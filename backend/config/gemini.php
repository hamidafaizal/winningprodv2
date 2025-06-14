<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/gemini.php';

// Set response header
header('Content-Type: application/json');

// === Helper Functions ===
function respond($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function log_system($pdo, $action, $details) {
    $stmt = $pdo->prepare("INSERT INTO system_logs (action, details, created_at) VALUES (?, ?, NOW())");
    $stmt->execute([$action, json_encode($details)]);
}

function is_valid_image($file) {
    $allowedMime = ['image/png', 'image/jpeg'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    return (
        in_array($file['type'], $allowedMime) &&
        in_array($ext, ['png', 'jpg', 'jpeg']) &&
        $file['size'] > 0 &&
        $file['size'] <= 5 * 1024 * 1024 // 5MB
    );
}

// === Validate POST parameters ===
$session_id = $_POST['session_id'] ?? '';
$batch_number = intval($_POST['batch_number'] ?? 0);
$screenshot_number = intval($_POST['screenshot_number'] ?? 0);

if (!$session_id || $batch_number < 1 || $screenshot_number < 1 || $screenshot_number > 25) {
    respond(['status' => 'error', 'error_message' => 'Parameter tidak valid.'], 400);
}

// === Validate and process uploaded image ===
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    respond(['status' => 'error', 'error_message' => 'Gambar tidak ditemukan atau gagal upload.'], 400);
}
$file = $_FILES['image'];
if (!is_valid_image($file)) {
    respond(['status' => 'error', 'error_message' => 'File gambar tidak valid.'], 400);
}

$uploadDir = realpath(__DIR__ . '/../../assets/uploads/screenshots');
if (!$uploadDir) {
    mkdir(__DIR__ . '/../../assets/uploads/screenshots', 0775, true);
    $uploadDir = realpath(__DIR__ . '/../../assets/uploads/screenshots');
}
if (!$uploadDir) {
    respond(['status' => 'error', 'error_message' => 'Gagal membuat folder upload.'], 500);
}

$uniqueName = uniqid('ss_', true) . '.' . strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$targetPath = $uploadDir . DIRECTORY_SEPARATOR . $uniqueName;

// Prevent directory traversal
if (strpos($targetPath, $uploadDir) !== 0) {
    respond(['status' => 'error', 'error_message' => 'Path upload tidak valid.'], 400);
}

if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    respond(['status' => 'error', 'error_message' => 'Gagal menyimpan file gambar.'], 500);
}

// === Call Gemini API ===
$prompt = "Analyze this Shopee screenshot and extract commission percentage for each product. Return JSON format: {products: [{position: 1, commission: 5.5}, ...]}";
$geminiResult = GeminiConfig::analyzeImage($targetPath, $prompt);

if ($geminiResult['error']) {
    respond([
        'status' => 'error',
        'error_message' => $geminiResult['message']
    ], 500);
}

$products = $geminiResult['products'];
$products_found = count($products);

// If not exactly 4 products, require reupload
if ($products_found !== 4) {
    respond([
        'status' => 'reupload_required',
        'products_found' => $products_found,
        'commissions' => $products,
        'error_message' => 'Jumlah produk terdeteksi tidak sama dengan 4. Silakan upload ulang atau input manual.'
    ]);
}

// === Save analysis result to DB ===
$pdo = Database::getInstance();
try {
    $pdo->beginTransaction();

    // Insert into image_analyses
    $stmt = $pdo->prepare("INSERT INTO image_analyses (session_id, batch_number, screenshot_number, image_path, products_found, commissions_json, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())");
    $stmt->execute([
        $session_id,
        $batch_number,
        $screenshot_number,
        $uniqueName,
        $products_found,
        json_encode($products)
    ]);
    $analysisId = $pdo->lastInsertId();

    // Update products table with commission values
    foreach ($products as $prod) {
        $position = intval($prod['position']);
        $commission = floatval($prod['commission']);
        $stmt = $pdo->prepare("UPDATE products SET komisi = ? WHERE session_id = ? AND batch_number = ? AND position_in_batch = ?");
        $stmt->execute([$commission, $session_id, $batch_number, $position]);
    }

    // Log operation
    log_system($pdo, 'analyze_image', [
        'session_id' => $session_id,
        'batch_number' => $batch_number,
        'screenshot_number' => $screenshot_number,
        'image' => $uniqueName,
        'products_found' => $products_found
    ]);

    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    respond(['status' => 'error', 'error_message' => 'Gagal menyimpan hasil analisis: ' . $e->getMessage()], 500);
}

// === Response ===
respond([
    'status' => 'success',
    'products_found' => $products_found,
    'commissions' => $products
]);
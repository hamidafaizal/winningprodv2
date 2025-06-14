<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/gemini.php';

try {
    // Validate inputs
    if (empty($_POST['session_id']) || empty($_FILES['image'])) {
        throw new Exception('Missing required parameters', 400);
    }

    // Sanitize inputs
    $session_id = filter_var($_POST['session_id'], FILTER_SANITIZE_STRING);
    $batch_number = filter_var($_POST['batch_number'], FILTER_VALIDATE_INT);
    $screenshot_number = filter_var($_POST['screenshot_number'], FILTER_VALIDATE_INT);

    if (!$session_id || !$batch_number || !$screenshot_number) {
        throw new Exception('Invalid input values', 400);
    }

    // Image validation
    $allowedTypes = ['image/jpeg', 'image/png'];
    $file = $_FILES['image'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Image upload error', 400);
    }
    if ($file['size'] > 5 * 1024 * 1024) {
        throw new Exception('Image too large (max 5MB)', 413);
    }
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    if (!in_array($mimeType, $allowedTypes)) {
        throw new Exception('Invalid image type', 415);
    }

    // Save image
    $uploadDir = realpath(__DIR__ . '/../../assets/uploads/screenshots');
    if (!$uploadDir) {
        mkdir(__DIR__ . '/../../assets/uploads/screenshots', 0775, true);
        $uploadDir = realpath(__DIR__ . '/../../assets/uploads/screenshots');
    }
    if (!$uploadDir) {
        throw new Exception('Failed to create upload directory', 500);
    }
    $ext = $mimeType === 'image/png' ? 'png' : 'jpg';
    $uniqueName = uniqid('ss_', true) . '.' . $ext;
    $targetPath = $uploadDir . DIRECTORY_SEPARATOR . $uniqueName;
    if (strpos($targetPath, $uploadDir) !== 0) {
        throw new Exception('Invalid upload path', 400);
    }
    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        throw new Exception('Failed to save image', 500);
    }

    // Gemini API call with retries and error handling
    $prompt = "Analyze this Shopee screenshot and extract commission percentage for each product. Return JSON format: {products: [{position: 1, commission: 5.5}, ...]}";
    $maxAttempts = 3;
    $attempt = 0;
    $geminiResult = null;
    $lastError = null;

    while ($attempt < $maxAttempts) {
        $attempt++;
        $geminiResult = GeminiConfig::analyzeImage($targetPath, $prompt, 30); // 30s timeout
        if (!$geminiResult['error']) {
            break;
        }
        $lastError = $geminiResult['message'];
        // Handle specific Gemini errors
        if (stripos($lastError, 'rate limit') !== false) {
            throw new Exception('Gemini API rate limit. Please try again later.', 429);
        }
        if (stripos($lastError, 'API key') !== false) {
            throw new Exception('Invalid Gemini API key.', 401);
        }
        if (stripos($lastError, 'timeout') !== false || stripos($lastError, 'Connection error') !== false) {
            if ($attempt < $maxAttempts) {
                sleep(1); // brief wait before retry
                continue;
            } else {
                throw new Exception('Network error or timeout contacting Gemini API.', 504);
            }
        }
        // Other errors: break and report
        break;
    }

    if ($geminiResult['error']) {
        throw new Exception('Gemini API error: ' . $geminiResult['message'], 502);
    }

    $products = $geminiResult['products'];
    $products_found = count($products);

    // If not exactly 4 products, require reupload
    if ($products_found !== 4) {
        echo json_encode([
            'status' => 'reupload_required',
            'products_found' => $products_found,
            'commissions' => $products,
            'error_message' => 'Jumlah produk terdeteksi tidak sama dengan 4. Silakan upload ulang atau input manual.'
        ]);
        exit;
    }

    // Save analysis result to DB
    $pdo = Database::getInstance();
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
    $stmt = $pdo->prepare("INSERT INTO system_logs (action, details, created_at) VALUES (?, ?, NOW())");
    $stmt->execute([
        'analyze_image',
        json_encode([
            'session_id' => $session_id,
            'batch_number' => $batch_number,
            'screenshot_number' => $screenshot_number,
            'image' => $uniqueName,
            'products_found' => $products_found
        ])
    ]);

    $pdo->commit();

    echo json_encode([
        'status' => 'success',
        'products_found' => $products_found,
        'commissions' => $products
    ]);
    exit;

} catch (Exception $e) {
    $code = $e->getCode() ?: 500;
    http_response_code($code);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'error_code' => $code
    ]);
    exit;
}
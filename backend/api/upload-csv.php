<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/csv-parser.php';

try {
    // CSRF Protection
//    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
//        $token = $_POST['csrf_token'] ?? '';
//        if (!isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $token)) {
//            http_response_code(403);
//            exit(json_encode(['error' => 'Invalid CSRF token']));
        }
//    }

    // Validate rank parameter
    $rank = isset($_POST['rank']) ? intval($_POST['rank']) : 0;
    if ($rank < 1 || !is_numeric($_POST['rank'])) {
        http_response_code(400);
        exit(json_encode(['error' => 'Parameter rank tidak valid.']));
    }

    // Validate and process uploaded files
    if (!isset($_FILES['csv_files'])) {
        http_response_code(400);
        exit(json_encode(['error' => 'Tidak ada file CSV yang diupload.']));
    }

    $files = $_FILES['csv_files'];
    $fileCount = is_array($files['name']) ? count($files['name']) : 0;
    if ($fileCount < 1) {
        http_response_code(400);
        exit(json_encode(['error' => 'Tidak ada file CSV yang diupload.']));
    }

    $allowedMime = [
        'text/csv',
        'application/csv',
        'application/vnd.ms-excel',
        'text/plain',
        'text/comma-separated-values',
        'application/octet-stream'
    ];
    $maxFileSize = 10 * 1024 * 1024; // 10MB

    $uploadDir = realpath(__DIR__ . '/../../assets/uploads/csv');
    if (!$uploadDir) {
        mkdir(__DIR__ . '/../../assets/uploads/csv', 0775, true);
        $uploadDir = realpath(__DIR__ . '/../../assets/uploads/csv');
    }
    if (!$uploadDir) {
        http_response_code(500);
        exit(json_encode(['error' => 'Gagal membuat folder upload.']));
    }

    $savedFiles = [];
    for ($i = 0; $i < $fileCount; $i++) {
        $file = [
            'name' => $files['name'][$i],
            'type' => $files['type'][$i],
            'tmp_name' => $files['tmp_name'][$i],
            'error' => $files['error'][$i],
            'size' => $files['size'][$i]
        ];

        if ($file['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            exit(json_encode(['error' => 'Upload file gagal: ' . $file['name']]));
        }
        if (!in_array($file['type'], $allowedMime)) {
            http_response_code(415);
            exit(json_encode(['error' => 'Tipe file tidak didukung: ' . $file['name']]));
        }
        if ($file['size'] > $maxFileSize) {
            http_response_code(413);
            exit(json_encode(['error' => 'File terlalu besar: ' . $file['name']]));
        }

        $uniqueName = uniqid('csv_', true) . '.csv';
        $targetPath = $uploadDir . DIRECTORY_SEPARATOR . $uniqueName;

        // Prevent directory traversal
        if (strpos($targetPath, $uploadDir) !== 0) {
            http_response_code(400);
            exit(json_encode(['error' => 'Path upload tidak valid.']));
        }

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            http_response_code(500);
            exit(json_encode(['error' => 'Gagal menyimpan file: ' . $file['name']]));
        }
        $savedFiles[] = $targetPath;
    }

    // Parse and filter CSV files
    try {
        $filteredProducts = parse_and_filter_csv_files($savedFiles, $rank);
    } catch (Exception $e) {
        http_response_code(500);
        exit(json_encode(['error' => 'Gagal memproses CSV: ' . $e->getMessage()]));
    }

    $totalProducts = count($filteredProducts);
    $batchSize = 100;
    $batchCount = (int)ceil($totalProducts / $batchSize);

    // Generate session_id (sanitize: only hex)
    $session_id = bin2hex(random_bytes(16));

    // Save to database
    $pdo = Database::getInstance();
    try {
        $pdo->beginTransaction();

        // Insert upload_sessions
        $stmt = $pdo->prepare("INSERT INTO upload_sessions (session_id, created_at, total_products, batch_count) VALUES (?, NOW(), ?, ?)");
        $stmt->execute([$session_id, $totalProducts, $batchCount]);
        $uploadSessionId = $pdo->lastInsertId();

        // Insert products
        $productsArr = [];
        foreach ($filteredProducts as $idx => $prod) {
            $batchNum = (int)floor($idx / $batchSize) + 1;
            $posInBatch = ($idx % $batchSize) + 1;
            $stmt = $pdo->prepare("INSERT INTO products (session_id, product_link, batch_number, position_in_batch, created_at) VALUES (?, ?, ?, ?, NOW())");
            $stmt->execute([$session_id, $prod['productLink'], $batchNum, $posInBatch]);
            $productId = $pdo->lastInsertId();
            $productsArr[] = [
                'id' => $productId,
                'product_link' => $prod['productLink'],
                'batch_number' => $batchNum,
                'position_in_batch' => $posInBatch
            ];
        }

        // Log operation
        $stmt = $pdo->prepare("INSERT INTO system_logs (action, details, created_at) VALUES (?, ?, NOW())");
        $stmt->execute([
            'upload_csv',
            json_encode([
                'session_id' => $session_id,
                'files' => array_map('basename', $savedFiles),
                'total_products' => $totalProducts
            ])
        ]);

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        exit(json_encode(['error' => 'Gagal menyimpan ke database: ' . $e->getMessage()]));
    }

    http_response_code(201);
    echo json_encode([
        'session_id' => $session_id,
        'total_products' => $totalProducts,
        'filtered_products' => $totalProducts,
        'batch_count' => $batchCount,
        'products' => $productsArr
    ]);
    exit;

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Server error occurred',
        'debug' => (isset($_ENV['APP_ENV']) && $_ENV['APP_ENV'] === 'development') ? $e->getMessage() : null
    ]);
    error_log('Upload CSV Error: ' . $e->getMessage());
    exit;
}
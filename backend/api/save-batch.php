<?php
session_start();
require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

function respond($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

try {
    // Input validation
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Method not allowed', 405);
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data || !isset($data['session_id']) || !isset($data['products']) || !isset($data['threshold'])) {
        throw new Exception('Invalid request data', 400);
    }

    // Sanitize inputs
    $session_id = filter_var($data['session_id'], FILTER_SANITIZE_STRING);
    $threshold = filter_var($data['threshold'], FILTER_VALIDATE_INT);
    $products = $data['products'];

    if (!$threshold || $threshold < 1) {
        throw new Exception('Invalid threshold value', 400);
    }
    if (!is_array($products) || count($products) === 0) {
        throw new Exception('No products provided', 400);
    }

    $pdo = Database::getInstance();

    // Use transaction
    $pdo->beginTransaction();

    // Assign batch numbers
    $batchSize = 100;
    $batchCount = 0;
    $batches = [];
    $currentBatch = [];
    $productIndex = 0;

    foreach ($products as $prod) {
        $currentBatch[] = $prod;
        $productIndex++;
        if (count($currentBatch) === $batchSize) {
            $batchCount++;
            $batches[] = [
                'batch_number' => $batchCount,
                'links' => array_map(function($p) { return $p['product_link']; }, $currentBatch)
            ];
            $currentBatch = [];
        }
    }
    // Add last batch if not empty
    if (count($currentBatch) > 0) {
        $batchCount++;
        $batches[] = [
            'batch_number' => $batchCount,
            'links' => array_map(function($p) { return $p['product_link']; }, $currentBatch)
        ];
    }

    // Optionally update products table with batch_number and position_in_batch
    foreach ($batches as $batch) {
        foreach ($batch['links'] as $pos => $link) {
            // Update products table if needed
            $stmt = $pdo->prepare("UPDATE products SET batch_number = ?, position_in_batch = ? WHERE session_id = ? AND product_link = ?");
            $stmt->execute([$batch['batch_number'], $pos + 1, $session_id, $link]);
        }
    }

    $pdo->commit();

    respond([
        'status' => 'success',
        'message' => 'Batches created successfully',
        'batch_count' => $batchCount,
        'batches' => $batches
    ]);
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();

    $code = $e->getCode() ?: 500;
    respond([
        'status' => 'error',
        'message' => $e->getMessage()
    ], $code);

    error_log('Save Batch Error: ' . $e->getMessage());
}
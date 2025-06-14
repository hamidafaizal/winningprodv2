<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/whatsapp.php';

try {
    // Validate required fields
    $required = ['session_id', 'batch_number', 'phone_id', 'threshold'];
    foreach ($required as $field) {
        if (empty($_POST[$field])) {
            throw new Exception("Missing required field: $field", 400);
        }
    }

    // Sanitize inputs
    $session_id = filter_var($_POST['session_id'], FILTER_SANITIZE_STRING);
    $batch_number = filter_var($_POST['batch_number'], FILTER_VALIDATE_INT);
    $phone_id = filter_var($_POST['phone_id'], FILTER_VALIDATE_INT);
    $threshold = filter_var($_POST['threshold'], FILTER_VALIDATE_INT);

    if (!$batch_number || !$phone_id || !$threshold) {
        throw new Exception('Invalid input parameters', 400);
    }

    $pdo = Database::getInstance();

    // Get phone info
    $stmt = $pdo->prepare("SELECT name, whatsapp_number FROM phones WHERE id = ? AND is_active = 1");
    $stmt->execute([$phone_id]);
    $phone = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$phone) {
        throw new Exception('HP tidak ditemukan atau tidak aktif.', 400);
    }

    // Verify batch is complete
    $stmt = $pdo->prepare("SELECT product_link FROM products WHERE session_id = ? AND batch_number = ? ORDER BY position_in_batch ASC");
    $stmt->execute([$session_id, $batch_number]);
    $links = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (count($links) < $threshold) {
        throw new Exception('Batch belum lengkap.', 400);
    }

    // Generate WhatsApp URL
    try {
        $wa_url = generate_wa_url($phone['whatsapp_number'], array_slice($links, 0, $threshold));
    } catch (Exception $e) {
        throw new Exception($e->getMessage(), 400);
    }

    // Transaction for DB operations
    $pdo->beginTransaction();
    try {
        // Save to distributions table
        $stmt = $pdo->prepare("INSERT INTO distributions (session_id, batch_number, phone_id, whatsapp_number, distributed_at, total_links) VALUES (?, ?, ?, ?, NOW(), ?)");
        $stmt->execute([$session_id, $batch_number, $phone_id, $phone['whatsapp_number'], $threshold]);

        // Mark batch as distributed
        $stmt = $pdo->prepare("UPDATE products SET is_distributed = 1 WHERE session_id = ? AND batch_number = ?");
        $stmt->execute([$session_id, $batch_number]);

        // Log successful distribution
        $stmt = $pdo->prepare("INSERT INTO system_logs (action, details, created_at) VALUES (?, ?, NOW())");
        $stmt->execute([
            'distribute_batch',
            json_encode([
                'session_id' => $session_id,
                'batch_number' => $batch_number,
                'phone_id' => $phone_id,
                'phone' => $phone['whatsapp_number'],
                'total_links' => $threshold
            ])
        ]);

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        throw new Exception('Database error: ' . $e->getMessage(), 500);
    }

    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'whatsapp_url' => $wa_url,
        'batch_info' => [
            'batch_number' => $batch_number,
            'phone_name' => $phone['name'],
            'total_links' => $threshold
        ]
    ]);
} catch (Exception $e) {
    $code = $e->getCode() ?: 500;
    http_response_code($code);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
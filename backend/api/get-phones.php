<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: max-age=300'); // Cache for 5 minutes

try {
    require_once '../config/database.php';

    $db = Database::getInstance();
    $stmt = $db->prepare("SELECT id, name, whatsapp_number FROM phones WHERE is_active = 1");
    $stmt->execute();

    $phones = $stmt->fetchAll(PDO::FETCH_ASSOC);

    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'data' => $phones,
        'count' => count($phones)
    ]);
} catch (PDOException $e) {
    http_response_code(503);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database connection failed',
        'error_code' => 'DB_ERROR'
    ]);
    error_log('Get Phones Error: ' . $e->getMessage());
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Gagal mengambil data HP',
        'error_code' => 'UNKNOWN_ERROR'
    ]);
    error_log('Unknown Error: ' . $e->getMessage());
}
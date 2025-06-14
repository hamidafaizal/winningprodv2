<?php
// filepath: backend/api/mock-responses.php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$endpoint = $_GET['endpoint'] ?? '';
sleep(rand(0, 2)); // Simulate delay

switch ($endpoint) {
    case 'upload-csv':
        echo json_encode([
            'status' => 'success',
            'session_id' => 'mock-session-123',
            'total_products' => 200,
            'filtered_products' => 200,
            'batch_count' => 2,
            'products' => array_map(function($i) {
                return [
                    'id' => $i + 1,
                    'product_link' => "https://shopee.co.id/product/" . (1000 + $i),
                    'batch_number' => floor($i / 100) + 1,
                    'position_in_batch' => ($i % 100) + 1,
                    'komisi' => ''
                ];
            }, range(0, 199))
        ]);
        break;

    case 'analyze-image':
        $rand = rand(1, 10);
        if ($rand <= 2) {
            echo json_encode([
                'status' => 'reupload_required',
                'products_found' => 3,
                'commissions' => [
                    ['position' => 1, 'commission' => 5.5],
                    ['position' => 2, 'commission' => 6.2],
                    ['position' => 3, 'commission' => 4.8]
                ],
                'error_message' => 'Jumlah produk terdeteksi tidak sama dengan 4. Silakan upload ulang atau input manual.'
            ]);
        } elseif ($rand == 3) {
            http_response_code(504);
            echo json_encode([
                'status' => 'error',
                'message' => 'Mock Gemini API timeout'
            ]);
        } else {
            echo json_encode([
                'status' => 'success',
                'products_found' => 4,
                'commissions' => [
                    ['position' => 1, 'commission' => 5.5],
                    ['position' => 2, 'commission' => 6.2],
                    ['position' => 3, 'commission' => 4.8],
                    ['position' => 4, 'commission' => 7.1]
                ]
            ]);
        }
        break;

    case 'distribute':
        $batch = rand(1, 3);
        $links = [];
        for ($i = 0; $i < 100; $i++) {
            $links[] = "https://shopee.co.id/product/" . ($batch * 100 + $i);
        }
        echo json_encode([
            'status' => 'success',
            'whatsapp_url' => 'https://wa.me/6281234567890?text=' . urlencode(implode("\n", array_slice($links, 0, 5))),
            'batch_info' => [
                'batch_number' => $batch,
                'phone_name' => 'Mock HP',
                'total_links' => 100
            ]
        ]);
        break;

    case 'get-phones':
        echo json_encode([
            'status' => 'success',
            'data' => [
                ['id' => 1, 'name' => 'Mock HP 1', 'whatsapp_number' => '6281234567890'],
                ['id' => 2, 'name' => 'Mock HP 2', 'whatsapp_number' => '6289876543210']
            ],
            'count' => 2
        ]);
        break;

    case 'save-batch':
        $count = rand(1, 3);
        $batches = [];
        for ($i = 1; $i <= $count; $i++) {
            $links = [];
            for ($j = 0; $j < 100; $j++) {
                $links[] = "https://shopee.co.id/product/" . ($i * 100 + $j);
            }
            $batches[] = [
                'batch_number' => $i,
                'links' => $links
            ];
        }
        echo json_encode([
            'status' => 'success',
            'message' => 'Batches created successfully',
            'batch_count' => $count,
            'batches' => $batches
        ]);
        break;

    default:
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Unknown mock endpoint']);
}
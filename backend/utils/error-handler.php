<?php
require_once __DIR__ . '/../config/database.php';

class ErrorHandler
{
    // Set to true for development, false for production
    private static $isDev = false;

    // Centralized error logging and response
    public static function handle($message, $context = [], $httpCode = 500)
    {
        self::logError($message, $context);
        http_response_code($httpCode);
        $userMessage = self::$isDev
            ? $message . (empty($context) ? '' : ' | ' . json_encode($context))
            : 'Terjadi kesalahan pada sistem. Silakan coba lagi atau hubungi admin.';
        echo json_encode(['error' => $userMessage]);
        exit;
    }

    // Log error to system_logs table
    public static function logError($message, $context = [])
    {
        try {
            $pdo = Database::getInstance();
            $stmt = $pdo->prepare("INSERT INTO system_logs (action, details, created_at) VALUES (?, ?, NOW())");
            $stmt->execute([
                'error',
                json_encode([
                    'message' => $message,
                    'context' => $context,
                    'time' => date('c')
                ])
            ]);
        } catch (\Exception $e) {
            // Fallback: log to PHP error log if DB fails
            error_log('System log DB error: ' . $e->getMessage());
            error_log('Original error: ' . $message . ' | Context: ' . json_encode($context));
        }
    }

    // Set mode (call at app bootstrap if needed)
    public static function setDevMode($isDev)
    {
        self::$isDev = $isDev ? true : false;
<?php
/**
 * Database configuration for WinningProd V2
 * - Uses PDO (MySQL, UTF8MB4)
 * - Loads environment variables from .env
 * - Singleton pattern for connection
 * - Production-ready error handling
 */

class Database
{
    private static $instance = null;
    private $pdo;

    private function __construct()
    {
        $env = self::loadEnv(__DIR__ . '/../../.env');
        $host = $env['DB_HOST'] ?? '';
        $db   = $env['DB_NAME'] ?? '';
        $user = $env['DB_USER'] ?? '';
        $pass = $env['DB_PASS'] ?? '';

        $dsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_PERSISTENT         => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ];

        try {
            $this->pdo = new PDO($dsn, $user, $pass, $options);
            // Test connection
            $this->pdo->query('SELECT 1');
        } catch (PDOException $e) {
            error_log('Database connection failed: ' . $e->getMessage());
            http_response_code(500);
            die('Database connection error.');
        }
    }

    public static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance->pdo;
    }

    // Simple .env loader
    private static function loadEnv($path)
    {
        if (!file_exists($path)) return [];
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $env = [];
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            [$key, $value] = array_map('trim', explode('=', $line, 2) + [null, null]);
            if ($key && $value !== null) {
                $env[$key] = $value;
            }
        }
        return $env;
    }
}
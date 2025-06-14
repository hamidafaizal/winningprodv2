<?php
class Database {
    private static $instance = null;
    private $pdo;

    private function __construct() {
        $envPath = __DIR__ . '/../../.env';
        if (!file_exists($envPath)) {
            die('Error: .env file not found');
        }
        
        $env = parse_ini_file($envPath);
        $host = $env['DB_HOST'] ?? 'localhost';
        $db   = $env['DB_NAME'] ?? 'winningprod_v2';
        $user = $env['DB_USER'] ?? 'root';
        $pass = $env['DB_PASS'] ?? '';

        $dsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false
        ];

        try {
            $this->pdo = new PDO($dsn, $user, $pass, $options);
        } catch (PDOException $e) {
            error_log('Database connection failed: ' . $e->getMessage());
            die('Database connection error');
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance->pdo;
    }
}
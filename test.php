<?php
// Test 1: PHP Info
echo "<h2>1. PHP Configuration</h2>";
echo "PHP Version: " . phpversion() . "<br>";
echo "Upload Max Size: " . ini_get('upload_max_filesize') . "<br>";
echo "Post Max Size: " . ini_get('post_max_size') . "<br><br>";

// Test 2: Database Connection
echo "<h2>2. Database Connection Test</h2>";
require_once 'backend/config/database.php';

try {
    $db = Database::getInstance()->getConnection();
    echo "✅ Database connection successful!<br>";
    
    // Test query
    $stmt = $db->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "✅ Tables found: " . implode(", ", $tables) . "<br><br>";
    
} catch (Exception $e) {
    echo "❌ Database Error: " . $e->getMessage() . "<br><br>";
}

// Test 3: File Permissions
echo "<h2>3. Directory Permissions</h2>";
$dirs = [
    'assets/uploads/csv',
    'assets/uploads/screenshots',
    'logs'
];

foreach ($dirs as $dir) {
    if (is_writable($dir)) {
        echo "✅ $dir is writable<br>";
    } else {
        echo "❌ $dir is NOT writable<br>";
    }
}

// Test 4: Environment Variables
echo "<h2>4. Environment Variables</h2>";
if (file_exists('.env')) {
    echo "✅ .env file exists<br>";
    // Don't display actual values for security
    $required_vars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'GEMINI_API_KEY'];
    foreach ($required_vars as $var) {
        if (isset($_ENV[$var]) || getenv($var)) {
            echo "✅ $var is set<br>";
        } else {
            echo "❌ $var is NOT set<br>";
        }
    }
} else {
    echo "❌ .env file NOT found<br>";
}
?>
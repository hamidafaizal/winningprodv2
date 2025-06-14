<?php
// filepath: install.php

echo "<h2>WinningProd V2 Installation Wizard</h2>";

function check_extension($ext) {
    if (!extension_loaded($ext)) {
        echo "<div style='color:red;'>PHP extension missing: <b>$ext</b></div>";
        return false;
    }
    echo "<div style='color:green;'>PHP extension loaded: $ext</div>";
    return true;
}

function check_folder($folder) {
    if (!is_dir($folder)) {
        if (!mkdir($folder, 0775, true)) {
            echo "<div style='color:red;'>Failed to create directory: <b>$folder</b></div>";
            return false;
        }
    }
    if (!is_writable($folder)) {
        echo "<div style='color:red;'>Directory not writable: <b>$folder</b></div>";
        return false;
    }
    echo "<div style='color:green;'>Directory OK: $folder</div>";
    return true;
}

$all_ok = true;

// 1. Check PHP extensions
echo "<h3>PHP Extensions</h3>";
foreach (['pdo', 'pdo_mysql', 'curl', 'json', 'mbstring', 'fileinfo'] as $ext) {
    $all_ok &= check_extension($ext);
}

// 2. Check folders
echo "<h3>Folder Permissions</h3>";
foreach ([
    'assets/uploads/csv',
    'assets/uploads/screenshots',
    'assets/logs'
] as $folder) {
    $all_ok &= check_folder(__DIR__ . '/' . $folder);
}

// 3. Test DB connection
echo "<h3>Database Connection</h3>";
require_once __DIR__ . '/backend/config/database.php';
try {
    $pdo = Database::getInstance();
    $pdo->query('SELECT 1');
    echo "<div style='color:green;'>Database connection successful.</div>";
} catch (Exception $e) {
    echo "<div style='color:red;'>Database connection failed: " . htmlspecialchars($e->getMessage()) . "</div>";
    $all_ok = false;
}

// 4. Setup wizard
if ($all_ok) {
    echo "<h3 style='color:green;'>All checks passed. You can proceed with the setup.</h3>";
    // Add further setup steps here (e.g., admin user creation)
} else {
    echo "<h3 style='color:red;'>Please fix the above issues before continuing.</h3>";
}
?>
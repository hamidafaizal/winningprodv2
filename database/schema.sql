-- ========================================
-- CREATE DATABASE
-- ========================================
CREATE DATABASE IF NOT EXISTS winningprod_v2
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE winningprod_v2;

-- ========================================
-- TABLE: phones (Daftar HP untuk distribusi)
-- ========================================
CREATE TABLE IF NOT EXISTS phones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT 'Nama pemilik HP',
    whatsapp_number VARCHAR(20) NOT NULL COMMENT 'Nomor WhatsApp (format: 628xxx)',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Status aktif/nonaktif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active (is_active),
    UNIQUE KEY unique_whatsapp (whatsapp_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABLE: upload_sessions (Track setiap upload CSV)
-- ========================================
CREATE TABLE IF NOT EXISTS upload_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL UNIQUE COMMENT 'Unique session identifier',
    total_files INT DEFAULT 0 COMMENT 'Jumlah file CSV yang diupload',
    rank_value INT NOT NULL COMMENT 'Nilai rank yang diinput user',
    total_raw_products INT DEFAULT 0 COMMENT 'Total produk sebelum filter',
    total_filtered_products INT DEFAULT 0 COMMENT 'Total produk setelah filter',
    status ENUM('processing', 'completed', 'distributed') DEFAULT 'processing',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_session (session_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABLE: products (Hasil filter dari Navbar 1)
-- ========================================
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL COMMENT 'Link ke upload session',
    product_link VARCHAR(500) NOT NULL COMMENT 'Link produk Shopee',
    commission DECIMAL(10,2) DEFAULT NULL COMMENT 'Komisi dari analisa AI',
    commission_status ENUM('pending', 'analyzed', 'approved', 'error') DEFAULT 'pending',
    batch_number INT DEFAULT NULL COMMENT 'Nomor batch (1, 2, 3, dst)',
    position_in_batch INT DEFAULT NULL COMMENT 'Posisi dalam batch (1-100)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_session_batch (session_id, batch_number),
    INDEX idx_commission_status (commission_status),
    UNIQUE KEY unique_product_session (product_link, session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABLE: image_analyses (Track analisa screenshot)
-- ========================================
CREATE TABLE IF NOT EXISTS image_analyses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL,
    batch_number INT NOT NULL COMMENT 'Batch yang sedang dianalisa',
    screenshot_number INT NOT NULL COMMENT 'Screenshot ke-berapa (1-25 per batch)',
    image_path VARCHAR(255) DEFAULT NULL COMMENT 'Path file screenshot',
    gemini_response TEXT COMMENT 'Raw response dari Gemini API',
    products_found INT DEFAULT 0 COMMENT 'Jumlah produk yang terdeteksi dalam SS',
    analysis_status ENUM('pending', 'processing', 'success', 'error', 'reupload_required') DEFAULT 'pending',
    error_message TEXT DEFAULT NULL,
    approved_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_session_batch_ss (session_id, batch_number, screenshot_number),
    INDEX idx_status (analysis_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABLE: distributions (Track distribusi ke WhatsApp)
-- ========================================
CREATE TABLE IF NOT EXISTS distributions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL,
    batch_number INT NOT NULL,
    phone_id INT NOT NULL,
    threshold INT NOT NULL COMMENT 'Threshold yang diset user',
    total_links INT NOT NULL COMMENT 'Jumlah link dalam batch',
    distribution_status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
    sent_at TIMESTAMP NULL DEFAULT NULL,
    whatsapp_link TEXT COMMENT 'Generated WhatsApp Web link',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_session_batch (session_id, batch_number),
    INDEX idx_status (distribution_status),
    FOREIGN KEY (phone_id) REFERENCES phones(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABLE: system_logs (Untuk tracking & debugging)
-- ========================================
CREATE TABLE IF NOT EXISTS system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(50) DEFAULT NULL,
    log_type ENUM('info', 'warning', 'error', 'debug') DEFAULT 'info',
    component ENUM('navbar1', 'navbar2', 'navbar3', 'backend', 'api') DEFAULT 'backend',
    message TEXT NOT NULL,
    details JSON DEFAULT NULL COMMENT 'Additional data dalam format JSON',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session (session_id),
    INDEX idx_type (log_type),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- INSERT SAMPLE DATA
-- ========================================
INSERT INTO phones (name, whatsapp_number) VALUES
('Admin Utama', '6281234567890'),
('Tim Marketing 1', '6281234567891'),
('Tim Marketing 2', '6281234567892'),
('Supervisor', '6281234567893');
# WinningProd V2

## Overview

WinningProd V2 is a web-based system for product filtering, commission analysis, and WhatsApp distribution, optimized for Shopee workflows.

---

## Installation

1. **Requirements**
   - PHP 7.4+
   - MySQL/MariaDB
   - PHP extensions: `pdo`, `pdo_mysql`, `curl`, `json`, `mbstring`, `fileinfo`
   - Node.js (for frontend build, optional)
   - Web server (Apache/Nginx)

2. **Setup**
   - Clone/download the repository.
   - Copy `.env.example` to `.env` and fill in your DB and Gemini API credentials.
   - Set folder permissions for `assets/uploads/` and `assets/logs/`.
   - Run `install.php` in your browser to check environment and permissions.
   - Import the provided SQL schema to your database.

3. **Configuration**
   - Edit `config.js` for frontend settings.
   - Edit `.env` for backend credentials.

---

## API Documentation

- **Upload CSV:** `POST /backend/api/upload-csv.php`
- **Analyze Image:** `POST /backend/api/analyze-image.php`
- **Get Phones:** `GET /backend/api/get-phones.php`
- **Distribute Batch:** `POST /backend/api/distribute.php`
- **Save Batch:** `POST /backend/api/save-batch.php`

See `docs/api.md` for full parameter and response details.

---

## System Requirements

- PHP 7.4+
- MySQL/MariaDB
- Modern browser (Chrome/Edge/Firefox)
- Internet connection for Gemini API

---

## Troubleshooting

- **Permission errors:** Ensure `assets/uploads/` and `assets/logs/` are writable.
- **Database errors:** Check `.env` DB credentials and run `install.php`.
- **API errors:** See `assets/logs/` and `system_logs` table for details.
- **Gemini API issues:** Check API key and quota in Google Cloud Console.
- **WhatsApp popup blocked:** Allow popups for your site in browser settings.

---

## License

MIT License

---

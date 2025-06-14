// Validate CSV file structure by checking required columns in the first row
export function validateCSVStructure(file, requiredColumns = ['productLink', 'Tren', 'isAd', 'Penjualan (30 Hari)']) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const text = e.target.result;
            const lines = text.split(/\r?\n/);
            if (!lines.length) return reject('CSV kosong.');
            const header = lines[0].split(',');
            const missing = requiredColumns.filter(col => !header.includes(col));
            if (missing.length) {
                reject(`Kolom wajib tidak ditemukan: ${missing.join(', ')}`);
            } else {
                resolve(true);
            }
        };
        reader.onerror = () => reject('Gagal membaca file CSV.');
        reader.readAsText(file);
    });
}

// Validate image file (PNG/JPG, max 5MB)
export function validateImageFile(file) {
    const allowedTypes = ['image/png', 'image/jpeg'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (!allowedTypes.includes(file.type)) return false;
    if (file.size > maxSize) return false;
    return true;
}

// Validate threshold (positive integer)
export function validateThreshold(value) {
    const n = Number(value);
    return Number.isInteger(n) && n > 0;
}

// Validate Indonesian phone number (62xxxxxxxxxx)
export function validatePhoneNumber(number) {
    return
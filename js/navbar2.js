import { apiRequest } from './api-client.js';
import { showLoading, hideLoading, showNotification } from './ui-helpers.js';

// ======= DOM Elements =======
const navbar2 = document.querySelector('.navbar2-content');
const batchIndicator = navbar2.querySelector('[data-batch-indicator]');
const uploadArea = navbar2.querySelector('[data-upload="screenshots"]');
const fileInput = navbar2.querySelector('[data-input="screenshots"]');
const previewGrid = navbar2.querySelector('[data-preview-grid]');
const analisaBtn = navbar2.querySelector('[data-action="analisa"]');
const resultsTable = navbar2.querySelector('[data-komisi-results]');
const notifications = navbar2.querySelector('.notifications');

let sessionId = null;
let currentBatch = 1;
let screenshots = [];
let analysisResults = [];
let approvedCount = 0;
const maxScreenshots = 25;

// ======= Helper Functions =======
function showNotification(msg, type = 'error') {
    const toast = document.createElement('div');
    toast.className = `notification toast ${type}`;
    toast.textContent = msg;
    notifications.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function showLoading(btn, loading = true) {
    if (loading) {
        btn.disabled = true;
        btn.dataset.originalText = btn.textContent;
        btn.innerHTML = `<span class="spinner"></span> Analisa...`;
    } else {
        btn.disabled = false;
        btn.textContent = btn.dataset.originalText || 'ANALISA';
    }
}

function updateBatchIndicator() {
    batchIndicator.innerHTML = `Batch <span data-batch-number>${currentBatch}</span>: <span data-batch-range>${approvedCount}/${maxScreenshots} Screenshots</span>`;
}

function clearPreviewGrid() {
    previewGrid.innerHTML = '';
    screenshots = [];
    analysisResults = [];
    approvedCount = 0;
    updateBatchIndicator();
    resultsTable.hidden = true;
}

function renderImagePreview(files) {
    clearPreviewGrid();
    [...files].forEach((file, idx) => {
        const card = document.createElement('div');
        card.className = 'image-card';
        card.dataset.imageIndex = idx + 1;
        const url = URL.createObjectURL(file);
        card.innerHTML = `
            <img src="${url}" alt="Screenshot Preview" class="image-thumb" />
            <div class="image-info">
                <span class="product-count">Menganalisa...</span>
                <div class="manual-input" data-manual-input hidden>
                    <label>
                        Masukkan jumlah produk:
                        <input type="number" min="1" max="4" class="input input-manual-count" />
                    </label>
                </div>
                <div class="image-error" data-image-error hidden>
                    <span class="error-icon">&#9888;</span>
                    <span>Gagal membaca gambar. Silakan unggah ulang.</span>
                </div>
            </div>
        `;
        previewGrid.appendChild(card);
    });
    screenshots = [...files];
    updateBatchIndicator();
}

function renderAnalysisResult(idx, result) {
    const card = previewGrid.querySelector(`.image-card[data-image-index="${idx + 1}"]`);
    if (!card) return;
    const info = card.querySelector('.image-info');
    const productCount = info.querySelector('.product-count');
    const manualInput = info.querySelector('[data-manual-input]');
    const imageError = info.querySelector('[data-image-error]');

    if (result.status === 'success') {
        productCount.innerHTML = `Produk terdeteksi: <b>${result.products_found}</b>`;
        imageError.hidden = true;
        manualInput.hidden = true;
        card.classList.remove('error');
        // Show commission values in results table
        renderKomisiResults(idx, result.commissions);
    } else if (result.status === 'reupload_required') {
        productCount.innerHTML = `Produk terdeteksi: <b>${result.products_found}</b> <span class="info-icon tooltip" data-tooltip="Jumlah produk ideal: 4">&#9432;</span>`;
        imageError.hidden = false;
        manualInput.hidden = false;
        card.classList.add('error');
        showNotification(result.error_message, 'error');
    } else {
        productCount.innerHTML = 'Gagal analisa';
        imageError.hidden = false;
        manualInput.hidden = true;
        card.classList.add('error');
        showNotification(result.error_message || 'Gagal analisa gambar.', 'error');
    }
}

function renderKomisiResults(idx, commissions) {
    resultsTable.hidden = false;
    let card = resultsTable.querySelector(`.komisi-result-card[data-result-index="${idx + 1}"]`);
    if (!card) {
        card = document.createElement('div');
        card.className = 'komisi-result-card';
        card.dataset.resultIndex = idx + 1;
        card.innerHTML = `
            <div class="result-header">
                <span class="result-image-thumb"><img src="${URL.createObjectURL(screenshots[idx])}" alt="Preview" /></span>
                <span class="result-title">Screenshot ${idx + 1}</span>
            </div>
            <ul class="komisi-list"></ul>
            <button class="btn btn-approve" data-action="approve" data-result-index="${idx + 1}">APPROVE</button>
        `;
        resultsTable.appendChild(card);
    }
    const ul = card.querySelector('.komisi-list');
    ul.innerHTML = '';
    commissions.forEach((prod, i) => {
        ul.innerHTML += `<li>Produk ${prod.position}: <span class="komisi-value" data-komisi-value>${prod.commission}</span></li>`;
    });
    card.querySelector('.btn-approve').disabled = false;
}

function resetBatch() {
    clearPreviewGrid();
    resultsTable.innerHTML = '';
    resultsTable.hidden = true;
    approvedCount = 0;
    updateBatchIndicator();
}

// Setup based on Navbar 1 data
function initialize(data) {
    sessionId = data.sessionId;
    resetBatch();
    updateBatchIndicator();
    calculateTotalScreenshots();
}

// Calculate total screenshots needed (25 per 100 products)
function calculateTotalScreenshots() {
    if (!window.Navbar1 || !window.Navbar1.products) return 0;
    const totalProducts = window.Navbar1.products().length;
    return Math.ceil(totalProducts / 4); // 4 products per screenshot
}

// Send commission data to Navbar 1 and progress to next
function handleApprove(idx) {
    const result = analysisResults[idx];
    if (!result || result.status !== 'success') return;
    // Update Navbar 1 commission columns
    result.commissions.forEach((prod, i) => {
        const productIdx = idx * 4 + i;
        if (window.Navbar1 && window.Navbar1.updateCommission) {
            const product = window.Navbar1.products()[productIdx];
            if (product) window.Navbar1.updateCommission(product.id, prod.commission);
        }
    });
    approvedCount++;
    updateBatchIndicator();
    if (approvedCount >= screenshots.length) {
        showNotification('Batch selesai! Lanjut ke batch berikutnya.', 'success');
        setTimeout(() => {
            resetBatch();
            currentBatch++;
            updateBatchIndicator();
        }, 1200);
    }
}

// Clear progress and UI
function reset() {
    resetBatch();
    resultsTable.innerHTML = '';
    resultsTable.hidden = true;
    approvedCount = 0;
    updateBatchIndicator();
}

// Error display function for Navbar2
function showError(message, details = null) {
    const errorBox = document.querySelector('[data-notifications="navbar2"]');
    if (errorBox) {
        const div = document.createElement('div');
        div.className = 'notification toast error';
        div.textContent = message;
        errorBox.appendChild(div);
        setTimeout(() => div.remove(), 5000);
    }
    console.error('Navbar2 Error:', message, details);
}

// Validate image file before upload
function validateImage(file) {
    const validTypes = ['image/jpeg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
        throw new Error('Format gambar harus JPG atau PNG');
    }
    if (file.size > maxSize) {
        throw new Error('Ukuran gambar maksimal 5MB');
    }
}

// Analyze image with error recovery and retry
async function analyzeImage(imageFile) {
    const maxAttempts = 3;
    let attempt = 0;

    while (attempt < maxAttempts) {
        try {
            showLoading('navbar2');

            const response = await APIClient.analyzeImage({
                session_id: AppState.currentSessionId,
                batch_number: currentBatch,
                screenshot_number: currentScreenshot,
                image: imageFile
            });

            if (response.status === 'reupload_required') {
                showError('Gambar tidak valid. Harus mengandung 4 produk.');
                return false;
            }

            return response;

        } catch (error) {
            attempt++;

            if (attempt >= maxAttempts) {
                showError('Gagal menganalisa gambar setelah 3 kali percobaan');
                return false;
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
        } finally {
            hideLoading('navbar2');
        }
    }
}

// Save progress to sessionStorage
function saveProgress() {
    sessionStorage.setItem('navbar2_progress', JSON.stringify({
        batch: currentBatch,
        screenshot: currentScreenshot
    }));
}

// Restore progress from sessionStorage
function restoreProgress() {
    const saved = sessionStorage.getItem('navbar2_progress');
    if (saved) {
        const progress = JSON.parse(saved);
        currentBatch = progress.batch;
        currentScreenshot = progress.screenshot;
    }
}

// ======= Event Handlers =======

// Drag & drop
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', e => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', e => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
});
uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        renderImagePreview(e.dataTransfer.files);
    }
});
fileInput.addEventListener('change', e => {
    renderImagePreview(e.target.files);
});

// ANALISA button
analisaBtn.addEventListener('click', async () => {
    if (!sessionId) {
        showNotification('Session belum tersedia. Silakan upload CSV di Navbar 1.', 'error');
        return;
    }
    if (!screenshots.length) {
        showNotification('Upload minimal satu screenshot.', 'error');
        return;
    }
    showLoading(analisaBtn, true);
    analysisResults = [];

    for (let i = 0; i < screenshots.length; i++) {
        const file = screenshots[i];
        // Show loading spinner on card
        renderAnalysisResult(i, { status: 'loading' });

        const formData = new FormData();
        formData.append('session_id', sessionId);
        formData.append('batch_number', currentBatch);
        formData.append('screenshot_number', i + 1);
        formData.append('image', file);

        try {
            const resp = await apiRequest({
                url: 'backend/api/analyze-image.php',
                method: 'POST',
                files: [file],
                data: {
                    session_id: sessionId,
                    batch_number: currentBatch,
                    screenshot_number: i + 1
                }
            });
            analysisResults[i] = resp;
            renderAnalysisResult(i, resp);
        } catch (err) {
            analysisResults[i] = { status: 'error', error_message: err.message || 'Gagal analisa.' };
            renderAnalysisResult(i, analysisResults[i]);
        }
    }
    showLoading(analisaBtn, false);
});

// APPROVE button
resultsTable.addEventListener('click', e => {
    if (e.target.matches('[data-action="approve"]')) {
        const idx = parseInt(e.target.dataset.resultIndex, 10) - 1;
        const result = analysisResults[idx];
        if (!result || result.status !== 'success') {
            showNotification('Analisa belum berhasil.', 'error');
            return;
        }
        // Simulate sending approval to backend and updating Navbar 1
        e.target.disabled = true;
        approvedCount++;
        updateBatchIndicator();

        // Update Navbar 1 commission column (if integrated)
        // window.Navbar1 && window.Navbar1.setKomisiForBatch && window.Navbar1.setKomisiForBatch(currentBatch, result.commissions);

        // Move to next screenshot or batch
        if (approvedCount >= screenshots.length) {
            showNotification('Batch selesai! Lanjut ke batch berikutnya.', 'success');
            setTimeout(() => {
                resetBatch();
                currentBatch++;
                updateBatchIndicator();
            }, 1200);
        }
    }
});

// ======= INIT =======
window.Navbar2 = {
    init: function (sid) {
        sessionId = sid;
        resetBatch();
        updateBatchIndicator();
    }
};

// Auto-init if session_id is available globally
if (window.Navbar1 && window.Navbar1.sessionId) {
    window.Navbar2.init(window.Navbar1.sessionId);
}
import { apiRequest } from './api-client.js';
import { showLoading, hideLoading, showNotification } from './ui-helpers.js';

// ======= DOM Elements =======
const navbar3 = document.querySelector('.navbar3-content');
const progressChart = navbar3.querySelector('[data-progress-chart]');
const chartValue = navbar3.querySelector('[data-chart-value]');
const thresholdInput = navbar3.querySelector('[data-input="threshold"]');
const confirmBtn = navbar3.querySelector('[data-action="confirm-threshold"]');
const batchesArea = navbar3.querySelector('[data-batches-area]');
const batchesList = navbar3.querySelector('[data-batches-list]');
const resetBtn = navbar3.querySelector('[data-action="reset"]');
const notifications = navbar3.querySelector('.notifications');

let allLinks = [];
let threshold = 0;
let batchSize = 100;
let batches = [];
let phones = [];
let distributedBatches = 0;

// ======= Helper Functions =======
function showNotification(msg, type = 'error') {
    const toast = document.createElement('div');
    toast.className = `notification toast ${type}`;
    toast.textContent = msg;
    notifications.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function validateThreshold() {
    const val = parseInt(thresholdInput.value, 10);
    return Number.isInteger(val) && val > 0 && allLinks.length >= val;
}

function drawPieChart(collected, total) {
    // Use Canvas for animated pie chart
    let canvas = progressChart.querySelector('canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.width = 110;
        canvas.height = 110;
        progressChart.innerHTML = '';
        progressChart.appendChild(canvas);
        progressChart.appendChild(chartValue);
        progressChart.appendChild(progressChart.querySelector('.chart-label') || document.createElement('span'));
    }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 110, 110);

    // Background circle
    ctx.beginPath();
    ctx.arc(55, 55, 48, 0, 2 * Math.PI);
    ctx.strokeStyle = '#1e3c72';
    ctx.lineWidth = 12;
    ctx.globalAlpha = 0.18;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Progress arc
    const percent = Math.min(collected / total, 1);
    ctx.beginPath();
    ctx.arc(55, 55, 48, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * percent);
    ctx.strokeStyle = '#6dd5ed';
    ctx.lineWidth = 12;
    ctx.shadowColor = '#6dd5ed';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Value
    chartValue.textContent = `${Math.round(percent * 100)}%`;
}

function updatePieChart() {
    const collected = allLinks.length;
    drawPieChart(collected, threshold);
}

function filterUniqueLinks(links) {
    return [...new Set(links)];
}

function calculateBatches() {
    // Only use up to threshold links, split into batches of 100
    const uniqueLinks = filterUniqueLinks(allLinks).slice(0, threshold);
    let batchArr = [];
    for (let i = 0; i < uniqueLinks.length; i += batchSize) {
        batchArr.push(uniqueLinks.slice(i, i + batchSize));
    }
    return batchArr;
}

function renderBatches() {
    batchesList.innerHTML = '';
    batches = calculateBatches();
    distributedBatches = 0;

    if (batches.length === 0) {
        batchesList.innerHTML = `<div class="batch-incomplete-message">Belum ada link yang dikumpulkan.</div>`;
        return;
    }

    batches.forEach((batch, idx) => {
        const isComplete = batch.length === batchSize || (idx === batches.length - 1 && batch.length === threshold % batchSize);
        const batchNum = idx + 1;
        const card = document.createElement('div');
        card.className = 'batch-card';
        card.dataset.batchIndex = batchNum;

        let phoneOptions = phones.map(
            p => `<option value="${p.id}">${p.name} (${p.whatsapp_number})</option>`
        ).join('');

        card.innerHTML = `
            <div class="batch-info">
                <span class="batch-label">Batch ${batchNum}</span>
                <span class="batch-count">${batch.length} link</span>
            </div>
            <div class="batch-actions">
                <label class="dropdown-label">
                    Target HP
                    <select class="dropdown dropdown-hp" data-dropdown="hp">
                        <option value="">Pilih HP</option>
                        ${phoneOptions}
                    </select>
                </label>
                <button class="btn btn-kirim" data-action="kirim-batch" data-batch-index="${batchNum}" ${!isComplete ? 'disabled' : ''}>
                    KIRIM
                </button>
            </div>
        `;

        if (!isComplete) {
            const missing = batchSize - batch.length;
            card.innerHTML += `<div class="batch-incomplete-message">Kurang <span data-missing-links>${missing}</span> link lagi.</div>`;
        }

        batchesList.appendChild(card);
    });
}

function resetAll() {
    allLinks = [];
    threshold = 0;
    batches = [];
    distributedBatches = 0;
    thresholdInput.value = '';
    batchesArea.hidden = true;
    updatePieChart();
    batchesList.innerHTML = '';
    showNotification('Distribusi direset.', 'success');
    // Reset Navbar 1 & 2 if needed
    if (window.Navbar1 && typeof window.Navbar1.reset === 'function') window.Navbar1.reset();
    if (window.Navbar2 && typeof window.Navbar2.reset === 'function') window.Navbar2.reset();
}

// Error display function for Navbar3
function showError(message, details = null) {
    const errorBox = document.querySelector('[data-notifications="navbar3"]');
    if (errorBox) {
        const div = document.createElement('div');
        div.className = 'notification toast error';
        div.textContent = message;
        errorBox.appendChild(div);
        setTimeout(() => div.remove(), 5000);
    }
    console.error('Navbar3 Error:', message, details);
}

function showSuccess(message) {
    const successBox = document.querySelector('[data-notifications="navbar3"]');
    if (successBox) {
        const div = document.createElement('div');
        div.className = 'notification toast success';
        div.textContent = message;
        successBox.appendChild(div);
        setTimeout(() => div.remove(), 4000);
    }
}

// Distribution error handling
async function handleDistribute(batchNumber, phoneId) {
    try {
        if (!navigator.onLine) {
            throw new Error('Tidak ada koneksi internet untuk membuka WhatsApp');
        }

        showLoading('navbar3');

        const response = await apiRequest({
            url: 'backend/api/distribute.php',
            method: 'POST',
            data: {
                session_id: window.Navbar1 ? window.Navbar1.sessionId : '',
                batch_number: batchNumber,
                phone_id: phoneId,
                threshold: batchSize
            }
        });

        if (response.status === 'success') {
            // Open WhatsApp Web
            window.open(response.whatsapp_url, '_blank');
            // Remove batch card with animation
            removeBatch(batchNumber);
            distributedBatches++;
            updatePieChart();
            showSuccess(`Batch ${batchNumber} berhasil dikirim!`);
        } else {
            throw new Error(response.message || 'Gagal distribusi.');
        }

    } catch (error) {
        showError(error.message);
        // Re-enable the send button
        enableBatchButton(batchNumber);
    } finally {
        hideLoading('navbar3');
    }
}

// Batch validation
function validateBatch(batchData) {
    if (!batchData.links || batchData.links.length === 0) {
        throw new Error('Batch tidak memiliki link');
    }

    if (batchData.links.length < threshold) {
        throw new Error(`Batch belum lengkap. Kurang ${threshold - batchData.links.length} link`);
    }
}

// Threshold validation with live feedback
thresholdInput.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);

    if (isNaN(value) || value < 1) {
        e.target.classList.add('error');
        showError('Threshold harus berupa angka positif');
        disableAllBatches();
    } else {
        e.target.classList.remove('error');
        threshold = value;
        recalculateBatches();
    }
});

// Helper to disable all batch send buttons
function disableAllBatches() {
    document.querySelectorAll('.btn-kirim').forEach(btn => btn.disabled = true);
}

// Helper to enable a batch send button
function enableBatchButton(batchNumber) {
    const btn = document.querySelector(`.batch-card[data-batch-index="${batchNumber}"] .btn-kirim`);
    if (btn) btn.disabled = false;
}

// Helper to remove batch card from UI
function removeBatch(batchNumber) {
    const card = document.querySelector(`.batch-card[data-batch-index="${batchNumber}"]`);
    if (card) {
        card.classList.add('removing');
        setTimeout(() => card.remove(), 600);
    }
}

// ======= Event Handlers =======

// Threshold confirm
confirmBtn.addEventListener('click', async () => {
    if (!validateThreshold()) {
        showNotification('Threshold harus berupa angka positif.', 'error');
        return;
    }
    threshold = parseInt(thresholdInput.value, 10);
    if (allLinks.length < threshold) {
        showNotification(`Belum cukup link. Minimal ${threshold} link dibutuhkan.`, 'error');
        return;
    }
    batchesArea.hidden = false;
    updatePieChart();
    renderBatches();
});

// KIRIM batch
batchesList.addEventListener('click', async e => {
    if (e.target.matches('[data-action="kirim-batch"]')) {
        const card = e.target.closest('.batch-card');
        const batchIdx = parseInt(card.dataset.batchIndex, 10) - 1;
        const dropdown = card.querySelector('[data-dropdown="hp"]');
        const phoneId = dropdown.value;
        if (!phoneId) {
            showNotification('Pilih target HP terlebih dahulu.', 'error');
            return;
        }
        e.target.disabled = true;
        e.target.textContent = 'Mengirim...';

        try {
            const resp = await apiRequest({
                url: 'backend/api/distribute.php',
                method: 'POST',
                data: {
                    session_id: window.Navbar1 ? window.Navbar1.sessionId : '',
                    batch_number: batchIdx + 1,
                    phone_id: phoneId,
                    threshold: batchSize
                }
            });
            if (resp.status === 'success') {
                // Open WhatsApp Web
                window.open(resp.whatsapp_url, '_blank');
                // Remove batch card with animation
                card.style.transition = 'opacity 0.5s, transform 0.5s';
                card.style.opacity = 0;
                card.style.transform = 'translateX(60px)';
                setTimeout(() => card.remove(), 600);
                distributedBatches++;
                updatePieChart();
                showNotification(`Batch ${batchIdx + 1} berhasil dikirim ke WhatsApp.`, 'success');
            } else {
                showNotification(resp.message || 'Gagal distribusi.', 'error');
                e.target.disabled = false;
                e.target.textContent = 'KIRIM';
            }
        } catch (err) {
            showNotification(err.message || 'Gagal distribusi.', 'error');
            e.target.disabled = false;
            e.target.textContent = 'KIRIM';
        }
    }
});

// Reset
resetBtn.addEventListener('click', () => {
    if (confirm('Reset semua distribusi dan threshold?')) {
        resetAll();
    }
});

// ======= Initialization =======
async function loadPhones() {
    try {
        phones = await apiRequest({ url: 'backend/api/get-phones.php' });
    } catch {
        phones = [];
        showNotification('Gagal memuat daftar HP.', 'error');
    }
}

// Receive links from Navbar 1
function initialize(batches) {
    allLinks = [];
    batches.forEach(batch => {
        allLinks = allLinks.concat(batch.links);
    });
    updatePieChart();
    batchesArea.hidden = false;
    renderBatches();
}

// This function should be called when Navbar 1 has finished and links are ready
window.Navbar3 = {
    init: async function (links) {
        allLinks = filterUniqueLinks(links);
        await loadPhones();
        updatePieChart();
        batchesArea.hidden = true;
        batchesList.innerHTML = '';
        showNotification('Link siap untuk distribusi.', 'success');
    },
    reset: resetAll,
    initialize,
    drawPieChart,
    validateThreshold,
    handleDistribute,
    reset
};

// ======= Pie Chart Initial State =======
updatePieChart();
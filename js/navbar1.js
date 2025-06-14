// ========== API Client Utility ==========

// Generic AJAX request (GET/POST/PUT/DELETE)
export function apiRequest({ url, method = 'GET', data = null, files = null, onProgress = null }) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                let resp;
                try {
                    resp = JSON.parse(xhr.responseText);
                } catch (e) {
                    return reject({ error: true, message: 'Invalid server response.' });
                }
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(resp);
                } else {
                    reject(resp);
                }
            }
        };

        xhr.onerror = function () {
            reject({ error: true, message: 'Network error.' });
        };

        if (onProgress && xhr.upload) {
            xhr.upload.onprogress = function (e) {
                if (e.lengthComputable) {
                    onProgress(Math.round((e.loaded / e.total) * 100));
                }
            };
        }

        if (files) {
            // File upload with FormData
            const formData = new FormData();
            Object.entries(data || {}).forEach(([k, v]) => formData.append(k, v));
            for (let i = 0; i < files.length; i++) {
                formData.append('csv_files[]', files[i]);
            }
            xhr.send(formData);
        } else if (data) {
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(data));
        } else {
            xhr.send();
        }
    });
}

// Update commission display in product list
function updateCommission(productId, commission) {
    const item = productList.querySelector(`[data-product-id="${productId}"]`);
    if (item) {
        const komisiInput = item.querySelector('[data-komisi]');
        if (komisiInput) komisiInput.value = commission;
    }
}

// Check if all commissions are filled, then show KIRIM button
function enableKirimButton() {
    let allFilled = true;
    const komisiInputs = productList.querySelectorAll('[data-komisi]');
    komisiInputs.forEach(input => {
        if (!input.value.trim()) allFilled = false;
    });
    let kirimBtn = resultsSection.querySelector('[data-action="kirim"]');
    if (!kirimBtn) {
        kirimBtn = document.createElement('button');
        kirimBtn.className = 'btn btn-gradient btn-kirim';
        kirimBtn.dataset.action = 'kirim';
        kirimBtn.textContent = 'KIRIM';
        resultsSection.appendChild(kirimBtn);
        kirimBtn.addEventListener('click', handleKirimClick);
    }
    kirimBtn.disabled = !allFilled;
    kirimBtn.style.display = allFilled ? 'inline-block' : 'none';
}

// Package data and send to Navbar 3 via AppEvents
async function handleKirimClick() {
    const komisiInputs = productList.querySelectorAll('[data-komisi]');
    const updatedProducts = [];
    komisiInputs.forEach((input, idx) => {
        const productId = products[idx].id;
        const commission = input.value.trim();
        updatedProducts.push({ ...products[idx], commission });
    });
    // Save batch to backend and send to Navbar 3
    try {
        showLoading(this, true);
        const resp = await saveBatch(sessionId, updatedProducts, batchCount * 100);
        if (resp && resp.batches) {
            window.Navbar3 && window.Navbar3.initialize(resp.batches);
            showNotification('Batch siap untuk distribusi.', 'success');
        }
        showLoading(this, false);
    } catch (err) {
        showNotification('Gagal menyimpan batch: ' + (err.message || ''), 'error');
        showLoading(this, false);
    }
}

// Clear all data and UI elements
function reset() {
    clearResults();
    selectedFiles = [];
    renderFilePreview([]);
    rankInput.value = '';
    sessionId = null;
    products = [];
    batchCount = 0;
    let kirimBtn = resultsSection.querySelector('[data-action="kirim"]');
    if (kirimBtn) kirimBtn.remove();
    showNotification('Data direset.', 'success');
}

// Error display function
function showError(message, details = null) {
    const errorBox = document.querySelector('[data-error]');
    if (errorBox) {
        errorBox.textContent = message;
        errorBox.hidden = false;
        console.error('Navbar1 Error:', message, details);
        setTimeout(() => {
            errorBox.hidden = true;
        }, 5000);
    } else {
        alert(message);
    }
}

// File upload with error handling
async function handleFileUpload(files) {
    try {
        showLoading('navbar1');

        // Validate files
        for (const file of files) {
            if (!file.name.endsWith('.csv')) {
                throw new Error(`File ${file.name} bukan format CSV`);
            }
            if (file.size > 10485760) {
                throw new Error(`File ${file.name} terlalu besar (max 10MB)`);
            }
        }

        const rankValue = rankInput.value;
        const response = await APIClient.uploadCSV(files, rankValue);

        if (response.status === 'error') {
            throw new Error(response.message);
        }

        // Process success
        displayResults(response.data);

    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading('navbar1');
    }
}

// Connection monitoring
window.addEventListener('offline', () => {
    showError('Koneksi internet terputus');
    disableAllButtons();
});

window.addEventListener('online', () => {
    enableAllButtons();
    showNotification('Koneksi internet kembali normal', 'success');
});

// Helper to disable/enable all buttons in Navbar1
function disableAllButtons() {
    document.querySelectorAll('.navbar1 button, .navbar1 input, .navbar1 select').forEach(el => {
        el.disabled = true;
    });
}
function enableAllButtons() {
    document.querySelectorAll('.navbar1 button, .navbar1 input, .navbar1 select').forEach(el => {
        el.disabled = false;
    });
}

// Expose for integration
window.Navbar1 = {
    updateCommission,
    enableKirimButton,
    handleKirimClick,
    reset,
    sessionId: () => sessionId,
    products: () => products
};
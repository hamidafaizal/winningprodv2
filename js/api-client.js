const API_CONFIG = {
    baseURL: 'backend/api/',
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000
};

const ErrorMessages = {
    network: 'Koneksi internet bermasalah. Silakan coba lagi.',
    timeout: 'Request timeout. Server tidak merespons.',
    server: 'Terjadi kesalahan server. Silakan coba beberapa saat lagi.',
    validation: 'Data yang dimasukkan tidak valid.',
    parse: 'Gagal memproses response dari server.'
};

const NetworkUtils = {
    isOnline: () => navigator.onLine,

    waitForConnection: () => {
        return new Promise((resolve) => {
            if (navigator.onLine) {
                resolve();
            } else {
                const handler = () => {
                    window.removeEventListener('online', handler);
                    resolve();
                };
                window.addEventListener('online', handler);
            }
        });
    }
};

async function fetchWithRetry(url, options = {}, retries = API_CONFIG.maxRetries) {
    try {
        if (!NetworkUtils.isOnline()) {
            throw new Error(ErrorMessages.network);
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), API_CONFIG.timeout);

        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;

    } catch (error) {
        if (retries > 0 && !error.message.includes('abort')) {
            await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay));
            return fetchWithRetry(url, options, retries - 1);
        }
        throw error;
    }
}

// Helper to handle JSON response and errors
async function handleApiResponse(response) {
    try {
        const data = await response.json();
        if (data.status === 'error' || data.error) {
            throw new Error(data.message || data.error || ErrorMessages.server);
        }
        return data;
    } catch (e) {
        throw new Error(ErrorMessages.parse);
    }
}

// Generic API request (GET/POST/PUT/DELETE)
export async function apiRequest({ url, method = 'GET', data = null, files = null, onProgress = null }) {
    let fullUrl = url.startsWith('http') ? url : API_CONFIG.baseURL + url.replace(/^\/+/, '');
    let options = { method, headers: {} };

    if (files) {
        // File upload with FormData
        const formData = new FormData();
        if (data) {
            Object.entries(data).forEach(([k, v]) => formData.append(k, v));
        }
        for (let i = 0; i < files.length; i++) {
            formData.append('csv_files[]', files[i]);
        }
        options.body = formData;
    } else if (data) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(data);
    }

    // Progress for file upload (XHR fallback)
    if (files && onProgress) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(method, fullUrl, true);

            xhr.upload.onprogress = function (e) {
                if (e.lengthComputable) {
                    onProgress(Math.round((e.loaded / e.total) * 100));
                }
            };

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    try {
                        const resp = JSON.parse(xhr.responseText);
                        if (xhr.status >= 200 && xhr.status < 300) {
                            if (resp.status === 'error' || resp.error) {
                                reject(new Error(resp.message || resp.error || ErrorMessages.server));
                            } else {
                                resolve(resp);
                            }
                        } else {
                            reject(new Error(resp.message || ErrorMessages.server));
                        }
                    } catch {
                        reject(new Error(ErrorMessages.parse));
                    }
                }
            };

            xhr.onerror = function () {
                reject(new Error(ErrorMessages.network));
            };

            xhr.send(options.body);
        });
    }

    // Fetch with retry and error handling
    try {
        const response = await fetchWithRetry(fullUrl, options);
        return await handleApiResponse(response);
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error(ErrorMessages.timeout);
        }
        if (error.message.includes('No internet')) {
            throw new Error(ErrorMessages.network);
        }
        throw error;
    }
}

// Save batch to backend
export async function saveBatch(sessionId, products, threshold) {
    try {
        return await apiRequest({
            url: 'save-batch.php',
            method: 'POST',
            data: { session_id: sessionId, products, threshold }
        });
    } catch (error) {
        throw new Error(error.message || ErrorMessages.server);
    }
}

// Update commission for a product
export async function updateCommission(productId, commission) {
    try {
        return await apiRequest({
            url: 'update-commission.php',
            method: 'POST',
            data: { product_id: productId, commission }
        });
    } catch (error) {
        throw new Error(error.message || ErrorMessages.server);
    }
}

// Get session progress
export async function getSessionProgress(sessionId) {
    try {
        return await apiRequest({
            url: `session-progress.php?session_id=${encodeURIComponent(sessionId)}`,
            method: 'GET'
        });
    } catch (error) {
        throw new Error(error.message || ErrorMessages.server);
    }
}
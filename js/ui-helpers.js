// Show loading overlay for a navbar section
export function showLoading(navbarId) {
    const navbar = document.getElementById(navbarId) || document.querySelector(`#${navbarId}, .${navbarId}`);
    if (!navbar) return;
    let overlay = navbar.querySelector('.loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'loading-overlay active';
        overlay.innerHTML = `<div class="loading-spinner"></div>`;
        navbar.appendChild(overlay);
    }
    overlay.classList.add('active');
}

// Hide loading overlay for a navbar section
export function hideLoading(navbarId) {
    const navbar = document.getElementById(navbarId) || document.querySelector(`#${navbarId}, .${navbarId}`);
    if (!navbar) return;
    const overlay = navbar.querySelector('.loading-overlay');
    if (overlay) overlay.classList.remove('active');
}

// Show notification (success, error, info)
export function showNotification(message, type = 'info') {
    let notifications = document.querySelector('.notifications');
    if (!notifications) {
        notifications = document.createElement('div');
        notifications.className = 'notifications';
        document.body.appendChild(notifications);
    }
    const toast = document.createElement('div');
    toast.className = `notification toast ${type}`;
    toast.textContent = message;
    notifications.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// Animate commission update in Navbar 1
export function animateCommissionUpdate(productId) {
    const input = document.querySelector(`[data-product-id="${productId}"] [data-komisi]`);
    if (input) {
        input.classList.add('updated');
        setTimeout(() => input.classList.remove('updated'), 1200);
    }
}

// Animate batch card removal in Navbar 3
export function animateBatchRemoval(batchId) {
    const card = document.querySelector(`.batch-card[data-batch-index="${batchId}"]`);
    if (card) {
        card.classList.add('removing');
        setTimeout(() => card.remove(), 600);
    }
}

// Update pie chart progress (current: collected, total: threshold)
export function updatePieChart(current, total) {
    const chartValue = document.querySelector('.chart-value');
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    if (chartValue) chartValue.textContent = `${percent}%`;

    // Optionally update canvas if present
    const canvas = document.querySelector('.progress-chart canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Background circle
        ctx.beginPath();
        ctx.arc(55, 55, 48, 0, 2 * Math.PI);
        ctx.strokeStyle = '#1e3c72';
        ctx.lineWidth = 12;
        ctx.globalAlpha = 0.18;
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Progress arc
        const percentArc = Math.min(current / total, 1);
        ctx.beginPath();
        ctx.arc(55, 55, 48, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * percentArc);
        ctx.strokeStyle = '#6dd5ed';
        ctx.lineWidth = 12;
        ctx.shadowColor = '#6dd5ed';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
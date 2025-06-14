// ===============================
// Helper: Load external HTML into a container
// ===============================
function loadComponent(containerId, htmlPath) {
  const container = document.getElementById(containerId);
  if (!container) return;
  fetch(htmlPath, { cache: "no-store" })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    })
    .then(html => {
      container.innerHTML = html;
    })
    .catch(error => {
      container.innerHTML = `<div class="notification toast">Gagal memuat komponen: ${htmlPath}</div>`;
      console.error(`Error loading ${htmlPath}:`, error);
    });
}

// ===============================
// Modular: Prepare per-navbar logic objects
// ===============================
window.Navbar1 = {
  // Add Navbar 1 logic here (event handlers, filtering, etc)
};
window.Navbar2 = {
  // Add Navbar 2 logic here (event handlers, progress, etc)
};
window.Navbar3 = {
  // Add Navbar 3 logic here (event handlers, WhatsApp, etc)
};

// ===============================
// Main: Load all navbars after window loads
// ===============================
window.onload = function () {
  // Load Navbar 1
  loadComponent('navbar1-container', 'components/navbar1.html').then(() => {
    // Init Navbar 1 logic here if needed
    // window.Navbar1.init && window.Navbar1.init();
  });

  // Load Navbar 2
  loadComponent('navbar2-container', 'components/navbar2.html').then(() => {
    // Init Navbar 2 logic here if needed
    // window.Navbar2.init && window.Navbar2.init();
  });

  // Load Navbar 3
  loadComponent('navbar3-container', 'components/navbar3.html').then(() => {
    // Init Navbar 3 logic here if needed
    // window.Navbar3.init && window.Navbar3.init();
  });
};

// ===============================
// Export helper for global use
// ===============================
window.loadComponent = loadComponent;

// ===============================
// End of main.js
//
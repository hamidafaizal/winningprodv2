// File: js/main.js
// Tambahkan di bagian bawah setelah window.onload

// Global state management
window.AppState = {
  currentSessionId: null,
  navbar1Data: null,
  navbar2Progress: {
    currentBatch: 1,
    currentScreenshot: 1,
    totalBatches: 0
  },
  navbar3Data: {
    threshold: 0,
    batches: []
  }
};

// Inter-navbar communication
window.AppEvents = {
  // Navbar 1 -> Navbar 2: After CSV processed
  onCSVProcessed: function(data) {
    window.AppState.currentSessionId = data.session_id;
    window.AppState.navbar1Data = data;
    window.Navbar2.initialize(data);
  },
  
  // Navbar 2 -> Navbar 1: Update commission
  onCommissionApproved: function(productId, commission) {
    window.Navbar1.updateCommission(productId, commission);
  },
  
  // Navbar 1 -> Navbar 3: Send links for distribution
  onSendToDistribution: function(data) {
    window.AppState.navbar3Data.batches = data.batches;
    window.Navbar3.initialize(data);
    window.Navbar1.reset();
    window.Navbar2.reset();
  }
};

// Initialize sequence
window.addEventListener('DOMContentLoaded', function() {
  // Initialize all navbars with proper state management
  if (window.Navbar1) window.Navbar1.init();
  if (window.Navbar2) window.Navbar2.init();
  if (window.Navbar3) window.Navbar3.init();
});
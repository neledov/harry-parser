import { HARSocketClient } from './core/har-socket-client.js';

const initializeHarSocket = async () => {
    const requestDetail = document.getElementById('request-detail');
    if (!requestDetail) return;
    
    const filename = requestDetail.dataset.filename;
    window.harSocket = new HARSocketClient();
    
    await window.harSocket.init();
    await window.harSocket.requestHARData(filename);
    
    const progressContainer = document.querySelector('.progress-container');
    if (progressContainer) {
        progressContainer.classList.remove('hidden');
    }
};

const handleLoadingStates = () => {
    const loadingOverlay = document.getElementById('page-loading-spinner');
    
    if (loadingOverlay) {
        // Initial state
        loadingOverlay.style.display = 'flex';
        
        // Hide when DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            loadingOverlay.style.display = 'none';
        });
        
        // Show on navigation start
        document.addEventListener('beforeunload', () => {
            loadingOverlay.style.display = 'flex';
        });
        
        // Handle page visibility
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                document.body.style.opacity = '1';
            }
        });
    }
};

// Initialize everything when page loads
window.addEventListener('load', async () => {
    handleLoadingStates();
    await initializeHarSocket();
});

// Clean up before unload
window.addEventListener('beforeunload', () => {
    if (window.harSocket) {
        window.harSocket.disconnect();
    }
});

// Handle resource loading completion
window.addEventListener('load', () => {
    document.body.style.opacity = '1';
    const loadingOverlay = document.getElementById('page-loading-spinner');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
});

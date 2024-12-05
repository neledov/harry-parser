import { HARSocketClient } from './websocket.js';

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

window.addEventListener('load', async () => {
    await initializeHarSocket();
    
    // Setup WebSocket reconnection handling
    if (window.harSocket) {
        window.harSocket.socket.on('disconnect', () => {
            const progressText = document.querySelector('.progress-text');
            if (progressText) {
                progressText.textContent = 'Reconnecting...';
            }
        });
        
        window.harSocket.socket.on('connect', () => {
            const progressText = document.querySelector('.progress-text');
            if (progressText) {
                progressText.textContent = 'Connected';
            }
        });
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.harSocket) {
        window.harSocket.disconnect();
    }
});

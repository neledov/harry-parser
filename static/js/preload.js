import { HARSocketClient } from './websocket.js';

window.addEventListener('load', () => {
    const requestDetail = document.getElementById('request-detail');
    if (!requestDetail) return;
    
    const filename = requestDetail.dataset.filename;
    window.harSocket = new HARSocketClient();
    window.harSocket.requestHARData(filename);
    
    // Initialize progress tracking
    const progressContainer = document.querySelector('.progress-container');
    if (progressContainer) {
        progressContainer.classList.remove('hidden');
    }
    
    // Setup WebSocket reconnection handling
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
});

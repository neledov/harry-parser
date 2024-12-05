import { showToast } from './utils/helpers.js';
import { generateRequestListItem } from './utils/html.js';

export class HARSocketClient {
    constructor() {
        this.socket = io();
        this.dataCache = {};
        this.setupListeners();
        this.showLoadingOverlay();
    }

    showLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'flex';
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    setupListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to WebSocket');
            document.querySelector('.progress-text').textContent = 'Connected';
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket');
            document.querySelector('.progress-text').textContent = 'Reconnecting...';
        });

        this.socket.on('har_data_chunk', (data) => {
            this.handleDataChunk(data);
        });

        this.socket.on('error', (error) => {
            showToast(error.message, 3000);
        });
    }

    handleDataChunk(data) {
        const { chunk, progress, isLast, totalEntries } = data;
        
        // Update progress bar
        const progressBar = document.querySelector('.progress-bar');
        const progressText = document.querySelector('.progress-text');
        if (progressBar && progressText) {
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `Loading: ${Math.round(progress)}%`;
        }

        // Cache the received chunk and update request list
        const requestList = document.getElementById('request-list');
        if (requestList) {
            chunk.forEach((entry, index) => {
                const globalIndex = Object.keys(this.dataCache).length;
                this.dataCache[globalIndex] = {
                    request: entry.request,
                    response: entry.response,
                    timings: entry.timings
                };
                
                const li = document.createElement('li');
                li.dataset.index = globalIndex;
                li.dataset.statusCode = entry.response.status;
                li.dataset.contentType = entry.response.content?.mimeType || '';
                
                if (entry.response.status >= 400) {
                    li.classList.add('error-request');
                }
                
                // Add SAML detection
                if (window.HARRY.utils.saml.isRequest(entry.request) || 
                    window.HARRY.utils.saml.isResponse(entry.response)) {
                    li.classList.add('saml-request');
                }
                
                li.innerHTML = generateRequestListItem(entry);
                requestList.appendChild(li);
            });
        }

        if (isLast) {
            this.hideLoadingOverlay();
            document.querySelector('.progress-container').classList.add('hidden');
            window.requestCache = this.dataCache;
            
            // Apply any active filters after loading
            if (window.HARRY.handlers.filterRequests) {
                window.HARRY.handlers.filterRequests();
            }
        }
    }

    requestHARData(filename) {
        this.socket.emit('request_har_data', { filename });
        
        // Show progress container
        const progressContainer = document.querySelector('.progress-container');
        if (progressContainer) {
            progressContainer.classList.remove('hidden');
            document.querySelector('.progress-text').textContent = 'Loading...';
        }
    }

    disconnect() {
        this.socket.disconnect();
    }
}

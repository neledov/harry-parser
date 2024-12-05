import { showToast } from './utils/helpers.js';
import { generateRequestListItem } from './utils/html.js';

export class HARSocketClient {
    constructor() {
        this.socket = io({
            transports: ['websocket'],
            upgrade: false,
            forceNew: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            headers: {
                'Accept-Encoding': 'gzip, deflate'
            },
            perMessageDeflate: {
                threshold: 1024
            }
        });
        this.dataCache = {};
        this.currentIndex = 0;
        this.batchSize = 5;
        this.renderQueue = [];
        this.isRendering = false;
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
        const { chunk, progress, isLast } = data;
        this.updateProgressBar(progress);
        
        for (let i = 0; i < chunk.length; i += this.batchSize) {
            const batch = chunk.slice(i, i + this.batchSize);
            this.renderQueue.push(batch);
        }

        if (!this.isRendering) {
            this.processRenderQueue();
        }

        if (isLast) {
            this.finalizeLoading();
        }
    }

    updateProgressBar(progress) {
        const progressBar = document.querySelector('.progress-bar');
        const progressText = document.querySelector('.progress-text');
        if (progressBar && progressText) {
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `Loading: ${Math.round(progress)}%`;
        }
    }

    processRenderQueue() {
        this.isRendering = true;
        
        if (this.renderQueue.length === 0) {
            this.isRendering = false;
            return;
        }

        const batch = this.renderQueue.shift();
        requestAnimationFrame(() => {
            this.processBatch(batch);
            setTimeout(() => this.processRenderQueue(), 0);
        });
    }

    processBatch(batch) {
        const requestList = document.getElementById('request-list');
        if (!requestList) return;

        const fragment = document.createDocumentFragment();

        batch.forEach((entry, index) => {
            const globalIndex = this.currentIndex + index;
            this.dataCache[globalIndex] = {
                request: entry.request,
                response: entry.response,
                timings: entry.timings
            };
            
            const li = document.createElement('li');
            li.dataset.index = globalIndex;
            li.dataset.statusCode = entry.response?.status || '';
            li.dataset.contentType = entry.response?.content?.mimeType || '';
            
            if (entry.response?.status >= 400) {
                li.classList.add('error-request');
            }
            
            if (window.HARRY.utils.saml.isRequest(entry.request) || 
                window.HARRY.utils.saml.isResponse(entry.response)) {
                li.classList.add('saml-request');
            }
            
            li.innerHTML = generateRequestListItem(entry);
            fragment.appendChild(li);
        });

        requestList.appendChild(fragment);
        this.currentIndex += batch.length;
    }

    finalizeLoading() {
        this.hideLoadingOverlay();
        document.querySelector('.progress-container').classList.add('hidden');
        window.requestCache = this.dataCache;
        
        if (window.HARRY.handlers.filterRequests) {
            window.HARRY.handlers.filterRequests();
        }
    }

    requestHARData(filename) {
        this.socket.emit('request_har_data', { filename });
        
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

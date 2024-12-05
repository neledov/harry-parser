import { showToast } from './utils/helpers.js';
import { generateRequestListItem } from './utils/html.js';
import { HarDatabase } from './utils/db.js';

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
                threshold: 512,
                zlibInflateOptions: {
                    chunkSize: 16 * 1024
                },
                zlibInflateOptions: {
                    level: 9,
                    memLevel: 9
                }
            }
        });
        this.dataCache = {};
        this.currentIndex = 0;
        this.batchSize = 3;
        this.renderQueue = [];
        this.isRendering = false;
        this.setupListeners();
        this.showLoadingOverlay();
    }

    async init() {
        return new Promise((resolve) => {
            this.socket.on('connect', () => {
                console.log('Connected to WebSocket');
                const progressText = document.querySelector('.progress-text');
                if (progressText) {
                    progressText.textContent = 'Connected';
                }
                resolve();
            });
        });
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
        this.socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket');
            const progressText = document.querySelector('.progress-text');
            if (progressText) {
                progressText.textContent = 'Reconnecting...';
            }
        });

        this.socket.on('har_data_chunk', async (data) => {
            await this.handleDataChunk(data);
        });

        this.socket.on('error', (error) => {
            showToast(error.message, 3000);
        });
    }

    async handleDataChunk(data) {
        const { chunk, progress, isLast } = data;
        this.updateProgressBar(progress);
        
        if (Array.isArray(chunk) && chunk.length > 0) {
            // Store all chunks in IndexedDB
            await HarDatabase.storeHarData(window.filename, chunk);
            
            for (let i = 0; i < chunk.length; i += this.batchSize) {
                const batch = chunk.slice(i, i + this.batchSize);
                this.renderQueue.push(batch);
                
                if (!this.isRendering) {
                    await this.processRenderQueue();
                }
            }
        }

        if (isLast) {
            await this.finalizeLoading();
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

    async processRenderQueue() {
        this.isRendering = true;
        
        while (this.renderQueue.length > 0) {
            const batch = this.renderQueue.shift();
            await new Promise(resolve => {
                requestAnimationFrame(async () => {
                    await this.processBatch(batch);
                    resolve();
                });
            });
        }

        this.isRendering = false;
    }

    async processBatch(batch) {
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

    async finalizeLoading() {
        this.hideLoadingOverlay();
        const progressContainer = document.querySelector('.progress-container');
        if (progressContainer) {
            progressContainer.classList.add('hidden');
            const progressText = document.querySelector('.progress-text');
            const progressBar = document.querySelector('.progress-bar');
            if (progressText) progressText.textContent = '';
            if (progressBar) progressBar.style.width = '0%';
        }
        window.requestCache = this.dataCache;
        
        if (window.HARRY.handlers.filterRequests) {
            window.HARRY.handlers.filterRequests();
        }
    }

    async requestHARData(filename) {
        try {
            const cachedData = await HarDatabase.getHarData(filename);
            if (cachedData && cachedData.length > 0) {
                const progressContainer = document.querySelector('.progress-container');
                if (progressContainer) {
                    progressContainer.classList.remove('hidden');
                    document.querySelector('.progress-text').textContent = 'Loading from cache...';
                    console.log('Loading from the cache...')
                }
    
                const totalEntries = cachedData.length;
                let processedEntries = 0;
    
                for (let i = 0; i < cachedData.length; i += this.batchSize) {
                    const chunk = cachedData.slice(i, i + this.batchSize);
                    processedEntries += chunk.length;
                    
                    await this.handleDataChunk({
                        chunk,
                        progress: (processedEntries / totalEntries) * 100,
                        isLast: processedEntries === totalEntries
                    });
                }
                return;
            }
    
            this.socket.emit('request_har_data', { filename });
            const progressContainer = document.querySelector('.progress-container');
            if (progressContainer) {
                progressContainer.classList.remove('hidden');
                document.querySelector('.progress-text').textContent = 'Loading from server...';
                console.log('Loading from the server...')
            }
        } catch (error) {
            console.error('Cache retrieval failed:', error);
            this.socket.emit('request_har_data', { filename });
        }
    }
    

    disconnect() {
        this.socket.disconnect();
    }
}

import { showToast } from '../core/common-utils.js';
import { generateRequestListItem } from '../renderers/request-detail-renderer.js';
import { HarDatabase } from '../core/indexed-db-manager.js';

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
        this.batchSize = 25;
        this.renderQueue = [];
        this.isRendering = false;
        this.startTime = null;
        this.activeConnections = new Map();
        this.maxConnections = 6;
        this.setupListeners();
        this.showLoadingOverlay();
    }

    async init() {
        return new Promise((resolve) => {
            this.socket.on('connect', () => {
                console.log('Connected to WebSocket');
                const loadingText = document.querySelector('.loading-overlay .loading-text');
                if (loadingText) {
                    loadingText.textContent = 'connected to WSS';
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
            const loadingText = document.querySelector('.loading-overlay .loading-text');
            if (loadingText) {
                loadingText.textContent = 'Reconnecting...';
            }
        });

        this.socket.on('connect', () => {
            const loadingText = document.querySelector('.loading-overlay .loading-text');
            if (loadingText) {
                loadingText.textContent = 'connected to WSS';
            }
        });

        this.socket.on('har_data_chunk', async (data) => {
            await this.handleDataChunk({...data, fromCache: false});
        });

        this.socket.on('error', (error) => {
            showToast(error.message, 3000);
        });
    }

    calculateConcurrentConnections(timestamp, timings = {}) {
        const current = new Date(timestamp);

        // Remove expired connections
        for (const [key, conn] of this.activeConnections) {
            if (conn.end < current) {
                this.activeConnections.delete(key);
            }
        }

        const currentlyQueued = [];
        const currentlyActive = [];

        for (const conn of this.activeConnections.values()) {
            // If current time is before active start, it's queued (blocked)
            if (current >= conn.originalStart && current < conn.start) {
                currentlyQueued.push(conn);
            } else if (current >= conn.start && current <= conn.end) {
                currentlyActive.push(conn);
            }
        }

        const totalActive = currentlyActive.length;
        const totalQueued = currentlyQueued.length;
        const isAtLimit = totalActive >= this.maxConnections;
        const blockedTime = timings.blocked || 0;
        const queuedTime = isAtLimit ? blockedTime : 0;

        const reason = getBlockedReason(timings, isAtLimit);

        return {
            concurrent: Math.max(1,totalActive),
            queued: queuedTime,
            blocked: blockedTime - queuedTime,
            atLimit: isAtLimit,
            reason,
            activeConnections: {
                total: totalActive + totalQueued,
                blocked: totalQueued,
                queued: totalQueued
            },
            browserLimit: this.maxConnections
        };
    }

    async handleDataChunk(data) {
        const { chunk, progress, isLast, fromCache } = data;

        const currentTime = Date.now();
        if (!this.startTime) {
            this.startTime = currentTime;
        }

        const elapsed = (currentTime - this.startTime) / 1000;
        const percentComplete = progress / 100;
        const estimatedTotal = elapsed / percentComplete;
        const remaining = Math.ceil(estimatedTotal - elapsed);

        const timeText = document.querySelector('.loading-overlay .time-remaining');
        if (timeText) {
            timeText.textContent = formatTimeRemaining(remaining);
        }

        this.updateProgressBar(progress);

        if (Array.isArray(chunk) && chunk.length > 0) {
            for (let entry of chunk) {
                const timestamp = entry.startedDateTime;
                const duration = Object.values(entry.timings)
                    .reduce((sum, time) => sum + (time > 0 ? time : 0), 0);

                const blockedTime = entry.timings.blocked > 0 ? entry.timings.blocked : 0;
                const originalStart = new Date(timestamp);
                const startActive = new Date(originalStart.getTime() + blockedTime);
                const activeDuration = duration - blockedTime;
                const end = new Date(startActive.getTime() + activeDuration);

                this.activeConnections.set(timestamp, {
                    originalStart: originalStart,
                    start: startActive,
                    end: end,
                    blocked: blockedTime
                });

                entry.connectionInfo = this.calculateConcurrentConnections(timestamp, entry.timings);
            }

            if (!fromCache) {
                await HarDatabase.storeHarData(window.filename, chunk);
            }

            this.renderQueue.push(chunk);
            if (!this.isRendering) {
                await this.processRenderQueue();
            }
            this.currentIndex += chunk.length;
        }

        if (isLast) {
            await this.finalizeLoading();
        }
    }

    updateProgressBar(progress) {
        const circle = document.querySelector('.loading-overlay .circular-progress .progress');
        const text = document.querySelector('.loading-overlay .circular-progress .progress-text');

        if (circle && text) {
            const circumference = 2 * Math.PI * 45;
            const offset = circumference - (progress / 100) * circumference;
            circle.style.strokeDasharray = `${circumference} ${circumference}`;
            circle.style.strokeDashoffset = offset;
            text.textContent = `${Math.round(progress)}%`;
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
            const globalIndex = this.currentIndex - batch.length + index;
            this.dataCache[globalIndex] = {
                request: entry.request,
                response: entry.response,
                timings: entry.timings,
                connectionInfo: entry.connectionInfo
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
    }

    async finalizeLoading() {
        this.hideLoadingOverlay();
        window.requestCache = this.dataCache;

        if (window.HARRY.handlers.filterRequests) {
            window.HARRY.handlers.filterRequests();
        }
    }

    async requestHARData(filename) {
        try {
            const cachedData = await HarDatabase.getHarData(filename);
            const loadingText = document.querySelector('.loading-overlay .loading-text');

            if (cachedData && cachedData.length > 0) {
                if (loadingText) {
                    loadingText.textContent = 'loading from cache...';
                }

                const totalEntries = cachedData.length;
                let processedEntries = 0;

                for (let i = 0; i < totalEntries; i += this.batchSize) {
                    const chunk = cachedData.slice(i, i + this.batchSize);
                    processedEntries += chunk.length;

                    await this.handleDataChunk({
                        chunk,
                        progress: (processedEntries / totalEntries) * 100,
                        isLast: processedEntries === totalEntries,
                        fromCache: true
                    });
                }
                return;
            }

            if (loadingText) {
                loadingText.textContent = 'loading from server...';
            }
            this.socket.emit('request_har_data', { filename });

        } catch (error) {
            console.error('Cache retrieval failed:', error);
            this.socket.emit('request_har_data', { filename });
        }
    }

    disconnect() {
        this.socket.disconnect();
    }
}

function formatTimeRemaining(seconds) {
    const s = Math.round(Number(seconds));
    if (s < 60) {
        return `${s} second${s === 1 ? '' : 's'} remaining`;
    } else if (s < 3600) {
        const minutes = Math.round(s / 60);
        return `${minutes} minute${minutes === 1 ? '' : 's'} remaining`;
    } else {
        const hours = Math.round(s / 3600);
        return `${hours} hour${hours === 1 ? '' : 's'} remaining`;
    }
}

/**
 * Determine the reason for blocked or queued requests.
 * @param {Object} timings - The HAR timings object.
 * @param {Boolean} atLimit - Indicates if the browser’s connection limit is reached.
 * @returns {String} - The reason for being blocked/queued.
 */
function getBlockedReason(timings, atLimit) {
    // If we hit the connection limit, that’s the primary reason
    if (atLimit) {
        return 'Browser connection limit reached';
    }

    // If not at the limit, check DNS, SSL, or connect delays
    if ((timings.dns || 0) > 0) {
        return 'Waiting for DNS resolution';
    }
    if ((timings.ssl || 0) > 0) {
        return 'Waiting for SSL/TLS handshake';
    }
    if ((timings.connect || 0) > 0) {
        return 'Waiting for TCP connection';
    }

    // Fallback reason
    return 'Other blocked reason (possibly browser scheduling)';
}

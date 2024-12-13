export const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
};

export const escapeHTML = (str) => {
    const safeStr = str ?? "";
    const chars = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" };
    return safeStr.replace(/[&<>'"]/g, tag => chars[tag] || tag);
};

export const copyToClipboard = async (text) => {
    await navigator.clipboard.writeText(decodeURIComponent(text));
    showToast("Copied to clipboard!");
};

export const showToast = (message, duration = 2000) => {
    const toast = document.createElement("div");
    toast.className = "copy-message";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
};

export const formatJSON = (jsonString) => {
    try {
        return JSON.stringify(JSON.parse(jsonString), null, 2);
    } catch {
        return String(jsonString);
    }
};

export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const clearIndexedDBCache = async () => {
    const databases = await window.indexedDB.databases();
    for (const db of databases) {
        window.indexedDB.deleteDatabase(db.name);
    }
    showToast('Cache cleared successfully');
};

export const calculateBandwidth = (entry) => {
    // Get response size with fallbacks
    const responseSize = entry?.response?.content?.size || 
                        entry?.response?.bodySize || 
                        entry?.response?.headersSize ||
                        entry?.response?.content?.compression || 0;
    
    const timings = entry?.timings || {};
    
    // Calculate total transfer time considering all relevant phases
    const send = Math.max(0, timings.send || 0);
    const receive = Math.max(0, timings.receive || 0);
    const wait = Math.max(0, timings.wait || 0);
    const connect = Math.max(0, timings.connect || 0);
    const ssl = Math.max(0, timings.ssl || 0);
    
    // Calculate effective transfer time based on protocol
    const isHTTP2 = entry?.response?.httpVersion?.includes('2');
    const transferTime = isHTTP2 ? 
        // For HTTP/2, consider multiplexing
        Math.max(receive, send) :
        // For HTTP/1.x, sum sequential transfers
        send + receive;
    
    // Guard against invalid values
    if (!transferTime || transferTime <= 0 || !responseSize) {
        return '0 bps';
    }

    // Calculate bits per second considering protocol overhead
    const protocolOverhead = isHTTP2 ? 1.02 : 1.1; // 2% for HTTP/2, 10% for HTTP/1.x
    const bitsPerSecond = (responseSize * 8 * protocolOverhead) / (transferTime / 1000);
    
    return formatBandwidth(bitsPerSecond);
};


export const formatBandwidth = (bps) => {
    const units = ['bps', 'Kbps', 'Mbps', 'Gbps'];
    let value = Math.abs(bps);
    let unitIndex = 0;
    
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }
    
    // Handle edge cases and format number
    if (!Number.isFinite(value)) return '0 bps';
    
    return `${value.toFixed(1)} ${units[unitIndex]}`;
};

export const isSuspiciousRequest = (request, timings, connectionInfo) => {
    const statusCode = parseInt(request.status);
    const totalTime = timings ? 
        Object.values(timings).reduce((a, b) => a + Math.max(0, b), 0) : 0;
    
    return statusCode >= 400 || 
           !request.status || 
           totalTime > 2000 || 
           (connectionInfo && connectionInfo.concurrent >= 6);
};

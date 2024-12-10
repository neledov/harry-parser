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
    // Extract all relevant timing and size data
    const responseSize = entry?.response?.content?.size || 
                        entry?.response?.bodySize || 
                        entry?.response?.headersSize || 0;
                        
    const timings = entry?.timings || {};
    
    // Get all relevant transfer phases
    const send = Math.max(0, timings.send || 0);
    const receive = Math.max(0, timings.receive || 0);
    const wait = Math.max(0, timings.wait || 0);
    
    // Calculate total transfer time, excluding DNS/Connect phases
    const transferTime = send + receive;
    
    // Guard against division by zero or invalid values
    if (!transferTime || transferTime <= 0 || !responseSize) {
        return '0 bps';
    }

    // Calculate bits per second
    const bitsPerSecond = (responseSize * 8) / (transferTime / 1000);
    
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

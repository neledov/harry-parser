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
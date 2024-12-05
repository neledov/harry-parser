// Import all utilities and handlers
import { createTimelineChart } from './visualization/chart.js';
import { decodeCertificate } from './utils/certificate-analyzer.js';
import { generateCurlCommand } from './utils/curl.js';
import { handleEncryptedAssertion } from './utils/encryption-handler.js';
import { debounce, escapeHTML, copyToClipboard, showToast, formatJSON } from './utils/helpers.js';
import { generateDetailHTML, generateSamlSection } from './utils/html.js';
import { analyzeSamlSecurity } from './utils/saml-analyzer.js';
import { isSamlRequest, isSamlResponse } from './utils/saml-detector.js';
import { decodeSamlMessage, parseSamlXml } from './utils/saml.js';
import { validateXmlSignature } from './utils/signature-validator.js';
import { loadRequestDetail, filterRequests, deleteFile, renderRequestDetail, updateSelectedRequest } from './handlers/requests.js';
import { HarDatabase } from './utils/db.js';

// Cache container
window.requestCache = null;

// Performance optimized initialization
const initializeSearchFeatures = () => {
    const searchInput = document.getElementById("search");
    if (searchInput) {
        searchInput.addEventListener("input", debounce(filterRequests, 300));
    }
};

const setupEventListeners = () => {
    const requestList = document.getElementById("request-list");
    if (requestList) {
        requestList.addEventListener("click", e => {
            const item = e.target.closest("li[data-index]");
            if (item && requestList.contains(item)) {
                loadRequestDetail(item.dataset.index);
            }
        });
    }

    ["method-filter", "status-filter", "content-type-filter", "error-only", "saml-only"].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener("change", filterRequests);
        }
    });

    const filesList = document.getElementById("files-list");
    if (filesList) {
        filesList.addEventListener("click", e => {
            const deleteBtn = e.target.closest(".delete-btn");
            if (deleteBtn) deleteFile(deleteBtn.dataset.filename);
        });
    }

    document.addEventListener('keydown', e => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            navigateRequests(e.key === 'ArrowUp' ? -1 : 1);
        }
    });
};

// Initialize application with performance optimization and IndexedDB
document.addEventListener('DOMContentLoaded', async () => {
    const requestDetail = document.getElementById("request-detail");
    if (requestDetail) {
        window.filename = requestDetail.dataset.filename;
    }

    // Initialize IndexedDB
    await HarDatabase.init();
    await HarDatabase.clearOldData();

    if (window.location.pathname.startsWith("/processing/")) {
        const filename = window.location.pathname.split("/").pop();
        if (filename) {
            setTimeout(() => {
                window.location.href = `/requests/${encodeURIComponent(filename)}`;
            }, 2000);
        }
    }
});

// Performance optimized readystate handler
const readyStateHandler = debounce((event) => {
    if (document.readyState === 'interactive') {
        document.getElementById('page-loading-spinner').style.display = 'none';
    }
    if (document.readyState === 'complete') {
        initializeSearchFeatures();
        setupEventListeners();
    }
}, 50);

document.addEventListener('readystatechange', readyStateHandler);

// Navigation helper
function navigateRequests(direction) {
    const visibleRequests = Array.from(document.querySelectorAll('#request-list li:not([style*="display: none"])'));
    const currentSelected = document.querySelector('#request-list li.selected');
    
    if (!visibleRequests.length) return;
    
    let nextIndex = 0;
    if (currentSelected) {
        const currentIndex = visibleRequests.indexOf(currentSelected);
        nextIndex = (currentIndex + direction + visibleRequests.length) % visibleRequests.length;
    }
    
    const nextRequest = visibleRequests[nextIndex];
    if (nextRequest && nextRequest.dataset.index) {
        loadRequestDetail(nextRequest.dataset.index);
    }
}

// Export all utilities for global access
window.HARRY = {
    chart: { createTimelineChart },
    utils: {
        certificate: { decodeCertificate },
        curl: { generateCurlCommand },
        encryption: { handleEncryptedAssertion },
        helpers: { debounce, escapeHTML, copyToClipboard, showToast, formatJSON },
        html: { generateDetailHTML, generateSamlSection },
        saml: {
            analyzeSecurity: analyzeSamlSecurity,
            isRequest: isSamlRequest,
            isResponse: isSamlResponse,
            decode: decodeSamlMessage,
            parse: parseSamlXml,
            validateSignature: validateXmlSignature
        }
    },
    handlers: {
        loadRequestDetail,
        filterRequests,
        deleteFile,
        renderRequestDetail,
        updateSelectedRequest
    },
    performance: {
        readyStateHandler
    },
    db: HarDatabase
};

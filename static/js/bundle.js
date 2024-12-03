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

// Cache container
window.requestCache = null;

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    const requestDetail = document.getElementById("request-detail");
    if (requestDetail) {
        window.filename = requestDetail.dataset.filename;
    }

    // Setup request list handlers
    const requestList = document.getElementById("request-list");
    if (requestList) {
        requestList.addEventListener("click", e => {
            const item = e.target.closest("li[data-index]");
            if (item && requestList.contains(item)) {
                loadRequestDetail(item.dataset.index);
            }
        });
    }

    // Setup filters
    ["method-filter", "status-filter", "content-type-filter", "error-only", "saml-only"].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener("change", filterRequests);
        }
    });

    // Setup search with debounce
    const searchInput = document.getElementById("search");
    if (searchInput) {
        searchInput.addEventListener("input", debounce(filterRequests, 300));
    }

    // Setup file deletion
    const filesList = document.getElementById("files-list");
    if (filesList) {
        filesList.addEventListener("click", e => {
            const deleteBtn = e.target.closest(".delete-btn");
            if (deleteBtn) deleteFile(deleteBtn.dataset.filename);
        });
    }

    // Handle processing redirect
    if (window.location.pathname.startsWith("/processing/")) {
        const filename = window.location.pathname.split("/").pop();
        if (filename) {
            setTimeout(() => {
                window.location.href = `/requests/${encodeURIComponent(filename)}`;
            }, 2000);
        }
    }

    // Keyboard navigation
    document.addEventListener('keydown', e => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            navigateRequests(e.key === 'ArrowUp' ? -1 : 1);
        }
    });
});

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
    }
};

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

import { loadRequestDetail, filterRequests, deleteFile } from './handlers/request-handler.js';
import { debounce } from './core/common-utils.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize filename
    const requestDetail = document.getElementById("request-detail");
    if (requestDetail) {
        window.filename = requestDetail.dataset.filename;
    }

    // Setup request list click handlers
    const requestList = document.getElementById("request-list");
    if (requestList) {
        requestList.addEventListener("click", e => {
            const item = e.target.closest("li[data-index]");
            if (item && requestList.contains(item)) {
                loadRequestDetail(item.dataset.index);
            }
        });
    }

    // Setup all filter controls
    const filterElements = [
        "method-filter",
        "status-filter",
        "content-type-filter",
        "error-only",
        "saml-only"
    ];

    filterElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener("change", filterRequests);
        }
    });

    // Setup search filter with debounce
    const searchInput = document.getElementById("search");
    if (searchInput) {
        searchInput.addEventListener("input", debounce(filterRequests, 300));
    }

    // Setup file deletion handlers
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

    // Initialize keyboard navigation
    document.addEventListener('keydown', e => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            navigateRequests(e.key === 'ArrowUp' ? -1 : 1);
        }
    });
});

// Keyboard navigation function
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

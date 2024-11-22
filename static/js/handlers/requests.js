import { showToast, copyToClipboard } from '../utils/helpers.js';
import { generateDetailHTML } from '../utils/html.js';
import { generateCurlCommand } from '../utils/curl.js';
import { createTimelineChart } from '../visualization/chart.js';
import { isSamlRequest, isSamlResponse } from '../utils/saml-detector.js';

export const loadRequestDetail = async (index) => {
    const filename = window.filename;
    if (!filename) return;

    try {
        const response = await fetch(`/request/${encodeURIComponent(filename)}/${index}`);
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error);
        
        renderRequestDetail(data);
        updateSelectedRequest(index);
    } catch (error) {
        document.getElementById("request-detail").innerHTML = 
            `<p class="error">Error: ${error.message}</p>`;
    }
};

export const filterRequests = () => {
    const filters = {
        search: document.getElementById("search").value.toLowerCase(),
        method: document.getElementById("method-filter").value,
        status: document.getElementById("status-filter").value,
        contentType: document.getElementById("content-type-filter").value,
        errorOnly: document.getElementById("error-only").checked
    };

    let anyVisible = false;
    document.querySelectorAll("#request-list li").forEach(item => {
        if (!item.dataset.index) return;

        const matches = {
            search: true,
            method: true,
            status: true,
            contentType: true,
            error: true
        };

        // URL search
        if (filters.search) {
            matches.search = item.querySelector(".url").textContent.toLowerCase().includes(filters.search);
        }

        // Method filter
        if (filters.method) {
            matches.method = item.querySelector(".method").textContent.trim() === filters.method;
        }

        // Status code filter
        if (filters.status) {
            const statusCode = item.dataset.statusCode;
            matches.status = statusCode && statusCode.startsWith(filters.status);
        }

        // Content type filter
        if (filters.contentType) {
            matches.contentType = item.dataset.contentType && 
                                item.dataset.contentType.toLowerCase().includes(filters.contentType.toLowerCase());
        }

        // Error only filter
        if (filters.errorOnly) {
            const statusCode = parseInt(item.dataset.statusCode);
            matches.error = statusCode >= 400;
        }

        const isVisible = Object.values(matches).every(Boolean);
        item.style.display = isVisible ? "" : "none";
        if (isVisible) anyVisible = true;
    });

    const noResults = document.getElementById("no-results");
    if (!anyVisible) {
        if (!noResults) {
            const message = document.createElement("li");
            message.id = "no-results";
            message.textContent = "No results found.";
            message.style.color = "#ff5555";
            document.getElementById("request-list").appendChild(message);
        }
    } else if (noResults) {
        noResults.remove();
    }
};

export const deleteFile = async (filename) => {
    if (!confirm('Delete this file?')) return;

    try {
        const response = await fetch(`/delete/${encodeURIComponent(filename)}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error);
        
        window.location.reload();
    } catch (error) {
        showToast(`Error: ${error.message}`, 3000);
    }
};

export const renderRequestDetail = (data) => {
    const detailDiv = document.getElementById("request-detail");
    const mimeType = data.response?.content?.mimeType || "";
    
    // Add SAML detection
    const isSaml = isSamlRequest(data.request) || isSamlResponse(data.response);
    if (isSaml) {
        data.isSaml = true;
    }

    const languageClass = mimeType.includes("json") ? "language-json" : 
                         mimeType.includes("html") ? "language-markup" :
                         mimeType.includes("xml") || isSaml ? "language-markup" :
                         "language-none";

    const curlCommand = generateCurlCommand(data);
    const html = generateDetailHTML(data, curlCommand, languageClass);
    
    detailDiv.innerHTML = html;
    
    const canvas = document.getElementById("timelineChartCanvas");
    if (canvas) {
        createTimelineChart(canvas, data.timings);
    }
    Prism.highlightAll();

    // Setup copy buttons
    document.querySelectorAll(".copy-button").forEach(button => {
        button.addEventListener("click", () => {
            const text = button.getAttribute("data-text");
            copyToClipboard(text);
        });
    });

    // Setup certificate detail toggles
    document.querySelectorAll(".toggle-cert-details").forEach(button => {
        button.addEventListener("click", (e) => {
            const detailsDiv = e.target.nextElementSibling;
            const isHidden = detailsDiv.classList.contains("hidden");
            
            detailsDiv.classList.toggle("hidden");
            e.target.textContent = isHidden ? "Hide Certificate Details" : "Show Certificate Details";
        });
    });
};

export const updateSelectedRequest = (index) => {
    document.querySelectorAll("#request-list li").forEach(item => {
        item.classList.remove("selected");
    });
    const selectedItem = document.querySelector(`#request-list li[data-index='${index}']`);
    if (selectedItem) {
        selectedItem.classList.add("selected");
        selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
};

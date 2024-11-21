import { escapeHTML, formatJSON } from './helpers.js';

export const generateDetailHTML = (data, curlCommand, languageClass) => {
    const { request, response } = data;
    
    const queryParamsHtml = request.queryString?.length > 0 
        ? request.queryString.map(q => `<li><strong>${escapeHTML(q.name)}:</strong> ${escapeHTML(q.value)}</li>`).join('')
        : '<li>No query parameters</li>';

    const requestHeadersHtml = request.headers?.length > 0
        ? request.headers.map(h => `<li><strong>${escapeHTML(h.name)}:</strong> ${escapeHTML(h.value)}</li>`).join('')
        : '<li>No request headers</li>';

    const responseHeadersHtml = response.headers?.length > 0
        ? response.headers.map(h => `<li><strong>${escapeHTML(h.name)}:</strong> ${escapeHTML(h.value)}</li>`).join('')
        : '<li>No response headers</li>';

    return `
        <div class="section">
            <div class="chart-container">
                <canvas id="timelineChartCanvas"></canvas>
            </div>
        </div>
        <div class="section">
            <button class="copy-button curl-button" data-text="${encodeURIComponent(curlCommand)}" aria-label="Copy cURL Command">
                <i class="fas fa-copy"></i> Copy cURL
            </button>
            <pre><code class="language-bash">${escapeHTML(curlCommand)}</code></pre>
        </div>
        <div class="section">
            <h2>Request Details</h2>
            <p><strong>Method:</strong> ${escapeHTML(request.method || "N/A")}</p>
            <p><strong>URL:</strong> <a href="${escapeHTML(request.url || "#")}" target="_blank" rel="noopener noreferrer">
                ${escapeHTML(request.url || "N/A")}
            </a></p>
        </div>
        <div class="section">
            <h2>Response Details</h2>
            <p><strong>Status:</strong> ${escapeHTML(String(response.status))} ${escapeHTML(response.statusText || "")}</p>
        </div>
        <div class="section">
            <h3>Request Headers</h3>
            <ul>${requestHeadersHtml}</ul>
        </div>
        <div class="section">
            <h3>Query Parameters</h3>
            <ul>${queryParamsHtml}</ul>
        </div>
        ${request.postData && request.postData.text ? `
            <div class="section">
                <h3>Post Data</h3>
                <pre><code class="${languageClass}">${escapeHTML(formatJSON(request.postData.text))}</code></pre>
                <button class="copy-button" data-text="${encodeURIComponent(request.postData.text)}" aria-label="Copy Post Data">
                    <i class="fas fa-copy"></i> Copy
                </button>
            </div>
        ` : ''}
        <div class="section">
            <h3>Response Headers</h3>
            <ul>${responseHeadersHtml}</ul>
        </div>
        ${response.content && response.content.text ? `
            <div class="section">
                <h3>Response Content</h3>
                <pre><code class="${languageClass}">${escapeHTML(formatJSON(response.content.text))}</code></pre>
                <button class="copy-button" data-text="${encodeURIComponent(response.content.text)}" aria-label="Copy Response Content">
                    <i class="fas fa-copy"></i> Copy
                </button>
            </div>
        ` : '<div class="section"><p>No response content available.</p></div>'}
    `;
};

import { escapeHTML, formatJSON } from './helpers.js';
import { decodeSamlMessage, parseSamlXml } from './saml.js';

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

    const samlSectionHtml = data.isSaml ? generateSamlSection(data) : '';

    return `
        <div class="section">
            <div class="chart-container">
                <canvas id="timelineChartCanvas"></canvas>
            </div>
        </div>
        ${samlSectionHtml}
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

export const generateSamlSection = (data) => {
    if (!data.isSaml) return '';

    let samlData = null;
    let decoded = null;
    
    // Check POST data
    if (data.request.postData?.text) {
        const samlParam = new URLSearchParams(data.request.postData.text).get('SAMLResponse') || 
                         new URLSearchParams(data.request.postData.text).get('SAMLRequest');
        if (samlParam) {
            decoded = decodeSamlMessage(samlParam);
            if (decoded) {
                samlData = parseSamlXml(decoded);
            }
        }
    }

    // Check URL parameters
    if (!samlData && data.request.url) {
        const url = new URL(data.request.url);
        const samlParam = url.searchParams.get('SAMLResponse') || 
                         url.searchParams.get('SAMLRequest');
        if (samlParam) {
            decoded = decodeSamlMessage(samlParam);
            if (decoded) {
                samlData = parseSamlXml(decoded);
            }
        }
    }

    if (!samlData || !decoded) return '';

    return `
        <div class="section saml-section">
            <h2><i class="fas fa-shield-alt"></i> SAML Analysis</h2>
            <div class="saml-details">
                <p><strong>Type:</strong> ${samlData.type}</p>
                <p><strong>Issuer:</strong> ${samlData.issuer || 'Not specified'}</p>
                
                <div class="saml-raw">
                    <h3>Raw SAML XML</h3>
                    <pre><code class="language-markup">${escapeHTML(decoded)}</code></pre>
                    <button class="copy-button" data-text="${encodeURIComponent(decoded)}" aria-label="Copy Raw SAML">
                        <i class="fas fa-copy"></i> Copy Raw SAML
                    </button>
                </div>
                
                ${samlData.conditions ? `
                    <div class="saml-conditions">
                        <h3>Conditions</h3>
                        <p>Valid From: ${samlData.conditions.notBefore || 'Not specified'}</p>
                        <p>Valid Until: ${samlData.conditions.notOnOrAfter || 'Not specified'}</p>
                        ${samlData.conditions.audiences.length ? `
                            <h4>Audiences:</h4>
                            <ul>
                                ${samlData.conditions.audiences.map(aud => `<li>${escapeHTML(aud)}</li>`).join('')}
                            </ul>
                        ` : ''}
                    </div>
                ` : ''}
                
                ${samlData.attributes.length ? `
                    <div class="saml-attributes">
                        <h3>Attributes</h3>
                        <ul>
                            ${samlData.attributes.map(attr => `
                                <li>
                                    <strong>${escapeHTML(attr.name)}:</strong>
                                    ${attr.values.map(val => escapeHTML(val)).join(', ')}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${samlData.authStatements.length ? `
                    <div class="saml-auth-statements">
                        <h3>Authentication Statements</h3>
                        <ul>
                            ${samlData.authStatements.map(stmt => `
                                <li>
                                    <p>Authentication Instant: ${escapeHTML(stmt.authnInstant || 'Not specified')}</p>
                                    <p>Session Index: ${escapeHTML(stmt.sessionIndex || 'Not specified')}</p>
                                    <p>Authentication Context: ${escapeHTML(stmt.authnContext || 'Not specified')}</p>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
};

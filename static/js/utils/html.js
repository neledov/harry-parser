import { escapeHTML, formatJSON } from './helpers.js';
import { decodeSamlMessage, parseSamlXml } from './saml.js';
import { analyzeSamlSecurity } from './saml-analyzer.js';

const renderTimestampValidation = (timestamps) => {
    if (timestamps.status === 'missing') {
        return `<p class="warning">${timestamps.details}</p>`;
    }

    return `
        <div class="timestamp-details">
            <p>Valid From: ${timestamps.notBefore ? new Date(timestamps.notBefore).toLocaleString() : 'Not specified'}</p>
            <p>Valid Until: ${timestamps.notOnOrAfter ? new Date(timestamps.notOnOrAfter).toLocaleString() : 'Not specified'}</p>
            ${timestamps.isExpired ? '<p class="error">Token has expired</p>' : ''}
            ${timestamps.isNotYetValid ? '<p class="error">Token is not yet valid</p>' : ''}
        </div>
    `;
};

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

    const securityAnalysis = analyzeSamlSecurity(samlData, decoded);

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

                <div class="saml-security">
                    <h3>Security Analysis</h3>
                    
                    <div class="security-item ${securityAnalysis.validations.signature.status}">
                        <h4>Signature</h4>
                        <p>${securityAnalysis.validations.signature.details}</p>
                    </div>

                    <div class="security-item ${securityAnalysis.validations.encryption.status}">
                        <h4>Encryption</h4>
                        <p>${securityAnalysis.validations.encryption.details}</p>
                    </div>

                    <div class="security-item">
                        <h4>Certificates</h4>
                        <p>${securityAnalysis.validations.certificates.details}</p>
                        ${securityAnalysis.certificateInfo ? `
                            <button class="toggle-cert-details">Show Certificate Details</button>
                            <div class="certificate-details hidden">
                                <pre><code>${escapeHTML(JSON.stringify(securityAnalysis.certificateInfo, null, 2))}</code></pre>
                            </div>
                        ` : ''}
                    </div>

                    <div class="security-item">
                        <h4>Timestamp Validation</h4>
                        ${renderTimestampValidation(securityAnalysis.validations.timestamps)}
                    </div>

                    <div class="security-item">
                        <h4>Audience Validation</h4>
                        <p>${securityAnalysis.validations.audience.details}</p>
                        ${securityAnalysis.validations.audience.found ? `
                            <ul>
                                ${securityAnalysis.validations.audience.values.map(aud => 
                                    `<li>${escapeHTML(aud)}</li>`).join('')}
                            </ul>
                        ` : ''}
                    </div>
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

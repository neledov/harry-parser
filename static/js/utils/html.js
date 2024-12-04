import { escapeHTML, formatJSON } from "./helpers.js";
import { decodeSamlMessage, parseSamlXml } from "./saml.js";
import { analyzeSamlSecurity } from "./saml-analyzer.js";

const renderTimestampValidation = (timestamps) => {
  if (timestamps.status === "missing") {
    return `<p class="warning">${timestamps.details}</p>`;
  }

  return `
        <div class="timestamp-details">
            <p>Valid From: ${
              timestamps.notBefore
                ? new Date(timestamps.notBefore).toLocaleString()
                : "Not specified"
            }</p>
            <p>Valid Until: ${
              timestamps.notOnOrAfter
                ? new Date(timestamps.notOnOrAfter).toLocaleString()
                : "Not specified"
            }</p>
            ${
              timestamps.isExpired
                ? '<p class="error">Token has expired</p>'
                : ""
            }
            ${
              timestamps.isNotYetValid
                ? '<p class="error">Token is not yet valid</p>'
                : ""
            }
        </div>
    `;
};

const renderCertificateDetails = (certInfo) => `
    <div class="certificate-info">
        <div class="cert-validity ${
          certInfo.status.isValid ? "valid" : "invalid"
        }">
            Status: ${certInfo.status.isValid ? "Valid" : "Invalid"}
            ${certInfo.status.isExpired ? " (Expired)" : ""}
            ${certInfo.status.isNotYetValid ? " (Not Yet Valid)" : ""}
        </div>
        <h4>Subject</h4>
        <pre><code>${escapeHTML(
          JSON.stringify(certInfo.decoded.subject, null, 2)
        )}</code></pre>
        
        <h4>Issuer</h4>
        <pre><code>${escapeHTML(
          JSON.stringify(certInfo.decoded.issuer, null, 2)
        )}</code></pre>
        
        <h4>Validity Period</h4>
        <p>Not Before: ${certInfo.decoded.validity.notBefore.toLocaleString()}</p>
        <p>Not After: ${certInfo.decoded.validity.notAfter.toLocaleString()}</p>
        
        <h4>Public Key</h4>
        <p>Algorithm: ${certInfo.decoded.publicKey.algorithm}</p>
        <p>Key Size: ${certInfo.decoded.publicKey.keySize} bits</p>
        
        <h4>Fingerprints</h4>
        <p>SHA-1: ${certInfo.decoded.fingerprints.sha1}</p>
        <p>SHA-256: ${certInfo.decoded.fingerprints.sha256}</p>
    </div>
`;

export const generateDetailHTML = (data, curlCommand, languageClass) => {
  const { request, response } = data;

  const queryParamsHtml =
    request.queryString?.length > 0
      ? request.queryString
          .map(
            (q) =>
              `<li><strong>${escapeHTML(q.name)}:</strong> ${escapeHTML(
                q.value
              )}</li>`
          )
          .join("")
      : "<li>No query parameters</li>";

  const requestHeadersHtml =
    request.headers?.length > 0
      ? request.headers
          .map(
            (h) =>
              `<li><strong>${escapeHTML(h.name)}:</strong> ${escapeHTML(
                h.value
              )}</li>`
          )
          .join("")
      : "<li>No request headers</li>";

  const responseHeadersHtml =
    response.headers?.length > 0
      ? response.headers
          .map(
            (h) =>
              `<li><strong>${escapeHTML(h.name)}:</strong> ${escapeHTML(
                h.value
              )}</li>`
          )
          .join("")
      : "<li>No response headers</li>";

  const samlSectionHtml = data.isSaml ? generateSamlSection(data) : "";

  return `
        <div class="section">
            <div class="chart-container">
                <canvas id="timelineChartCanvas"></canvas>
            </div>
        </div>
        ${samlSectionHtml}
        <div class="section">
            <button class="copy-button curl-button" data-text="${encodeURIComponent(
              curlCommand
            )}" aria-label="Copy cURL Command">
                <i class="fas fa-copy"></i> Copy cURL
            </button>
            <pre><code class="language-bash">${escapeHTML(
              curlCommand
            )}</code></pre>
        </div>
        <div class="section">
            <h3>Request Details</h3>
            <p><strong>Method:</strong> ${escapeHTML(
              request.method || "N/A"
            )}</p>
            <p><strong>URL:</strong> <a href="${escapeHTML(
              request.url || "#"
            )}" target="_blank" rel="noopener noreferrer">
                ${escapeHTML(request.url || "N/A")}
            </a></p>
        </div>
        <div class="section">
            <h3>Response Details</h3>
            <p><strong>Status:</strong> ${escapeHTML(
              String(response.status)
            )} ${escapeHTML(response.statusText || "")}</p>
        </div>
        <div class="section">
            <h3>Request Headers</h3>
            <ul>${requestHeadersHtml}</ul>
        </div>
        <div class="section">
            <h3>Query Parameters</h3>
            <ul>${queryParamsHtml}</ul>
        </div>
        ${
          request.postData && request.postData.text
            ? `
            <div class="section">
                <h3>Post Data</h3>
                <pre><code class="${languageClass}">${escapeHTML(
                formatJSON(request.postData.text)
              )}</code></pre>
                <button class="copy-button" data-text="${encodeURIComponent(
                  request.postData.text
                )}" aria-label="Copy Post Data">
                    <i class="fas fa-copy"></i> Copy
                </button>
            </div>
        `
            : ""
        }
        <div class="section">
            <h3>Response Headers</h3>
            <ul>${responseHeadersHtml}</ul>
        </div>
        ${
          response.content && response.content.text
            ? `
            <div class="section">
                <h3>Response Content</h3>
                <pre><code class="${languageClass}">${escapeHTML(
                formatJSON(response.content.text)
              )}</code></pre>
                <button class="copy-button" data-text="${encodeURIComponent(
                  response.content.text
                )}" aria-label="Copy Response Content">
                    <i class="fas fa-copy"></i> Copy
                </button>
            </div>
        `
            : '<div class="section"><p>No response content available.</p></div>'
        }
    `;
};

export const generateSamlSection = (data) => {
  if (!data.isSaml) return '';

  let samlData = null;
  let decoded = null;
    
  // Extract SAML data from POST or URL parameters
  if (data.request.postData?.text) {
      const samlParam = new URLSearchParams(data.request.postData.text).get('SAMLResponse') || 
                       new URLSearchParams(data.request.postData.text).get('SAMLRequest');
      if (samlParam) {
          decoded = decodeSamlMessage(samlParam);
          if (decoded) samlData = parseSamlXml(decoded);
      }
  }

  if (!samlData && data.request.url) {
      const url = new URL(data.request.url);
      const samlParam = url.searchParams.get('SAMLResponse') || 
                       url.searchParams.get('SAMLRequest');
      if (samlParam) {
          decoded = decodeSamlMessage(samlParam);
          if (decoded) samlData = parseSamlXml(decoded);
      }
  }

  if (!samlData || !decoded) return '';

  const securityAnalysis = analyzeSamlSecurity(samlData, decoded);

  return `
      <div class="section saml-section">
          <h3><i class="fas fa-shield-alt"></i> SAML Analysis</h3>
            
          <!-- Quick Overview Panel -->
          <div class="saml-overview">
              <div class="overview-item">
                  <strong>Type:</strong> ${samlData.type}
              </div>
              <div class="overview-item">
                  <strong>Issuer:</strong> ${samlData.issuer || 'Not specified'}
              </div>
              <div class="overview-item ${securityAnalysis.validations.signature.status}">
                  <strong>Signature:</strong> ${securityAnalysis.validations.signature.status}
              </div>
              <div class="overview-item ${securityAnalysis.validations.encryption.status}">
                  <strong>Encryption:</strong> ${securityAnalysis.validations.encryption.status}
              </div>
          </div>

          <!-- Raw SAML Panel -->
          <div class="saml-raw">
              <button class="copy-button" data-text="${encodeURIComponent(decoded)}" aria-label="Copy Raw SAML">
                  <i class="fas fa-copy"></i> Copy Raw SAML
              </button>
              <pre><code class="language-markup">${escapeHTML(decoded)}</code></pre>
          </div>

          <!-- Security Analysis Panel -->
          <div class="saml-security">
              <div class="security-grid">
                  <div class="security-item ${securityAnalysis.validations.signature.status}">
                      <h4><i class="fas fa-signature"></i> Signature</h4>
                      <p>${securityAnalysis.validations.signature.details}</p>
                      ${securityAnalysis.validations.signature.algorithm ? `
                          <div class="algorithm-info">
                              <span>Algorithm: ${securityAnalysis.validations.signature.algorithm.name}</span>
                          </div>
                      ` : ''}
                  </div>

                  <div class="security-item ${securityAnalysis.validations.encryption.status}">
                      <h4><i class="fas fa-lock"></i> Encryption</h4>
                      <p>${securityAnalysis.validations.encryption.details}</p>
                  </div>
              </div>
          </div>

          <!-- Certificate Details -->
          <div class="certificate-section">
              <h3><i class="fas fa-certificate"></i> Certificates</h3>
              ${securityAnalysis.certificateInfo ? securityAnalysis.certificateInfo.map((cert, index) => `
    <div class="certificate-item" data-cert-index="${index + 1}">
        <button class="toggle-cert-details">
            <i class="fas fa-chevron-down"></i> Certificate ${index + 1} 
            <span class="cert-status ${cert.status.isValid ? 'valid' : 'invalid'}">
                ${cert.status.isValid ? 'Valid' : 'Invalid'}
            </span>
        </button>
        <div class="certificate-details hidden">
            ${renderCertificateDetails(cert)}
        </div>
    </div>
`).join('') : '<p>No certificates found</p>'}
          </div>
          <!-- SAML Attributes -->
          ${samlData.attributes.length ? `
              <div class="saml-attributes">
                  <h3><i class="fas fa-list"></i> Attributes</h3>
                  <div class="attributes-grid">
                      ${samlData.attributes.map(attr => `
                          <div class="attribute-item">
                              <strong>${escapeHTML(attr.name)}</strong>
                              <span>${attr.values.map(val => escapeHTML(val)).join(', ')}</span>
                          </div>
                      `).join('')}
                  </div>
              </div>
          ` : ''}

<!-- Conditions -->
${samlData.conditions ? `
    <div class="saml-conditions">
        <h3><i class="fas fa-clock"></i> Validity Conditions</h3>
        <div class="conditions-grid">
            ${renderTimestampValidation({
                status: "valid",
                notBefore: samlData.conditions.notBefore,
                notOnOrAfter: samlData.conditions.notOnOrAfter,
                isExpired: new Date() > new Date(samlData.conditions.notOnOrAfter),
                isNotYetValid: new Date() < new Date(samlData.conditions.notBefore)
            })}
            ${samlData.conditions.audiences.length ? `
                <div class="condition-item full-width">
                    <strong>Audiences:</strong>
                    <ul>
                        ${samlData.conditions.audiences.map(aud => 
                            `<li>${escapeHTML(aud)}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    </div>
` : ''}

      </div>
  `;
};

// Add this export along with the existing exports
export const generateRequestListItem = (entry) => {
    const method = entry.request.method;
    const url = entry.request.url;
    const status = entry.response?.status || 'No Status';
    const contentType = entry.response?.content?.mimeType || 'Unknown';
    const methodClass = ['GET', 'POST', 'PUT', 'DELETE'].includes(method) ? method : 'OTHER';
    
    const statusCategory = 
        status >= 200 && status < 300 ? 'success' :
        status >= 300 && status < 400 ? 'redirection' :
        status >= 400 && status < 500 ? 'client-error' :
        status >= 500 ? 'server-error' : 'unknown';

    const isSaml = url.toLowerCase().includes('saml') || 
                  url.toLowerCase().includes('sso') ||
                  entry.request.postData?.text?.toLowerCase().includes('saml');

    return `
        <div class="method ${methodClass}">
            ${method}
            ${isSaml ? '<i class="fas fa-shield-alt saml-icon" title="SAML Request"></i>' : ''}
        </div>
        <div class="url" title="${url}">${url}</div>
        <div class="status ${statusCategory}">Status: ${status}</div>
    `;
};

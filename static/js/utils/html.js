import { escapeHTML, formatJSON,calculateBandwidth } from "./helpers.js";
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
  const { request, response, connectionInfo, timings } = data;

  const queryParamsHtml = request.queryString?.length > 0
    ? request.queryString.map(q => 
        `<li><strong>${escapeHTML(q.name)}:</strong> ${escapeHTML(q.value)}</li>`
      ).join("")
    : "<li>No query parameters</li>";

  const requestHeadersHtml = request.headers?.length > 0
    ? request.headers.map(h => 
        `<li><strong>${escapeHTML(h.name)}:</strong> ${escapeHTML(h.value)}</li>`
      ).join("")
    : "<li>No request headers</li>";

  const responseHeadersHtml = response.headers?.length > 0
    ? response.headers.map(h => 
        `<li><strong>${escapeHTML(h.name)}:</strong> ${escapeHTML(h.value)}</li>`
      ).join("")
    : "<li>No response headers</li>";

  const samlSectionHtml = data.isSaml ? generateSamlSection(data) : "";

  const connectionInfoHtml = `
    <div class="section connection-info">
        <h3>Connection Analysis</h3>
        <div class="connection-stats">
            <div class="stat ${connectionInfo.concurrent >= 6 ? 'warning' : ''}">
                <span>Active:</span>
                <span class="value">${connectionInfo.concurrent}</span>
                ${connectionInfo.concurrent >= 6 ? 
                    '<div class="warning-note">Connection pool limit reached</div>' : 
                    ''}
            </div>
  
            <div class="stat timing">
                <span>Total Time:</span>
                <span class="value">${Object.values(timings).reduce((sum, time) => 
                    sum + (time > 0 ? time : 0), 0)}ms</span>
            </div>
        </div>
    </div>
  `;

  return `
        <div class="section">
            <div class="chart-container">
                <canvas id="timelineChartCanvas"></canvas>
            </div>
        </div>
        ${connectionInfoHtml}
        ${samlSectionHtml}
        <div class="section">
            <button class="copy-button curl-button" data-text="${encodeURIComponent(curlCommand)}" 
                    aria-label="Copy cURL Command">
                <i class="fas fa-copy"></i> Copy cURL
            </button>
            <pre><code class="language-bash">${escapeHTML(curlCommand)}</code></pre>
        </div>
        <div class="section">
            <h3>Request Details</h3>
            <p><strong>Method:</strong> ${escapeHTML(request.method || "N/A")}</p>
            <p><strong>URL:</strong> 
                <a href="${escapeHTML(request.url || "#")}" 
                   target="_blank" rel="noopener noreferrer">
                    ${escapeHTML(request.url || "N/A")}
                </a>
            </p>
        </div>
        <div class="section">
            <h3>Response Details</h3>
            <p><strong>Status:</strong> ${escapeHTML(String(response.status))} 
                ${escapeHTML(response.statusText || "")}</p>
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
                <button class="copy-button" data-text="${encodeURIComponent(request.postData.text)}" 
                        aria-label="Copy Post Data">
                    <i class="fas fa-copy"></i> Copy
                </button>
                <h3>Post Data</h3>
                <pre><code class="${languageClass}">${escapeHTML(formatJSON(request.postData.text))}</code></pre>
            </div>
        ` : ""}
        <div class="section">
            <h3>Response Headers</h3>
            <ul>${responseHeadersHtml}</ul>
        </div>
        ${response.content && response.content.text ? `
            <div class="section">
                <button class="copy-button" data-text="${encodeURIComponent(response.content.text)}" 
                        aria-label="Copy Response Content">
                    <i class="fas fa-copy"></i> Copy
                </button>
                <h3>Response Content</h3>
                <pre><code class="${languageClass}">${escapeHTML(formatJSON(response.content.text))}</code></pre>
            </div>
        ` : '<div class="section"><p>No response content available.</p></div>'}
    `;
};


export const generateSamlSection = (data) => {
  if (!data.isSaml) return "";

  let samlData = null;
  let decoded = null;

  // Extract SAML data from POST or URL parameters
  if (data.request.postData?.text) {
    const samlParam =
      new URLSearchParams(data.request.postData.text).get("SAMLResponse") ||
      new URLSearchParams(data.request.postData.text).get("SAMLRequest");
    if (samlParam) {
      decoded = decodeSamlMessage(samlParam);
      if (decoded) samlData = parseSamlXml(decoded);
    }
  }

  if (!samlData && data.request.url) {
    const url = new URL(data.request.url);
    const samlParam =
      url.searchParams.get("SAMLResponse") ||
      url.searchParams.get("SAMLRequest");
    if (samlParam) {
      decoded = decodeSamlMessage(samlParam);
      if (decoded) samlData = parseSamlXml(decoded);
    }
  }

  if (!samlData || !decoded) return "";

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
                  <strong>Issuer:</strong> ${samlData.issuer || "Not specified"}
              </div>
              <div class="overview-item ${
                securityAnalysis.validations.signature.status
              }">
                  <strong>Signature:</strong> ${
                    securityAnalysis.validations.signature.status
                  }
              </div>
              <div class="overview-item ${
                securityAnalysis.validations.encryption.status
              }">
                  <strong>Encryption:</strong> ${
                    securityAnalysis.validations.encryption.status
                  }
              </div>
          </div>

          <!-- Raw SAML Panel -->
          <div class="saml-raw">
              <button class="copy-button" data-text="${encodeURIComponent(
                decoded
              )}" aria-label="Copy Raw SAML">
                  <i class="fas fa-copy"></i> Copy Raw SAML
              </button>
              <pre><code class="language-markup">${escapeHTML(
                decoded
              )}</code></pre>
          </div>

          <!-- Security Analysis Panel -->
          <div class="saml-security">
              <div class="security-grid">
                  <div class="security-item ${
                    securityAnalysis.validations.signature.status
                  }">
                      <h4><i class="fas fa-signature"></i> Signature</h4>
                      <p>${securityAnalysis.validations.signature.details}</p>
                      ${
                        securityAnalysis.validations.signature.algorithm
                          ? `
                          <div class="algorithm-info">
                              <span>Algorithm: ${securityAnalysis.validations.signature.algorithm.name}</span>
                          </div>
                      `
                          : ""
                      }
                  </div>

                  <div class="security-item ${
                    securityAnalysis.validations.encryption.status
                  }">
                      <h4><i class="fas fa-lock"></i> Encryption</h4>
                      <p>${securityAnalysis.validations.encryption.details}</p>
                  </div>
              </div>
          </div>

          <!-- Certificate Details -->
          <div class="certificate-section">
              <h3><i class="fas fa-certificate"></i> Certificates</h3>
              ${
                securityAnalysis.certificateInfo
                  ? securityAnalysis.certificateInfo
                      .map(
                        (cert, index) => `
    <div class="certificate-item" data-cert-index="${index + 1}">
        <button class="toggle-cert-details">
            <i class="fas fa-chevron-down"></i> Certificate ${index + 1} 
            <span class="cert-status ${
              cert.status.isValid ? "valid" : "invalid"
            }">
                ${cert.status.isValid ? "Valid" : "Invalid"}
            </span>
        </button>
        <div class="certificate-details hidden">
            ${renderCertificateDetails(cert)}
        </div>
    </div>
`
                      )
                      .join("")
                  : "<p>No certificates found</p>"
              }
          </div>
          <!-- SAML Attributes -->
          ${
            samlData.attributes.length
              ? `
              <div class="saml-attributes">
                  <h3><i class="fas fa-list"></i> Attributes</h3>
                  <div class="attributes-grid">
                      ${samlData.attributes
                        .map(
                          (attr) => `
                          <div class="attribute-item">
                              <strong>${escapeHTML(attr.name)}</strong>
                              <span>${attr.values
                                .map((val) => escapeHTML(val))
                                .join(", ")}</span>
                          </div>
                      `
                        )
                        .join("")}
                  </div>
              </div>
          `
              : ""
          }

<!-- Conditions -->
${
  samlData.conditions
    ? `
    <div class="saml-conditions">
        <h3><i class="fas fa-clock"></i> Validity Conditions</h3>
        <div class="conditions-grid">
            ${renderTimestampValidation({
              status: "valid",
              notBefore: samlData.conditions.notBefore,
              notOnOrAfter: samlData.conditions.notOnOrAfter,
              isExpired:
                new Date() > new Date(samlData.conditions.notOnOrAfter),
              isNotYetValid:
                new Date() < new Date(samlData.conditions.notBefore),
            })}
            ${
              samlData.conditions.audiences.length
                ? `
                <div class="condition-item full-width">
                    <strong>Audiences:</strong>
                    <ul>
                        ${samlData.conditions.audiences
                          .map((aud) => `<li>${escapeHTML(aud)}</li>`)
                          .join("")}
                    </ul>
                </div>
            `
                : ""
            }
        </div>
    </div>
`
    : ""
}

      </div>
  `;
};

// Add this export along with the existing exports
export const generateRequestListItem = (entry) => {
    const method = entry.request.method;
    const url = entry.request.url;
    const status = entry.response?.status || 'No Status';
    const contentType = entry.response?.content?.mimeType || 'Unknown';
    const responseSize = entry.response?.content?.size || 0;
    const methodClass = ['GET', 'POST', 'PUT', 'DELETE'].includes(method) ? method : 'OTHER';
    const downloadTime = entry.timings.receive;
    const bandwidth = calculateBandwidth(entry);
    const concurrent = entry.connectionInfo?.concurrent || 0;
    const concurrentClass = concurrent >= 6 ? 'warning' : '';
    // More precise version detection from HAR entry
    let httpVersion = 'HTTP/1.1'; // Default fallback
    
    // Check protocol version from HAR entry
    if (entry.request.httpVersion) {
        httpVersion = entry.request.httpVersion.toUpperCase();
    }
    
    // Check custom headers for protocol version
    const protocolHeaders = [
        'x-ap-version',
        'x-http-version',
        'x-protocol-version',
        'x-forwarded-proto-version',
        'alpn',
        'x-firefox-spdy',
        'x-spdy-version'
    ];
    
    for (const header of entry.request.headers) {
        const headerName = header.name.toLowerCase();
        if (protocolHeaders.includes(headerName)) {
            // Handle SPDY and QUIC protocols
            if (header.value.includes('spdy') || header.value.includes('quic')) {
                httpVersion = 'HTTP/2.0';
                break;
            }
            // Handle explicit version numbers
            if (header.value.includes('2') || header.value.includes('3')) {
                httpVersion = `HTTP/${header.value.includes('3') ? '3.0' : '2.0'}`;
                break;
            }
        }
    }
    
    const versionNumber = parseFloat(httpVersion.replace(/[^0-9.]/g, ''));
    const versionClass = versionNumber >= 2.0 ? 'higher-version' : 
                        versionNumber <= 1.1 ? 'lower-version' : '';
    
    const statusCategory = 
        status >= 200 && status < 300 ? 'success' :
        status >= 300 && status < 400 ? 'redirection' :
        status >= 400 && status < 500 ? 'client-error' :
        status >= 500 ? 'server-error' : 'unknown';

    const duration = Object.values(entry.timings).reduce((sum, time) => sum + (time > 0 ? time : 0), 0);

    return `
        <div class="method ${methodClass}">
            ${method}
            <span class="http-version ${versionClass}">${httpVersion}</span>
        </div>
        <div class="url" title="${url}">${url}</div>
        <div class="request-info">
            <span class="status ${statusCategory}">Status: ${status}</span>
            <span class="size">${(responseSize/1024).toFixed(1)} KB</span>
            <span class="bandwidth">${bandwidth}</span>
            <span class="duration">${Math.round(duration)} ms</span>
                        <span class="stat ${concurrentClass}" title="Concurrent Connections">
                <i class="fas fa-network-wired"></i> ${concurrent}
            </span>
        </div>
    `;
};




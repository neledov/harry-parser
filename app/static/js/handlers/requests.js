import { showToast, copyToClipboard, debounce, isSuspiciousRequest } from "../utils/helpers.js";
import { generateDetailHTML } from "../utils/html.js";
import { generateCurlCommand } from "../utils/curl.js";
import { createTimelineChart } from "../visualization/chart.js";
import { isSamlRequest, isSamlResponse } from "../utils/saml-detector.js";

export const loadRequestDetail = async (index) => {
  const filename = window.filename;
  if (!filename) return;

  try {
    const data = window.requestCache[index];
    if (!data) throw new Error("Request not found");

    renderRequestDetail(data);
    updateSelectedRequest(index);
  } catch (error) {
    document.getElementById(
      "request-detail"
    ).innerHTML = `<p class="error">Error: ${error.message}</p>`;
  }
};

export const filterRequests = () => {
  const filters = {
      method: document.getElementById("method-filter").value,
      status: document.getElementById("status-filter").value,
      contentType: document.getElementById("content-type-filter").value,
      errorOnly: document.getElementById("error-only").checked,
      samlOnly: document.getElementById("saml-only").checked
  };

  const requestList = document.getElementById("request-list");
  const items = Array.from(requestList.getElementsByTagName("li"));
  let anyVisible = false;

  items.forEach((item) => {
      if (!item.dataset.index) return;

      const requestData = window.requestCache[item.dataset.index];
      const duration = calculateDuration(requestData?.timings || {});
      const hasError = requestData?.response?.status >= 400 || !requestData?.response?.status;
      const isSlow = duration > 2000;
      const hasConnectionIssue = requestData?.connectionInfo?.concurrent >= 6;

      const matches = {
          method: !filters.method || item.querySelector(".method").textContent.trim().startsWith(filters.method),
          status: !filters.status || (item.dataset.statusCode && item.dataset.statusCode.startsWith(filters.status)),
          contentType: !filters.contentType || (item.dataset.contentType && item.dataset.contentType.toLowerCase().includes(filters.contentType.toLowerCase())),
          error: !filters.errorOnly || (hasError || isSlow || hasConnectionIssue),
          saml: !filters.samlOnly || item.classList.contains("saml-request")
      };

      const isVisible = Object.values(matches).every(Boolean);
      item.style.display = isVisible ? "" : "none";
      if (isVisible) anyVisible = true;

      item.dataset.duration = duration;
      item.dataset.hasIssue = (hasError || isSlow) ? "1" : "0";
  });

  if (filters.errorOnly) {
      const visibleItems = items.filter(item => item.style.display !== "none");
      visibleItems.sort((a, b) => {
          const issueA = a.dataset.hasIssue === "1";
          const issueB = b.dataset.hasIssue === "1";
          if (issueA !== issueB) return issueB - issueA;
          return parseFloat(b.dataset.duration) - parseFloat(a.dataset.duration);
      });
      visibleItems.forEach(item => requestList.appendChild(item));
  }

  updateNoResultsMessage(anyVisible);
};

const updateNoResultsMessage = (anyVisible) => {
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


const calculateDuration = (timings) => {
  return Object.values(timings).reduce((sum, time) => sum + (time > 0 ? time : 0), 0);
};


const searchInResponses = (searchText) => {
    if (!window.requestCache || !searchText) {
        hideSearchResults();
        document.getElementById("search-results-count").textContent = "";
        return;
    }

    if (searchText.length < 3) {
        hideSearchResults();
        showToast("Search term must be at least 3 characters", 2000);
        return;
    }

    try {
        const chunkSize = 25;
        const entries = Object.entries(window.requestCache);
        const chunks = [];
        
        for (let i = 0; i < entries.length; i += chunkSize) {
            chunks.push(entries.slice(i, i + chunkSize));
        }

        let matches = [];
        let processedChunks = 0;

        const processChunk = (chunk) => {
            const chunkMatches = chunk.filter(([_, data]) => {
                const searchTargets = {
                    url: data.request?.url || "",
                    requestHeaders: data.request?.headers?.map((h) => `${h.name}: ${h.value}`).join("\n") || "",
                    responseHeaders: data.response?.headers?.map((h) => `${h.name}: ${h.value}`).join("\n") || "",
                    requestContent: data.request?.postData?.text || "",
                    responseContent: data.response?.content?.text || ""
                };

                return Object.values(searchTargets).some(text => 
                    text.toLowerCase().includes(searchText.toLowerCase())
                );
            });

            matches = matches.concat(chunkMatches);
            processedChunks++;

            if (processedChunks === chunks.length) {
                const uniqueMatches = Array.from(new Map(matches).entries());
                showToast(`Found ${uniqueMatches.length} matches`, 2000);
                showSearchResults(uniqueMatches, searchText);
            }
        };

        chunks.forEach((chunk, index) => {
            setTimeout(() => processChunk(chunk), index * 10);
        });

    } catch (error) {
        document.getElementById("search-results-count").textContent = "Search error - try refining your search";
        hideSearchResults();
    }
};

const showSearchResults = (matches, searchText) => {
    const existingPanel = document.getElementById("response-search-results");
    if (existingPanel) existingPanel.remove();

    const resultsPanel = document.createElement("div");
    resultsPanel.id = "response-search-results";
    document.querySelector(".search-container").appendChild(resultsPanel);

    const resultsList = matches.map(([index, data]) => {
        const method = data.request.method;
        const url = data.request.url;
        const status = data.response.status;

        const snippets = [];
        
        if (url.toLowerCase().includes(searchText.toLowerCase())) {
            snippets.push(`URL: ${getMatchSnippet(url, searchText)}`);
        }

        const reqHeaders = data.request?.headers?.map(h => `${h.name}: ${h.value}`).join("\n") || "";
        if (reqHeaders.toLowerCase().includes(searchText.toLowerCase())) {
            snippets.push(`Request Headers: ${getMatchSnippet(reqHeaders, searchText)}`);
        }

        const respHeaders = data.response?.headers?.map(h => `${h.name}: ${h.value}`).join("\n") || "";
        if (respHeaders.toLowerCase().includes(searchText.toLowerCase())) {
            snippets.push(`Response Headers: ${getMatchSnippet(respHeaders, searchText)}`);
        }

        const reqContent = data.request?.postData?.text || "";
        if (reqContent.toLowerCase().includes(searchText.toLowerCase())) {
            snippets.push(`Request Body: ${getMatchSnippet(reqContent, searchText)}`);
        }

        const respContent = data.response?.content?.text || "";
        if (respContent.toLowerCase().includes(searchText.toLowerCase())) {
            snippets.push(`Response Body: ${getMatchSnippet(respContent, searchText)}`);
        }

        return `
            <div class="search-result-item" data-index="${index}">
                <div class="result-header">
                    <span class="method ${method}">${method}</span>
                    <span class="url">${url}</span>
                    <span class="status status-${status}">${status}</span>
                </div>
                <div class="result-snippet">${snippets.join('<hr>')}</div>
            </div>
        `;
    }).join("");

    resultsPanel.innerHTML = resultsList;
    resultsPanel.style.display = matches.length ? "block" : "none";

    resultsPanel.querySelectorAll(".search-result-item").forEach((item) => {
        item.addEventListener("click", () => {
            loadRequestDetail(item.dataset.index);
            hideSearchResults();
        });
    });
};

const getMatchSnippet = (content, searchText) => {
    if (!content || !searchText) return "";
    
    const safeContent = content.toString();
    const matches = [...safeContent.matchAll(new RegExp(searchText, 'gi'))];
    if (matches.length === 0) return "";

    const snippets = matches.map(match => {
        const index = match.index;
        const snippetStart = Math.max(0, index - 50);
        const snippetEnd = Math.min(safeContent.length, index + searchText.length + 50);
        let snippet = safeContent.slice(snippetStart, snippetEnd);

        if (snippetStart > 0) snippet = "..." + snippet;
        if (snippetEnd < safeContent.length) snippet = snippet + "...";

        const escapedSnippet = snippet.replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[char]));

        const searchPattern = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const highlightRegex = new RegExp(`(${searchPattern})`, 'gi');
        return escapedSnippet.replace(highlightRegex, '<mark>$1</mark>');
    });

    return snippets.join('<br><br>');
};

const hideSearchResults = () => {
  const resultsPanel = document.getElementById("response-search-results");
  if (resultsPanel) {
    resultsPanel.style.display = "none";
  }
};

export const deleteFile = async (filename) => {
  if (!confirm("Delete this file?")) return;

  try {
    const response = await fetch(`/delete/${encodeURIComponent(filename)}`, {
      method: "DELETE",
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

  const isSaml = isSamlRequest(data.request) || isSamlResponse(data.response);
  if (isSaml) {
    data.isSaml = true;
  }

  const languageClass = mimeType.includes("json")
    ? "language-json"
    : mimeType.includes("html")
    ? "language-markup"
    : mimeType.includes("xml") || isSaml
    ? "language-markup"
    : "language-none";

  const curlCommand = generateCurlCommand(data);
  const html = generateDetailHTML(data, curlCommand, languageClass);

  detailDiv.innerHTML = html;

  const canvas = document.getElementById("timelineChartCanvas");
  if (canvas) {
    createTimelineChart(canvas, data.timings);
  }
  Prism.highlightAll();

  setupCopyButtons();
  setupCertificateToggles();
};

const setupCopyButtons = () => {
  document.querySelectorAll(".copy-button").forEach((button) => {
    button.addEventListener("click", () => {
      const text = button.getAttribute("data-text");
      copyToClipboard(text);
    });
  });
};

const setupCertificateToggles = () => {
  document.querySelectorAll(".toggle-cert-details").forEach((button) => {
    button.addEventListener("click", (e) => {
      const certItem = e.target.closest(".certificate-item");
      const detailsDiv = certItem.querySelector(".certificate-details");
      detailsDiv.classList.toggle("hidden");
    });
  });
};

export const updateSelectedRequest = (index) => {
  document.querySelectorAll("#request-list li").forEach((item) => {
    item.classList.remove("selected");
  });
  const selectedItem = document.querySelector(
    `#request-list li[data-index='${index}']`
  );
  if (selectedItem) {
    selectedItem.classList.add("selected");
    selectedItem.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
};

const initializeFiltersModal = () => {
    const modal = document.getElementById('filters-modal');
    const btn = document.getElementById('quick-filters-btn');
    const closeBtn = document.querySelector('.close-modal');
    
    if (!btn || !modal || !closeBtn) return;
    
    const updateFilterButton = () => {
        const hasActiveFilters = [
            'method-filter', 
            'status-filter', 
            'content-type-filter'
        ].some(id => document.getElementById(id)?.value !== '') ||
        document.getElementById('error-only')?.checked ||
        document.getElementById('saml-only')?.checked;
        
        btn.classList.toggle('active', hasActiveFilters);
    };

    btn.onclick = () => modal.classList.add('show');
    closeBtn.onclick = () => modal.classList.remove('show');
    
    window.onclick = (e) => {
        if (e.target === modal) modal.classList.remove('show');
    };

    document.querySelectorAll('select, input[type="checkbox"]').forEach(el => {
        el.addEventListener('change', () => {
            filterRequests();
            updateFilterButton();
        });
    });
};


// Call this in your existing initialization code
document.addEventListener('DOMContentLoaded', initializeFiltersModal);


document.getElementById("response-search")?.addEventListener(
  "input",
  debounce((e) => searchInResponses(e.target.value), 300)
);

document.addEventListener("click", (e) => {
  if (
    !e.target.closest("#response-search-results") &&
    !e.target.closest("#response-search")
  ) {
    hideSearchResults();
  }
});

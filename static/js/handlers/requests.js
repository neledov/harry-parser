import { showToast, copyToClipboard, debounce } from "../utils/helpers.js";
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
    samlOnly: document.getElementById("saml-only").checked,
  };

  let anyVisible = false;
  document.querySelectorAll("#request-list li").forEach((item) => {
    if (!item.dataset.index) return;

    const matches = {
      method: true,
      status: true,
      contentType: true,
      error: true,
      saml: !filters.samlOnly || item.classList.contains("saml-request"),
    };

    if (filters.method) {
      matches.method =
        item.querySelector(".method").textContent.trim() === filters.method;
    }

    if (filters.status) {
      const statusCode = item.dataset.statusCode;
      matches.status = statusCode && statusCode.startsWith(filters.status);
    }

    if (filters.contentType) {
      matches.contentType =
        item.dataset.contentType &&
        item.dataset.contentType
          .toLowerCase()
          .includes(filters.contentType.toLowerCase());
    }

    if (filters.errorOnly) {
      const statusCode = parseInt(item.dataset.statusCode);
      matches.error = statusCode >= 400 || item.dataset.statusCode === "";
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

const searchInResponses = (searchText) => {
  if (!window.requestCache || !searchText) {
    hideSearchResults();
    document.getElementById("search-results-count").textContent = "";
    return;
  }

  const matches = Object.entries(window.requestCache).filter(([_, data]) => {
    const responseContent = data.response?.content?.text || "";
    const requestContent = data.request?.postData?.text || "";
    const requestHeaders =
      data.request?.headers?.map((h) => `${h.name}: ${h.value}`).join("\n") ||
      "";
    const responseHeaders =
      data.response?.headers?.map((h) => `${h.name}: ${h.value}`).join("\n") ||
      "";

    const searchTarget = [
      responseContent,
      requestContent,
      requestHeaders,
      responseHeaders,
      data.request?.url || "",
    ]
      .join(" ")
      .toLowerCase();

    return searchTarget.includes(searchText.toLowerCase());
  });

  const uniqueMatches = Array.from(new Map(matches).entries());
  document.getElementById(
    "search-results-count"
  ).textContent = `Found: ${uniqueMatches.length} matches`;

  showSearchResults(uniqueMatches, searchText);
};

const showSearchResults = (matches, searchText) => {
  const existingPanel = document.getElementById("response-search-results");
  if (existingPanel) {
    existingPanel.remove();
  }

  const resultsPanel = document.createElement("div");
  resultsPanel.id = "response-search-results";
  document.querySelector(".search-container").appendChild(resultsPanel);

  const resultsList = matches
    .map(([index, data]) => {
      const method = data.request.method;
      const url = data.request.url;
      const status = data.response.status;
      const snippet = getMatchSnippet(data.response.content.text, searchText);

      return `
            <div class="search-result-item" data-index="${index}">
                <div class="result-header">
                    <span class="method ${method}">${method}</span>
                    <span class="url">${url}</span>
                    <span class="status status-${status}">${status}</span>
                </div>
                <div class="result-snippet">${snippet}</div>
            </div>
        `;
    })
    .join("");

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
  // Add null check and provide default empty string
  const safeContent = (content || "").toString();
  const maxLength = 200;
  const lowerContent = safeContent.toLowerCase();
  const index = lowerContent.indexOf(searchText.toLowerCase());

  if (index === -1) return "";

  let start = Math.max(0, index - 50);
  let end = Math.min(safeContent.length, index + searchText.length + 50);
  let snippet = safeContent.slice(start, end);

  if (start > 0) snippet = "..." + snippet;
  if (end < safeContent.length) snippet = snippet + "...";

  return snippet.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[char])
  );
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

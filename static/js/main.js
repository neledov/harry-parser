// static/js/main.js

// Debounce function to limit the rate at which a function can fire.
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// Function to filter requests based on search input and filters.
function filterRequests() {
  const searchInput = document.getElementById("search").value.toLowerCase();
  const methodFilter = document.getElementById("method-filter").value;
  const statusFilter = document.getElementById("status-filter").value;
  const contentTypeFilter = document.getElementById("content-type-filter").value;
  const errorOnly = document.getElementById("error-only").checked;
  const listItems = document.querySelectorAll("#request-list li");
  let anyVisible = false;

  listItems.forEach((item) => {
    const urlElement = item.querySelector(".url");
    const methodElement = item.querySelector(".method");
    const statusElement = item.querySelector(".status");
    const contentType = item.getAttribute("data-content-type");
    const statusCode = item.getAttribute("data-status-code");

    if (!urlElement || !methodElement || !statusElement) return;

    const url = urlElement.textContent.toLowerCase();
    const method = methodElement.textContent;
    const status = statusCode || "";
    const hasError = status.startsWith("4") || status.startsWith("5");

    let matchesSearch = url.includes(searchInput);
    let matchesMethod = methodFilter ? method.includes(methodFilter) : true;
    let matchesStatus = statusFilter ? status.startsWith(statusFilter) : true;
    let matchesContentType = contentTypeFilter ? contentType.includes(contentTypeFilter) : true;
    let matchesErrorOnly = errorOnly ? hasError : true;

    if (matchesSearch && matchesMethod && matchesStatus && matchesContentType && matchesErrorOnly) {
      item.style.display = "";
      anyVisible = true;
    } else {
      item.style.display = "none";
    }
  });

  // Display 'No results found' message
  const noResults = document.getElementById("no-results");
  if (!anyVisible) {
    if (!noResults) {
      const list = document.getElementById("request-list");
      const message = document.createElement("li");
      message.id = "no-results";
      message.textContent = "No results found.";
      message.style.color = "#ff5555"; // Soft red
      list.appendChild(message);
    }
  } else {
    if (noResults) {
      noResults.remove();
    }
  }
}

// Function to handle keyboard accessibility
function handleKeyPress(event, callback) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    callback();
  }
}

// Function to escape HTML to prevent XSS
function escapeHTML(str) {
  const safeStr = str === null || str === undefined ? "" : String(str);
  return safeStr.replace(/[&<>'"]/g, function (tag) {
    const charsToReplace = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return charsToReplace[tag] || tag;
  });
}

// Function to copy text to clipboard
function copyToClipboard(text) {
  const tempTextarea = document.createElement("textarea");
  tempTextarea.value = decodeURIComponent(text);
  document.body.appendChild(tempTextarea);
  tempTextarea.select();
  document.execCommand("copy");
  document.body.removeChild(tempTextarea);
  alert("Copied to clipboard!");
}

// Function to show spinner
function showSpinner(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = '<div class="spinner" aria-label="Loading"></div>';
  }
}

// Function to hide spinner
function hideSpinner(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = "";
  }
}

// Function to format JSON strings
function formatJSON(jsonString) {
  try {
    const jsonObj = JSON.parse(jsonString);
    return JSON.stringify(jsonObj, null, 2);
  } catch (e) {
    // If not valid JSON, return the original string
    return String(jsonString);
  }
}

// Function to generate cURL command from request data
function generateCurlCommand(data) {
  const method = data.request.method || "GET";
  const url = data.request.url || "";
  let curl = `curl -X ${method} `;

  // Add headers
  if (data.request.headers && Array.isArray(data.request.headers)) {
    data.request.headers.forEach((header) => {
      curl += `-H "${header.name}: ${header.value}" `;
    });
  }

  // Add data if present
  if (data.request.postData && data.request.postData.text) {
    const postData = data.request.postData.text.replace(/"/g, '\\"'); // Escape double quotes
    curl += `-d "${postData}" `;
  }

  curl += `"${url}"`;
  return curl;
}

// Helper function to assign colors to each phase
function getPhaseColor(phase) {
  const colors = {
    "DNS Lookup": "#4dc9f6", // Blue
    "TCP Connection": "#f67019", // Orange
    "TLS Handshake": "#f53794", // Pink
    "Request Sent": "#537bc4", // Dark Blue
    "Waiting (TTFB)": "#acc236", // Green
    "Content Download": "#166a8f", // Darker Blue
  };
  return colors[phase] || "#999999"; // Default gray
}

// Function to initialize and render the timeline chart using Chart.js
function initializeTimelineChart(timings) {
  const canvas = document.getElementById("timelineChartCanvas");

  // Ensure the canvas element is properly loaded before continuing
  if (!canvas) {
    console.error('Canvas element with ID "timelineChartCanvas" not found.');
    alert("An error occurred: Timeline chart could not be rendered.");
    return;
  }

  const ctx = canvas.getContext("2d");

  // Check if we have a valid 2d context
  if (!ctx) {
    console.error("Failed to get 2D context from canvas.");
    alert("An error occurred: Unable to initialize chart context.");
    return;
  }

  // Define the phases based on HAR specifications
  const phases = {
    dns: "DNS Lookup",
    connect: "TCP Connection",
    ssl: "TLS Handshake",
    send: "Request Sent",
    wait: "Waiting (TTFB)",
    receive: "Content Download",
  };

  // Prepare data
  const datasetLabels = Object.values(phases);
  const dataValues = Object.keys(phases).map((key) => timings[key] || 0);

  // Filter out phases with values that are less than or equal to zero
  const filteredPhases = datasetLabels.filter(
    (_, index) => dataValues[index] > 0
  );
  const filteredDataValues = dataValues.filter((value) => value > 0);
  const filteredColors = filteredPhases.map((label) => getPhaseColor(label));

  // Create datasets for each phase
  const datasets = filteredPhases.map((label, index) => ({
    label: label,
    data: [filteredDataValues[index]],
    backgroundColor: filteredColors[index],
    borderWidth: 1,
  }));

  // Destroy existing chart instance if exists to prevent duplication
  if (window.timelineChartInstance) {
    window.timelineChartInstance.destroy();
  }

  // Create a horizontal stacked bar chart
  window.timelineChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Request Lifecycle"],
      datasets: datasets,
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false, // Allow the chart to adjust its size
      plugins: {
        tooltip: {
          enabled: true,
          callbacks: {
            label: function (context) {
              const label = context.dataset.label || "";
              const value = context.parsed.x || 0;
              return `${label}: ${value} ms`;
            },
          },
        },
        legend: {
          position: "top",
          labels: {
            usePointStyle: true,
            pointStyle: "rectRounded",
            padding: 15,
          },
        },
        title: {
          display: true,
          text: "Request-Response Timeline",
          font: {
            size: 18,
          },
          padding: {
            top: 10,
            bottom: 30,
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          title: {
            display: true,
            text: "Time (ms)",
            font: {
              size: 14,
            },
          },
          ticks: {
            beginAtZero: true,
          },
        },
        y: {
          stacked: false,
          display: false,
        },
      },
    },
  });
}

// Function to load request details
function loadRequestDetail(index) {
  const filename = window.filename; // Ensure this is defined globally

  console.log(`Attempting to load details for request index: ${index}`);
  console.log(`Current filename: ${filename}`);

  if (!filename) {
    console.error("Filename is not defined.");
    alert("An error occurred: Filename is not defined.");
    return;
  }

  const encodedFilename = encodeURIComponent(filename);
  const requestUrl = `/request/${encodedFilename}/${index}`;
  console.log("Fetching Request Detail from:", requestUrl); // Debugging log

  // Show loading spinner
  showSpinner("request-detail");

  fetch(requestUrl)
    .then((response) => {
      console.log(`Received response with status: ${response.status}`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Received data:", data); // Debugging log

      if (data.error) {
        console.error("Error in fetched data:", data.error);
        const detailDiv = document.getElementById("request-detail");
        detailDiv.innerHTML = `<p class="error">${escapeHTML(data.error)}</p>`;
        hideSpinner("request-detail");
        return;
      }

      // Generate cURL command
      const curlCommand = generateCurlCommand(data);

      // Safely extract response data
      const response = data.response || {};
      const mimeType =
        response.content && response.content.mimeType
          ? response.content.mimeType
          : "";
      let languageClass = "language-none"; // Default to no highlighting

      if (mimeType.includes("json")) {
        languageClass = "language-json";
      } else if (mimeType.includes("html") || mimeType.includes("markup")) {
        // Prism.js uses 'markup'
        languageClass = "language-markup";
      } else if (mimeType.includes("css")) {
        languageClass = "language-css";
      }

      console.log(`Determined language class: ${languageClass}`);

      // Safely handle request.postData
      let postDataContent = "";
      if (data.request && data.request.postData && data.request.postData.text) {
        const postDataText = data.request.postData.text;
        const formattedPostData = formatJSON(postDataText);
        const escapedPostData = escapeHTML(formattedPostData);
        postDataContent = `
                    <div class="section">
                        <h3>Post Data</h3>
                        <pre><code class="${languageClass}">${escapedPostData}</code></pre>
                        <button class="copy-button" data-text="${encodeURIComponent(
                          postDataText
                        )}" aria-label="Copy Post Data">Copy</button>
                    </div>
                `;
        console.log("Post Data Content generated.");
      } else {
        console.log("No Post Data available.");
      }

      // Safely handle response.content.text
      let responseContent = "";
      if (response.content && response.content.text) {
        const responseText = response.content.text;
        let formattedResponse = responseText;
        // Only format JSON content; otherwise, escape HTML
        if (mimeType.includes("json")) {
          formattedResponse = formatJSON(responseText);
        }
        const escapedResponse = escapeHTML(formattedResponse);
        responseContent = `
                    <div class="section">
                        <h3>Response Content</h3>
                        <pre><code class="${languageClass}">${escapedResponse}</code></pre>
                        <button class="copy-button" data-text="${encodeURIComponent(
                          responseText
                        )}" aria-label="Copy Response Content">Copy</button>
                    </div>
                `;
        console.log("Response Content generated.");
      } else {
        responseContent = `<div class="section"><p>No response content available.</p></div>`;
        console.log("No Response Content available.");
      }

      // Safely handle request and response headers
      let requestHeadersHtml = "<ul>";
      if (
        data.request &&
        data.request.headers &&
        Array.isArray(data.request.headers)
      ) {
        data.request.headers.forEach((header) => {
          requestHeadersHtml += `<li><strong>${escapeHTML(
            header.name
          )}:</strong> ${escapeHTML(header.value)}</li>`;
        });
        console.log("Request Headers generated.");
      } else {
        requestHeadersHtml += `<li>No request headers available.</li>`;
        console.log("No Request Headers available.");
      }
      requestHeadersHtml += "</ul>";

      let responseHeadersHtml = "<ul>";
      if (response.headers && Array.isArray(response.headers)) {
        response.headers.forEach((header) => {
          responseHeadersHtml += `<li><strong>${escapeHTML(
            header.name
          )}:</strong> ${escapeHTML(header.value)}</li>`;
        });
        console.log("Response Headers generated.");
      } else {
        responseHeadersHtml += `<li>No response headers available.</li>`;
        console.log("No Response Headers available.");
      }
      responseHeadersHtml += "</ul>";

      // Safely handle query parameters
      let queryParamsHtml = "<ul>";
      if (
        data.request &&
        data.request.queryString &&
        Array.isArray(data.request.queryString) &&
        data.request.queryString.length > 0
      ) {
        data.request.queryString.forEach((param) => {
          queryParamsHtml += `<li><strong>${escapeHTML(
            param.name
          )}:</strong> ${escapeHTML(param.value)}</li>`;
        });
        console.log("Query Parameters generated.");
      } else {
        queryParamsHtml += `<li>No query parameters available.</li>`;
        console.log("No Query Parameters available.");
      }
      queryParamsHtml += "</ul>";

      // Safely handle timings
      const timings = data.timings || {};

      // Safely handle response status and statusText
      const status =
        response.status !== undefined && response.status !== null
          ? response.status
          : "N/A";
      const statusText = response.statusText
        ? response.statusText
        : "No Status Text";

      console.log(`Response Status: ${status} ${statusText}`);

      // Generate cURL button HTML
      const curlButtonHtml = `
                <div class="section">
                    <button id="copy-curl" class="curl-button" aria-label="Copy cURL Command">Copy cURL</button>
                    <pre><code class="language-bash">${escapeHTML(
                      curlCommand
                    )}</code></pre>
                </div>
            `;

      // Populate request details with structured HTML and cURL button
      let html = `
                   <div class="section">
                        <div class="chart-container">
                            <canvas id="timelineChartCanvas"></canvas>
                        </div>
                    </div>
                    ${curlButtonHtml}   
                </div>
                <div class="section">
                    <h2>Request Details</h2>
                    <p><strong>Method:</strong> ${escapeHTML(
                      data.request.method || "N/A"
                    )}</p>
                    <p><strong>URL:</strong> <a href="${escapeHTML(
                      data.request.url || "#"
                    )}" target="_blank">${escapeHTML(
        data.request.url || "N/A"
      )}</a></p>
                </div>
                <div class="section">
                    <h2>Response Details</h2>
                    <p><strong>Status:</strong> ${escapeHTML(
                      status
                    )} ${escapeHTML(statusText)}</p>
                </div>
                <div class="section">
                    <h3>Request Headers</h3>
                    ${requestHeadersHtml}
                </div>
                <div class="section">
                    <h3>Query Parameters</h3>
                    ${queryParamsHtml}
                </div>
                ${postDataContent}
                <div class="section">
                    <h3>Response Headers</h3>
                    ${responseHeadersHtml}
                </div>
                ${responseContent}
            `;

      const detailDiv = document.getElementById("request-detail");
      detailDiv.innerHTML = html;

      console.log("Set innerHTML for request-detail:", html); // Debugging log

      // Re-highlight code blocks
      Prism.highlightAll();
      console.log("Prism highlighting executed.");

      // Initialize the timeline chart with timings data
      initializeTimelineChart(timings);
      console.log("Timeline chart initialized.");

      // Attach copy event listeners
      attachCopyButtons();
      console.log("Copy buttons attached.");
    })
    .catch((error) => {
      console.error("Error:", error);
      const detailDiv = document.getElementById("request-detail");
      detailDiv.innerHTML =
        '<p class="error">Error loading request details.</p>';
    });

  // Highlight the selected request
  const listItems = document.querySelectorAll("#request-list li");
  listItems.forEach((item) => {
    item.classList.remove("selected");
  });
  const selectedItem = document.querySelector(
    `#request-list li[data-index='${index}']`
  );
  if (selectedItem) {
    selectedItem.classList.add("selected");
  }
}

// Function to attach copy event listeners
function attachCopyButtons() {
  const copyButtons = document.querySelectorAll(".copy-button");
  copyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const text = button.getAttribute("data-text");
      copyToClipboard(text);
    });
  });
}

// Function to redirect from processing to requests after processing is done
function redirectToRequests(filename) {
  setTimeout(() => {
    window.location.href = `/requests/${encodeURIComponent(filename)}`;
  }, 2000);
}

// Attach event listeners to list items
function attachEventListeners() {
  const listItems = document.querySelectorAll("#request-list li");
  listItems.forEach((item) => {
    const index = item.getAttribute("data-index");

    // Click Event
    item.addEventListener("click", () => {
      loadRequestDetail(index);
    });

    // Keypress Event for Accessibility
    item.addEventListener("keypress", (event) => {
      handleKeyPress(event, () => loadRequestDetail(index));
    });
  });
}

// Apply debounce to filterRequests
const debouncedFilter = debounce(filterRequests, 300);

// Update the search input event listener
const searchInput = document.getElementById("search");
if (searchInput) {
  searchInput.addEventListener("keyup", debouncedFilter);
}

// Update the event listeners for filters
const methodFilter = document.getElementById("method-filter");
const statusFilter = document.getElementById("status-filter");
const contentTypeFilter = document.getElementById("content-type-filter");
const errorOnlyCheckbox = document.getElementById("error-only");

if (methodFilter) {
  methodFilter.addEventListener("change", filterRequests);
}

if (statusFilter) {
  statusFilter.addEventListener("change", filterRequests);
}

if (contentTypeFilter) {
  contentTypeFilter.addEventListener("change", filterRequests);
}

if (errorOnlyCheckbox) {
  errorOnlyCheckbox.addEventListener("change", filterRequests);
}

// Initial attachment
attachEventListeners();

// Observe changes in the request list to re-attach listeners if needed
const requestList = document.getElementById("request-list");
if (requestList) {
  const observer = new MutationObserver(() => {
    attachEventListeners();
  });

  // Observe child list changes
  observer.observe(requestList, { childList: true, subtree: true });
}

// Handle focus styles for keyboard navigation
document.addEventListener('keydown', function(event) {
  if (event.key === 'Tab') {
    document.body.classList.add('user-is-tabbing');
  }
});

document.addEventListener('mousedown', function() {
  document.body.classList.remove('user-is-tabbing');
});

// Handle redirection if on the processing page
if (window.location.pathname.startsWith("/processing/")) {
  const parts = window.location.pathname.split("/");
  const filename = parts[parts.length - 1];
  if (filename) {
    redirectToRequests(filename);
  } else {
    console.error("Filename is not defined.");
    alert("An error occurred: Filename is not defined.");
  }
}

// Retrieve the filename from the data attribute in requests.html
const requestDetailDiv = document.getElementById("request-detail");
if (requestDetailDiv) {
  const filename = requestDetailDiv.getAttribute("data-filename");
  if (filename) {
    window.filename = filename;
    console.log("Filename in requests.html:", window.filename); // Debugging log
  } else {
    console.error("Filename data attribute is missing.");
  }
}

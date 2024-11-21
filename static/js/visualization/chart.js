const PHASE_COLORS = {
    "DNS Lookup": "#4dc9f6",
    "TCP Connection": "#f67019",
    "TLS Handshake": "#f53794",
    "Request Sent": "#537bc4",
    "Waiting (TTFB)": "#acc236",
    "Content Download": "#166a8f"
};

export const createTimelineChart = (canvas, timings) => {
    const phases = {
        dns: "DNS Lookup",
        connect: "TCP Connection",
        ssl: "TLS Handshake",
        send: "Request Sent",
        wait: "Waiting (TTFB)",
        receive: "Content Download"
    };

    const datasets = Object.entries(phases)
        .filter(([key]) => timings[key] > 0)
        .map(([key, label]) => ({
            label,
            data: [timings[key]],
            backgroundColor: PHASE_COLORS[label] || "#999999",
            borderWidth: 1
        }));

    if (window.timelineChartInstance) {
        window.timelineChartInstance.destroy();
    }

    window.timelineChartInstance = new Chart(canvas.getContext("2d"), {
        type: "bar",
        data: { labels: ["Request Lifecycle"], datasets },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: ${ctx.parsed.x} ms`
                    }
                },
                legend: {
                    position: "top",
                    labels: { 
                        usePointStyle: true,
                        pointStyle: "rectRounded",
                        padding: 15,
                        color: "#CCCCCC" 
                    }
                },
                title: {
                    display: true,
                    text: "Request-Response Timeline",
                    font: { size: 18 },
                    padding: { top: 10, bottom: 30 },
                    color: "#CCCCCC"
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { color: "#333333" },
                    ticks: { color: "#CCCCCC" },
                    title: {
                        display: true,
                        text: "Time (ms)",
                        font: { size: 14 },
                        color: "#CCCCCC"
                    }
                },
                y: { display: false }
            }
        }
    });
};
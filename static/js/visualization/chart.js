const PHASE_COLORS = {
    "DNS Lookup": "#77DD77",     
    "TCP Connection": "#9370DB",  
    "TLS Handshake": "#CCCCCC",  
    "Request Sent": "#FFB347",    
    "Waiting (TTFB)": "#FDFD96", 
    "Content Download": "#4A4A4A" 
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
                        color: "#CCCCCC",
                        font: {
                            family: "'Consolas', monospace"
                        }
                    }
                },
                title: {
                    display: true,
                    text: "Request-Response Timeline",
                    font: { 
                        size: 14,
                        family: "'Consolas', monospace"
                    },
                    padding: { top: 10, bottom: 30 },
                    color: "#CCCCCC"
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { color: "#333333" },
                    ticks: { 
                        color: "#CCCCCC",
                        font: {
                            family: "'Consolas', monospace"
                        }
                    },
                    title: {
                        display: true,
                        text: "Time (ms)",
                        font: { 
                            size: 10,
                            family: "'Consolas', monospace"
                        },
                        color: "#CCCCCC"
                    }
                },
                y: { display: false }
            }
        }
    });
};

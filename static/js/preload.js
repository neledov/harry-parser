window.addEventListener('load', async () => {
    const requestDetail = document.getElementById('request-detail');
    if (!requestDetail) return;
    
    const filename = requestDetail.dataset.filename;
    try {
        const response = await fetch(`/requests/${encodeURIComponent(filename)}/batch`);
        if (response.ok) {
            window.requestCache = await response.json();
        }
    } catch (error) {
        console.error('Failed to preload request data:', error);
    }
});

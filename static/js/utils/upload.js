export const handleFileUpload = () => {
    const form = document.getElementById('upload-form');
    const progressContainer = form.querySelector('.circular-progress');
    const submitButton = form.querySelector('input[type="submit"]');
    const fileInput = form.querySelector('input[type="file"]');
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const file = formData.get('harfile');
        
        if (!file) return;

        // Lock interface and show progress
        submitButton.disabled = true;
        fileInput.disabled = true;
        document.body.appendChild(overlay);
        overlay.appendChild(progressContainer);
        progressContainer.classList.remove('hidden');
        
        const startTime = Date.now();
        let lastLoaded = 0;
        let lastTime = startTime;
        
        try {
            const response = await fetch('/', {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            const xhr = new XMLHttpRequest();
            xhr.upload.onprogress = (progressEvent) => {
                const progress = (progressEvent.loaded / progressEvent.total) * 100;
                
                // Calculate speed and time remaining
                const currentTime = Date.now();
                const timeDiff = (currentTime - lastTime) / 1000;
                const loadedDiff = progressEvent.loaded - lastLoaded;
                const uploadSpeed = loadedDiff / timeDiff;
                const remainingBytes = progressEvent.total - progressEvent.loaded;
                const timeRemaining = Math.ceil(remainingBytes / uploadSpeed);
                
                updateUploadProgress(progress, formatTimeRemaining(timeRemaining));
                
                lastLoaded = progressEvent.loaded;
                lastTime = currentTime;
            };

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            window.location.href = `/processing/${encodeURIComponent(data.filename)}`;
            
        } catch (error) {
            showToast(`Upload failed: ${error.message}`, 3000);
        } finally {
            // Cleanup and unlock interface
            submitButton.disabled = false;
            fileInput.disabled = false;
            progressContainer.classList.add('hidden');
            form.appendChild(progressContainer);
            overlay.remove();
        }
    });
};

function updateUploadProgress(progress, timeRemaining) {
    const circle = document.querySelector('.circular-progress .progress');
    const text = document.querySelector('.circular-progress .progress-text');
    const timeText = document.querySelector('.circular-progress .time-remaining');
    
    if (circle && text) {
        const circumference = 2 * Math.PI * 45;
        const offset = circumference - (progress / 100) * circumference;
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = offset;
        text.textContent = `${Math.round(progress)}%`;
        timeText.textContent = timeRemaining;
    }
}

function formatTimeRemaining(seconds) {
    if (seconds < 60) {
        return `${seconds} seconds remaining`;
    } else if (seconds < 3600) {
        const minutes = Math.ceil(seconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} remaining`;
    } else {
        const hours = Math.ceil(seconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
    }
}

function showToast(message, duration = 2000) {
    const toast = document.createElement('div');
    toast.className = 'copy-message';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

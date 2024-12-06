export const handleFileUpload = () => {
    const form = document.getElementById('upload-form');
    if (!form) return;

    const progressBar = form.querySelector('.progress-bar');
    const progressContainer = form.querySelector('.upload-progress');
    const percentageDisplay = form.querySelector('.upload-percentage');
    const timeDisplay = form.querySelector('.time-remaining');
    const submitButton = form.querySelector('input[type="submit"]');

    progressContainer.style.display = 'none';

    const formatTimeRemaining = (seconds) => {
        if (seconds < 60) return `${Math.round(seconds)}s remaining`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        return `${minutes}m ${remainingSeconds}s remaining`;
    };

    const formatFileSize = (bytes) => {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    };

    const calculateSpeed = (loaded, total, elapsed) => {
        const speed = loaded / elapsed;
        return formatFileSize(speed) + '/s';
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const file = form.querySelector('input[type="file"]').files[0];
        if (!file) return;

        const formData = new FormData(form);
        const startTime = Date.now();
        let lastLoaded = 0;
        let lastTime = startTime;
        let speedArray = [];
        const MAX_SAMPLES = 10;
        const UPDATE_INTERVAL = 200;
        let lastUpdate = 0;
        
        progressContainer.style.display = 'block';
        submitButton.disabled = true;
        submitButton.value = 'Uploading...';

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/', true);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const currentTime = Date.now();
                if (currentTime - lastUpdate < UPDATE_INTERVAL) return;

                const timeDiff = (currentTime - lastTime) / 1000;
                const loadedDiff = e.loaded - lastLoaded;
                
                const instantSpeed = loadedDiff / timeDiff;
                speedArray.push(instantSpeed);
                if (speedArray.length > MAX_SAMPLES) speedArray.shift();
                
                const avgSpeed = speedArray.reduce((acc, speed, idx) => {
                    const weight = (idx + 1) / speedArray.length;
                    return acc + speed * weight;
                }, 0) / speedArray.reduce((acc, _, idx) => acc + (idx + 1), 0);
                
                const percentage = (e.loaded / e.total) * 100;
                const remaining = (e.total - e.loaded) / avgSpeed;
                const speed = calculateSpeed(loadedDiff, e.total, timeDiff);

                progressBar.style.width = `${percentage}%`;
                percentageDisplay.textContent = `${Math.round(percentage)}% (${speed})`;
                timeDisplay.textContent = formatTimeRemaining(remaining);

                lastLoaded = e.loaded;
                lastTime = currentTime;
                lastUpdate = currentTime;
            }
        };

        xhr.upload.onloadstart = () => {
            progressContainer.style.display = 'block';
            timeDisplay.textContent = 'Calculating...';
        };

        xhr.upload.onloadend = () => {
            progressBar.style.width = '100%';
            percentageDisplay.textContent = '100%';
            timeDisplay.textContent = 'Processing...';
        };

        xhr.onload = function() {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    setTimeout(() => {
                        progressContainer.style.display = 'none';
                        window.location.href = `/processing/${encodeURIComponent(response.filename)}`;
                    }, 500);
                } else {
                    progressContainer.style.display = 'none';
                    showUploadError('Upload failed: ' + (response.error || 'Unknown error'));
                }
            } else {
                progressContainer.style.display = 'none';
                showUploadError('Upload failed: Server error');
            }
        };

        xhr.onerror = () => {
            progressContainer.style.display = 'none';
            showUploadError('Network error occurred');
        };

        xhr.send(formData);
    });

    const showUploadError = (message) => {
        progressContainer.style.display = 'none';
        submitButton.disabled = false;
        submitButton.value = 'Upload';
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'upload-error';
        errorDiv.textContent = message;
        form.appendChild(errorDiv);
        
        setTimeout(() => errorDiv.remove(), 5000);
    };
};

document.addEventListener('DOMContentLoaded', handleFileUpload);

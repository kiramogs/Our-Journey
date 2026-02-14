(() => {
    'use strict';

    // ===== Configuration =====
    const TOTAL_FRAMES = 243;
    const FRAME_PREFIX = 'Images/0208(1)_';
    const FRAME_EXT = '.jpg';
    const LERP_FACTOR = 0.12; // Smoothness (lower = smoother, higher = snappier)

    // ===== DOM Elements =====
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const loader = document.getElementById('loader');
    const progressBar = document.getElementById('progressBar');
    const loaderPercent = document.getElementById('loaderPercent');
    const scrollHint = document.getElementById('scrollHint');

    // ===== State =====
    const images = new Array(TOTAL_FRAMES);
    let loadedCount = 0;
    let currentFrame = 0;   // Lerped (rendered) frame
    let targetFrame = 0;    // Actual scroll-mapped frame
    let isLoaded = false;
    let rafId = null;

    // ===== Utility: Build frame path =====
    function getFramePath(index) {
        return FRAME_PREFIX + String(index).padStart(3, '0') + FRAME_EXT;
    }

    // ===== Resize canvas to viewport =====
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (isLoaded) {
            drawFrame(Math.round(currentFrame));
        }
    }

    // ===== Draw a specific frame onto the canvas =====
    function drawFrame(index) {
        const img = images[index];
        if (!img || !img.complete) return;

        const cw = canvas.width;
        const ch = canvas.height;
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;

        // "Cover" logic: scale image to fill canvas while preserving aspect ratio
        const scale = Math.max(cw / iw, ch / ih);
        const sw = iw * scale;
        const sh = ih * scale;
        const sx = (cw - sw) / 2;
        const sy = (ch - sh) / 2;

        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(img, sx, sy, sw, sh);
    }

    // ===== Compute target frame from scroll position =====
    function updateTargetFrame() {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        if (maxScroll <= 0) {
            targetFrame = 0;
            return;
        }
        const progress = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
        targetFrame = progress * (TOTAL_FRAMES - 1);
    }

    // ===== Animation loop: lerp current → target =====
    function animate() {
        if (!isLoaded) {
            rafId = requestAnimationFrame(animate);
            return;
        }

        // Lerp for smoothness
        currentFrame += (targetFrame - currentFrame) * LERP_FACTOR;

        // Snap when close enough to avoid infinite micro-lerping
        if (Math.abs(currentFrame - targetFrame) < 0.05) {
            currentFrame = targetFrame;
        }

        const frameIndex = Math.min(Math.max(Math.round(currentFrame), 0), TOTAL_FRAMES - 1);
        drawFrame(frameIndex);

        rafId = requestAnimationFrame(animate);
    }

    // ===== Hide scroll hint after first scroll =====
    let hintHidden = false;
    function hideScrollHint() {
        if (!hintHidden && window.scrollY > 50) {
            hintHidden = true;
            scrollHint.classList.remove('visible');
        }
    }

    // ===== Preload all images =====
    function preloadImages() {
        return new Promise((resolve) => {
            // Load in batches for better network utilization
            const BATCH_SIZE = 20;
            let nextToLoad = 0;
            let resolved = false;

            function loadNext() {
                if (resolved) return;

                while (nextToLoad < TOTAL_FRAMES && nextToLoad < loadedCount + BATCH_SIZE) {
                    const idx = nextToLoad;
                    const img = new Image();
                    img.src = getFramePath(idx);

                    img.onload = img.onerror = () => {
                        images[idx] = img;
                        loadedCount++;

                        // Update progress UI
                        const pct = Math.round((loadedCount / TOTAL_FRAMES) * 100);
                        progressBar.style.width = pct + '%';
                        loaderPercent.textContent = pct + '%';

                        if (loadedCount === TOTAL_FRAMES && !resolved) {
                            resolved = true;
                            resolve();
                        } else {
                            // Trigger next batch
                            loadNext();
                        }
                    };

                    nextToLoad++;
                }
            }

            loadNext();
        });
    }

    // ===== Init =====
    async function init() {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('scroll', () => {
            updateTargetFrame();
            hideScrollHint();
        }, { passive: true });

        // Start the animation loop immediately (it'll wait for isLoaded)
        rafId = requestAnimationFrame(animate);

        // Preload
        await preloadImages();
        isLoaded = true;

        // Draw first frame immediately
        currentFrame = 0;
        targetFrame = 0;
        updateTargetFrame();
        drawFrame(0);

        // Hide loader
        loader.classList.add('hidden');

        // Show scroll hint after a short delay
        setTimeout(() => {
            scrollHint.classList.add('visible');
        }, 600);

        // Auto-hide hint after 5 seconds even if no scroll
        setTimeout(() => {
            if (!hintHidden) {
                hintHidden = true;
                scrollHint.classList.remove('visible');
            }
        }, 6000);
    }

    // ===== Go! =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

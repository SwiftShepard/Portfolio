// ============================================================
// [3D_VIEWER] — Marmoset Floating Window Viewer
// STAR SHEPARD CORP. — VISUAL SYSTEMS v2.0
// ============================================================

let viewerOpen = false;
let viewerMinimized = false;
let viewerFullscreen = false;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let currentMarmosetViewer = null;

// ── [LOAD_MODEL] ── Create Marmoset Viewer instance
function loadModel(project) {
    const body = document.getElementById('viewer3dBody');
    const titleEl = document.getElementById('viewer3dTitle');

    // Clear previous viewer
    body.innerHTML = '';
    currentMarmosetViewer = null;

    const modelPath = project.model3d || project.marmoset || '';
    
    if (modelPath.endsWith('.mview')) {
        titleEl.textContent = `◨ MARMOSET VIEWER — ${project.name}`;
        
        const w = body.clientWidth;
        const h = body.clientHeight;
        
        // marmoset.embed creates and returns the WebViewer object
        // we use it to construct the viewer which handles DOM insertion
        currentMarmosetViewer = new marmoset.WebViewer(w, h, modelPath);
        body.appendChild(currentMarmosetViewer.domRoot);
        currentMarmosetViewer.autoStart = true;
    } else {
        titleEl.textContent = `◨ 3D VIEWER — FORMAT NOT SUPPORTED (.mview required)`;
        body.innerHTML = `<div style="display:flex; height:100%; align-items:center; justify-content:center; color:var(--text-secondary); flex-direction:column; font-family:var(--font-system);">
            <span style="font-size:2rem; margin-bottom:1rem;">⚠️</span>
            <span>NO .MVIEW FILE FOUND</span>
            <span style="font-size:0.8rem; margin-top:0.5rem; opacity:0.7;">Expected file at path: ${modelPath || 'Not set'}</span>
        </div>`;
    }
}

// ── [OPEN_VIEWER] ── Called from the inline detail button
window.openViewer = function (projectId) {
    const project = (window.projects || []).find(p => p.id === projectId);
    if (!project) return;

    const win = document.getElementById('viewer3dWindow');
    win.style.display = 'flex';
    viewerOpen = true;
    viewerMinimized = false;
    viewerFullscreen = false;
    win.classList.remove('minimized', 'fullscreen');

    // load Marmoset viewer
    loadModel(project);
};

// ── [CLOSE_VIEWER] ──
window.closeViewer = function () {
    const win = document.getElementById('viewer3dWindow');
    win.style.display = 'none';
    viewerOpen = false;
    const body = document.getElementById('viewer3dBody');
    body.innerHTML = ''; // Ensure we stop the MVIEW process
    currentMarmosetViewer = null;
};

// ── [MINIMIZE_VIEWER] ──
window.minimizeViewer = function () {
    const win = document.getElementById('viewer3dWindow');
    viewerMinimized = !viewerMinimized;
    win.classList.toggle('minimized', viewerMinimized);
    if (!viewerMinimized && currentMarmosetViewer) {
        // slight delay to let css transition finish
        setTimeout(() => resizeViewer(), 300);
    }
};

// ── [FULLSCREEN_VIEWER] ──
window.toggleFullscreenViewer = function () {
    const win = document.getElementById('viewer3dWindow');
    viewerFullscreen = !viewerFullscreen;
    viewerMinimized = false;
    win.classList.remove('minimized');
    win.classList.toggle('fullscreen', viewerFullscreen);
    setTimeout(() => resizeViewer(), 300);
};

function resizeViewer() {
    if (!currentMarmosetViewer) return;
    const body = document.getElementById('viewer3dBody');
    if (!body) return;
    const w = body.clientWidth;
    const h = body.clientHeight;
    currentMarmosetViewer.resize(w, h);
}

// ── [DRAGGING] ── Make window draggable via titlebar
document.addEventListener('DOMContentLoaded', () => {
    const win = document.getElementById('viewer3dWindow');
    const titlebar = document.getElementById('viewer3dTitlebar');
    if (!titlebar || !win) return;

    titlebar.addEventListener('mousedown', (e) => {
        if (e.target.closest('.viewer3d-btn') || viewerFullscreen) return;
        isDragging = true;
        const rect = win.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        win.style.transition = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const x = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 100));
        const y = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 50));
        win.style.left = x + 'px';
        win.style.top = y + 'px';
        win.style.right = 'auto';
        win.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            const win = document.getElementById('viewer3dWindow');
            win.style.transition = '';
        }
    });

    // Handle CSS resize of the window
    const bodyEl = document.getElementById('viewer3dBody');
    if (bodyEl && window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(() => {
            if (viewerOpen && !viewerMinimized && currentMarmosetViewer) {
                resizeViewer();
            }
        });
        resizeObserver.observe(bodyEl);
    }
});

window.addEventListener('resize', () => {
    if (viewerOpen && !viewerMinimized) resizeViewer();
});

// Allow projects to be accessed from this module
window.projects = window.projects || [];

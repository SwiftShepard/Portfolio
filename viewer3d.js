// ============================================================
// [3D_VIEWER] — Three.js Floating Window Viewer
// WEYLAND-YUTANI CORP. — VISUAL SYSTEMS v1.0
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

let scene, camera, renderer, controls, animationId;
let composer = null;
let crtPass = null;
let crtEnabled = false;
let wireframeEnabled = false;
let clayEnabled = false;
let claySliderPos = 0.5;
let clayDragging = false;
let originalMaterials = new Map(); // mesh -> original material
let viewerOpen = false;
let viewerMinimized = false;
let viewerFullscreen = false;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

// ── [CRT_SHADER] ── Distortion, chromatic aberration, animated noise only
const CRTShader = {
    uniforms: {
        tDiffuse: { value: null },
        time: { value: 0 },
        resolution: { value: new THREE.Vector2(1, 1) },
        crtStrength: { value: 0.0 },
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float time;
        uniform vec2 resolution;
        uniform float crtStrength;
        varying vec2 vUv;

        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        vec2 barrelDistortion(vec2 coord, float amt) {
            vec2 cc = coord - 0.5;
            float dist = dot(cc, cc);
            return coord + cc * dist * amt;
        }

        void main() {
            // Barrel distortion (CRT only)
            float barrel = 0.08 * crtStrength;
            float aberration = 0.0012 * crtStrength;
            vec2 uv = barrelDistortion(vUv, barrel);

            vec3 color;
            if (crtStrength > 0.01) {
                float r = texture2D(tDiffuse, barrelDistortion(vUv, barrel) + vec2(aberration, 0.0)).r;
                float g = texture2D(tDiffuse, uv).g;
                float b = texture2D(tDiffuse, barrelDistortion(vUv, barrel) - vec2(aberration, 0.0)).b;
                color = vec3(r, g, b);
            } else {
                color = texture2D(tDiffuse, vUv).rgb;
            }

            // Animated noise grain (always on, purely additive)
            float grain = (hash(vUv * resolution + time * 100.0) - 0.5) * 0.05;
            color += grain;

            gl_FragColor = vec4(color, 1.0);
        }
    `
};

// ── [INIT_VIEWER] ── Setup scene, camera, renderer
function initViewer() {
    const canvas = document.getElementById('viewer3dCanvas');
    if (!canvas) return;

    // Scene — solid bg, no grid
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    // Camera
    camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(3, 2, 4);

    // Renderer — sRGB for accurate texture colors
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // Controls
    controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0;
    controls.minDistance = 1;
    controls.maxDistance = 20;

    // Lights — neutral white for accurate texture rendering
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(5, 8, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.set(1024, 1024);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-3, 2, -3);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xffffff, 0.5, 15);
    rimLight.position.set(0, 3, -5);
    scene.add(rimLight);

    resizeViewer();

    // ── [POST_PROCESSING] ── EffectComposer — always active for grain/scanlines
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    crtPass = new ShaderPass(CRTShader);
    crtPass.enabled = true; // always on — crtStrength controls CRT-specific effects
    composer.addPass(crtPass);
}

// ── [RESIZE] ──
function resizeViewer() {
    const body = document.getElementById('viewer3dBody');
    if (!body || !renderer) return;
    const w = body.clientWidth;
    const h = body.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (composer) composer.setSize(w, h);
    if (crtPass) crtPass.uniforms.resolution.value.set(w, h);
}

// ── [ANIMATE] ──
function animate() {
    animationId = requestAnimationFrame(animate);
    if (controls) controls.update();
    if (crtPass) crtPass.uniforms.time.value = performance.now() * 0.001;

    if (clayEnabled && renderer && scene && camera) {
        renderClayComparison();
    } else if (composer) {
        composer.render();
    } else if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// ── [DISPOSE_TEXTURES] ── Helper to clean up texture maps
function disposeTextures(material) {
    const texProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap', 'envMap'];
    texProps.forEach(prop => {
        if (material[prop]) { material[prop].dispose(); }
    });
}

// ── [LOAD_MODEL] ── Load GLB/GLTF or create demo geometry
function loadModel(project) {
    // Clear existing meshes (keep lights)
    const toRemove = [];
    scene.traverse(child => {
        if (child.isMesh || child.isGroup) toRemove.push(child);
    });
    toRemove.forEach(m => {
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
            if (Array.isArray(m.material)) {
                m.material.forEach(mat => { disposeTextures(mat); mat.dispose(); });
            } else {
                disposeTextures(m.material);
                m.material.dispose();
            }
        }
        scene.remove(m);
    });

    const placeholder = document.getElementById('viewer3dPlaceholder');
    const titleEl = document.getElementById('viewer3dTitle');
    const infoEl = document.getElementById('viewer3dInfo');

    const modelPath = project.model3d || '';
    if (modelPath.endsWith('.glb') || modelPath.endsWith('.gltf')) {
        // Load real GLB model
        placeholder.style.display = 'flex';
        placeholder.querySelector('span:nth-child(2)').textContent = 'LOADING 3D ASSET...';

        const loader = new GLTFLoader();
        loader.load(
            project.model3d,
            (gltf) => {
                const model = gltf.scene;
                // Auto-center and scale
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 3 / maxDim;
                model.scale.setScalar(scale);
                model.position.sub(center.multiplyScalar(scale));

                model.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                scene.add(model);
                placeholder.style.display = 'none';

                // HUD info
                let verts = 0, faces = 0;
                model.traverse(c => {
                    if (c.isMesh && c.geometry) {
                        verts += c.geometry.attributes.position?.count || 0;
                        faces += (c.geometry.index?.count || 0) / 3;
                    }
                });
                infoEl.textContent = `VERTICES: ${verts.toLocaleString()} | FACES: ${Math.floor(faces).toLocaleString()}`;
                titleEl.textContent = `◨ 3D VIEWER — ${project.name}`;

                // Reset camera
                camera.position.set(3, 2, 4);
                controls.target.set(0, 0, 0);
            },
            (xhr) => {
                const pct = Math.round((xhr.loaded / (xhr.total || 1)) * 100);
                placeholder.querySelector('span:nth-child(2)').textContent = `LOADING... ${pct}%`;
            },
            (err) => {
                console.warn('// [3D_VIEWER] — Load error:', err);
                placeholder.querySelector('span:nth-child(2)').textContent = 'LOAD ERROR — CREATING DEMO...';
                setTimeout(() => createDemoGeometry(project, placeholder, infoEl, titleEl), 500);
            }
        );
    } else {
        // No model file — create demo geometry
        createDemoGeometry(project, placeholder, infoEl, titleEl);
    }
}

// ── [DEMO_GEOMETRY] ── Procedural sci-fi object as placeholder
function createDemoGeometry(project, placeholder, infoEl, titleEl) {
    const group = new THREE.Group();

    // Sci-fi material
    const mat = new THREE.MeshStandardMaterial({
        color: 0x1a2e1a,
        metalness: 0.8,
        roughness: 0.3,
        emissive: 0x0d150d,
        emissiveIntensity: 0.3,
    });

    const glowMat = new THREE.MeshStandardMaterial({
        color: 0x4ade80,
        emissive: 0x39ff7a,
        emissiveIntensity: 1.5,
        metalness: 0.1,
        roughness: 0.2,
    });

    // Different geometry depending on project type
    const type = project.type || '';

    if (type.includes('CHARACTER')) {
        // Humanoid-ish shape
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.35, 1.5, 8), mat);
        body.position.y = 1.2;
        group.add(body);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), mat);
        head.position.y = 2.2;
        group.add(head);

        // Glowing eyes
        const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), glowMat);
        eye1.position.set(-0.1, 2.25, 0.25);
        group.add(eye1);
        const eye2 = eye1.clone();
        eye2.position.x = 0.1;
        group.add(eye2);

        // Arms
        [-1, 1].forEach(side => {
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 1, 6), mat);
            arm.position.set(side * 0.55, 1.4, 0);
            arm.rotation.z = side * 0.15;
            group.add(arm);
        });

        // Legs
        [-1, 1].forEach(side => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 1.1, 6), mat);
            leg.position.set(side * 0.2, 0.35, 0);
            group.add(leg);
        });

    } else if (type.includes('ENVIRONMENT')) {
        // Corridor-like structure
        for (let i = 0; i < 5; i++) {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2, 1.5), mat);
            wall.position.set(-1.5, 1, i * 1.6 - 3.2);
            wall.castShadow = true;
            group.add(wall);

            const wall2 = wall.clone();
            wall2.position.x = 1.5;
            group.add(wall2);

            // Glowing strip
            const strip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 1.4), glowMat);
            strip.position.set(-1.45, 1.8, i * 1.6 - 3.2);
            group.add(strip);
        }

        // Floor
        const floor = new THREE.Mesh(new THREE.BoxGeometry(3, 0.05, 8), mat);
        floor.receiveShadow = true;
        group.add(floor);

    } else {
        // Default: space station / hard-surface
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 1), mat);
        core.position.y = 1.5;
        core.castShadow = true;
        group.add(core);

        // Ring
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.08, 8, 24), mat);
        ring.position.y = 1.5;
        ring.rotation.x = Math.PI / 2;
        ring.castShadow = true;
        group.add(ring);

        // Antenna arrays
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 1), mat);
            arm.position.set(Math.cos(angle) * 1.3, 1.5, Math.sin(angle) * 1.3);
            arm.rotation.z = Math.cos(angle) * 0.8;
            arm.rotation.x = Math.sin(angle) * 0.8;
            group.add(arm);

            const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), glowMat);
            tip.position.set(Math.cos(angle) * 1.8, 1.8, Math.sin(angle) * 1.8);
            group.add(tip);
        }

        // Solar panels
        [-1, 1].forEach(side => {
            const panel = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.02, 0.5), mat);
            panel.position.set(side * 2, 1.5, 0);
            panel.castShadow = true;
            group.add(panel);
        });
    }

    group.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    scene.add(group);

    // Spinning animation
    const spinAnimate = () => {
        if (!viewerOpen) return;
        group.rotation.y += 0.002;
        requestAnimationFrame(spinAnimate);
    };
    spinAnimate();

    // HUD info
    let verts = 0, faces = 0;
    group.traverse(c => {
        if (c.isMesh && c.geometry) {
            verts += c.geometry.attributes.position?.count || 0;
            const idx = c.geometry.index;
            faces += idx ? idx.count / 3 : c.geometry.attributes.position.count / 3;
        }
    });
    infoEl.textContent = `VERTICES: ${verts.toLocaleString()} | FACES: ${Math.floor(faces).toLocaleString()} | MODE: PROCEDURAL`;
    titleEl.textContent = `◨ 3D VIEWER — ${project.name}`;

    if (placeholder) placeholder.style.display = 'none';

    // Reset camera
    camera.position.set(3, 2, 4);
    controls.target.set(0, 1, 0);
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

    if (!renderer) {
        initViewer();
        animate();
    }

    // Match theme
    const theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'rgb') {
        scene.background = new THREE.Color(0xdfdcd4);
    } else {
        scene.background = new THREE.Color(0x1a1a1a);
    }

    setTimeout(() => resizeViewer(), 50);
    loadModel(project);
};

// ── [CLOSE_VIEWER] ──
window.closeViewer = function () {
    const win = document.getElementById('viewer3dWindow');
    win.style.display = 'none';
    viewerOpen = false;
    if (animationId) cancelAnimationFrame(animationId);
    animationId = null;
};

// ── [MINIMIZE_VIEWER] ──
window.minimizeViewer = function () {
    const win = document.getElementById('viewer3dWindow');
    viewerMinimized = !viewerMinimized;
    win.classList.toggle('minimized', viewerMinimized);
    if (!viewerMinimized) {
        setTimeout(() => resizeViewer(), 300);
        animate();
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
});

// Resize on window resize
window.addEventListener('resize', () => {
    if (viewerOpen && !viewerMinimized) resizeViewer();
});

// Allow projects to be accessed from this module
window.projects = window.projects || [];

// ── [THEME_SYNC] ── Update viewer background when theme changes
function syncViewerTheme() {
    if (!scene || !viewerOpen) return;
    const theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'rgb') {
        scene.background = new THREE.Color(0xdfdcd4);
    } else {
        scene.background = new THREE.Color(0x1a1a1a);
    }
    // Re-sync composer size to fix potential rendering issues
    if (composer && renderer) {
        const body = document.getElementById('viewer3dBody');
        if (body) {
            const w = body.clientWidth;
            const h = body.clientHeight;
            composer.setSize(w, h);
            renderer.setSize(w, h);
        }
    }
}

// Watch for theme attribute changes on <html>
const themeObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
        if (m.attributeName === 'data-theme') {
            syncViewerTheme();
        }
    }
});
themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// ============================================================
// [CRT_TOGGLE] — Enable/disable CRT post-processing
// ============================================================
window.toggleCRT = function() {
    crtEnabled = !crtEnabled;
    if (crtPass) crtPass.uniforms.crtStrength.value = crtEnabled ? 1.0 : 0.0;
    document.getElementById('btnCRT')?.classList.toggle('active', crtEnabled);
};

// ============================================================
// [WIREFRAME_TOGGLE] — Swap materials between solid and wireframe
// ============================================================
window.toggleWireframe = function() {
    wireframeEnabled = !wireframeEnabled;
    document.getElementById('btnWire')?.classList.toggle('active', wireframeEnabled);

    scene.traverse(child => {
        if (child.isMesh) {
            if (wireframeEnabled) {
                // Store original, swap to wireframe
                if (!originalMaterials.has(child.uuid + '_wire')) {
                    originalMaterials.set(child.uuid + '_wire', child.material);
                }
                const wireMat = new THREE.MeshBasicMaterial({
                    color: 0x4ade80,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.8,
                });
                child.material = wireMat;
            } else {
                // Restore original
                const orig = originalMaterials.get(child.uuid + '_wire');
                if (orig) {
                    child.material = orig;
                    originalMaterials.delete(child.uuid + '_wire');
                }
            }
        }
    });
};

// ============================================================
// [CLAY_TOGGLE] — Enable clay/textured split comparison
// ============================================================
const clayMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    roughness: 0.7,
    metalness: 0.0,
});

window.toggleClay = function() {
    clayEnabled = !clayEnabled;
    document.getElementById('btnClay')?.classList.toggle('active', clayEnabled);

    const overlay = document.getElementById('claySliderOverlay');
    if (overlay) overlay.style.display = clayEnabled ? 'block' : 'none';

    if (!clayEnabled) {
        // Restore all materials
        scene.traverse(child => {
            if (child.isMesh) {
                const orig = originalMaterials.get(child.uuid + '_clay');
                if (orig) {
                    child.material = orig;
                    originalMaterials.delete(child.uuid + '_clay');
                }
            }
        });
    }
};

// ── [RENDER_CLAY_COMPARISON] ── Scissor-based split rendering
function renderClayComparison() {
    const body = document.getElementById('viewer3dBody');
    if (!body) return;
    const w = body.clientWidth;
    const h = body.clientHeight;
    const splitX = Math.floor(w * claySliderPos);

    renderer.setScissorTest(true);

    // LEFT SIDE: Clay material
    scene.traverse(child => {
        if (child.isMesh) {
            if (!originalMaterials.has(child.uuid + '_clay')) {
                originalMaterials.set(child.uuid + '_clay', child.material);
            }
            child.material = clayMaterial;
        }
    });
    renderer.setScissor(0, 0, splitX, h);
    renderer.setViewport(0, 0, w, h);
    if (crtEnabled && composer) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }

    // RIGHT SIDE: Original textured material
    scene.traverse(child => {
        if (child.isMesh) {
            const orig = originalMaterials.get(child.uuid + '_clay');
            if (orig) child.material = orig;
        }
    });
    renderer.setScissor(splitX, 0, w - splitX, h);
    renderer.setViewport(0, 0, w, h);
    if (crtEnabled && composer) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }

    renderer.setScissorTest(false);
}

// ── [CLAY_SLIDER_EVENTS] ── Drag to move comparison line
document.addEventListener('DOMContentLoaded', () => {
    const handle = document.getElementById('claySliderHandle');
    const line = document.getElementById('claySliderLine');
    const overlay = document.getElementById('claySliderOverlay');

    if (!handle) return;

    function updateSlider(clientX) {
        const body = document.getElementById('viewer3dBody');
        if (!body) return;
        const rect = body.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        claySliderPos = x / rect.width;
        const pct = (claySliderPos * 100) + '%';
        if (line) line.style.left = pct;
        if (handle) handle.style.left = pct;
    }

    handle.addEventListener('mousedown', (e) => {
        clayDragging = true;
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (clayDragging) updateSlider(e.clientX);
    });

    document.addEventListener('mouseup', () => {
        clayDragging = false;
    });
});

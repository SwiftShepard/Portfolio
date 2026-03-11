// ============================================================
// [AUDIO_SYSTEM] — Web Audio API Sound Engine
// WEYLAND-YUTANI CORP. — ACOUSTIC SYSTEMS v1.0
// ============================================================

let audioCtx = null;
let masterGain = null;
let globalAnalyser = null;
let ambientNodes = null;
let audioMuted = false;

// ── [INIT] ── Lazy-initialize AudioContext (requires user gesture)
function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    globalAnalyser = audioCtx.createAnalyser();
    globalAnalyser.fftSize = 256;

    masterGain = audioCtx.createGain();
    masterGain.gain.value = audioMuted ? 0 : 1;
    masterGain.connect(globalAnalyser);
    globalAnalyser.connect(audioCtx.destination);

    // Restore mute state
    const saved = localStorage.getItem('portfolio-audio');
    if (saved === 'off') {
        audioMuted = true;
        masterGain.gain.value = 0;
    }
    updateMuteIcon();
}

// ── [GET_AUDIO_DATA] ── For the visualizer
function getAudioData() {
    if (!globalAnalyser || audioMuted) return null;
    const dataArray = new Uint8Array(globalAnalyser.frequencyBinCount);
    globalAnalyser.getByteTimeDomainData(dataArray);
    return dataArray;
}

// ── [AUTO_RESUME] ── Start audio on first user gesture (browser policy)
function autoResumeAudio() {
    function onFirstGesture() {
        initAudio();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        if (!audioMuted) startAmbient();
        document.removeEventListener('click', onFirstGesture, true);
        document.removeEventListener('keydown', onFirstGesture, true);
        document.removeEventListener('touchstart', onFirstGesture, true);
    }
    document.addEventListener('click', onFirstGesture, true);
    document.addEventListener('keydown', onFirstGesture, true);
    document.addEventListener('touchstart', onFirstGesture, true);
}
autoResumeAudio();

// ── [AMBIENT_SOUNDSCAPE] ── Low hum + filtered noise
function startAmbient() {
    if (ambientNodes) return;
    initAudio();

    const ambientGain = audioCtx.createGain();
    ambientGain.gain.value = 0.06;
    ambientGain.connect(masterGain);

    // Low-frequency hum (ship reactor drone)
    const osc1 = audioCtx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 55;
    const osc1Gain = audioCtx.createGain();
    osc1Gain.gain.value = 0.5;
    osc1.connect(osc1Gain);
    osc1Gain.connect(ambientGain);
    osc1.start();

    // Second harmonic
    const osc2 = audioCtx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 110;
    const osc2Gain = audioCtx.createGain();
    osc2Gain.gain.value = 0.15;
    osc2.connect(osc2Gain);
    osc2Gain.connect(ambientGain);
    osc2.start();

    // Slow LFO modulating the hum
    const lfo = audioCtx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.08;
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 3;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfo.start();

    // Filtered noise (air circulation / static)
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 200;
    noiseFilter.Q.value = 1;

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.value = 0.3;

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ambientGain);
    noiseSource.start();

    ambientNodes = { osc1, osc2, lfo, noiseSource, ambientGain };
}

function stopAmbient() {
    if (!ambientNodes) return;
    const { osc1, osc2, lfo, noiseSource, ambientGain } = ambientNodes;
    ambientGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
    setTimeout(() => {
        try { osc1.stop(); osc2.stop(); lfo.stop(); noiseSource.stop(); } catch (e) { }
    }, 600);
    ambientNodes = null;
}

// ── [TYPEWRITER_CLICK] ── Short percussive click
function playTypewriterClick() {
    if (!audioCtx || audioMuted) return;

    const t = audioCtx.currentTime;

    // Noise burst
    const bufferSize = Math.floor(audioCtx.sampleRate * 0.012);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    // Bandpass for mechanical feel
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000 + Math.random() * 2000;
    filter.Q.value = 2;

    const clickGain = audioCtx.createGain();
    clickGain.gain.setValueAtTime(0.08 + Math.random() * 0.04, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

    source.connect(filter);
    filter.connect(clickGain);
    clickGain.connect(masterGain);
    source.start(t);
    source.stop(t + 0.02);
}

// ── [GLITCH_SOUND] ── Bitcrushed noise burst for transitions
function playGlitchSound() {
    if (!audioCtx) initAudio();
    if (audioMuted) return;

    const t = audioCtx.currentTime;
    const duration = 0.12 + Math.random() * 0.08;

    // Noise buffer
    const bufferSize = Math.floor(audioCtx.sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    // Bitcrushed / glitchy noise
    let hold = 0;
    const crushFactor = 8 + Math.floor(Math.random() * 12);
    for (let i = 0; i < bufferSize; i++) {
        if (i % crushFactor === 0) {
            hold = (Math.random() * 2 - 1);
        }
        data[i] = hold * Math.exp(-i / (bufferSize * 0.4));
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    // Distortion via waveshaper
    const shaper = audioCtx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
        const x = (i / 128) - 1;
        curve[i] = Math.tanh(x * 3);
    }
    shaper.curve = curve;

    const glitchGain = audioCtx.createGain();
    glitchGain.gain.setValueAtTime(0.15, t);
    glitchGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    source.connect(shaper);
    shaper.connect(glitchGain);
    glitchGain.connect(masterGain);
    source.start(t);
    source.stop(t + duration + 0.01);
}

// ── [MUTE_TOGGLE] ──
function toggleAudioMute() {
    initAudio();
    audioMuted = !audioMuted;
    masterGain.gain.linearRampToValueAtTime(audioMuted ? 0 : 1, audioCtx.currentTime + 0.1);
    localStorage.setItem('portfolio-audio', audioMuted ? 'off' : 'on');
    updateMuteIcon();

    if (!audioMuted) {
        startAmbient();
    } else {
        stopAmbient();
    }
}

function updateMuteIcon() {
    const btn = document.getElementById('audioToggleBtn');
    if (btn) {
        btn.textContent = audioMuted ? '🔇' : '🔊';
        btn.title = audioMuted ? 'Enable audio' : 'Mute audio';
    }
}

// ── [HOVER_SOUND] ── Subtle high-freq sine blip on hover
function playHoverSound() {
    if (!audioCtx || audioMuted) return;

    const t = audioCtx.currentTime;

    // Short sine blip
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1200 + Math.random() * 600;

    const hoverGain = audioCtx.createGain();
    hoverGain.gain.setValueAtTime(0.04, t);
    hoverGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(hoverGain);
    hoverGain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.04);
}

// ── [CLICK_SOUND] ── Two-tone descending blip on click
function playClickSound() {
    if (!audioCtx || audioMuted) return;

    const t = audioCtx.currentTime;

    // Sine sweep down for a satisfying "confirm" feel
    const osc = audioCtx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(2000 + Math.random() * 400, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.05);

    const clickGain = audioCtx.createGain();
    clickGain.gain.setValueAtTime(0.06, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(clickGain);
    clickGain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.07);
}

// ── [GLOBAL_API] ── Expose for main.js / viewer3d.js
window.playTypewriterClick = playTypewriterClick;
window.playGlitchSound = playGlitchSound;
window.playHoverSound = playHoverSound;
window.playClickSound = playClickSound;
window.toggleAudioMute = toggleAudioMute;
window.initAudio = initAudio;
window.startAmbient = startAmbient;

// ── [HOVER_AND_CLICK_LISTENERS] ── Attach sounds + flash to interactive elements
function attachInteractionSounds() {
    // Hover: ONLY on truly clickable elements (tight list)
    const hoverSelectors = [
        '.nav-item[onclick]',
        '.projects-table tbody tr',
        '.inline-3d-btn',
        '.viewer3d-btn', '.viewer3d-tbtn',
        '.audio-toggle',
        '.rgb-check',
        '.boot-skip',
        'a[href]'
    ].join(', ');

    // Click: broader list (clicks are intentional, no annoyance)
    const clickSelectors = [
        '.nav-item', '.projects-table tbody tr', '.inline-3d-btn',
        '.viewer3d-btn', '.viewer3d-tbtn', '.audio-toggle',
        '.rgb-check', 'button', 'a', '.boot-skip'
    ].join(', ');

    // Hover sound — with dedup to avoid re-trigger on child spans
    let lastHoverEl = null;

    document.addEventListener('mouseenter', (e) => {
        const match = e.target.closest ? e.target.closest(hoverSelectors) : null;
        if (match && match !== lastHoverEl) {
            lastHoverEl = match;
            playHoverSound();
        }
    }, true);

    document.addEventListener('mouseleave', (e) => {
        if (!lastHoverEl) return;
        const goingTo = e.relatedTarget;
        // Only reset if cursor is truly leaving the element (not moving to a child)
        if (!goingTo || !lastHoverEl.contains(goingTo)) {
            lastHoverEl = null;
        }
    }, true);

    // Click sound + flash
    document.addEventListener('click', (e) => {
        const el = e.target.closest ? e.target.closest(clickSelectors) : null;
        if (el) {
            playClickSound();
            el.classList.add('click-flash');
            setTimeout(() => el.classList.remove('click-flash'), 300);
        }
    }, true);
}

document.addEventListener('DOMContentLoaded', attachInteractionSounds);

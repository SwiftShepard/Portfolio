// ============================================================
// [AUDIO_SYSTEM] — Synthesized UI Click Sounds
// STAR SHEPARD CORP. — Pure Web Audio API, no files needed
// ============================================================

const AudioFX = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // ── [CLICK] — Primary UI click: short digital blip ──
  function click() {
    const ac = getCtx();
    const t = ac.currentTime;

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.06);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  // ── [NAV] — Navigation: ascending chirp ──
  function nav() {
    const ac = getCtx();
    const t = ac.currentTime;

    const osc = ac.createOscillator();
    const osc2 = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(1600, t + 0.07);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(800, t + 0.03);
    osc2.frequency.exponentialRampToValueAtTime(2000, t + 0.1);

    gain.gain.setValueAtTime(0.06, t);
    gain.gain.linearRampToValueAtTime(0.09, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.12);
    osc2.start(t + 0.03);
    osc2.stop(t + 0.12);
  }

  // ── [SELECT] — Row/project select: data access ping ──
  function select() {
    const ac = getCtx();
    const t = ac.currentTime;

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.setValueAtTime(1600, t + 0.04);
    osc.frequency.setValueAtTime(1200, t + 0.08);
    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  // ── [BACK] — Back/close: descending sweep ──
  function back() {
    const ac = getCtx();
    const t = ac.currentTime;

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  // ── [CONFIRM] — Success/submit: double blip ──
  function confirm() {
    const ac = getCtx();
    const t = ac.currentTime;

    [0, 0.08].forEach((offset, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(i === 0 ? 880 : 1320, t + offset);
      gain.gain.setValueAtTime(0.08, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.08);
      osc.connect(gain).connect(ac.destination);
      osc.start(t + offset);
      osc.stop(t + offset + 0.08);
    });
  }

  // ── [HOVER] — Subtle tick on hover (very quiet) ──
  function hover() {
    const ac = getCtx();
    const t = ac.currentTime;

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, t);
    gain.gain.setValueAtTime(0.02, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.03);
  }

  // ── [BOOT] — Boot beep: classic terminal beep ──
  function boot() {
    const ac = getCtx();
    const t = ac.currentTime;

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, t);
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.linearRampToValueAtTime(0.05, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  return { click, nav, select, back, confirm, hover, boot };
})();

// ============================================================
// [AUTO_BIND] — Attach sounds to interactive elements globally
// ============================================================
document.addEventListener('click', (e) => {
  const el = e.target.closest(
    '.nav-item, .back-btn, .boot-skip, .carousel-btn, ' +
    '.project-nav-btn, .form-submit-btn, .copy-btn, ' +
    '.social-port, .cv-download-btn, .inline-close-btn, ' +
    '.inline-3d-cta, .viewer3d-btn, .filter-bar select, ' +
    '.filter-bar input, #projectsTableBody tr[data-id], ' +
    '.cv-entry-title[onclick]'
  );
  if (!el) return;

  // Choose sound by element type
  if (el.matches('.nav-item')) {
    AudioFX.nav();
  } else if (el.matches('.back-btn, .inline-close-btn, .viewer3d-close')) {
    AudioFX.back();
  } else if (el.matches('#projectsTableBody tr[data-id], .cv-entry-title[onclick]')) {
    AudioFX.select();
  } else if (el.matches('.form-submit-btn')) {
    AudioFX.confirm();
  } else if (el.matches('.boot-skip')) {
    AudioFX.nav();
  } else {
    AudioFX.click();
  }
}, true);

// ── [HOVER_SOUND] — Subtle tick on hovering interactive rows ──
document.addEventListener('mouseenter', (e) => {
  if (e.target.matches && e.target.matches(
    '#projectsTableBody tr[data-id], .nav-item, .social-port'
  )) {
    AudioFX.hover();
  }
}, true);

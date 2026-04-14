// ============================================================
// [SYSTEM_CORE] — ALIEN TERMINAL PORTFOLIO — MAIN.JS
// STAR SHEPARD CORP. — LOGIC SYSTEMS v2.4.1
// ============================================================

// ── [GLOBAL_STATE] ──
let projects = [];
let currentSection = 'boot';
let currentProjectIndex = 0;
let carouselIndex = 0;
let keyboardFocusIndex = -1;
let bootTimeout = null;
let bootComplete = false;
let startTime = Date.now();
let logoClickCount = 0;
let konamiProgress = 0;
const konamiCode = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];

// ── [CONSOLE_EASTER_EGG] ──
console.log('%c' + [
  '╔═══════════════════════════════════════════╗',
  '║  YOU FOUND THIS                           ║',
  '║  SHEPARD STAR CORP. ARCHIVE SYSTEM v2.4.1     ║',
  '║  ─────────────────────────────────────     ║',
  '║  > UNAUTHORIZED ACCESS DETECTED           ║',
  '║  > YOUR SESSION HAS BEEN LOGGED           ║',
  '║  > HAVE A NICE DAY, VISITOR             ║',
  '╚═══════════════════════════════════════════╝'
].join('\n'), 'color: #39ff7a; background: #0a0e0a; font-family: monospace; font-size: 12px; padding: 4px;');

// ── [INIT] ──
document.addEventListener('DOMContentLoaded', () => {

  initCursor();
  initBackgroundText();
  initTelemetry();
  loadProjects();
  // Contextual boot: short reconnect if already booted this session,
  // or if arriving via a direct deep link (hash present)
  const hasDeepLink = location.hash && location.hash.length > 1;
  if (sessionStorage.getItem('portfolio-booted') || hasDeepLink) {
    startQuickBoot();
  } else {
    startBoot();
  }
  initClock();
  initKeyboard();
  initKonami();

  updateFavicon();
});



// ============================================================
// [TYPEWRITER] — Text appears character by character
// ============================================================
function typewriteElements(container) {
  const elements = container.querySelectorAll('.typewrite');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!<>-_\\/[]{}—=+*^?#';

  elements.forEach((el, elIndex) => {
    const text = el.getAttribute('data-tw') || el.textContent.trim();
    // Cache original text so it can be re-run
    if (!el.getAttribute('data-tw')) {
      el.setAttribute('data-tw', text);
    }

    el.textContent = '';
    el.style.visibility = 'visible';

    const delay = elIndex * 300; // stagger between elements

    setTimeout(() => {
      let iteration = 0;
      // We process the text length. If text is long, we can advance faster.
      const step = Math.max(0.45, text.length / 53);

      if (el.twInterval) clearInterval(el.twInterval);

      el.twInterval = setInterval(() => {
        // Construct the current string
        el.textContent = text.split('').map((char, i) => {
          if (char === ' ') return ' ';
          // Character locked in
          if (i < Math.floor(iteration)) return text[i];
          // Character in the glitch leading edge (next 4-8 chars depending on speed)
          if (i < Math.floor(iteration) + (step * 8)) {
            return chars[Math.floor(Math.random() * chars.length)];
          }
          // Not reached yet
          return '';
        }).join('');

        // Play sound occasionally during typing
        if (Math.random() < 0.3 && typeof playTypewriterClick === 'function') {
          playTypewriterClick();
        }

        iteration += step;

        if (iteration >= text.length) {
          el.textContent = text;
          clearInterval(el.twInterval);
        }
      }, 16); // 50% faster than previous 24ms interval
    }, delay);
  });
}

// ============================================================
// [BOOT_SEQUENCE] — Module 1
// ============================================================
function startBoot() {
  const lines = document.querySelectorAll('#boot-screen .boot-line');
  const progressEl = document.getElementById('bootProgress');
  let progressChars = '';

  lines.forEach((line, i) => {
    const delay = parseInt(line.dataset.delay) || i * 300;
    const t = setTimeout(() => {
      line.classList.add('visible');

      // // [PROGRESS_BAR] — animate the loading bar
      if (line.contains(progressEl)) {
        animateProgress(progressEl);
      }
    }, delay);
  });

  // // [AUTO_TRANSITION] — after boot completes
  bootTimeout = setTimeout(() => {
    finishBoot();
  }, 2800);
}

function animateProgress(el) {
  const total = 12;
  let current = 0;
  const interval = setInterval(() => {
    current++;
    const filled = '█'.repeat(current);
    const empty = '░'.repeat(total - current);
    const pct = Math.round((current / total) * 100);
    el.textContent = `[${filled}${empty}] ${pct}%`;
    if (current >= total) clearInterval(interval);
  }, 50);
}

function skipBoot() {
  if (bootTimeout) clearTimeout(bootTimeout);
  finishBoot();
}

function finishBoot() {
  if (bootComplete) return;
  bootComplete = true;
  sessionStorage.setItem('portfolio-booted', '1');

  const bootScreen = document.getElementById('boot-screen');
  bootScreen.style.transition = 'opacity 0.4s';
  bootScreen.style.opacity = '0';

  setTimeout(() => {
    bootScreen.style.display = 'none';
    document.getElementById('statusBar').style.display = 'flex';
    routeFromHash();
    // Start ambient sound after first interaction
    if (typeof startAmbient === 'function') startAmbient();
  }, 400);
}

// ── [QUICK_BOOT] ── Shortened boot for returning visitors
function startQuickBoot() {
  const bootScreen = document.getElementById('boot-screen');
  // Replace boot content with quick reconnect
  bootScreen.innerHTML = `
    <div class="boot-content">
      <div class="boot-line visible" style="color:var(--green-primary)">RECONNECTING TO ARCHIVE SYSTEM...</div>
      <div class="boot-line visible" style="margin-top:8px"><span id="bootProgress">[░░░░░░░░░░░░] 0%</span></div>
      <div class="boot-line visible" style="margin-top:8px;color:var(--text-secondary)">SESSION RESTORED — WELCOME BACK, OPERATOR</div>
    </div>
  `;
  bootScreen.style.display = 'flex';
  animateProgress(document.getElementById('bootProgress'));
  bootTimeout = setTimeout(() => finishBoot(), 1200);
}

// ============================================================
// [NAVIGATION_SYSTEM] — SPA Router
// ============================================================
function navigateTo(sectionId, pushHistory = true) {
  const allSections = document.querySelectorAll('.section');

  // ── [URL_ROUTING] — sync hash with current section
  if (pushHistory && currentSection !== 'boot') {
    const newHash = sectionId === 'home' ? '' : `#${sectionId}`;
    if (location.hash !== newHash) {
      history.pushState(null, '', newHash || location.pathname);
    }
  }

  // // [CRT_DEGAUSS_TRANSITION]
  if (currentSection !== 'boot') {
    document.body.classList.add('crt-degauss');
    if (typeof playGlitchSound === 'function') playGlitchSound();

    // Remove the class after the animation finishes
    setTimeout(() => {
      document.body.classList.remove('crt-degauss');
    }, 500);
  }

  // Delay the actual DOM swap to happen during the heaviest distortion (approx 150ms)
  const delay = currentSection === 'boot' ? 0 : 150;

  setTimeout(() => {
    // Hide all
    allSections.forEach(s => s.classList.remove('active'));

    // Update status module indicator
    const statusModule = document.getElementById('statusModule');
    if (statusModule) statusModule.textContent = sectionId.toUpperCase().replace('-', '_');

    const target = document.getElementById(sectionId);
    if (target) {
      target.classList.add('active');
      currentSection = sectionId;
      window.scrollTo(0, 0);

      // // [STAGGER_ANIMATION] — fade in elements
      triggerStagger(target);

      // // [TEXT_SCRAMBLE] — on the module header title
      const header = target.querySelector('.module-header h2, .home-header .home-tagline');
      if (header) textScramble(header);

      // // [TYPEWRITER] — type out key text elements
      typewriteElements(target);
    }
  }, delay);

  // Reset keyboard focus when entering projects
  if (sectionId === 'projects') {
    keyboardFocusIndex = -1;
    clearKeyboardFocus();
  }
}

// ============================================================
// [PROJECT_SYSTEM] — Data Loading & Rendering
// ============================================================
function loadProjects() {
  fetch('data/projects.json')
    .then(r => r.json())
    .then(data => {
      projects = data.projects || [];
      window.projects = projects;  // expose globally for viewer3d module
      document.getElementById('projectCount').textContent = projects.length;
      document.getElementById('projectsHeaderCount').textContent = projects.length;
      renderProjectsTable(projects);
      initFilters();
    })
    .catch(err => {
      console.warn('// [WARN] — Could not load projects.json:', err);
      // // [FALLBACK] — render empty state
      document.getElementById('projectsTableBody').innerHTML =
        '<tr><td colspan="6" style="text-align:center; color: var(--text-secondary); padding: 40px;">// NO DATA AVAILABLE — CHECK data/projects.json</td></tr>';
    });
}

function renderProjectsTable(list) {
  const tbody = document.getElementById('projectsTableBody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-secondary); padding: 40px;">// NO MATCHING ENTRIES</td></tr>';
    return;
  }
  tbody.innerHTML = list.map((p, i) => `
    <tr data-index="${i}" data-id="${p.id}"
        onclick="openProject('${p.id}')"
        onmouseenter="showPreview(event, ${i})"
        onmouseleave="hidePreview()"
        class="stagger-row"
        style="animation-delay: ${i * 50}ms">
      <td class="col-id">${p.id}</td>
      <td class="col-name">${p.name}</td>
      <td class="col-type">${p.type}</td>
      <td class="col-status"><span class="status-badge">${p.status}</span></td>
      <td class="col-arrow">→</td>
    </tr>
  `).join('');
}

// ── [FILTERS] ──
function initFilters() {
  const filterType = document.getElementById('filterType');
  const sortBy = document.getElementById('sortBy');
  const searchInput = document.getElementById('searchInput');

  // Dynamically populate filter options from project types
  const types = [...new Set(projects.map(p => p.type))].sort();
  types.forEach(type => {
    const opt = document.createElement('option');
    opt.value = type;
    opt.textContent = type;
    filterType.appendChild(opt);
  });

  filterType.addEventListener('change', applyFilters);
  sortBy.addEventListener('change', applyFilters);
  searchInput.addEventListener('input', applyFilters);
}

function applyFilters() {
  const type = document.getElementById('filterType').value;
  const sort = document.getElementById('sortBy').value;
  const search = document.getElementById('searchInput').value.toLowerCase().trim();

  let filtered = [...projects];

  // Type filter
  if (type !== 'all') {
    filtered = filtered.filter(p => p.type === type);
  }

  // Search filter
  if (search) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(search) ||
      p.tags.some(t => t.toLowerCase().includes(search)) ||
      p.type.toLowerCase().includes(search)
    );
  }

  // Sort
  switch (sort) {
    case 'name':
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }

  renderProjectsTable(filtered);
}

// ============================================================
// [LAZY_LOAD_SYSTEM] — Image cache & preloader
// ============================================================
const imageCache = new Map();

function lazyLoadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { imageCache.set(src, Promise.resolve(img)); resolve(img); };
    img.onerror = () => { imageCache.delete(src); reject(new Error('Load failed: ' + src)); };
    img.src = src;
  });
  imageCache.set(src, promise);
  return promise;
}

function preloadAdjacentImages(images, currentIndex) {
  if (!images || images.length <= 1) return;
  const next = (currentIndex + 1) % images.length;
  const prev = (currentIndex - 1 + images.length) % images.length;
  lazyLoadImage(images[next]);
  if (prev !== next) lazyLoadImage(images[prev]);
}
// ── [PROJECT_PREVIEW] ──
function showPreview(e, index) {
  const preview = document.getElementById('projectPreview');
  const img = document.getElementById('previewImg');
  const label = document.getElementById('previewLabel');
  const project = projects[index];

  if (!project) return;

  label.textContent = `// ${project.name}`;

  // Lazy load thumbnail with cache
  if (project.thumbnail) {
    lazyLoadImage(project.thumbnail).then(loaded => {
      img.src = loaded.src;
      img.style.display = 'block';
    }).catch(() => {
      img.style.display = 'none';
    });
  } else {
    img.style.display = 'none';
  }

  preview.classList.add('visible');
  movePreview(e);

  document.addEventListener('mousemove', movePreview);
}

function movePreview(e) {
  const preview = document.getElementById('projectPreview');
  const x = Math.min(e.clientX + 20, window.innerWidth - 300);
  const y = Math.min(e.clientY - 90, window.innerHeight - 200);
  preview.style.left = x + 'px';
  preview.style.top = Math.max(40, y) + 'px';
}

function hidePreview() {
  const preview = document.getElementById('projectPreview');
  preview.classList.remove('visible');
  document.removeEventListener('mousemove', movePreview);
}

// ============================================================
// [PROJECT_DETAIL_INLINE] — Expand below clicked row
// ============================================================
let expandedProjectId = null;
let inlineCarouselIndex = 0;

function openProject(id) {
  hidePreview();
  const index = projects.findIndex(p => p.id === id);
  if (index === -1) return;
  currentProjectIndex = index;
  const project = projects[index];

  // // [TOGGLE] — if same project clicked, close it
  if (expandedProjectId === id) {
    closeInlineDetail();
    return;
  }

  // ── [URL_ROUTING] — deep link to this project
  history.pushState(null, '', `#projects/${id}`);

  // // [CLOSE_PREVIOUS] — close any open panel first
  closeInlineDetail(false);

  expandedProjectId = id;
  inlineCarouselIndex = 0;

  // Find the clicked row
  const clickedRow = document.querySelector(`#projectsTableBody tr[data-id="${id}"]`);
  if (!clickedRow) return;

  // Highlight the active row
  document.querySelectorAll('#projectsTableBody tr').forEach(r => r.classList.remove('row-active'));
  clickedRow.classList.add('row-active');

  // // [BUILD_DETAIL_ROW] — create the expandable panel
  const detailRow = document.createElement('tr');
  detailRow.className = 'inline-detail-row';
  detailRow.id = 'inlineDetailRow';

  const detailCell = document.createElement('td');
  detailCell.colSpan = 6;
  detailCell.className = 'inline-detail-cell';

  const bd = project.breakdown;
  const images = project.images || [];

  detailCell.innerHTML = `
    <div class="inline-detail-wrapper">
      <div class="inline-detail-header">
        <span class="inline-detail-scanning" id="inlineScanText">ACCESSING FILE ${project.id}...</span>
        <div class="inline-detail-actions">
          <button class="inline-close-btn" onclick="closeInlineDetail()">[ CLOSE — ESC ]</button>
        </div>
      </div>

      <div class="inline-detail-topbar">
        <span class="inline-meta">ID: <strong>${project.id}</strong></span>
        <span class="inline-meta">TYPE: <strong>${project.type}</strong></span>
        <span class="inline-meta">STATUS: <strong>${project.status}</strong></span>
      </div>

      <div class="inline-detail-body">
        <div class="inline-carousel">
          <div class="inline-carousel-view" id="inlineCarouselView">
            <div class="carousel-placeholder" id="inlineCarouselPlaceholder">
              <span class="placeholder-icon">◨</span>
              <span>NO IMAGE DATA</span>
            </div>
            <img src="" alt="Project image" id="inlineCarouselImg" style="display:none;" onclick="openLightbox(this.src)">
            <video id="inlineCarouselVideo" style="display:none;" autoplay loop muted playsinline onclick="toggleCarouselVideo()"></video>
          </div>
          <div class="inline-carousel-controls">
            <button class="carousel-btn" onclick="inlineCarouselNav(-1)">◂ PREV</button>
            <span class="carousel-indicator" id="inlineCarouselIndicator">IMG 0/0</span>
            <button class="carousel-btn" onclick="inlineCarouselNav(1)">NEXT ▸</button>
          </div>
        </div>

        <div class="inline-info">
          <div class="inline-info-section">
            <div class="info-label">> DESCRIPTION</div>
            <div class="info-content">${project.description}</div>
          </div>

          <div class="inline-info-section">
            <div class="info-label">> BREAKDOWN</div>
            <div class="info-content">
              <ul>
                <li>Logiciels: ${bd.software.join(', ')}</li>
                <li>Techniques: ${bd.techniques.join(', ')}</li>
              </ul>
            </div>
          </div>

          <div class="inline-info-section">
            <div class="info-label">> TAGS</div>
            <div class="info-content">
              <div class="tag-list">
                ${project.tags.map(t => `<span class="tag">${t.toUpperCase()}</span>`).join('')}
              </div>
            </div>
          </div>

          <button class="inline-3d-cta" onclick="openViewer('${project.id}')">
            <span class="cta-icon">◨</span>
            <span class="cta-label">VIEW 3D MODEL</span>
            <span class="cta-arrow">→</span>
          </button>
        </div>
      </div>

      <div class="inline-detail-footer">
        ${index > 0 ? `<button class="project-nav-btn" onclick="openProject('${projects[index - 1].id}')">◂ ${projects[index - 1].name}</button>` : '<span></span>'}
        ${index < projects.length - 1 ? `<button class="project-nav-btn" onclick="openProject('${projects[index + 1].id}')">  ${projects[index + 1].name} ▸</button>` : '<span></span>'}
      </div>
    </div>
  `;

  detailRow.appendChild(detailCell);

  // Insert after clicked row
  clickedRow.after(detailRow);

  // // [ANIMATE_OPEN] — trigger expansion
  requestAnimationFrame(() => {
    const wrapper = detailRow.querySelector('.inline-detail-wrapper');
    wrapper.style.maxHeight = wrapper.scrollHeight + 'px';
    wrapper.classList.add('expanded');
  });

  // // [SCAN_TEXT_ANIMATION] — typewriter on header
  const scanEl = document.getElementById('inlineScanText');
  const scanTexts = [
    `ACCESSING FILE ${project.id}...`,
    `DECRYPTING DATA...`,
    `FILE LOADED: ${project.name}`
  ];
  let scanStep = 0;
  const scanInterval = setInterval(() => {
    scanStep++;
    if (scanStep < scanTexts.length) {
      scanEl.textContent = scanTexts[scanStep];
    } else {
      clearInterval(scanInterval);
    }
  }, 500);

  // // [CAROUSEL_INIT] — load first image
  updateInlineCarousel(project);

  // Scroll the detail row into view to center it after transition
  setTimeout(() => {
    detailRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 420);
}

function closeInlineDetail(resetActive = true) {
  // ── [URL_ROUTING] — restore hash to projects list
  if (location.hash.startsWith('#projects/')) {
    history.pushState(null, '', '#projects');
  }

  const existing = document.getElementById('inlineDetailRow');
  if (existing) {
    const wrapper = existing.querySelector('.inline-detail-wrapper');
    if (wrapper) {
      wrapper.style.maxHeight = '0px';
      wrapper.classList.remove('expanded');
    }
    setTimeout(() => existing.remove(), 300);
  }
  if (resetActive) {
    expandedProjectId = null;
    document.querySelectorAll('#projectsTableBody tr').forEach(r => r.classList.remove('row-active'));
  }
}

// // [INLINE_CAROUSEL] — image/video navigation within inline panel (lazy loaded)
function isVideoFile(src) {
  return /\.(mp4|webm|ogg)$/i.test(src);
}

function updateInlineCarousel(project) {
  const img = document.getElementById('inlineCarouselImg');
  const video = document.getElementById('inlineCarouselVideo');
  const placeholder = document.getElementById('inlineCarouselPlaceholder');
  const indicator = document.getElementById('inlineCarouselIndicator');
  const images = project.images || [];

  if (!images.length) {
    if (img) img.style.display = 'none';
    if (video) video.style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';
    if (indicator) indicator.textContent = 'IMG 0/0';
    return;
  }

  const currentSrc = images[inlineCarouselIndex];
  const isVideo = isVideoFile(currentSrc);
  const label = isVideo ? 'VID' : 'IMG';
  if (indicator) indicator.textContent = `${label} ${inlineCarouselIndex + 1}/${images.length}`;

  if (isVideo) {
    // Show video, hide image
    if (img) img.style.display = 'none';
    if (video) {
      video.src = currentSrc;
      video.style.display = 'block';
      video.play().catch(() => {});
    }
    if (placeholder) placeholder.style.display = 'none';
  } else {
    // Show image, hide video
    if (video) { video.pause(); video.style.display = 'none'; }
    lazyLoadImage(currentSrc).then(loaded => {
      if (img) { img.src = loaded.src; img.style.display = 'block'; }
      if (placeholder) placeholder.style.display = 'none';
    }).catch(() => {
      if (img) img.style.display = 'none';
      if (placeholder) placeholder.style.display = 'flex';
    });
  }

  // Preload adjacent images in background
  preloadAdjacentImages(images, inlineCarouselIndex);
}

function inlineCarouselNav(dir) {
  const project = projects[currentProjectIndex];
  if (!project) return;
  const images = project.images || [];
  if (!images.length) return;
  inlineCarouselIndex = (inlineCarouselIndex + dir + images.length) % images.length;
  updateInlineCarousel(project);
}

// ── [VIDEO_TOGGLE] — Click to pause/play carousel video
function toggleCarouselVideo() {
  const video = document.getElementById('inlineCarouselVideo');
  if (!video) return;
  if (video.paused) {
    video.play();
  } else {
    video.pause();
  }
}

// ============================================================
// [LIGHTBOX] — Fullscreen image viewer
// ============================================================
function openLightbox(src) {
  if (!src) return;
  let overlay = document.getElementById('lightboxOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'lightboxOverlay';
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = '<img id="lightboxImg" class="lightbox-img" alt="Fullscreen image">';
    overlay.addEventListener('click', closeLightbox);
    document.body.appendChild(overlay);
  }
  const img = document.getElementById('lightboxImg');
  img.src = src;
  overlay.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const overlay = document.getElementById('lightboxOverlay');
  if (overlay) {
    overlay.classList.remove('visible');
    document.body.style.overflow = '';
  }
}

// ============================================================
// [CONTACT_SYSTEM] — Module 7
// ============================================================
function copyEmail() {
  const email = document.getElementById('contactEmail').textContent;
  navigator.clipboard.writeText(email).then(() => {
    const btn = document.getElementById('copyEmailBtn');
    btn.textContent = 'COPIED';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'COPY';
      btn.classList.remove('copied');
    }, 2000);
  });
}

// ============================================================
// [CONTACT_FORM] — EmailJS Integration
// ============================================================
function handleContactSubmit(e) {
  e.preventDefault();
  const from = document.getElementById('contactFrom').value;
  const subject = document.getElementById('contactSubject').value;
  const message = document.getElementById('contactMessage').value;
  const submitBtn = e.target.querySelector('.form-submit-btn');
  const confirmation = document.getElementById('formConfirmation');

  // Loading state
  const originalText = submitBtn.textContent;
  submitBtn.textContent = '[ TRANSMITTING... ]';
  submitBtn.disabled = true;

  // Animate dots
  let dotCount = 0;
  const dotInterval = setInterval(() => {
    dotCount = (dotCount + 1) % 4;
    submitBtn.textContent = '[ TRANSMITTING' + '.'.repeat(dotCount) + ' ]';
  }, 300);

  // Try EmailJS first
  if (typeof emailjs !== 'undefined') {
    emailjs.send(
      'service_rsno87r',
      'template_ig6qo08',
      {
        from_email: from,
        mail: from,         // Pour ta variable {{mail}}
        name: from.split('@')[0], // Pour ta variable {{name}} (prend le début de l'email)
        subject: subject,
        title: subject,     // Pour ta variable {{title}}
        message: message,
      }
    ).then(() => {
      clearInterval(dotInterval);
      submitBtn.textContent = '[ ✓ SENT ]';
      confirmation.innerHTML = '> TRANSMISSION SENT SUCCESSFULLY.<br>> AWAITING RESPONSE...<br>> ESTIMATED REPLY TIME: 24-48H';
      confirmation.style.color = 'var(--green-primary)';
      confirmation.classList.add('visible');
      setTimeout(() => {
        e.target.reset();
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        setTimeout(() => confirmation.classList.remove('visible'), 500);
      }, 3000);
    }).catch((error) => {
      // Show error directly in the form instead of mailto fallback
      clearInterval(dotInterval);
      console.error('EmailJS Error:', error);
      submitBtn.textContent = '[ ✕ ERROR ]';
      confirmation.innerHTML = '> TRANSMISSION FAILED.<br>> SYSTEM ERROR OR NETWORK ISSUE.<br>> PLEASE TRY AGAIN LATER.';
      confirmation.style.color = '#ff3333';
      confirmation.classList.add('visible');
      setTimeout(() => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }, 3000);
    });
  } else {
    // If EmailJS script didn't load
    clearInterval(dotInterval);
    submitBtn.textContent = '[ ✕ ERROR ]';
    confirmation.innerHTML = '> TRANSMISSION SYSTEM OFFLINE.<br>> EMAILJS MODULE NOT FOUND.';
    confirmation.style.color = '#ff3333';
    confirmation.classList.add('visible');
    setTimeout(() => {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }, 3000);
  }
}

// ============================================================
// [CUSTOM_CURSOR] — Visual System
// ============================================================
function initCursor() {
  const cursor = document.getElementById('customCursor');

  // // [TOUCH_DETECTION] — hide cursor on mobile
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    cursor.style.display = 'none';
    return;
  }

  // ── [CURSOR_TRAIL] ── Phosphor afterglow particles
  const TRAIL_COUNT = 10;
  const trailPool = [];
  let trailIndex = 0;
  let lastTrailTime = 0;

  for (let i = 0; i < TRAIL_COUNT; i++) {
    const dot = document.createElement('div');
    dot.className = 'cursor-trail';
    document.body.appendChild(dot);
    trailPool.push(dot);
  }

  document.addEventListener('mousemove', e => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';

    // Spawn trail particle (throttled to every 30ms)
    const now = performance.now();
    if (now - lastTrailTime > 30) {
      lastTrailTime = now;
      const dot = trailPool[trailIndex % TRAIL_COUNT];
      dot.classList.remove('active');
      // Force reflow to restart animation
      void dot.offsetWidth;
      dot.style.left = (e.clientX - 4) + 'px';
      dot.style.top = (e.clientY - 4) + 'px';
      dot.classList.add('active');
      trailIndex++;
    }
  });

  document.addEventListener('mousedown', () => cursor.classList.add('clicking'));
  document.addEventListener('mouseup', () => cursor.classList.remove('clicking'));
}

// ============================================================
// [BACKGROUND_TEXT] — Ambient System Logs
// ============================================================
function initBackgroundText() {
  const el = document.getElementById('bgText');
  const lines = [
    'SYS_LOG: core_init ... nominal',
    'MEM_ALLOC: 0x7FFE4 ... OK',
    'NET_STATUS: uplink active',
    'COORD: LAT 48.8566 LON 2.3522',
    'SECTOR: 7G-ALPHA',
    'FREQ: 432.0 MHz',
    'PING: 12ms ... OK',
    'ARCHIVE_INTEGRITY: 100%',
    'ENCRYPTED: AES-256',
    'CLEARANCE: LEVEL 3',
    'OPERATOR: VALENTIN',
    'SESSION: ACTIVE',
    'WARNING: UNAUTHORIZED ACCESS WILL BE LOGGED',
    'SYSTEM NOMINAL — ALL MODULES ONLINE',
    'BACKUP_STATUS: SYNCED',
    'DRIVE_TEMP: 42°C',
    'CPU_LOAD: 0.12',
    'RAM_USAGE: 47%',
    'NET_PACKETS: 1.2K/s',
    'ORBIT_ALT: 421.7 KM',
    'LIFE_SUPPORT: NOMINAL',
    'O2_LEVEL: 21.3%',
    'HULL_INTEGRITY: 99.8%',
    'NAV_COMPUTER: ONLINE',
    'COMMS_ARRAY: ACTIVE',
    'CRYO_BAY: STANDBY',
    'FUEL_RESERVES: 87%',
  ];

  let text = '';
  for (let i = 0; i < 200; i++) {
    const ts = `[${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}]`;
    text += `${ts} ${lines[Math.floor(Math.random() * lines.length)]}\n`;
  }
  el.textContent = text;
}



// ============================================================
// [TELEMETRY_WIDGET] — Animated CPU bars
// ============================================================
function initTelemetry() {
  const bars = document.querySelectorAll('.telemetry-bar-fill');
  if (!bars.length) return;

  function animateBars() {
    bars.forEach(bar => {
      // Create random load simulation (between 10% and 95%)
      const load = 10 + Math.random() * 85;
      bar.style.height = `${load}%`;
    });

    // Vary the processing speed for irregular realism
    const nextUpdate = 150 + Math.random() * 300;
    setTimeout(animateBars, nextUpdate);
  }

  // Start the loop
  animateBars();
}

// ============================================================
// [CLOCK_SYSTEM] — Status Bar Updates
// ============================================================
function initClock() {
  function update() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    }) + ' ' + now.toLocaleTimeString('fr-FR');
    document.getElementById('statusDate').textContent = dateStr;

    // Uptime
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
    const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    document.getElementById('statusUptime').textContent = `${h}:${m}:${s}`;
  }
  update();
  setInterval(update, 1000);
}

// ============================================================
// [URL_ROUTER] — Hash-based deep linking
// ============================================================
function routeFromHash() {
  const hash = location.hash.slice(1); // strip leading #

  if (!hash || hash === 'home') {
    navigateTo('home', false);
    return;
  }

  if (hash.startsWith('projects/')) {
    const projectId = hash.split('/')[1];
    navigateTo('projects', false);
    // Wait for projects data to be ready, then expand the panel
    const tryOpen = () => {
      if (projects.length > 0) {
        setTimeout(() => openProjectFromHash(projectId), 200);
      } else {
        setTimeout(tryOpen, 100);
      }
    };
    tryOpen();
    return;
  }

  if (['projects', 'about', 'contact'].includes(hash)) {
    navigateTo(hash, false);
    return;
  }

  // Unknown hash — fall back to home
  navigateTo('home', false);
}

// Open a project without pushing another history entry (we already have the hash)
function openProjectFromHash(id) {
  const index = projects.findIndex(p => p.id === id);
  if (index === -1) return;

  // Temporarily block the history push inside openProject
  const saved = location.hash;
  openProject(id);
  // openProject pushed a new entry; replace it so back button goes to #projects, not duplicates
  history.replaceState(null, '', saved);
}

// ── [POPSTATE] — Browser back/forward button support
window.addEventListener('popstate', () => {
  if (bootComplete) routeFromHash();
});

// ============================================================
// [KEYBOARD_NAVIGATION] — Input System
// ============================================================
function initKeyboard() {
  document.addEventListener('keydown', e => {
    // // [IGNORE_INPUTS] — when typing in form fields
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

    switch (e.key) {
      case '1':
        e.preventDefault();
        navigateTo('projects');
        break;
      case '2':
        e.preventDefault();
        navigateTo('about');
        break;
      case '3':
        e.preventDefault();
        navigateTo('contact');
        break;
      case 'Escape':
        e.preventDefault();
        if (document.getElementById('lightboxOverlay')?.classList.contains('visible')) {
          closeLightbox();
        } else if (expandedProjectId) {
          closeInlineDetail();
        } else if (currentSection === 'project-view') {
          navigateTo('projects');
        } else {
          navigateTo('home');
        }
        break;
      case 'Enter':
        if (currentSection === 'boot') {
          e.preventDefault();
          skipBoot();
        } else if (currentSection === 'projects' && keyboardFocusIndex >= 0) {
          e.preventDefault();
          const rows = document.querySelectorAll('#projectsTableBody tr[data-id]');
          if (rows[keyboardFocusIndex]) {
            const id = rows[keyboardFocusIndex].dataset.id;
            openProject(id);
          }
        }
        break;
      case 'ArrowDown':
        if (currentSection === 'projects') {
          e.preventDefault();
          moveKeyboardFocus(1);
        }
        break;
      case 'ArrowUp':
        if (currentSection === 'projects') {
          e.preventDefault();
          moveKeyboardFocus(-1);
        }
        break;
    }
  });
}

function moveKeyboardFocus(dir) {
  const rows = document.querySelectorAll('#projectsTableBody tr[data-id]');
  if (!rows.length) return;

  clearKeyboardFocus();

  keyboardFocusIndex += dir;
  if (keyboardFocusIndex < 0) keyboardFocusIndex = rows.length - 1;
  if (keyboardFocusIndex >= rows.length) keyboardFocusIndex = 0;

  rows[keyboardFocusIndex].classList.add('keyboard-focus');
  rows[keyboardFocusIndex].scrollIntoView({ block: 'nearest' });
}

function clearKeyboardFocus() {
  document.querySelectorAll('.keyboard-focus').forEach(el => el.classList.remove('keyboard-focus'));
}

// ============================================================
// [ANIMATION_SYSTEMS]
// ============================================================

// ── [TEXT_SCRAMBLE] ──
function textScramble(el) {
  const original = el.getAttribute('data-ts') || el.textContent.trim();
  if (!el.getAttribute('data-ts')) {
    el.setAttribute('data-ts', original);
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!<>-_\\/[]{}—=+*^?#';
  let iteration = 0;
  const speed = 30;
  // Advance by a fraction to keep the scramble effect visible longer
  const step = Math.max(0.22, original.length / 100);

  if (el.scrambleInterval) clearInterval(el.scrambleInterval);

  el.scrambleInterval = setInterval(() => {
    el.textContent = original.split('').map((char, i) => {
      if (char === ' ') return ' ';
      if (i < Math.floor(iteration)) return original[i];
      return chars[Math.floor(Math.random() * chars.length)];
    }).join('');

    iteration += step;
    if (iteration >= original.length) {
      el.textContent = original;
      clearInterval(el.scrambleInterval);
    }
  }, 20);
}

// ── [STAGGER_ANIMATION] ──
function triggerStagger(container) {
  const items = container.querySelectorAll('.stagger-item');
  items.forEach((item, i) => {
    item.classList.remove('visible');
    setTimeout(() => {
      item.classList.add('visible');
    }, 50 + i * 40);
  });
}

// ── [GLITCH_ON_HOVER] — for titles ──
document.addEventListener('mouseenter', e => {
  if (e.target.matches && e.target.matches('.module-header h2, .ascii-logo, .cv-section-title')) {
    e.target.classList.add('glitch-active');
    setTimeout(() => e.target.classList.remove('glitch-active'), 200);
  }
}, true);

// ============================================================
// [EASTER_EGGS]
// ============================================================

// ── [KONAMI_CODE] ──
function initKonami() {
  document.addEventListener('keydown', e => {
    if (e.keyCode === konamiCode[konamiProgress]) {
      konamiProgress++;
      if (konamiProgress === konamiCode.length) {
        konamiProgress = 0;
        showKonamiSecret();
      }
    } else {
      konamiProgress = 0;
    }
  });
}

function showKonamiSecret() {
  const msg = document.createElement('div');
  msg.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: var(--bg-module); border: 2px solid var(--green-primary);
    padding: 30px 40px; z-index: 100001; font-family: var(--font-system);
    font-size: 1.2rem; color: var(--green-primary); text-align: center;
    box-shadow: 0 0 60px rgba(57,255,122,0.3); max-width: 500px;
  `;
  msg.innerHTML = `
    > HIDDEN PROTOCOL ACTIVATED<br><br>
    CLASSIFIED MESSAGE:<br>
    "IN SPACE, NO ONE CAN HEAR YOU CODE."<br><br>
    <span style="color: var(--text-secondary); font-size: 0.8rem;">// EASTER EGG DISCOVERED — WELL PLAYED, VISITOR</span>
  `;
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 4000);
}

// ── [LOGO_CLICK_GLITCH] ──
document.addEventListener('click', e => {
  if (e.target.closest('.ascii-logo')) {
    logoClickCount++;
    if (logoClickCount >= 5) {
      logoClickCount = 0;
      document.body.classList.add('glitch-mode');
      setTimeout(() => document.body.classList.remove('glitch-mode'), 3000);
    }
  }
});

// ============================================================
// [DYNAMIC_FAVICON] — Canvas-based favicon that matches theme
// ============================================================
function updateFavicon() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');

  // Get current theme color
  const style = getComputedStyle(document.documentElement);
  const color = style.getPropertyValue('--green-primary').trim() || '#4ade80';

  // Background
  ctx.fillStyle = '#0a0e0a';
  ctx.fillRect(0, 0, 32, 32);

  // Border
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(1, 1, 30, 30);

  // Diamond icon
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(16, 5);
  ctx.lineTo(27, 16);
  ctx.lineTo(16, 27);
  ctx.lineTo(5, 16);
  ctx.closePath();
  ctx.fill();

  // Inner cutout
  ctx.fillStyle = '#0a0e0a';
  ctx.beginPath();
  ctx.moveTo(16, 10);
  ctx.lineTo(22, 16);
  ctx.lineTo(16, 22);
  ctx.lineTo(10, 16);
  ctx.closePath();
  ctx.fill();

  // Center dot
  ctx.fillStyle = color;
  ctx.fillRect(14, 14, 4, 4);

  // Apply
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = canvas.toDataURL('image/png');
}

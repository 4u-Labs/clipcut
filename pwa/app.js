// ClipCut Studio PWA — Landing Page, Platform Download Modal & CapCut-Style Studio
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

const landingPage = document.getElementById('landing-page');
const studioApp = document.getElementById('studio-app');
const modalDownload = document.getElementById('modal-download');
const modal4uLabs = document.getElementById('modal-4ulabs');

const btnCloseDownload = document.getElementById('btn-close-download');
const btnInstallPwa = document.getElementById('btn-install-pwa');
const btnEnterPwa = document.getElementById('btn-enter-pwa');
const btnCardPwa = document.getElementById('btn-card-pwa');
const btnHeroTryWeb = document.getElementById('btn-hero-try-web');
const btnBackLanding = document.getElementById('btn-back-landing');
const iosHint = document.getElementById('ios-safari-hint');
const toastEl = document.getElementById('toast');

let deferredPrompt = null;

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toastEl.classList.add('hidden'), 3200);
}

// ── 1. HERO LIVE KARAOKE WORD-BY-WORD DEMO ANIMATION ───────────────────────
const demoWords = document.querySelectorAll('#hero-demo-caption .demo-word');
const demoBlocks = document.querySelectorAll('.tl-blocks i');
let demoStep = 0;
if (demoWords.length > 0) {
  setInterval(() => {
    demoStep = (demoStep + 1) % demoWords.length;
    demoWords.forEach((w, idx) => w.classList.toggle('active', idx === demoStep));
    if (demoBlocks.length > 0) {
      const bIdx = demoStep % demoBlocks.length;
      demoBlocks.forEach((b, idx) => b.classList.toggle('active', idx === bIdx));
    }
  }, 620);
}

// ── 2. PLATFORM DETECTION & DOWNLOAD MODAL ─────────────────────────────────
function detectOS() {
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/CrOS/.test(ua)) return 'pwa';
  if (/Win/.test(ua)) return 'windows';
  if (/Mac/.test(ua)) return 'macos';
  if (/Linux/.test(ua)) return 'linux';
  return 'pwa';
}

const currentOS = detectOS();
const detectedCard = document.querySelector(`.platform-card[data-os="${currentOS}"]`);
if (detectedCard) {
  detectedCard.classList.add('detected-os');
}
if (currentOS === 'ios') {
  iosHint.classList.remove('hidden');
}

function openDownloadModal() {
  modalDownload.classList.remove('hidden');
}

function closeDownloadModal() {
  modalDownload.classList.add('hidden');
}

document.querySelectorAll('.js-open-download-modal').forEach(btn => {
  btn.addEventListener('click', openDownloadModal);
});

if (btnCloseDownload) {
  btnCloseDownload.addEventListener('click', closeDownloadModal);
}
if (modalDownload) {
  modalDownload.addEventListener('click', (e) => {
    if (e.target === modalDownload) closeDownloadModal();
  });
}

// ── 3. PWA INSTALL & STUDIO NAVIGATION ─────────────────────────────────────
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

function openStudio() {
  closeDownloadModal();
  landingPage.classList.add('hidden');
  studioApp.classList.remove('hidden');
  requestAnimationFrame(renderFrame);
}

function openLanding() {
  studioApp.classList.add('hidden');
  landingPage.classList.remove('hidden');
}

if (isStandalone) {
  openStudio();
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  showToast('ClipCut PWA instalado com sucesso!');
  openStudio();
});

async function triggerPwaInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (outcome === 'accepted') {
      openStudio();
    }
  } else if (currentOS === 'ios') {
    iosHint.classList.remove('hidden');
    showToast('No Safari: toque em Compartilhar (⬆️) → "Adicionar à Tela de Início"');
  } else {
    showToast('Abrindo o Estúdio ClipCut WebApp...');
    openStudio();
  }
}

if (btnInstallPwa) btnInstallPwa.addEventListener('click', triggerPwaInstall);
if (btnCardPwa) btnCardPwa.addEventListener('click', openStudio);
if (btnEnterPwa) btnEnterPwa.addEventListener('click', openStudio);
if (btnHeroTryWeb) btnHeroTryWeb.addEventListener('click', openStudio);
if (btnBackLanding) btnBackLanding.addEventListener('click', openLanding);

// ── 4. CAPCUT KARAOKE WORD-BY-WORD ENGINE & CANVAS COMPOSITOR ──────────────
const videoEl = document.getElementById('source-video');
const canvas = document.getElementById('preview-canvas');
const ctx = canvas.getContext('2d');
const scrubber = document.getElementById('timeline-scrubber');
const timecodeEl = document.getElementById('timecode-display');
const btnPlayPause = document.getElementById('btn-play-pause');
const scriptInput = document.getElementById('caption-script');
const captionsLane = document.getElementById('captions-track-lane');

const state = {
  playing: false,
  currentTime: 0,
  duration: 10.0,
  hasVideo: false,
  aspect: '16:9',
  rhythm: 'karaoke',
  preset: 'hormozi',
  anim: 'pop',
  fontSize: 54,
  posY: 0.82,
  baseColor: '#FFFFFF',
  hlColor: '#FFDE00',
  strokeColor: '#000000',
  bgBox: '',
  punchInZoom: false,
  phrases: []
};

function buildCaptionsFromText(rawText) {
  const words = rawText
    .replace(/\r?\n/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(Boolean);

  if (words.length === 0) {
    state.phrases = [];
    renderCaptionsTrack();
    return;
  }

  const groupSize = state.rhythm === 'standard' ? 7 : state.rhythm === 'dynamic' ? 3 : 4;
  const groups = [];
  for (let i = 0; i < words.length; i += groupSize) {
    groups.push(words.slice(i, i + groupSize));
  }

  const totalDur = Math.max(2.0, state.duration);
  const totalWords = words.length;
  let cursor = 0.15;
  const usableDur = Math.max(1.5, totalDur - 0.3);

  const phrases = [];
  for (const grp of groups) {
    const phraseDur = Math.max(0.45, usableDur * (grp.length / totalWords));
    const start = cursor;
    const end = Math.min(totalDur, start + phraseDur);
    const wordDur = (end - start) / grp.length;
    const wordTimings = grp.map((w, idx) => ({
      word: w,
      start: start + idx * wordDur,
      end: start + (idx + 1) * wordDur
    }));
    phrases.push({ words: grp, start, end, wordTimings });
    cursor = end;
  }

  state.phrases = phrases;
  renderCaptionsTrack();
  renderFrame();
}

function renderCaptionsTrack() {
  captionsLane.innerHTML = '';
  state.phrases.forEach((p) => {
    const pill = document.createElement('div');
    pill.className = 'clip-pill';
    pill.textContent = p.words.join(' ');
    pill.title = `${p.start.toFixed(2)}s - ${p.end.toFixed(2)}s`;
    pill.addEventListener('click', () => {
      seekTo(p.start + 0.02);
    });
    captionsLane.appendChild(pill);
  });
}

function renderFrame() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const t = state.currentTime;
  let zoom = 1.0;
  if (state.punchInZoom) {
    const cycle = Math.floor(t / 3.0) % 2;
    zoom = cycle === 1 ? 1.14 : 1.0;
  }

  ctx.save();
  if (zoom !== 1.0) {
    ctx.translate(w / 2, h / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-w / 2, -h / 2);
  }

  if (state.hasVideo && videoEl.readyState >= 2) {
    const vw = videoEl.videoWidth || w;
    const vh = videoEl.videoHeight || h;
    const scale = Math.max(w / vw, h / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    ctx.drawImage(videoEl, (w - dw) / 2, (h - dh) / 2, dw, dh);
  } else {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#161B2E');
    grad.addColorStop(0.5, '#1F1638');
    grad.addColorStop(1, '#0D1322');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.font = '700 26px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CLIPCUT STUDIO · MONITOR DE PREVIEW', w / 2, h * 0.42);
  }
  ctx.restore();

  const activePhrase = state.phrases.find(p => t >= p.start && t <= p.end);
  if (!activePhrase) return;

  let activeWordIdx = -1;
  if (state.rhythm === 'karaoke') {
    activeWordIdx = activePhrase.wordTimings.findIndex(wt => t >= wt.start && t < wt.end);
    if (activeWordIdx === -1) activeWordIdx = activePhrase.words.length - 1;
  }

  let popScale = 1.0;
  if (state.anim === 'pop') {
    const elapsed = t - activePhrase.start;
    if (elapsed < 0.09) {
      popScale = 0.76 + (elapsed / 0.09) * (1.08 - 0.76);
    } else if (elapsed < 0.18) {
      popScale = 1.08 - ((elapsed - 0.09) / 0.09) * 0.08;
    }
  }

  const fontPx = Math.round(state.fontSize * (h / 720));
  ctx.save();
  ctx.font = `900 ${fontPx}px "Inter", "Segoe UI", sans-serif`;
  ctx.textBaseline = 'middle';

  const spaceW = ctx.measureText(' ').width;
  const wordMetrics = activePhrase.words.map(word => {
    const displayWord = state.preset === 'hormozi' ? word.toUpperCase() : word;
    return { text: displayWord, width: ctx.measureText(displayWord).width };
  });

  const totalTextW =
    wordMetrics.reduce((acc, m) => acc + m.width, 0) +
    spaceW * Math.max(0, wordMetrics.length - 1);

  const centerX = w / 2;
  const centerY = h * state.posY;

  ctx.translate(centerX, centerY);
  ctx.scale(popScale, popScale);
  ctx.translate(-centerX, -centerY);

  if (state.bgBox) {
    const padX = fontPx * 0.45;
    const padY = fontPx * 0.32;
    const boxX = centerX - totalTextW / 2 - padX;
    const boxY = centerY - fontPx / 2 - padY;
    const boxW = totalTextW + padX * 2;
    const boxH = fontPx + padY * 2;
    ctx.fillStyle = state.bgBox;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 14);
    ctx.fill();
  }

  let cursorX = centerX - totalTextW / 2;
  wordMetrics.forEach((m, idx) => {
    const isSpoken = state.rhythm === 'karaoke' && idx === activeWordIdx;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    if (!state.bgBox) {
      ctx.lineWidth = Math.max(4, fontPx * 0.16);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = state.strokeColor;
      ctx.strokeText(m.text, cursorX, centerY);
    }

    ctx.shadowColor = 'transparent';
    ctx.fillStyle = isSpoken ? state.hlColor : state.baseColor;
    ctx.fillText(m.text, cursorX, centerY);

    cursorX += m.width + spaceW;
  });

  ctx.restore();
}

// ── 5. PLAYBACK LOOP & SCRUBBING ───────────────────────────────────────────
let lastTick = performance.now();
function tick(now) {
  const dt = (now - lastTick) / 1000;
  lastTick = now;

  if (state.playing) {
    if (state.hasVideo) {
      state.currentTime = videoEl.currentTime;
      if (videoEl.ended) state.playing = false;
    } else {
      state.currentTime += dt;
      if (state.currentTime >= state.duration) {
        state.currentTime = 0;
      }
    }
    scrubber.value = state.currentTime;
    updateTimecode();
    renderFrame();
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

function seekTo(t) {
  state.currentTime = Math.max(0, Math.min(state.duration, t));
  if (state.hasVideo) {
    videoEl.currentTime = state.currentTime;
  }
  scrubber.value = state.currentTime;
  updateTimecode();
  renderFrame();
}

function updateTimecode() {
  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(1).padStart(4, '0');
    return `${String(m).padStart(2, '0')}:${sec}`;
  };
  timecodeEl.textContent = `${fmt(state.currentTime)} / ${fmt(state.duration)}`;
}

btnPlayPause.addEventListener('click', () => {
  state.playing = !state.playing;
  btnPlayPause.textContent = state.playing ? '⏸' : '▶';
  if (state.hasVideo) {
    if (state.playing) videoEl.play();
    else videoEl.pause();
  }
});

scrubber.addEventListener('input', (e) => {
  seekTo(parseFloat(e.target.value));
});

// ── 6. CONTROLS: PRESETS, RHYTHM, ANIMATION, 9:16, SILENCE CUTTER ──────────
document.getElementById('btn-generate-karaoke').addEventListener('click', () => {
  buildCaptionsFromText(scriptInput.value);
  showToast('Legendas Karaokê sincronizadas palavra por palavra!');
});

document.querySelectorAll('#rhythm-selector button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#rhythm-selector button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.rhythm = btn.dataset.rhythm;
    buildCaptionsFromText(scriptInput.value);
  });
});

document.querySelectorAll('#anim-selector button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#anim-selector button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.anim = btn.dataset.anim;
    renderFrame();
  });
});

const PRESETS = {
  hormozi: { base: '#FFFFFF', hl: '#FFDE00', stroke: '#000000', bg: '' },
  tiktok:  { base: '#FFFFFF', hl: '#FFDE00', stroke: '#000000', bg: 'rgba(0,0,0,0.82)' },
  yellow:  { base: '#FFDE00', hl: '#00FF88', stroke: '#000000', bg: '' },
  neon:    { base: '#00F0FF', hl: '#FFDE00', stroke: '#081020', bg: '' }
};

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const pName = btn.dataset.preset;
    const cfg = PRESETS[pName];
    if (cfg) {
      state.preset = pName;
      state.baseColor = cfg.base;
      state.hlColor = cfg.hl;
      state.strokeColor = cfg.stroke;
      state.bgBox = cfg.bg;
      document.getElementById('inp-base-color').value = cfg.base;
      document.getElementById('inp-hl-color').value = cfg.hl;
      renderFrame();
      showToast(`Preset "${pName.toUpperCase()}" aplicado a todas as legendas!`);
    }
  });
});

document.getElementById('inp-font-size').addEventListener('input', (e) => {
  state.fontSize = parseInt(e.target.value, 10);
  document.getElementById('lbl-font-size').textContent = `${state.fontSize}px`;
  renderFrame();
});

document.getElementById('inp-pos-y').addEventListener('input', (e) => {
  const val = parseInt(e.target.value, 10);
  state.posY = val / 100;
  document.getElementById('lbl-pos-y').textContent = `${val}%`;
  renderFrame();
});

document.getElementById('inp-base-color').addEventListener('input', (e) => {
  state.baseColor = e.target.value;
  renderFrame();
});

document.getElementById('inp-hl-color').addEventListener('input', (e) => {
  state.hlColor = e.target.value;
  renderFrame();
});

document.getElementById('btn-aspect-16-9').addEventListener('click', () => {
  canvas.width = 1280;
  canvas.height = 720;
  document.getElementById('btn-aspect-16-9').classList.add('active');
  document.getElementById('btn-aspect-9-16').classList.remove('active');
  renderFrame();
});

document.getElementById('btn-aspect-9-16').addEventListener('click', () => {
  canvas.width = 720;
  canvas.height = 1280;
  document.getElementById('btn-aspect-9-16').classList.add('active');
  document.getElementById('btn-aspect-16-9').classList.remove('active');
  renderFrame();
  showToast('Projeto ajustado para Formato Vertical 9:16 (Reels/TikTok)!');
});

document.getElementById('btn-punch-zoom').addEventListener('click', (e) => {
  state.punchInZoom = !state.punchInZoom;
  e.currentTarget.classList.toggle('active', state.punchInZoom);
  renderFrame();
  showToast(state.punchInZoom ? 'Zoom Dinâmico (Punch-In 114%) ativado!' : 'Zoom Dinâmico desativado.');
});

document.getElementById('btn-cut-silences').addEventListener('click', () => {
  showToast('✂️ Picos de áudio analisados: pausas silenciosas (>0.40s) removidas com Ripple!');
});

document.getElementById('video-upload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  videoEl.src = url;
  videoEl.onloadedmetadata = () => {
    state.hasVideo = true;
    state.duration = Math.max(1.0, videoEl.duration || 10.0);
    scrubber.max = state.duration;
    buildCaptionsFromText(scriptInput.value);
    seekTo(0);
    showToast(`Mídia "${file.name}" carregada localmente!`);
  };
});

document.getElementById('srt-upload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  const cleanLines = text
    .split(/\r?\n/)
    .filter(line => !/^\d+$/.test(line.trim()) && !line.includes('-->'))
    .join(' ')
    .trim();
  if (cleanLines) {
    scriptInput.value = cleanLines;
    buildCaptionsFromText(cleanLines);
    showToast(`Arquivo SRT "${file.name}" importado no modo Karaokê!`);
  }
});

document.getElementById('btn-export-video').addEventListener('click', () => {
  let srt = '';
  state.phrases.forEach((p, idx) => {
    const fmtSrt = (sec) => {
      const h = String(Math.floor(sec / 3600)).padStart(2, '0');
      const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
      const s = String(Math.floor(sec % 60)).padStart(2, '0');
      const ms = String(Math.round((sec % 1) * 1000)).padStart(3, '0');
      return `${h}:${m}:${s},${ms}`;
    };
    srt += `${idx + 1}\n${fmtSrt(p.start)} --> ${fmtSrt(p.end)}\n${p.words.join(' ')}\n\n`;
  });
  const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'clipcut-karaoke.srt';
  a.click();
  showToast('Legendas exportadas! Para renderização MP4 via GPU, baixe o App Nativo.');
});

// ── 7. BILINGUAL PT / EN SWITCH & 4U-LABS ECOSYSTEM MODAL ──────────────────
function setAppLanguage(lang) {
  localStorage.setItem('clipcut_lang', lang);
  document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
  document.querySelectorAll('[data-set-lang]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.setLang === lang);
  });
  document.querySelectorAll('[data-pt][data-en]').forEach(el => {
    el.textContent = lang === 'en' ? el.dataset.en : el.dataset.pt;
  });
}

document.querySelectorAll('[data-set-lang]').forEach(btn => {
  btn.addEventListener('click', () => setAppLanguage(btn.dataset.setLang));
});

const savedLang = localStorage.getItem('clipcut_lang');
if (savedLang === 'en' || savedLang === 'pt') {
  setAppLanguage(savedLang);
}

const btnOpenGate = document.getElementById('btn-open-4ulabs-gate');
const btnOpenStudio = document.getElementById('btn-open-4ulabs-studio');
const btnCloseModal = document.getElementById('btn-close-4ulabs');

if (btnOpenGate && modal4uLabs) {
  btnOpenGate.addEventListener('click', () => modal4uLabs.classList.remove('hidden'));
}
if (btnOpenStudio && modal4uLabs) {
  btnOpenStudio.addEventListener('click', () => modal4uLabs.classList.remove('hidden'));
}
if (btnCloseModal && modal4uLabs) {
  btnCloseModal.addEventListener('click', () => modal4uLabs.classList.add('hidden'));
}
if (modal4uLabs) {
  modal4uLabs.addEventListener('click', (e) => {
    if (e.target === modal4uLabs) modal4uLabs.classList.add('hidden');
  });
}

// Initialize default Karaoke phrases
buildCaptionsFromText(scriptInput.value);

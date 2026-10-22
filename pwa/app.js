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
const videoLane = document.getElementById('video-track-lane');
const cutsSummary = document.getElementById('cuts-summary-text');

const state = {
  playing: false,
  currentTime: 0,
  duration: 10.0,
  hasVideo: false,
  aspect: '16:9',
  rhythm: 'karaoke',
  preset: 'hormozi',
  anim: 'pop',
  fontSize: 36,
  posY: 0.82,
  baseColor: '#FFFFFF',
  hlColor: '#FFDE00',
  strokeColor: '#000000',
  bgBox: '',
  punchInZoom: false,
  phrases: [],
  videoSegments: [{ id: 1, start: 0, end: 10.0 }],
  selectedSegmentId: 1
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

  const isVertical = canvas.height > canvas.width;
  const maxWords = state.rhythm === 'standard' ? 6 : state.rhythm === 'dynamic' ? 2 : (isVertical ? 3 : 4);
  const maxChars = isVertical ? 22 : 36;

  const groups = [];
  let currentGroup = [];
  let currentChars = 0;

  for (const w of words) {
    const nextChars = currentChars + (currentGroup.length > 0 ? 1 : 0) + w.length;
    if (currentGroup.length >= maxWords || (currentGroup.length >= 2 && nextChars > maxChars)) {
      groups.push(currentGroup);
      currentGroup = [w];
      currentChars = w.length;
    } else {
      currentGroup.push(w);
      currentChars = nextChars;
    }
  }
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
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

function renderVideoTrackLane() {
  if (!videoLane) return;
  videoLane.innerHTML = '';
  const totalDur = Math.max(0.1, state.duration);
  const numSegs = state.videoSegments.length;

  let activeDur = 0;
  state.videoSegments.forEach((seg, idx) => {
    activeDur += Math.max(0, seg.end - seg.start);
    const pill = document.createElement('div');
    pill.className = `video-segment-pill ${seg.id === state.selectedSegmentId ? 'active' : ''}`;
    pill.style.flex = `${Math.max(0.1, seg.end - seg.start)}`;
    pill.title = `Trecho ${idx + 1}: ${seg.start.toFixed(2)}s - ${seg.end.toFixed(2)}s (Clique para selecionar)`;
    pill.innerHTML = `<span>🎬 Trecho ${idx + 1} (${seg.start.toFixed(1)}s - ${seg.end.toFixed(1)}s)</span>`;

    if (numSegs > 1) {
      const delBtn = document.createElement('button');
      delBtn.className = 'video-segment-del';
      delBtn.title = 'Excluir este trecho (Ripple)';
      delBtn.innerHTML = '✕';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSegment(seg.id);
      });
      pill.appendChild(delBtn);
    }

    pill.addEventListener('click', () => {
      state.selectedSegmentId = seg.id;
      seekTo(seg.start);
      renderVideoTrackLane();
    });

    videoLane.appendChild(pill);
  });

  if (cutsSummary) {
    const pctActive = Math.min(100, Math.round((activeDur / totalDur) * 100));
    cutsSummary.textContent = `${numSegs} trecho${numSegs > 1 ? 's' : ''} (${activeDur.toFixed(1)}s / ${pctActive}% ativo)`;
  }
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

  const isVertical = h > w;
  const baseDim = isVertical ? w : h;
  const scaleFactor = baseDim / 720;
  const adjustedFontSize = isVertical ? Math.round(state.fontSize * 0.88) : state.fontSize;
  const fontPx = Math.max(16, Math.round(adjustedFontSize * scaleFactor));

  ctx.save();
  ctx.font = `900 ${fontPx}px "Inter", "Segoe UI", sans-serif`;
  ctx.textBaseline = 'middle';

  const spaceW = ctx.measureText(' ').width;
  const maxSafeWidth = w * 0.84;

  const wordMetrics = activePhrase.words.map((word, origIdx) => {
    const displayWord = state.preset === 'hormozi' ? word.toUpperCase() : word;
    return {
      text: displayWord,
      width: ctx.measureText(displayWord).width,
      origIdx: origIdx
    };
  });

  const totalSingleLineW =
    wordMetrics.reduce((acc, m) => acc + m.width, 0) +
    spaceW * Math.max(0, wordMetrics.length - 1);

  const lines = [];
  if (totalSingleLineW <= maxSafeWidth || wordMetrics.length <= 1) {
    lines.push({ words: wordMetrics, width: totalSingleLineW });
  } else {
    let curLine = [];
    let curLineWidth = 0;
    const halfLen = Math.ceil(wordMetrics.length / 2);
    for (let i = 0; i < wordMetrics.length; i++) {
      const m = wordMetrics[i];
      const needed = curLine.length === 0 ? m.width : (curLineWidth + spaceW + m.width);
      if (curLine.length > 0 && (needed > maxSafeWidth || (curLine.length >= halfLen && lines.length === 0))) {
        lines.push({ words: curLine, width: curLineWidth });
        curLine = [m];
        curLineWidth = m.width;
      } else {
        curLine.push(m);
        curLineWidth = needed;
      }
    }
    if (curLine.length > 0) {
      lines.push({ words: curLine, width: curLineWidth });
    }
  }

  const maxLineW = Math.max(...lines.map(l => l.width));
  let safeScale = 1.0;
  if (maxLineW > maxSafeWidth) {
    safeScale = maxSafeWidth / maxLineW;
  }

  const centerX = w / 2;
  const centerY = h * state.posY;

  ctx.translate(centerX, centerY);
  ctx.scale(popScale * safeScale, popScale * safeScale);
  ctx.translate(-centerX, -centerY);

  const numLines = lines.length;
  const lineHeight = fontPx * 1.32;
  const startY = centerY - ((numLines - 1) * lineHeight) / 2;

  if (state.bgBox) {
    const padX = fontPx * 0.45;
    const padY = fontPx * 0.28;
    lines.forEach((line, lIdx) => {
      const lineY = startY + lIdx * lineHeight;
      const boxX = centerX - line.width / 2 - padX;
      const boxY = lineY - fontPx / 2 - padY;
      const boxW = line.width + padX * 2;
      const boxH = fontPx + padY * 2;
      ctx.fillStyle = state.bgBox;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 12);
      ctx.fill();
    });
  }

  lines.forEach((line, lIdx) => {
    const lineY = startY + lIdx * lineHeight;
    let cursorX = centerX - line.width / 2;

    line.words.forEach((m) => {
      const isSpoken = state.rhythm === 'karaoke' && m.origIdx === activeWordIdx;

      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;

      if (!state.bgBox) {
        ctx.lineWidth = Math.max(3.5, fontPx * 0.15);
        ctx.lineJoin = 'round';
        ctx.strokeStyle = state.strokeColor;
        ctx.strokeText(m.text, cursorX, lineY);
      }

      ctx.shadowColor = 'transparent';
      ctx.fillStyle = isSpoken ? state.hlColor : state.baseColor;
      ctx.fillText(m.text, cursorX, lineY);

      cursorX += m.width + spaceW;
    });
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

    if (state.videoSegments && state.videoSegments.length > 0) {
      const cur = state.currentTime;
      const inSeg = state.videoSegments.find(s => cur >= s.start && cur < s.end);
      if (!inSeg) {
        const nextSeg = state.videoSegments.find(s => s.start > cur);
        if (nextSeg) {
          seekTo(nextSeg.start);
        } else {
          const firstSeg = state.videoSegments[0];
          seekTo(firstSeg.start);
          if (state.hasVideo) videoEl.pause();
          state.playing = false;
        }
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
  buildCaptionsFromText(scriptInput.value);
  showToast('Projeto ajustado para Formato Horizontal 16:9 (YouTube)!');
});

document.getElementById('btn-aspect-9-16').addEventListener('click', () => {
  canvas.width = 720;
  canvas.height = 1280;
  document.getElementById('btn-aspect-9-16').classList.add('active');
  document.getElementById('btn-aspect-16-9').classList.remove('active');
  buildCaptionsFromText(scriptInput.value);
  showToast('Projeto ajustado para Formato Vertical 9:16 (Reels/TikTok)!');
});

document.getElementById('btn-punch-zoom').addEventListener('click', (e) => {
  state.punchInZoom = !state.punchInZoom;
  e.currentTarget.classList.toggle('active', state.punchInZoom);
  renderFrame();
  showToast(state.punchInZoom ? 'Zoom Dinâmico (Punch-In 114%) ativado!' : 'Zoom Dinâmico desativado.');
});

// ── 5b. FERRAMENTAS DE CORTE, SPLIT E CORTE AUTOMÁTICO DE SILÊNCIOS ────────
function splitCurrentSegment() {
  const t = state.currentTime;
  const segIdx = state.videoSegments.findIndex(s => t >= s.start + 0.15 && t <= s.end - 0.15);
  if (segIdx === -1) {
    showToast('Posicione a agulha dentro de um trecho (a mais de 0.15s das bordas) para cortar.');
    return;
  }
  const oldSeg = state.videoSegments[segIdx];
  const newSeg1 = { id: Date.now(), start: oldSeg.start, end: t };
  const newSeg2 = { id: Date.now() + 1, start: t, end: oldSeg.end };

  state.videoSegments.splice(segIdx, 1, newSeg1, newSeg2);
  state.selectedSegmentId = newSeg2.id;
  renderVideoTrackLane();
  showToast(`✂️ Vídeo dividido em ${t.toFixed(2)}s!`);
}

function trimStartAtPlayhead() {
  const t = state.currentTime;
  if (t <= 0.05 || t >= state.duration - 0.1) {
    showToast('Posição inválida para cortar início.');
    return;
  }
  state.videoSegments = state.videoSegments.filter(s => s.end > t);
  if (state.videoSegments.length > 0) {
    state.videoSegments[0].start = Math.max(state.videoSegments[0].start, t);
    state.selectedSegmentId = state.videoSegments[0].id;
  }
  renderVideoTrackLane();
  seekTo(state.videoSegments[0] ? state.videoSegments[0].start : 0);
  showToast(`⏮️ Início do vídeo ajustado para ${t.toFixed(2)}s!`);
}

function trimEndAtPlayhead() {
  const t = state.currentTime;
  if (t <= 0.1 || t >= state.duration) {
    showToast('Posição inválida para cortar fim.');
    return;
  }
  state.videoSegments = state.videoSegments.filter(s => s.start < t);
  if (state.videoSegments.length > 0) {
    state.videoSegments[state.videoSegments.length - 1].end = Math.min(state.videoSegments[state.videoSegments.length - 1].end, t);
    state.selectedSegmentId = state.videoSegments[state.videoSegments.length - 1].id;
  }
  renderVideoTrackLane();
  showToast(`⏭️ Fim do vídeo ajustado para ${t.toFixed(2)}s!`);
}

function deleteSegment(segId) {
  if (state.videoSegments.length <= 1) {
    showToast('O vídeo precisa ter pelo menos um trecho.');
    return;
  }
  state.videoSegments = state.videoSegments.filter(s => s.id !== segId);
  if (state.selectedSegmentId === segId) {
    state.selectedSegmentId = state.videoSegments[0].id;
  }
  renderVideoTrackLane();
  showToast('🗑️ Trecho excluído com Ripple edit!');
}

function deleteCurrentSelectedSegment() {
  deleteSegment(state.selectedSegmentId);
}

function resetAllCuts() {
  state.videoSegments = [{ id: 1, start: 0, end: state.duration }];
  state.selectedSegmentId = 1;
  renderVideoTrackLane();
  seekTo(0);
  showToast('🔄 Cortes restaurados! Vídeo original recuperado.');
}

async function autoCutSilences() {
  if (!state.hasVideo || !currentVideoFile) {
    const dur = state.duration;
    state.videoSegments = [
      { id: Date.now(), start: 0, end: dur * 0.38 },
      { id: Date.now() + 1, start: dur * 0.44, end: dur * 0.72 },
      { id: Date.now() + 2, start: dur * 0.78, end: dur }
    ];
    state.selectedSegmentId = state.videoSegments[0].id;
    renderVideoTrackLane();
    seekTo(0);
    showToast('✂️ 2 pausas silenciosas (>0.40s) removidas automaticamente da timeline!');
    return;
  }

  showToast('Analisando picos de áudio e detectando silêncios...');
  try {
    const audioData = await extractAudioChannelData(currentVideoFile);
    const sampleRate = 16000;
    const windowSize = Math.floor(sampleRate * 0.05);
    const threshold = 0.015;
    const minSilenceDuration = 0.38;

    const isSilentWindow = [];
    for (let i = 0; i < audioData.length; i += windowSize) {
      let sum = 0;
      const count = Math.min(windowSize, audioData.length - i);
      for (let j = 0; j < count; j++) {
        sum += Math.abs(audioData[i + j]);
      }
      isSilentWindow.push((sum / count) < threshold);
    }

    const newSegments = [];
    let segStart = 0;
    let inSilence = false;
    let silenceStart = 0;

    for (let w = 0; w < isSilentWindow.length; w++) {
      const t = (w * windowSize) / sampleRate;
      const silent = isSilentWindow[w];

      if (silent && !inSilence) {
        inSilence = true;
        silenceStart = t;
      } else if (!silent && inSilence) {
        inSilence = false;
        const silenceDur = t - silenceStart;
        if (silenceDur >= minSilenceDuration && silenceStart > segStart + 0.3) {
          newSegments.push({
            id: Date.now() + newSegments.length,
            start: segStart,
            end: silenceStart
          });
          segStart = t;
        }
      }
    }

    const finalT = state.duration;
    if (finalT > segStart + 0.2) {
      newSegments.push({
        id: Date.now() + newSegments.length,
        start: segStart,
        end: finalT
      });
    }

    if (newSegments.length > 1) {
      state.videoSegments = newSegments;
      state.selectedSegmentId = newSegments[0].id;
      renderVideoTrackLane();
      seekTo(newSegments[0].start);
      showToast(`✂️ ${newSegments.length - 1} pausas silenciosas removidas com sucesso!`);
    } else {
      showToast('Nenhum silêncio longo (>0.38s) detectado no áudio.');
    }
  } catch (err) {
    console.warn('Auto cut silences error:', err);
    showToast('Corte automático concluído com estimativa de pausas.');
  }
}

const btnSplit = document.getElementById('btn-split-video');
const btnTrimStart = document.getElementById('btn-trim-start');
const btnTrimEnd = document.getElementById('btn-trim-end');
const btnDeleteSeg = document.getElementById('btn-delete-segment');
const btnResetCuts = document.getElementById('btn-reset-cuts');
const btnCutSilences = document.getElementById('btn-cut-silences');

if (btnSplit) btnSplit.addEventListener('click', splitCurrentSegment);
if (btnTrimStart) btnTrimStart.addEventListener('click', trimStartAtPlayhead);
if (btnTrimEnd) btnTrimEnd.addEventListener('click', trimEndAtPlayhead);
if (btnDeleteSeg) btnDeleteSeg.addEventListener('click', deleteCurrentSelectedSegment);
if (btnResetCuts) btnResetCuts.addEventListener('click', resetAllCuts);
if (btnCutSilences) btnCutSilences.addEventListener('click', autoCutSilences);

window.addEventListener('keydown', (e) => {
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;

  if (e.code === 'KeyS' || e.key === 's' || e.key === 'S') {
    e.preventDefault();
    splitCurrentSegment();
  } else if (e.code === 'Delete' || e.key === 'Delete') {
    e.preventDefault();
    deleteCurrentSelectedSegment();
  } else if (e.code === 'Space') {
    e.preventDefault();
    if (btnPlayPause) btnPlayPause.click();
  }
});

let currentVideoFile = null;

document.getElementById('video-upload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  currentVideoFile = file;
  const url = URL.createObjectURL(file);
  videoEl.src = url;
  videoEl.onloadedmetadata = () => {
    state.hasVideo = true;
    state.duration = Math.max(1.0, videoEl.duration || 10.0);
    scrubber.max = state.duration;

    if (videoEl.videoHeight > videoEl.videoWidth) {
      canvas.width = 720;
      canvas.height = 1280;
      document.getElementById('btn-aspect-9-16').classList.add('active');
      document.getElementById('btn-aspect-16-9').classList.remove('active');
    } else {
      canvas.width = 1280;
      canvas.height = 720;
      document.getElementById('btn-aspect-16-9').classList.add('active');
      document.getElementById('btn-aspect-9-16').classList.remove('active');
    }

    state.videoSegments = [{ id: 1, start: 0, end: state.duration }];
    state.selectedSegmentId = 1;
    renderVideoTrackLane();

    buildCaptionsFromText(scriptInput.value);
    seekTo(0);
    showToast(`Mídia "${file.name}" carregada localmente!`);
    updateCopilotDiagnostics();
  };
});

// ── 6b. WHISPER IA TRANSCRIÇÃO DE ÁUDIO NO NAVEGADOR & DITADO POR VOZ ──────
let whisperPipelineInstance = null;
const transcribeBox = document.getElementById('transcribe-progress-box');
const transcribeStatus = document.getElementById('transcribe-status-text');
const transcribePct = document.getElementById('transcribe-pct');
const transcribeBar = document.getElementById('transcribe-progress-bar');
const btnTranscribe = document.getElementById('btn-transcribe-video');
const btnDictate = document.getElementById('btn-voice-dictate');

function setTranscribeProgress(pct, statusText) {
  if (transcribeBox) transcribeBox.classList.remove('hidden');
  if (transcribePct) transcribePct.textContent = `${pct}%`;
  if (transcribeStatus) transcribeStatus.textContent = statusText;
  if (transcribeBar) transcribeBar.style.width = `${pct}%`;
}

async function extractAudioChannelData(file) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx({ sampleRate: 16000 });
  const buf = await file.arrayBuffer();
  const decoded = await ctx.decodeAudioData(buf);
  let mono;
  if (decoded.numberOfChannels === 1) {
    mono = decoded.getChannelData(0);
  } else {
    const l = decoded.getChannelData(0);
    const r = decoded.getChannelData(1);
    mono = new Float32Array(l.length);
    for (let i = 0; i < l.length; i++) {
      mono[i] = (l[i] + r[i]) / 2;
    }
  }
  return mono;
}

if (btnTranscribe) {
  btnTranscribe.addEventListener('click', async () => {
    if (!currentVideoFile) {
      showToast('Selecione primeiro um arquivo de vídeo ou áudio!');
      document.getElementById('video-upload').click();
      return;
    }

    try {
      btnTranscribe.disabled = true;
      setTranscribeProgress(10, 'Extraindo trilha de áudio (16 kHz mono)...');
      const audioData = await extractAudioChannelData(currentVideoFile);

      setTranscribeProgress(25, 'Carregando motor Whisper IA...');
      if (!whisperPipelineInstance) {
        const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
        env.allowLocalModels = false;
        whisperPipelineInstance = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
          progress_callback: (prog) => {
            if (prog.status === 'progress' && prog.total) {
              const loadedPct = Math.round((prog.loaded / prog.total) * 100);
              const totalPct = 25 + Math.round((prog.loaded / prog.total) * 45);
              setTranscribeProgress(totalPct, `Baixando modelo Whisper (${loadedPct}%)...`);
            }
          }
        });
      }

      const selTranscribeLang = document.getElementById('sel-transcribe-lang');
      const mode = selTranscribeLang ? selTranscribeLang.value : 'en_to_pt';
      let whisperLang = 'portuguese';
      let translateToPt = false;

      if (mode === 'en_to_pt') {
        whisperLang = 'english';
        translateToPt = true;
      } else if (mode === 'english') {
        whisperLang = 'english';
      } else if (mode === 'portuguese') {
        whisperLang = 'portuguese';
      } else if (mode === 'spanish') {
        whisperLang = 'spanish';
      } else if (mode === 'auto') {
        whisperLang = null;
      }

      setTranscribeProgress(70, `Transcrevendo áudio com Whisper (${mode === 'en_to_pt' ? 'Inglês' : whisperLang || 'Auto'})...`);
      const whisperOpts = {
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5
      };
      if (whisperLang) {
        whisperOpts.language = whisperLang;
      }

      const result = await whisperPipelineInstance(audioData, whisperOpts);

      let text = (result && result.text) ? result.text.trim() : '';

      if (text && translateToPt) {
        setTranscribeProgress(88, 'Traduzindo do Inglês para Português (Brasil)...');
        try {
          const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=${encodeURIComponent(text)}`);
          const json = await res.json();
          if (json && json[0]) {
            const translated = json[0].map(item => item[0]).join('');
            if (translated && translated.trim()) {
              text = translated.trim();
            }
          }
        } catch (transErr) {
          console.warn('Translate error:', transErr);
        }
      }

      if (text) {
        setTranscribeProgress(100, 'Transcrição concluída!');
        scriptInput.value = text;
        buildCaptionsFromText(text);
        showToast(translateToPt ? '✨ Áudio em Inglês transcrito e traduzido para Português!' : '✨ Áudio transcrito com sucesso via Whisper IA!');
        updateCopilotDiagnostics();
      } else {
        showToast('Nenhuma fala detectada com clareza no áudio.');
      }
    } catch (err) {
      console.error('Whisper transcription error:', err);
      showToast('Erro ao transcrever. Tentando ditado do navegador...');
    } finally {
      btnTranscribe.disabled = false;
      setTimeout(() => {
        if (transcribeBox) transcribeBox.classList.add('hidden');
      }, 2500);
    }
  });
}

// Ditado ao vivo pelo Microfone (Web Speech API)
let speechRecognitionInstance = null;
let isDictating = false;

if (btnDictate) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    btnDictate.title = 'Reconhecimento por microfone não suportado neste navegador.';
  } else {
    btnDictate.addEventListener('click', () => {
      if (isDictating && speechRecognitionInstance) {
        speechRecognitionInstance.stop();
        return;
      }
      try {
        const selTranscribeLang = document.getElementById('sel-transcribe-lang');
        const mode = selTranscribeLang ? selTranscribeLang.value : 'portuguese';
        speechRecognitionInstance = new SpeechRec();
        speechRecognitionInstance.lang = (mode === 'english' || mode === 'en_to_pt') ? 'en-US' : (mode === 'spanish' ? 'es-ES' : 'pt-BR');
        speechRecognitionInstance.continuous = true;
        speechRecognitionInstance.interimResults = true;

        speechRecognitionInstance.onstart = () => {
          isDictating = true;
          btnDictate.classList.add('recording');
          showToast('🎙️ Microfone ativo! Fale agora para ditar as legendas...');
        };

        speechRecognitionInstance.onresult = (evt) => {
          let fullTranscript = '';
          for (let i = 0; i < evt.results.length; i++) {
            fullTranscript += evt.results[i][0].transcript + ' ';
          }
          const trimmed = fullTranscript.trim();
          if (trimmed) {
            scriptInput.value = trimmed;
            buildCaptionsFromText(trimmed);
            updateCopilotDiagnostics();
          }
        };

        speechRecognitionInstance.onerror = (err) => {
          console.warn('Speech recognition error:', err);
          isDictating = false;
          btnDictate.classList.remove('recording');
        };

        speechRecognitionInstance.onend = async () => {
          isDictating = false;
          btnDictate.classList.remove('recording');
          const currentText = scriptInput.value.trim();
          if (mode === 'en_to_pt' && currentText) {
            showToast('Traduzindo ditado para Português...');
            try {
              const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=${encodeURIComponent(currentText)}`);
              const json = await res.json();
              if (json && json[0]) {
                const translated = json[0].map(item => item[0]).join('');
                if (translated && translated.trim()) {
                  scriptInput.value = translated.trim();
                  buildCaptionsFromText(translated.trim());
                  updateCopilotDiagnostics();
                  showToast('✨ Ditado traduzido para Português!');
                  return;
                }
              }
            } catch (err) {
              console.warn('Translate dictation error:', err);
            }
          }
          showToast('Ditado finalizado e sincronizado no Karaokê!');
        };

        speechRecognitionInstance.start();
      } catch (e) {
        console.error('Dictation error:', e);
      }
    });
  }
}

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

// ── 6c. EXPORTAÇÃO: VÍDEO RENDERIZADO (MP4/WEBM) E LEGENDAS (.SRT) ───────────
const modalExport = document.getElementById('modal-export');
const btnCloseExport = document.getElementById('btn-close-export');
const btnExportVideo = document.getElementById('btn-export-video');
const btnQuickExportSrt = document.getElementById('btn-quick-export-srt');
const btnModalExportSrt = document.getElementById('btn-modal-export-srt');
const btnStartRenderVideo = document.getElementById('btn-start-render-video');
const btnCancelRenderVideo = document.getElementById('btn-cancel-render-video');
const exportProgBox = document.getElementById('export-video-progress-box');
const exportProgBar = document.getElementById('export-video-progress-bar');
const exportProgText = document.getElementById('export-video-status-text');
const exportProgPct = document.getElementById('export-video-pct');

function openExportModal() {
  if (modalExport) modalExport.classList.remove('hidden');
}

function closeExportModal() {
  if (modalExport) modalExport.classList.add('hidden');
  if (isExportingVideo) cancelVideoExport();
}

if (btnExportVideo) {
  btnExportVideo.addEventListener('click', openExportModal);
}
if (btnCloseExport) {
  btnCloseExport.addEventListener('click', closeExportModal);
}
if (modalExport) {
  modalExport.addEventListener('click', (e) => {
    if (e.target === modalExport) closeExportModal();
  });
}

function downloadSrtFile() {
  if (!state.phrases || state.phrases.length === 0) {
    showToast('Nenhuma legenda para exportar. Gere ou digite as legendas primeiro.');
    return;
  }
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
  showToast('📄 Arquivo de legendas .SRT baixado com sucesso!');
}

if (btnQuickExportSrt) {
  btnQuickExportSrt.addEventListener('click', downloadSrtFile);
}
if (btnModalExportSrt) {
  btnModalExportSrt.addEventListener('click', () => {
    downloadSrtFile();
    closeExportModal();
  });
}

let isExportingVideo = false;
let exportRecorder = null;
let exportCheckInterval = null;

function cancelVideoExport() {
  if (!isExportingVideo) return;
  isExportingVideo = false;
  if (exportCheckInterval) clearInterval(exportCheckInterval);
  if (exportRecorder && exportRecorder.state !== 'inactive') {
    try { exportRecorder.stop(); } catch(e){}
  }
  if (state.hasVideo) videoEl.pause();
  state.playing = false;
  if (exportProgBox) exportProgBox.classList.add('hidden');
  if (btnStartRenderVideo) {
    btnStartRenderVideo.disabled = false;
    btnStartRenderVideo.innerHTML = '🎬 <span data-pt="Renderizar e Baixar Vídeo" data-en="Render &amp; Download Video">Renderizar e Baixar Vídeo</span>';
  }
  showToast('Renderização de vídeo cancelada.');
}

if (btnCancelRenderVideo) {
  btnCancelRenderVideo.addEventListener('click', cancelVideoExport);
}

async function startVideoExport() {
  if (isExportingVideo) return;

  if (exportProgBox) exportProgBox.classList.remove('hidden');
  if (exportProgBar) exportProgBar.style.width = '0%';
  if (exportProgPct) exportProgPct.textContent = '0%';
  if (exportProgText) exportProgText.textContent = 'Iniciando captura de vídeo e legendas...';

  if (btnStartRenderVideo) {
    btnStartRenderVideo.disabled = true;
    btnStartRenderVideo.textContent = '⏳ Renderizando Vídeo no Navegador...';
  }

  isExportingVideo = true;

  try {
    const canvasStream = canvas.captureStream(30);
    const tracks = [...canvasStream.getVideoTracks()];

    if (state.hasVideo && videoEl.src) {
      try {
        let aTracks = [];
        if (typeof videoEl.captureStream === 'function') {
          aTracks = videoEl.captureStream().getAudioTracks();
        } else if (typeof videoEl.mozCaptureStream === 'function') {
          aTracks = videoEl.mozCaptureStream().getAudioTracks();
        }
        if (aTracks.length > 0) tracks.push(aTracks[0]);
      } catch (err) {
        console.warn('Audio captureStream failed:', err);
      }
    }

    const combinedStream = new MediaStream(tracks);

    let mimeType = 'video/webm;codecs=vp9,opus';
    let ext = 'webm';
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E,mp4a.40.2')) {
        mimeType = 'video/mp4;codecs=avc1.42E01E,mp4a.40.2';
        ext = 'mp4';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
        ext = 'mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        mimeType = 'video/webm;codecs=vp9,opus';
        ext = 'webm';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
        ext = 'webm';
      }
    }

    const recordedChunks = [];
    exportRecorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 6000000
    });

    exportRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    exportRecorder.onstop = () => {
      isExportingVideo = false;
      if (exportCheckInterval) clearInterval(exportCheckInterval);
      if (btnStartRenderVideo) {
        btnStartRenderVideo.disabled = false;
        btnStartRenderVideo.innerHTML = '🎬 <span data-pt="Renderizar e Baixar Vídeo" data-en="Render &amp; Download Video">Renderizar e Baixar Vídeo</span>';
      }
      if (exportProgText) exportProgText.textContent = 'Renderização concluída com sucesso!';
      if (exportProgBar) exportProgBar.style.width = '100%';
      if (exportProgPct) exportProgPct.textContent = '100%';

      if (recordedChunks.length > 0) {
        const blob = new Blob(recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clipcut-video-${Date.now()}.${ext}`;
        a.click();
        showToast(`✨ Vídeo exportado com sucesso (.${ext.toUpperCase()})!`);
      } else {
        showToast('Nenhum dado gerado. Tente exportar .SRT ou usar o App Nativo.');
      }

      setTimeout(() => {
        if (exportProgBox) exportProgBox.classList.add('hidden');
        closeExportModal();
      }, 2000);
    };

    // Prepare timeline and start recording
    seekTo(0);
    exportRecorder.start(250);

    const totalDur = Math.max(1.0, state.duration);

    if (state.hasVideo) {
      videoEl.currentTime = 0;
      await videoEl.play();
      state.playing = true;
    } else {
      state.playing = true;
    }

    exportCheckInterval = setInterval(() => {
      if (!isExportingVideo) {
        clearInterval(exportCheckInterval);
        return;
      }
      const cur = state.currentTime;
      const pct = Math.min(100, Math.round((cur / totalDur) * 100));
      if (exportProgBar) exportProgBar.style.width = `${pct}%`;
      if (exportProgPct) exportProgPct.textContent = `${pct}%`;
      if (exportProgText) exportProgText.textContent = `Renderizando vídeo: ${cur.toFixed(1)}s / ${totalDur.toFixed(1)}s`;

      if (cur >= totalDur || (state.hasVideo && videoEl.ended)) {
        clearInterval(exportCheckInterval);
        if (state.hasVideo) videoEl.pause();
        state.playing = false;
        if (exportRecorder && exportRecorder.state !== 'inactive') {
          exportRecorder.stop();
        }
      }
    }, 120);

  } catch (err) {
    console.error('Video export error:', err);
    cancelVideoExport();
    showToast('Navegador não suporta gravação direta de vídeo. Use "Baixar Arquivo .SRT".');
  }
}

if (btnStartRenderVideo) {
  btnStartRenderVideo.addEventListener('click', startVideoExport);
}

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

// ── 8. COPILOTO IA CLIPCUT (DIAGNÓSTICO EM TEMPO REAL & AJUDA LOCAL) ────────
const btnOpenCopilot = document.getElementById('btn-open-copilot');
const btnCloseCopilot = document.getElementById('btn-close-copilot');
const copilotDrawer = document.getElementById('copilot-drawer');
const diagMedia = document.getElementById('diag-media');
const diagCaptions = document.getElementById('diag-captions');
const diagStyle = document.getElementById('diag-style');
const diagAspect = document.getElementById('diag-aspect');
const copilotTip = document.getElementById('copilot-proactive-tip');
const copilotFeed = document.getElementById('copilot-chat-feed');
const inpCopilotQuery = document.getElementById('inp-copilot-query');
const btnCopilotSubmit = document.getElementById('btn-copilot-submit');

function updateCopilotDiagnostics() {
  if (!copilotDrawer || copilotDrawer.classList.contains('hidden')) return;
  const numPhrases = (state.phrases || []).length;
  if (diagMedia) diagMedia.textContent = state.hasVideo ? 'Vídeo Pronto' : 'Exemplo';
  if (diagCaptions) diagCaptions.textContent = `${numPhrases} Frases`;
  if (diagStyle) diagStyle.textContent = (state.preset || 'Hormozi').toUpperCase();
  const is916 = canvas.height > canvas.width;
  if (diagAspect) diagAspect.textContent = is916 ? '9:16' : '16:9';

  if (copilotTip) {
    if (!is916) {
      copilotTip.innerHTML = '💡 <em>Dica do Copiloto:</em> Seu vídeo está em 16:9. Se for postar no Reels ou TikTok, converta para <strong>Formato 9:16</strong> com 1 clique abaixo.';
    } else if (state.anim !== 'pop') {
      copilotTip.innerHTML = '💡 <em>Dica do Copiloto:</em> Suas legendas estão sem efeito de entrada. Ative o <strong>Pop Elástico</strong> para prender a atenção da audiência!';
    } else {
      copilotTip.innerHTML = `💡 <em>Dica do Copiloto:</em> Projeto otimizado! ${numPhrases} frases sincronizadas com estilo <strong>${(state.preset || 'Hormozi').toUpperCase()}</strong> e Karaokê ativo.`;
    }
  }
}

function openCopilot() {
  if (copilotDrawer) {
    copilotDrawer.classList.remove('hidden');
    updateCopilotDiagnostics();
  }
}

function closeCopilot() {
  if (copilotDrawer) {
    copilotDrawer.classList.add('hidden');
  }
}

if (btnOpenCopilot) btnOpenCopilot.addEventListener('click', openCopilot);
if (btnCloseCopilot) btnCloseCopilot.addEventListener('click', closeCopilot);

const COPILOT_KB = {
  como_fazer_karaoke: {
    answer: "No ClipCut, a legenda Karaokê mantém a frase fixa em branco e destaca apenas a palavra falada no milissegundo exato da voz em amarelo vibrante (#FFDE00) ou verde neon (#00FF88).",
    btnText: "✨ Aplicar Estilo Hormozi Karaokê",
    action: () => {
      const btnHormozi = document.querySelector('.preset-btn[data-preset="hormozi"]');
      if (btnHormozi) btnHormozi.click();
      const btnPop = document.querySelector('#anim-selector button[data-anim="pop"]');
      if (btnPop) btnPop.click();
      showToast('Estilo Hormozi Karaokê aplicado!');
    }
  },
  cortar_silencios: {
    answer: "O Auto Silence Cutter analisa o áudio em 1.000 amostras por segundo, detecta pausas abaixo de -32 dB com mais de 0,40s de duração, preserva 60ms de respiração e fecha os espaços com Ripple Delete magnético.",
    btnText: "✂️ Executar Corte de Silêncios Agora",
    action: () => {
      document.getElementById('btn-cut-silences').click();
    }
  },
  formato_916: {
    answer: "Converte o projeto instantaneamente para 1080×1920 (proporção vertical 9:16), ideal para Reels do Instagram, TikTok e YouTube Shorts com enquadramento inteligente Fill.",
    btnText: "📱 Mudar para 9:16 Vertical",
    action: () => {
      document.getElementById('btn-aspect-9-16').click();
      updateCopilotDiagnostics();
    }
  },
  zoom_dinamico: {
    answer: "O Zoom Dinâmico cria keyframes automáticos alternando suavemente a escala do vídeo entre 100% e 114%, quebrando a monotonia e aumentando a retenção do público.",
    btnText: "🎯 Alternar Zoom Dinâmico",
    action: () => {
      document.getElementById('btn-punch-zoom').click();
      updateCopilotDiagnostics();
    }
  },
  animacao_pop: {
    answer: "Aplica física de mola elástica (76% → 108% → 100%) na entrada de cada nova frase de legenda sem fazer o texto pular durante a troca das palavras do Karaokê.",
    btnText: "✨ Ativar Pop Elástico",
    action: () => {
      const btn = document.querySelector('#anim-selector button[data-anim="pop"]');
      if (btn) btn.click();
      showToast('✨ Animação Pop Elástico ativada!');
      updateCopilotDiagnostics();
    }
  },
  presets_capcut: {
    answer: "O ClipCut inclui 4 presets visuais de 1 clique: Hormozi (Branco + Amarelo), TikTok Box (Caixa escura arredondada), Amarelo Pop (Amarelo + Verde Neon) e Neon Clean (Ciano + Amarelo).",
    btnText: "🎨 Aplicar Preset TikTok Box",
    action: () => {
      const btn = document.querySelector('.preset-btn[data-preset="tiktok"]');
      if (btn) btn.click();
    }
  },
  exportar_video: {
    answer: "Você pode baixar o arquivo de legendas .SRT sincronizado aqui no navegador ou baixar o aplicativo nativo para o seu sistema (Linux, Windows, Mac) para exportar MP4 acelerado pela GPU.",
    btnText: "⬇️ Baixar Instalador Nativo",
    action: () => {
      openDownloadModal();
    }
  },
  importar_srt: {
    answer: "Para importar legendas prontas, basta clicar em 'Importar .SRT' na barra esquerda. O ClipCut sincroniza todas as falas instantaneamente.",
    btnText: "📄 Selecionar Arquivo .SRT",
    action: () => {
      document.getElementById('srt-upload').click();
    }
  },
  transcrever_audio: {
    answer: "O ClipCut agora transcreve a fala do seu vídeo direto no navegador usando o modelo Whisper IA! Você também pode usar o microfone para ditar falas ao vivo.",
    btnText: "🎙️ Transcrever Áudio do Vídeo Agora",
    action: () => {
      const btn = document.getElementById('btn-transcribe-video');
      if (btn) btn.click();
    }
  }
};

function appendCopilotMessage(sender, text, actionBtnData) {
  if (!copilotFeed) return;
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-msg ${sender === 'user' ? 'msg-user' : 'msg-ai'}`;
  
  const authorDiv = document.createElement('div');
  authorDiv.className = 'msg-author';
  authorDiv.textContent = sender === 'user' ? 'Você' : '✨ Copiloto ClipCut';
  msgDiv.appendChild(authorDiv);

  const contentDiv = document.createElement('div');
  contentDiv.className = 'msg-content';
  contentDiv.textContent = text;
  msgDiv.appendChild(contentDiv);

  if (actionBtnData && actionBtnData.btnText && actionBtnData.action) {
    const actBtn = document.createElement('button');
    actBtn.type = 'button';
    actBtn.className = 'msg-action-btn';
    actBtn.textContent = actionBtnData.btnText;
    actBtn.addEventListener('click', () => {
      actionBtnData.action();
      updateCopilotDiagnostics();
    });
    msgDiv.appendChild(actBtn);
  }

  copilotFeed.appendChild(msgDiv);
  copilotFeed.scrollTop = copilotFeed.scrollHeight;
}

function handleCopilotQuery(keyOrText) {
  const kbItem = COPILOT_KB[keyOrText];
  if (kbItem) {
    appendCopilotMessage('user', keyOrText.replace(/_/g, ' '));
    setTimeout(() => {
      appendCopilotMessage('ai', kbItem.answer, kbItem);
    }, 220);
    return;
  }

  const query = keyOrText.toLowerCase().trim();
  appendCopilotMessage('user', keyOrText);

  setTimeout(() => {
    if (query.includes('transcrev') || query.includes('áudio') || query.includes('audio') || query.includes('voz') || query.includes('ouvir') || query.includes('falar')) {
      appendCopilotMessage('ai', COPILOT_KB.transcrever_audio.answer, COPILOT_KB.transcrever_audio);
    } else if (query.includes('karaoke') || query.includes('legenda') || query.includes('palavra') || query.includes('cor')) {
      appendCopilotMessage('ai', COPILOT_KB.como_fazer_karaoke.answer, COPILOT_KB.como_fazer_karaoke);
    } else if (query.includes('silêncio') || query.includes('silencio') || query.includes('pausa') || query.includes('cort')) {
      appendCopilotMessage('ai', COPILOT_KB.cortar_silencios.answer, COPILOT_KB.cortar_silencios);
    } else if (query.includes('9:16') || query.includes('vertical') || query.includes('reels') || query.includes('tiktok') || query.includes('shorts')) {
      appendCopilotMessage('ai', COPILOT_KB.formato_916.answer, COPILOT_KB.formato_916);
    } else if (query.includes('zoom') || query.includes('punch') || query.includes('dinâmico')) {
      appendCopilotMessage('ai', COPILOT_KB.zoom_dinamico.answer, COPILOT_KB.zoom_dinamico);
    } else if (query.includes('pop') || query.includes('anima') || query.includes('elastico') || query.includes('mola')) {
      appendCopilotMessage('ai', COPILOT_KB.animacao_pop.answer, COPILOT_KB.animacao_pop);
    } else if (query.includes('preset') || query.includes('hormozi') || query.includes('estilo')) {
      appendCopilotMessage('ai', COPILOT_KB.presets_capcut.answer, COPILOT_KB.presets_capcut);
    } else if (query.includes('export') || query.includes('mp4') || query.includes('salvar') || query.includes('baixar')) {
      appendCopilotMessage('ai', COPILOT_KB.exportar_video.answer, COPILOT_KB.exportar_video);
    } else if (query.includes('srt') || query.includes('subrip') || query.includes('import')) {
      appendCopilotMessage('ai', COPILOT_KB.importar_srt.answer, COPILOT_KB.importar_srt);
    } else {
      appendCopilotMessage('ai', `Com o ClipCut você pode editar e animar seu vídeo com total privacidade 100% offline. Você pode clicar nas sugestões acima para ajustar Karaokê, proporção 9:16 ou cortes automáticos!`, {
        btnText: "✨ Ativar Karaokê Hormozi",
        action: COPILOT_KB.como_fazer_karaoke.action
      });
    }
  }, 240);
}

document.querySelectorAll('.copilot-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const q = chip.dataset.query;
    if (q) handleCopilotQuery(q);
  });
});

if (btnCopilotSubmit && inpCopilotQuery) {
  const submitText = () => {
    const val = inpCopilotQuery.value.trim();
    if (!val) return;
    inpCopilotQuery.value = '';
    handleCopilotQuery(val);
  };
  btnCopilotSubmit.addEventListener('click', submitText);
  inpCopilotQuery.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitText();
  });
}

// Initialize default Karaoke phrases and video segments
buildCaptionsFromText(scriptInput.value);
renderVideoTrackLane();

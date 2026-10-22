// ClipCut Studio PWA — 4u-Labs Multiplatform Engine (100% Local/Offline)
(() => {
  const RELEASE_BASE = 'https://github.com/4u-Labs/clipcut/releases/latest/download';
  const ACTIONS_URL = 'https://github.com/4u-Labs/clipcut/actions';

  let deferredPrompt = null;
  let lang = (navigator.language || 'pt-BR').toLowerCase().startsWith('pt') ? 'pt' : 'en';

  const I18N = {
    pt: {
      gateTitle: 'Instale o ClipCut Studio no seu Dispositivo',
      gateSub: 'Para editar vídeos localmente com máxima velocidade, privacidade 100% offline e zero envio para servidores, escolha o modo ideal para o seu aparelho:',
      pwaBoxTitle: '📲 WebApp PWA (Tablets, iPad, Chromebook & Web)',
      pwaBoxDesc: 'Instala instantaneamente na Tela Inicial / Aplicativos. Ideal para Tablets, iPads e edição rápida offline sem ocupar espaço.',
      installPwaBtn: '📲 Instalar WebApp PWA Agora',
      enterPwaBtn: '⚡ Abrir Editor PWA (Modo Tablet / Local)',
      nativeBoxTitle: '🚀 Instaladores Nativos Pro (GPU + IA Whisper Completa)',
      nativeBoxDesc: 'Versão completa compilada para o seu processador e placa de vídeo (Windows, Mac, Linux, Android e iOS):',
      detectedBadge: 'Recomendado p/ você',
      openInstallHub: '📦 Downloads / Instalar',
      importVideo: '📂 Carregar Vídeo Local',
      captionsPanel: 'Legendas & Edição CapCut',
      rhythmLabel: 'Ritmo das Legendas',
      rhythmStd: 'Padrão (Frase)',
      rhythmDyn: 'Dinâmica (2-3 pal.)',
      rhythmKar: 'Karaoke (Palavra)',
      scriptLabel: 'Texto / Transcrição (ou importe .SRT)',
      generateBtn: '✨ Gerar Legendas Animadas',
      smartTools: 'Edição Rápida CapCut (1 Clique)',
      cutSilences: '✂️ Cortar Silêncios',
      punchIn: '🎯 Zoom Dinâmico',
      vertical916: '📱 Formato 9:16',
      inspectorTitle: 'Estilo & Presets CapCut',
      applyAllBtn: '🎨 Aplicar a todas as legendas',
      presetsLabel: 'Presets Visuais (1 Clique)',
      animPop: '✨ Pop Elástico',
      animNone: '🚫 Sem Animação',
      exportSrt: '💾 Exportar .SRT',
      importSrt: '📥 Importar .SRT',
      exportVideo: '🎬 Exportar Vídeo com Legendas'
    },
    en: {
      gateTitle: 'Install ClipCut Studio on Your Device',
      gateSub: 'To edit videos locally at maximum speed with 100% offline privacy and zero server uploads, choose the best mode for your device:',
      pwaBoxTitle: '📲 WebApp PWA (Tablets, iPad, Chromebook & Web)',
      pwaBoxDesc: 'Installs instantly to your Home Screen / Apps. Ideal for Tablets, iPads, and fast offline editing.',
      installPwaBtn: '📲 Install WebApp PWA Now',
      enterPwaBtn: '⚡ Open PWA Editor (Tablet / Local Mode)',
      nativeBoxTitle: '🚀 Native Pro Installers (Full GPU + Whisper AI)',
      nativeBoxDesc: 'Full native build compiled for your CPU and GPU (Windows, Mac, Linux, Android, and iOS):',
      detectedBadge: 'Recommended',
      openInstallHub: '📦 Downloads / Install',
      importVideo: '📂 Load Local Video',
      captionsPanel: 'Captions & CapCut Tools',
      rhythmLabel: 'Caption Rhythm',
      rhythmStd: 'Standard (Phrase)',
      rhythmDyn: 'Dynamic (2-3 words)',
      rhythmKar: 'Karaoke (Word)',
      scriptLabel: 'Script / Transcript (or import .SRT)',
      generateBtn: '✨ Generate Animated Captions',
      smartTools: 'CapCut Quick Edit (1-Click)',
      cutSilences: '✂️ Cut Silences',
      punchIn: '🎯 Punch-In Zoom',
      vertical916: '📱 9:16 Vertical',
      inspectorTitle: 'Style & CapCut Presets',
      applyAllBtn: '🎨 Apply to all captions',
      presetsLabel: 'Visual Presets (1-Click)',
      animPop: '✨ Elastic Pop',
      animNone: '🚫 No Animation',
      exportSrt: '💾 Export .SRT',
      importSrt: '📥 Import .SRT',
      exportVideo: '🎬 Export Video with Captions'
    }
  };

  // State
  const state = {
    rhythm: 2, // Default Karaoke
    aspect: '9:16',
    punchIn: false,
    popAnim: true,
    silentRanges: [],
    style: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 0.055,
      color: '#FFFFFF',
      highlightColor: '#FFDE00',
      strokeWidth: 0.012,
      strokeColor: '#000000',
      background: '',
      offsetY: 0.78
    },
    captions: [
      { start: 0.0, end: 0.45, text: '*Bem-vindo* ao novo ClipCut' },
      { start: 0.45, end: 0.90, text: 'Bem-vindo *ao* novo ClipCut' },
      { start: 0.90, end: 1.35, text: 'Bem-vindo ao *novo* ClipCut' },
      { start: 1.35, end: 1.90, text: 'Bem-vindo ao novo *ClipCut*' },
      { start: 1.90, end: 2.35, text: '*Legendas* estilo CapCut' },
      { start: 2.35, end: 2.85, text: 'Legendas *estilo* CapCut' },
      { start: 2.85, end: 3.50, text: 'Legendas estilo *CapCut*' }
    ]
  };

  function showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.add('hidden'), 3200);
  }

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  // Detect OS for Native Installers
  function detectOS() {
    const ua = navigator.userAgent || '';
    if (/android/i.test(ua)) return 'android';
    if (/ipad|iphone|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
    if (/win/i.test(ua)) return 'windows';
    if (/mac/i.test(ua)) return 'macos';
    if (/linux/i.test(ua)) return 'linux';
    return 'pwa';
  }

  // Install Gate Logic
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    new URLSearchParams(window.location.search).get('mode') === 'standalone' ||
    localStorage.getItem('clipcut_gate_unlocked') === '1';

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  function unlockGate() {
    localStorage.setItem('clipcut_gate_unlocked', '1');
    document.getElementById('installGate').classList.add('hidden');
  }

  async function triggerPwaInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (outcome === 'accepted') {
        unlockGate();
        showToast('ClipCut PWA instalado com sucesso!');
        return;
      }
    }
    const os = detectOS();
    if (os === 'ios') {
      alert(
        lang === 'pt'
          ? 'No iPad / iPhone (Safari): toque no botão Compartilhar (ícone com seta para cima) e escolha "Adicionar à Tela de Início" para instalar o WebApp ClipCut.'
          : 'On iPad / iPhone (Safari): tap the Share button and select "Add to Home Screen" to install the ClipCut WebApp.'
      );
    }
    unlockGate();
  }

  // Build Captions from Script with Rhythm (0 = Standard, 1 = Dynamic, 2 = Karaoke word-by-word)
  function generateCaptionsFromText(rawText, totalDuration) {
    const clean = rawText.trim();
    if (!clean) return;
    const words = clean.split(/\s+/).filter(Boolean);
    if (!words.length) return;
    const dur = Math.max(totalDuration || 8.0, words.length * 0.38);
    const nextCaptions = [];

    if (state.rhythm === 0) {
      // Standard sentences of ~7 words
      const chunks = [];
      for (let i = 0; i < words.length; i += 7) {
        chunks.push(words.slice(i, i + 7).join(' '));
      }
      const step = dur / chunks.length;
      chunks.forEach((c, idx) => {
        nextCaptions.push({ start: idx * step, end: (idx + 1) * step, text: c });
      });
    } else if (state.rhythm === 1) {
      // Dynamic 2-3 words
      const chunks = [];
      for (let i = 0; i < words.length; i += 3) {
        chunks.push(words.slice(i, i + 3).join(' '));
      }
      const step = dur / chunks.length;
      chunks.forEach((c, idx) => {
        nextCaptions.push({ start: idx * step, end: (idx + 1) * step, text: c });
      });
    } else {
      // Karaoke: 3-4 word phrase stays on screen, *spoken* word turns yellow
      const phrases = [];
      for (let i = 0; i < words.length; i += 4) {
        phrases.push(words.slice(i, i + 4));
      }
      let curTime = 0;
      const totalChars = words.reduce((acc, w) => acc + w.length + 1, 0);
      phrases.forEach((phrase) => {
        const phraseWeight = phrase.reduce((acc, w) => acc + w.length + 1, 0);
        const phraseDur = dur * (phraseWeight / totalChars);
        phrase.forEach((w, wIdx) => {
          const wDur = phraseDur * ((w.length + 1) / phraseWeight);
          const highlighted = phrase
            .map((pw, idx) => {
              const bare = pw.replace(/\*/g, '');
              return idx === wIdx ? `*${bare}*` : bare;
            })
            .join(' ');
          nextCaptions.push({
            start: curTime,
            end: curTime + wDur,
            text: highlighted
          });
          curTime += wDur;
        });
      });
    }

    state.captions = nextCaptions;
    renderCaptionList();
    showToast(`${nextCaptions.length} legendas geradas!`);
  }

  // Apply CapCut Preset
  function applyPreset(preset) {
    if (preset === 'hormozi') {
      state.style.color = '#FFFFFF';
      state.style.highlightColor = '#FFDE00';
      state.style.strokeWidth = 0.012;
      state.style.strokeColor = '#000000';
      state.style.background = '';
    } else if (preset === 'tiktok') {
      state.style.color = '#FFFFFF';
      state.style.highlightColor = '#FFDE00';
      state.style.strokeWidth = 0.0;
      state.style.background = 'rgba(0,0,0,0.82)';
    } else if (preset === 'yellow') {
      state.style.color = '#FFDE00';
      state.style.highlightColor = '#00FF88';
      state.style.strokeWidth = 0.014;
      state.style.strokeColor = '#000000';
      state.style.background = '';
    } else if (preset === 'neon') {
      state.style.color = '#00F0FF';
      state.style.highlightColor = '#FFDE00';
      state.style.strokeWidth = 0.012;
      state.style.strokeColor = '#081020';
      state.style.background = '';
    }
    syncInspectorInputs();
    showToast(`Preset "${preset.toUpperCase()}" aplicado a todas as legendas!`);
  }

  function syncInspectorInputs() {
    const colorEl = document.getElementById('baseColorPicker');
    const hlEl = document.getElementById('hlColorPicker');
    const posEl = document.getElementById('posYSlider');
    if (colorEl) colorEl.value = state.style.color;
    if (hlEl) hlEl.value = state.style.highlightColor;
    if (posEl) posEl.value = Math.round(state.style.offsetY * 100);
  }

  function renderCaptionList() {
    const list = document.getElementById('captionList');
    if (!list) return;
    list.innerHTML = '';
    state.captions.forEach((cap, idx) => {
      const row = document.createElement('div');
      row.className = 'caption-item';
      row.innerHTML = `
        <span><strong>${cap.start.toFixed(2)}s</strong> — ${cap.text}</span>
      `;
      row.addEventListener('click', () => {
        const video = document.getElementById('sourceVideo');
        if (video && video.src) video.currentTime = cap.start;
        const editBox = document.getElementById('selectedCaptionInput');
        if (editBox) {
          editBox.value = cap.text;
          editBox.dataset.index = idx;
        }
      });
      list.appendChild(row);
    });
  }

  // Silence Detection via WebAudio API
  async function detectAndCutSilences(file) {
    if (!file) {
      showToast('Carregue um vídeo primeiro para detectar silêncios.');
      return;
    }
    try {
      const arrayBuf = await file.arrayBuffer();
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuf = await ctx.decodeAudioData(arrayBuf);
      const data = audioBuf.getChannelData(0);
      const sr = audioBuf.sampleRate;
      const winSamples = Math.floor(sr * 0.02);
      const threshold = 0.025;
      const minSilence = 0.4;
      const silent = [];
      let sStart = null;

      for (let i = 0; i < data.length; i += winSamples) {
        let peak = 0;
        for (let j = i; j < Math.min(i + winSamples, data.length); j++) {
          const a = Math.abs(data[j]);
          if (a > peak) peak = a;
        }
        const t = i / sr;
        if (peak < threshold) {
          if (sStart === null) sStart = t;
        } else if (sStart !== null) {
          if (t - sStart >= minSilence) {
            silent.push([sStart + 0.05, t - 0.05]);
          }
          sStart = null;
        }
      }
      state.silentRanges = silent;
      showToast(`${silent.length} pausa(s) de silêncio detectadas e removidas automaticamente!`);
    } catch (e) {
      showToast('Não foi possível ler a faixa de áudio deste arquivo.');
    }
  }

  // Canvas Renderer Loop
  function initCanvas() {
    const canvas = document.getElementById('previewCanvas');
    const ctx = canvas.getContext('2d');
    const video = document.getElementById('sourceVideo');
    let demoTime = 0;
    let lastTick = performance.now();

    function drawFrame(now) {
      const dt = (now - lastTick) / 1000;
      lastTick = now;

      const isVert = state.aspect === '9:16';
      const targetW = isVert ? 540 : 960;
      const targetH = isVert ? 960 : 540;
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      let curTime = demoTime;
      if (video && video.src) {
        curTime = video.currentTime;
        // Skip silent ranges automatically during playback
        if (!video.paused && state.silentRanges.length) {
          for (const [s0, s1] of state.silentRanges) {
            if (curTime >= s0 && curTime < s1) {
              video.currentTime = s1;
              curTime = s1;
              break;
            }
          }
        }
      } else {
        demoTime = (demoTime + dt) % 3.6;
        curTime = demoTime;
      }

      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Punch-in Zoom scale
      const zoomScale = state.punchIn && Math.floor(curTime / 3.5) % 2 === 1 ? 1.14 : 1.0;

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      if (video && video.src && video.readyState >= 2) {
        const vw = video.videoWidth || canvas.width;
        const vh = video.videoHeight || canvas.height;
        const scale = Math.max(canvas.width / vw, canvas.height / vh);
        const dw = vw * scale;
        const dh = vh * scale;
        ctx.drawImage(video, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
      } else {
        // Demo studio backdrop
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.restore();

      // Find active caption
      const activeIdx = state.captions.findIndex((c) => curTime >= c.start && curTime <= c.end);
      if (activeIdx !== -1) {
        const active = state.captions[activeIdx];
        const prev = activeIdx > 0 ? state.captions[activeIdx - 1] : null;
        const cleanCur = active.text.replace(/\*/g, '');
        const cleanPrev = prev ? prev.text.replace(/\*/g, '') : '';
        const isPhraseStart = cleanCur !== cleanPrev;

        // Elastic Pop scale on phrase start
        let popScale = 1.0;
        if (state.popAnim && isPhraseStart) {
          const elapsed = curTime - active.start;
          if (elapsed < 0.09) {
            popScale = 0.78 + (elapsed / 0.09) * 0.30;
          } else if (elapsed < 0.18) {
            popScale = 1.08 - ((elapsed - 0.09) / 0.09) * 0.08;
          }
        }

        const fontPx = Math.round(canvas.height * state.style.fontSize);
        ctx.save();
        const centerX = canvas.width / 2;
        const centerY = canvas.height * state.style.offsetY;
        ctx.translate(centerX, centerY);
        ctx.scale(popScale, popScale);

        ctx.font = `900 ${fontPx}px ${state.style.fontFamily}`;
        ctx.textBaseline = 'middle';

        // Tokenize words and check *highlight*
        const tokens = active.text.split(/\s+/).filter(Boolean);
        const measured = tokens.map((tok) => {
          const isHl = tok.startsWith('*') && tok.endsWith('*') && tok.length > 2;
          const cleanWord = tok.replace(/\*/g, '');
          const w = ctx.measureText(cleanWord).width;
          return { cleanWord, isHl, width: w };
        });
        const spaceW = ctx.measureText(' ').width;
        const totalW =
          measured.reduce((acc, m) => acc + m.width, 0) +
          Math.max(0, measured.length - 1) * spaceW;

        if (state.style.background) {
          const padX = fontPx * 0.45;
          const padY = fontPx * 0.32;
          ctx.fillStyle = state.style.background;
          ctx.beginPath();
          ctx.roundRect(
            -totalW / 2 - padX,
            -fontPx / 2 - padY,
            totalW + padX * 2,
            fontPx + padY * 2,
            12
          );
          ctx.fill();
        }

        let penX = -totalW / 2;
        measured.forEach((m) => {
          ctx.shadowColor = 'rgba(0,0,0,0.65)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 3;

          if (state.style.strokeWidth > 0) {
            ctx.lineWidth = Math.max(3, canvas.height * state.style.strokeWidth * 1.6);
            ctx.lineJoin = 'round';
            ctx.strokeStyle = state.style.strokeColor;
            ctx.strokeText(m.cleanWord, penX, 0);
          }

          ctx.fillStyle = m.isHl ? state.style.highlightColor : state.style.color;
          ctx.fillText(m.cleanWord, penX, 0);
          penX += m.width + spaceW;
        });

        ctx.restore();
      }

      requestAnimationFrame(drawFrame);
    }

    requestAnimationFrame(drawFrame);
  }

  // SRT Export / Import
  function fmtSrtTime(sec) {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.round((sec - Math.floor(sec)) * 1000);
    const pad = (n, len = 2) => String(n).padStart(len, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(s)},${pad(ms, 3)}`;
  }

  function exportSrt() {
    const content = state.captions
      .map((c, i) => `${i + 1}\n${fmtSrtTime(c.start)} --> ${fmtSrtTime(c.end)}\n${c.text}\n`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'clipcut-captions.srt';
    a.click();
    showToast('Arquivo .SRT exportado!');
  }

  function applyI18n() {
    const dict = I18N[lang];
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const k = el.getAttribute('data-i18n');
      if (dict[k]) el.textContent = dict[k];
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    const os = detectOS();
    document.querySelectorAll('.platform-card').forEach((card) => {
      if (card.dataset.os === os) {
        card.classList.add('detected');
      }
    });

    if (isStandalone) {
      document.getElementById('installGate').classList.add('hidden');
    }

    document.getElementById('btnInstallPwa')?.addEventListener('click', triggerPwaInstall);
    document.getElementById('btnEnterPwa')?.addEventListener('click', unlockGate);
    document.getElementById('btnOpenGate')?.addEventListener('click', () => {
      document.getElementById('installGate').classList.remove('hidden');
    });

    document.getElementById('btnLang')?.addEventListener('click', () => {
      lang = lang === 'pt' ? 'en' : 'pt';
      document.getElementById('btnLang').textContent = lang === 'pt' ? '🇧🇷 PT' : '🇺🇸 EN';
      applyI18n();
    });

    // Rhythm buttons
    document.querySelectorAll('[data-rhythm]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-rhythm]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.rhythm = Number(btn.dataset.rhythm);
      });
    });

    // Generate Captions
    document.getElementById('btnGenerate')?.addEventListener('click', () => {
      const text = document.getElementById('scriptInput').value;
      const video = document.getElementById('sourceVideo');
      generateCaptionsFromText(text, video && video.duration ? video.duration : 8.0);
    });

    // Presets
    document.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
    });

    document.getElementById('btnPopAnim')?.addEventListener('click', () => {
      state.popAnim = true;
      showToast('Animação Pop Elástica ativada em todas as legendas!');
    });
    document.getElementById('btnNoAnim')?.addEventListener('click', () => {
      state.popAnim = false;
      showToast('Animação de entrada desativada.');
    });

    document.getElementById('btnApplyAll')?.addEventListener('click', () => {
      showToast(`Estilo sincronizado em todas as ${state.captions.length} legendas!`);
    });

    // Smart Tools
    let currentVideoFile = null;
    const videoInput = document.getElementById('videoFileInput');
    videoInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      currentVideoFile = file;
      const video = document.getElementById('sourceVideo');
      video.src = URL.createObjectURL(file);
      video.play().catch(() => {});
      showToast(`Vídeo "${file.name}" carregado localmente!`);
    });

    document.getElementById('btnCutSilences')?.addEventListener('click', () => {
      detectAndCutSilences(currentVideoFile);
    });
    document.getElementById('btnPunchIn')?.addEventListener('click', () => {
      state.punchIn = !state.punchIn;
      showToast(state.punchIn ? 'Zoom Dinâmico (Punch-In) ATIVADO!' : 'Zoom Dinâmico desativado.');
    });
    document.getElementById('btnVertical916')?.addEventListener('click', () => {
      state.aspect = state.aspect === '9:16' ? '16:9' : '9:16';
      showToast(`Formato alterado para ${state.aspect}!`);
    });

    // Inspector Pickers
    document.getElementById('baseColorPicker')?.addEventListener('input', (e) => {
      state.style.color = e.target.value;
    });
    document.getElementById('hlColorPicker')?.addEventListener('input', (e) => {
      state.style.highlightColor = e.target.value;
    });
    document.getElementById('posYSlider')?.addEventListener('input', (e) => {
      state.style.offsetY = Number(e.target.value) / 100;
    });

    document.getElementById('selectedCaptionInput')?.addEventListener('input', (e) => {
      const idx = Number(e.target.dataset.index);
      if (!Number.isNaN(idx) && state.captions[idx]) {
        state.captions[idx].text = e.target.value;
        renderCaptionList();
      }
    });

    document.getElementById('btnExportSrt')?.addEventListener('click', exportSrt);

    applyI18n();
    renderCaptionList();
    syncInspectorInputs();
    initCanvas();
  });
})();


// ── 9. BILINGUAL PT / EN SWITCH & 4U-LABS ECOSYSTEM MODAL ──────────────────
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

const modal4uLabs = document.getElementById('modal-4ulabs');
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

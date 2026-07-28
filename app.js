(function() {
    'use strict';

    // --- Estado Global ---
    const state = {
        config: {
            cycles: [20, 30, 20, 40],
            pauseDuration: 120,
            fullscreenAlert: 10,
            loop: true,
            sound: true,
            vibration: true
        },
        currentCycleIndex: 0,
        timeLeft: 0, // em segundos
        isRunning: false,
        isPaused: false,
        isAlerting: false,
        timerInterval: null,
        alertTimer: null,
        wakeLock: null,
        audioCtx: null,
        oscillator: null,
        gainNode: null,
        isConfigOpen: false,
        // --- Novos campos para precisão ---
        lastTimestamp: 0,
        isVisible: true
    };

    // --- Elementos DOM ---
    const el = {
        timerDisplay: document.getElementById('timerDisplay'),
        nextBreak: document.getElementById('nextBreak'),
        currentCycle: document.getElementById('currentCycle'),
        nextCycle: document.getElementById('nextCycle'),
        timeRemaining: document.getElementById('timeRemaining'),
        startBtn: document.getElementById('startBtn'),
        stopBtn: document.getElementById('stopBtn'),
        resetBtn: document.getElementById('resetBtn'),
        configBtn: document.getElementById('configBtn'),
        alertOverlay: document.getElementById('alertOverlay'),
        alertSub: document.getElementById('alertSub'),
        configOverlay: document.getElementById('configOverlay'),
        cyclesList: document.getElementById('cyclesList'),
        newCycleInput: document.getElementById('newCycleInput'),
        addCycleBtn: document.getElementById('addCycleBtn'),
        pauseDurationInput: document.getElementById('pauseDurationInput'),
        alertDurationInput: document.getElementById('alertDurationInput'),
        loopCheck: document.getElementById('loopCheck'),
        soundCheck: document.getElementById('soundCheck'),
        vibrationCheck: document.getElementById('vibrationCheck'),
        saveConfigBtn: document.getElementById('saveConfigBtn'),
        cancelConfigBtn: document.getElementById('cancelConfigBtn')
    };

    // --- Funções auxiliares ---
    function formatTime(seconds) {
        if (seconds < 0) seconds = 0;
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function formatTimeShort(seconds) {
        if (seconds < 0) seconds = 0;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function formatMinutes(minutes) {
        return `${minutes} min`;
    }

    function getCycleDuration(index) {
        const cycles = state.config.cycles;
        if (!cycles || cycles.length === 0) return 0;
        if (index >= cycles.length) return cycles[0] || 0;
        return cycles[index] || 0;
    }

    function getNextCycleIndex(current) {
        const cycles = state.config.cycles;
        if (!cycles || cycles.length === 0) return 0;
        if (current + 1 < cycles.length) return current + 1;
        return state.config.loop ? 0 : current;
    }

    function getNextCycleDuration(current) {
        const nextIdx = getNextCycleIndex(current);
        return getCycleDuration(nextIdx);
    }

    function getCycleDisplay(index) {
        const cycles = state.config.cycles;
        if (!cycles || cycles.length === 0) return '--';
        return `${index + 1} / ${cycles.length}`;
    }

    function getCycleMinutes(index) {
        return getCycleDuration(index);
    }

    // --- Badging API ---
    function setBadge(count) {
        if ('setAppBadge' in navigator) {
            try {
                if (count > 0) {
                    navigator.setAppBadge(count);
                } else {
                    navigator.clearAppBadge();
                }
            } catch (e) { /* ignore */ }
        }
    }

    function clearBadge() {
        if ('clearAppBadge' in navigator) {
            try {
                navigator.clearAppBadge();
            } catch (e) { /* ignore */ }
        }
    }

    // --- Notificações avançadas ---
    function sendRichNotification(title, body, options) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }
        try {
            const defaultOptions = {
                icon: './assets/icons/icon.svg',
                badge: './assets/icons/icon.svg',
                tag: 'pulse-break-alert',
                requireInteraction: true,
                timestamp: Date.now(),
                actions: [
                    { action: 'snooze', title: 'Adiar 5 min' },
                    { action: 'dismiss', title: 'Ignorar' }
                ]
            };
            const mergedOptions = Object.assign({}, defaultOptions, options);
            const notification = new Notification(title, mergedOptions);
            return notification;
        } catch (e) {
            // Fallback para notificação simples
            try {
                new Notification(title, { body, icon: './assets/icons/icon.svg' });
            } catch (e2) { /* ignore */ }
        }
    }

    // --- Notificações (compatibilidade) ---
    function sendNotification(title, body) {
        sendRichNotification(title, body, { tag: 'pulse-break-alert' });
    }

    // --- Vibração (com padrões distintos) ---
    function vibrate(pattern) {
        if (state.config.vibration && navigator.vibrate) {
            try {
                navigator.vibrate(pattern);
            } catch (e) { /* ignore */ }
        }
    }

    function vibrateAlert() {
        vibrate([500, 200, 500, 200, 1000]);
    }

    function vibrateRepeat() {
        vibrate([200, 100, 200, 100, 500]);
    }

    function vibrateReturn() {
        vibrate([100, 100, 100]);
    }

    // --- Som (Web Audio API) ---
    function playAlarmSound() {
        if (!state.config.sound) return;
        try {
            if (!state.audioCtx) {
                state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = state.audioCtx;
            if (ctx.state === 'suspended') {
                ctx.resume();
            }
            // Primeiro tom
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.8);

            setTimeout(() => {
                try {
                    const osc2 = ctx.createOscillator();
                    const gain2 = ctx.createGain();
                    osc2.type = 'square';
                    osc2.frequency.setValueAtTime(660, ctx.currentTime);
                    osc2.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.4);
                    gain2.gain.setValueAtTime(0.25, ctx.currentTime);
                    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
                    osc2.connect(gain2);
                    gain2.connect(ctx.destination);
                    osc2.start(ctx.currentTime);
                    osc2.stop(ctx.currentTime + 0.6);
                } catch (e) { /* ignore */ }
            }, 300);

            setTimeout(() => {
                try {
                    const osc3 = ctx.createOscillator();
                    const gain3 = ctx.createGain();
                    osc3.type = 'sine';
                    osc3.frequency.setValueAtTime(1200, ctx.currentTime);
                    gain3.gain.setValueAtTime(0.2, ctx.currentTime);
                    gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                    osc3.connect(gain3);
                    gain3.connect(ctx.destination);
                    osc3.start(ctx.currentTime);
                    osc3.stop(ctx.currentTime + 0.5);
                } catch (e) { /* ignore */ }
            }, 600);
        } catch (e) { /* console.warn('Som indisponível', e); */ }
    }

    // --- Wake Lock ---
    async function requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                state.wakeLock = await navigator.wakeLock.request('screen');
            } catch (e) { /* ignore */ }
        }
    }

    function releaseWakeLock() {
        if (state.wakeLock) {
            try {
                state.wakeLock.release();
                state.wakeLock = null;
            } catch (e) { /* ignore */ }
        }
    }

    // --- Fullscreen API ---
    function requestFullscreen() {
        const el = document.documentElement;
        if (el.requestFullscreen) {
            el.requestFullscreen().catch(() => {});
        } else if (el.webkitRequestFullscreen) {
            el.webkitRequestFullscreen();
        } else if (el.msRequestFullscreen) {
            el.msRequestFullscreen();
        }
    }

    function exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }

    // --- Atualizar interface ---
    function updateUI() {
        const cycles = state.config.cycles;
        const totalCycles = cycles.length;
        const currentIdx = state.currentCycleIndex;
        const currentDur = getCycleDuration(currentIdx);
        const nextDur = getNextCycleDuration(currentIdx);

        el.timerDisplay.textContent = formatTime(state.timeLeft);
        el.nextBreak.textContent = `${state.config.pauseDuration}s`;
        el.currentCycle.textContent = totalCycles > 0 ? getCycleDisplay(currentIdx) : '-- / --';
        if (totalCycles > 0) {
            const nextIdx = getNextCycleIndex(currentIdx);
            el.nextCycle.textContent = formatMinutes(getCycleDuration(nextIdx));
        } else {
            el.nextCycle.textContent = '--';
        }
        el.timeRemaining.textContent = formatTimeShort(state.timeLeft);
    }

    // --- Precisão temporal: recuperação ao retornar à aba ---
    function handleVisibilityChange() {
        const wasVisible = state.isVisible;
        state.isVisible = !document.hidden;

        if (state.isVisible && !wasVisible && state.isRunning && !state.isAlerting) {
            // Recalcular tempo restante com base no timestamp
            const now = Date.now();
            const elapsed = Math.floor((now - state.lastTimestamp) / 1000);
            if (elapsed > 0) {
                state.timeLeft = Math.max(0, state.timeLeft - elapsed);
                updateUI();
                // Se o tempo expirou durante a ausência, disparar alerta
                if (state.timeLeft <= 0 && state.isRunning && !state.isAlerting) {
                    startAlert();
                }
            }
            state.lastTimestamp = now;
        } else if (state.isVisible) {
            // Atualizar timestamp ao ficar visível
            state.lastTimestamp = Date.now();
        }
    }

    // --- Lógica do timer (modificada para precisão) ---
    function tick() {
        if (!state.isRunning || state.isAlerting) return;

        const now = Date.now();
        const elapsed = Math.floor((now - state.lastTimestamp) / 1000);

        if (elapsed >= 1) {
            state.timeLeft = Math.max(0, state.timeLeft - elapsed);
            state.lastTimestamp = now;
            updateUI();

            if (state.timeLeft <= 0) {
                startAlert();
            }
        } else {
            // Se não passou tempo suficiente, apenas atualiza timestamp
            state.lastTimestamp = now;
        }
    }

    function startTimer() {
        if (state.isRunning) return;
        if (state.timeLeft <= 0) {
            const dur = getCycleDuration(state.currentCycleIndex);
            state.timeLeft = dur * 60;
        }
        state.isRunning = true;
        state.isPaused = false;
        state.lastTimestamp = Date.now();
        requestWakeLock();
        if (state.timerInterval) clearInterval(state.timerInterval);
        state.timerInterval = setInterval(tick, 1000);
        updateUI();
    }

    function stopTimer() {
        state.isRunning = false;
        state.isPaused = true;
        if (state.timerInterval) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
        }
        releaseWakeLock();
        updateUI();
    }

    function resetTimer() {
        stopTimer();
        state.isAlerting = false;
        state.currentCycleIndex = 0;
        const dur = getCycleDuration(0);
        state.timeLeft = dur * 60;
        state.lastTimestamp = Date.now();
        hideAlert();
        clearBadge();
        updateUI();
    }

    // --- Alerta ---
    function startAlert() {
        if (state.isAlerting) return;
        state.isAlerting = true;
        state.isRunning = false;
        if (state.timerInterval) {
            clearInterval(state.timerInterval);
            state.timerInterval = null;
        }
        releaseWakeLock();

        // Som e vibração
        playAlarmSound();
        vibrateAlert();

        // Badge indicando pausa
        setBadge(1);

        // Notificação rica
        sendRichNotification('PULSE BREAK', 'Hora de levantar! Pausa iniciada.', {
            tag: 'pulse-break-alert',
            requireInteraction: true,
            actions: [
                { action: 'snooze', title: 'Adiar 5 min' },
                { action: 'dismiss', title: 'Ignorar' }
            ]
        });

        // Exibir overlay
        showAlert();
        requestFullscreen();

        // Contagem regressiva do alerta
        let alertSeconds = state.config.fullscreenAlert;
        if (state.alertTimer) clearInterval(state.alertTimer);
        state.alertTimer = setInterval(() => {
            alertSeconds--;
            if (alertSeconds <= 0) {
                clearInterval(state.alertTimer);
                state.alertTimer = null;
                hideAlert();
                startPause();
            }
        }, 1000);
    }

    function showAlert() {
        const overlay = el.alertOverlay;
        const sub = el.alertSub;
        sub.textContent = `PAUSA DE ${state.config.pauseDuration} SEGUNDOS`;
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        requestFullscreen();
    }

    function hideAlert() {
        const overlay = el.alertOverlay;
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        exitFullscreen();
        if (state.alertTimer) {
            clearInterval(state.alertTimer);
            state.alertTimer = null;
        }
        state.isAlerting = false;
        clearBadge();
    }

    // --- Pausa ---
    function startPause() {
        const pauseSec = state.config.pauseDuration;
        state.timeLeft = pauseSec;
        state.isRunning = true;
        state.isPaused = false;
        state.lastTimestamp = Date.now();
        requestWakeLock();
        if (state.timerInterval) clearInterval(state.timerInterval);
        state.timerInterval = setInterval(() => {
            if (!state.isRunning || state.isAlerting) return;
            const now = Date.now();
            const elapsed = Math.floor((now - state.lastTimestamp) / 1000);
            if (elapsed >= 1) {
                state.timeLeft = Math.max(0, state.timeLeft - elapsed);
                state.lastTimestamp = now;
                updateUI();
                if (state.timeLeft <= 0) {
                    clearInterval(state.timerInterval);
                    state.timerInterval = null;
                    state.isRunning = false;
                    releaseWakeLock();
                    advanceCycle();
                    const dur = getCycleDuration(state.currentCycleIndex);
                    state.timeLeft = dur * 60;
                    state.lastTimestamp = Date.now();
                    vibrateReturn();
                    startTimer();
                }
            } else {
                state.lastTimestamp = now;
            }
        }, 1000);
        updateUI();
    }

    function advanceCycle() {
        const cycles = state.config.cycles;
        if (!cycles || cycles.length === 0) return;
        let next = state.currentCycleIndex + 1;
        if (next >= cycles.length) {
            if (state.config.loop) {
                next = 0;
            } else {
                next = cycles.length - 1;
            }
        }
        state.currentCycleIndex = next;
        updateUI();
    }

    // --- Carregar configuração ---
    function loadConfig() {
        fetch('./config.json')
            .then(response => {
                if (!response.ok) throw new Error('Falha ao carregar config.json');
                return response.json();
            })
            .then(data => {
                state.config.cycles = data.cycles || [20, 30, 20, 40];
                state.config.pauseDuration = data.pauseDuration || 120;
                state.config.fullscreenAlert = data.fullscreenAlert || 10;
                state.config.loop = data.loop !== undefined ? data.loop : true;
                state.config.sound = data.sound !== undefined ? data.sound : true;
                state.config.vibration = data.vibration !== undefined ? data.vibration : true;
                const dur = getCycleDuration(0);
                state.timeLeft = dur * 60;
                state.currentCycleIndex = 0;
                state.lastTimestamp = Date.now();
                updateUI();
                populateConfigUI();
            })
            .catch(err => {
                console.warn('Erro ao carregar config.json, usando padrões.', err);
                const dur = getCycleDuration(0);
                state.timeLeft = dur * 60;
                state.currentCycleIndex = 0;
                state.lastTimestamp = Date.now();
                updateUI();
                populateConfigUI();
            });
    }

    // --- Populate Config UI ---
    function populateConfigUI() {
        const cfg = state.config;
        renderCycles();
        el.pauseDurationInput.value = cfg.pauseDuration;
        el.alertDurationInput.value = cfg.fullscreenAlert;
        el.loopCheck.checked = cfg.loop;
        el.soundCheck.checked = cfg.sound;
        el.vibrationCheck.checked = cfg.vibration;
    }

    function renderCycles() {
        const list = el.cyclesList;
        list.innerHTML = '';
        state.config.cycles.forEach((minutes, index) => {
            const item = document.createElement('div');
            item.className = 'cycle-item';
            item.innerHTML = `
                <span>${minutes} min</span>
                <button class="cycle-del" data-index="${index}" aria-label="Remover ciclo">✕</button>
            `;
            list.appendChild(item);
        });
        list.querySelectorAll('.cycle-del').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index, 10);
                removeCycle(idx);
            });
        });
    }

    function removeCycle(index) {
        if (state.config.cycles.length <= 1) {
            alert('É necessário ter pelo menos um ciclo.');
            return;
        }
        state.config.cycles.splice(index, 1);
        if (state.currentCycleIndex >= state.config.cycles.length) {
            state.currentCycleIndex = state.config.cycles.length - 1;
        }
        renderCycles();
        if (!state.isRunning && !state.isAlerting) {
            const dur = getCycleDuration(state.currentCycleIndex);
            state.timeLeft = dur * 60;
            state.lastTimestamp = Date.now();
            updateUI();
        }
    }

    function addCycle(minutes) {
        if (!minutes || minutes < 1) {
            alert('Insira um valor em minutos (mínimo 1).');
            return;
        }
        state.config.cycles.push(minutes);
        renderCycles();
        if (!state.isRunning && !state.isAlerting) {
            const dur = getCycleDuration(state.currentCycleIndex);
            state.timeLeft = dur * 60;
            state.lastTimestamp = Date.now();
            updateUI();
        }
    }

    // --- Salvar configuração ---
    function saveConfig() {
        const cycles = [];
        document.querySelectorAll('.cycle-item span').forEach(span => {
            const text = span.textContent.trim();
            const val = parseInt(text, 10);
            if (!isNaN(val) && val > 0) cycles.push(val);
        });
        if (cycles.length === 0) {
            alert('Adicione pelo menos um ciclo.');
            return;
        }
        const pause = parseInt(el.pauseDurationInput.value, 10);
        if (isNaN(pause) || pause < 1) {
            alert('Duração da pausa deve ser pelo menos 1 segundo.');
            return;
        }
        const alertDur = parseInt(el.alertDurationInput.value, 10);
        if (isNaN(alertDur) || alertDur < 1) {
            alert('Duração do alerta deve ser pelo menos 1 segundo.');
            return;
        }
        const loop = el.loopCheck.checked;
        const sound = el.soundCheck.checked;
        const vibration = el.vibrationCheck.checked;

        state.config.cycles = cycles;
        state.config.pauseDuration = pause;
        state.config.fullscreenAlert = alertDur;
        state.config.loop = loop;
        state.config.sound = sound;
        state.config.vibration = vibration;

        if (!state.isRunning && !state.isAlerting) {
            state.currentCycleIndex = 0;
            const dur = getCycleDuration(0);
            state.timeLeft = dur * 60;
            state.lastTimestamp = Date.now();
            updateUI();
        } else {
            updateUI();
        }
        closeConfig();
        renderCycles();
        populateConfigUI();
    }

    // --- Abrir/fechar configuração ---
    function openConfig() {
        if (state.isConfigOpen) return;
        state.isConfigOpen = true;
        populateConfigUI();
        el.configOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeConfig() {
        state.isConfigOpen = false;
        el.configOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // --- Eventos ---
    function initEvents() {
        el.startBtn.addEventListener('click', () => {
            if (state.isRunning) return;
            if (state.timeLeft <= 0) {
                const dur = getCycleDuration(state.currentCycleIndex);
                state.timeLeft = dur * 60;
                state.lastTimestamp = Date.now();
            }
            startTimer();
        });

        el.stopBtn.addEventListener('click', stopTimer);

        el.resetBtn.addEventListener('click', resetTimer);

        el.configBtn.addEventListener('click', openConfig);

        el.addCycleBtn.addEventListener('click', () => {
            const val = parseInt(el.newCycleInput.value, 10);
            if (!isNaN(val) && val > 0) {
                addCycle(val);
                el.newCycleInput.value = '';
            } else {
                alert('Insira um número inteiro positivo (minutos).');
            }
        });

        el.newCycleInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                el.addCycleBtn.click();
            }
        });

        el.saveConfigBtn.addEventListener('click', saveConfig);

        el.cancelConfigBtn.addEventListener('click', closeConfig);

        el.configOverlay.addEventListener('click', (e) => {
            if (e.target === el.configOverlay) {
                closeConfig();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' && !state.isConfigOpen && !el.alertOverlay.classList.contains('active')) {
                e.preventDefault();
                if (state.isRunning) {
                    stopTimer();
                } else {
                    el.startBtn.click();
                }
            }
            if (e.key === 'Escape') {
                if (state.isConfigOpen) closeConfig();
            }
        });

        // Listener de visibilidade para recuperação
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Solicitar permissão de notificação (após interação)
        const requestNotificationPermission = () => {
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
            }
        };
        document.addEventListener('click', requestNotificationPermission, { once: true });
        document.addEventListener('touchstart', requestNotificationPermission, { once: true });
    }

    // --- Inicialização ---
    function init() {
        loadConfig();
        initEvents();
        state.lastTimestamp = Date.now();

        setInterval(() => {
            if (!state.isRunning && !state.isAlerting) {
                updateUI();
            }
        }, 5000);

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js', { scope: './' })
                .then(registration => {
                    console.log('Service Worker registrado com escopo:', registration.scope);
                    if (!navigator.serviceWorker.controller) {
                        console.warn('Service Worker não está controlando a página.');
                    }
                    if (registration.waiting) {
                        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('Nova versão do PWA disponível. Recarregue para atualizar.');
                            }
                        });
                    });
                })
                .catch(err => {
                    console.warn('Falha ao registrar Service Worker:', err);
                });
        }

        console.log('PULSE BREAK iniciado (modo evoluído).');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

// ============================================
// STATE MANAGEMENT
// ============================================

let state = {
    profile: null,
    selectedRitual: [],
    timerSettings: {
        work: 25,
        shortBreak: 5,
        longBreak: 15
    },
    musicChoice: 'none',
    currentPhase: 'work',
    pomodorosCompleted: 0,
    pomodorosThisSession: 0,
    isTimerRunning: false,
    isPaused: false,
    timeRemaining: 0,
    totalTime: 0,
    timerInterval: null,
    dailyPomodoros: [],
    streak: 0,
    isMusicPlaying: false,
    currentGrowthPhase: 1
};

let youtubePlayer = null;
let isYouTubeAPIReady = false;

// ============================================
// DATA
// ============================================

const ritualTemplates = {
    student: [
        {
            name: "Rituale Focus Esame",
            items: ["Chiudi social e notifiche", "Prepara materiale di studio", "Definisci argomento da studiare", "Prepara acqua e snack"]
        },
        {
            name: "Rituale Scrittura Tesi",
            items: ["Apri solo il documento tesi", "Chiudi email e chat", "Definisci paragrafo da scrivere", "Prepara bibliografia a portata"]
        }
    ],
    professional: [
        {
            name: "Rituale Deep Work",
            items: ["Chiudi email e Slack", "Prepara solo file necessari", "Scrivi obiettivo dei prossimi 50 min", "Metti telefono in un'altra stanza"]
        },
        {
            name: "Rituale Atto Legale",
            items: ["Apri solo fascicolo/pratica", "Chiudi tutte le notifiche", "Leggi rapidamente il punto critico", "Prepara codici/giurisprudenza a schermo"]
        }
    ]
};

const ingredients = {
    student: [
        "Chiudi social e notifiche",
        "Prepara materiale di studio",
        "Definisci argomento preciso",
        "Prepara acqua e snack",
        "Apri solo app/siti necessari",
        "Metti telefono lontano",
        "Prepara timer carta e penna",
        "Fai 3 respiri profondi"
    ],
    professional: [
        "Chiudi email e Slack",
        "Prepara solo file necessari",
        "Scrivi micro-obiettivo sessione",
        "Metti telefono in altra stanza",
        "Chiudi tutte le tab inutili",
        "Prepara caffè/acqua",
        "Leggi rapidamente il punto critico",
        "Prepara strumenti di lavoro (codici, tool)"
    ]
};

const timerPresets = {
    student: [
        { name: "Classico", work: 25, short: 5, long: 15, desc: "Il classico Pomodoro (25/5/15)" },
        { name: "Studio Intenso", work: 45, short: 10, long: 20, desc: "Sessioni più lunghe (45/10/20)" },
        { name: "Quick Sprint", work: 15, short: 3, long: 10, desc: "Sessioni brevi e veloci (15/3/10)" }
    ],
    professional: [
        { name: "Deep Work", work: 50, short: 10, long: 30, desc: "Per lavoro complesso (50/10/30)" },
        { name: "Classico", work: 25, short: 5, long: 15, desc: "Il classico Pomodoro (25/5/15)" },
        { name: "Ultra Focus", work: 90, short: 15, long: 30, desc: "Massima concentrazione (90/15/30)" }
    ]
};

// Fasi crescita: percentuali del tempo in cui cambia fase
const growthPhases = [
    { phase: 1, percent: 0, name: "semina" },       // 0%
    { phase: 2, percent: 0.01, name: "innaffiatura" }, // dopo 10 sec
    { phase: 3, percent: 0.20, name: "germoglio" }, // 20%
    { phase: 4, percent: 0.40, name: "crescita" },  // 40%
    { phase: 5, percent: 0.60, name: "fioritura" }, // 60%
    { phase: 6, percent: 0.80, name: "verde" },     // 80%
    { phase: 7, percent: 0.96, name: "maturo" },    // 96%
    { phase: 8, percent: 1.0, name: "raccolta" }    // 100%
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    updateProgressTracker(screenId);
    
    // Mostra Pomo guida dove appropriato
    showPomoGuide(screenId);
}

function showPomoGuide(screenId) {
    const pomoGuide = document.getElementById('pomo-guide');
    if (!pomoGuide) return;
    
    const messages = {
        'screen-profile': { show: false },
        'screen-ritual-builder': { 
            show: true, 
            mascot: 'pomo-happy',
            text: state.profile === 'student' ? 
                "Scegli gli ingredienti per il tuo rituale perfetto! 🎯" : 
                "Costruisci il sistema che ti porta al successo. Precisione prima di tutto."
        },
        'screen-timer-settings': { 
            show: true, 
            mascot: 'pomo-neutral',
            text: state.profile === 'student' ? 
                "Quale ritmo funziona meglio per te? 🎵" : 
                "Ottimizza i parametri per massima produttività."
        },
        'screen-ritual-execution': { 
            show: true, 
            mascot: 'pomo-thumbsup',
            text: state.profile === 'student' ? 
                "Completa ogni passo, io aspetto qui! 💪" : 
                "Esegui il protocollo. Io monitoro il processo."
        },
        'screen-timer': { show: false }, // Durante timer, Pomo è la pianta
        'screen-recap': { 
            show: true, 
            mascot: 'pomo-proud',
            text: state.profile === 'student' ? 
                "WOW! Guarda quanti frutti hai raccolto! 🎉" : 
                "Risultati tangibili. Progressione costante."
        }
    };
    
    const config = messages[screenId];
    
    if (config && config.show) {
        pomoGuide.style.display = 'flex';
        updatePomoMascot(config.mascot, config.text);
    } else {
        pomoGuide.style.display = 'none';
    }
}

function updatePomoMascot(mascotType, text) {
    const pomoSvg = document.querySelector('#pomo-guide svg use');
    const pomoText = document.querySelector('#pomo-guide .pomo-speech p');
    
    if (pomoSvg) {
        pomoSvg.setAttribute('href', `#${mascotType}`);
    }
    if (pomoText) {
        pomoText.textContent = text;
    }
}

function updateProgressTracker(screenId) {
    const tracker = document.getElementById('progress-tracker');
    
    if (screenId === 'screen-profile') {
        tracker.style.display = 'none';
        return;
    }
    
    tracker.style.display = 'flex';
    
    document.querySelectorAll('.progress-step').forEach(step => {
        step.classList.remove('active');
    });
    
    if (screenId === 'screen-ritual-builder' || screenId === 'screen-ritual-execution') {
        document.querySelector('[data-step="1"]').classList.add('active');
    } else if (screenId === 'screen-timer-settings') {
        document.querySelector('[data-step="2"]').classList.add('active');
    } else if (screenId === 'screen-timer' || screenId === 'screen-recap') {
        document.querySelector('[data-step="3"]').classList.add('active');
    }
}

function saveState() {
    const toSave = {
        dailyPomodoros: state.dailyPomodoros,
        streak: state.streak
    };
    localStorage.setItem('focusflow_state', JSON.stringify(toSave));
}

function loadState() {
    const saved = localStorage.getItem('focusflow_state');
    if (saved) {
        const loaded = JSON.parse(saved);
        state.dailyPomodoros = loaded.dailyPomodoros || [];
        state.streak = loaded.streak || 0;
        updateStreak();
    }
}

function updateStreak() {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (state.dailyPomodoros.length > 0) {
        const lastSession = state.dailyPomodoros[state.dailyPomodoros.length - 1];
        const lastDate = new Date(lastSession.date).toDateString();
        
        if (lastDate !== yesterday && lastDate !== today) {
            state.streak = 0;
        }
    }
}

function addPomodoroToHistory() {
    const today = new Date().toDateString();
    const existing = state.dailyPomodoros.find(d => d.date === today);
    
    if (existing) {
        existing.count++;
    } else {
        state.dailyPomodoros.push({ date: today, count: 1 });
        state.streak++;
    }
    
    if (state.dailyPomodoros.length > 30) {
        state.dailyPomodoros = state.dailyPomodoros.slice(-30);
    }
    
    saveState();
}

function getTodayPomodoros() {
    const today = new Date().toDateString();
    const todayData = state.dailyPomodoros.find(d => d.date === today);
    return todayData ? todayData.count : 0;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function loadTheme(profile) {
    const studentCSS = document.getElementById('theme-student');
    const professionalCSS = document.getElementById('theme-professional');
    
    if (profile === 'student') {
        studentCSS.disabled = false;
        professionalCSS.disabled = true;
    } else {
        studentCSS.disabled = true;
        professionalCSS.disabled = false;
    }
}

// ============================================
// TOMATO GROWTH ANIMATION
// ============================================

function initTomatoGrowth() {
    const container = document.querySelector('.tomato-container');
    if (!container) {
        console.error('Tomato container not found');
        return;
    }
    
    // Crea SVG container
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'tomato-growth');
    svg.setAttribute('viewBox', '0 0 400 500');
    svg.setAttribute('width', '400');
    svg.setAttribute('height', '500');
    
    // Crea use element
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    const prefix = state.profile === 'student' ? 'student' : 'pro';
    use.setAttribute('href', `#${prefix}-phase-1`);
    
    svg.appendChild(use);
    container.appendChild(svg);
    
    state.currentGrowthPhase = 1;
}

function updateTomatoGrowth() {
    const progress = 1 - (state.timeRemaining / state.totalTime);
    
    // Trova la fase corretta
    let targetPhase = 1;
    for (let i = 0; i < growthPhases.length; i++) {
        if (progress >= growthPhases[i].percent) {
            targetPhase = growthPhases[i].phase;
        }
    }
    
    // Se cambia fase, aggiorna SVG
    if (targetPhase !== state.currentGrowthPhase) {
        state.currentGrowthPhase = targetPhase;
        const use = document.querySelector('.tomato-growth use');
        const prefix = state.profile === 'student' ? 'student' : 'pro';
        
        if (use) {
            // Animazione fade
            const svg = document.querySelector('.tomato-growth');
            svg.classList.add('fade-out');
            
            setTimeout(() => {
                use.setAttribute('href', `#${prefix}-phase-${targetPhase}`);
                svg.classList.remove('fade-out');
                svg.classList.add('fade-in');
                
                // Pulse animation per fase matura
                if (targetPhase === 7) {
                    svg.classList.add('tomato-pulse');
                }
                
                setTimeout(() => svg.classList.remove('fade-in'), 800);
            }, 400);
        }
    }
}

function animateHarvest() {
    const svg = document.querySelector('.tomato-growth');
    if (svg) {
        svg.classList.add('harvest-animation');
        
        setTimeout(() => {
            addTomatoToBasket();
        }, 1000);
    }
}

function addTomatoToBasket() {
    const basket = document.querySelector('.basket-count');
    if (basket) {
        basket.textContent = state.pomodorosCompleted;
        
        // Animazione bounce del cesto
        const basketContainer = document.querySelector('.tomato-basket');
        basketContainer.style.transform = 'scale(1.2)';
        setTimeout(() => {
            basketContainer.style.transform = 'scale(1)';
        }, 300);
    }
}

// ============================================
// SCREEN 1: Profile Selection
// ============================================

function initProfileSelection() {
    const profileBtns = document.querySelectorAll('.profile-btn');
    
    profileBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            state.profile = btn.dataset.profile;
            loadTheme(state.profile);
            showScreen('screen-ritual-builder');
            initRitualBuilder();
        });
    });
}

// ============================================
// SCREEN 2: Ritual Builder
// ============================================

function initRitualBuilder() {
    renderRecommendedRituals();
    renderIngredients();
    updateCart();
    
    document.getElementById('btn-back-profile').addEventListener('click', () => {
        showScreen('screen-profile');
        state.selectedRitual = [];
        state.profile = null;
    });
    
    document.getElementById('btn-next-timer').addEventListener('click', () => {
        showScreen('screen-timer-settings');
        initTimerSettings();
    });
    
    document.getElementById('btn-add-custom').addEventListener('click', () => {
        const customAction = prompt("Inserisci un'azione personalizzata:");
        if (customAction && customAction.trim()) {
            state.selectedRitual.push(customAction.trim());
            updateCart();
        }
    });
}

function renderRecommendedRituals() {
    const container = document.getElementById('recommended-rituals');
    const templates = ritualTemplates[state.profile];
    
    container.innerHTML = templates.map(ritual => `
        <div class="ritual-item">
            <h4>${ritual.name}</h4>
            <ul>
                ${ritual.items.map(item => `<li>${item}</li>`).join('')}
            </ul>
            <button onclick="selectRitual('${ritual.name}')">Usa questo rituale</button>
        </div>
    `).join('');
}

function selectRitual(ritualName) {
    const templates = ritualTemplates[state.profile];
    const ritual = templates.find(r => r.name === ritualName);
    if (ritual) {
        state.selectedRitual = [...ritual.items];
        updateCart();
    }
}

function renderIngredients() {
    const container = document.getElementById('ingredients-list');
    const items = ingredients[state.profile];
    
    container.innerHTML = items.map(item => {
        const escaped = item.replace(/'/g, "\\'");
        return `
            <div class="ingredient-item" data-ingredient="${item}" onclick="addIngredient('${escaped}')">
                ${item}
            </div>
        `;
    }).join('');
}

function addIngredient(ingredient) {
    if (!state.selectedRitual.includes(ingredient)) {
        state.selectedRitual.push(ingredient);
        updateCart();
    }
}

function removeIngredient(ingredient) {
    state.selectedRitual = state.selectedRitual.filter(item => item !== ingredient);
    updateCart();
}

function updateCart() {
    const container = document.getElementById('cart-items');
    const countEl = document.getElementById('cart-count');
    const nextBtn = document.getElementById('btn-next-timer');
    
    countEl.textContent = `${state.selectedRitual.length} azioni selezionate`;
    
    if (state.selectedRitual.length === 0) {
        container.innerHTML = '<p style="color: #718096; text-align: center; padding: 2rem;">Il tuo carrello è vuoto</p>';
        nextBtn.disabled = true;
    } else {
        container.innerHTML = state.selectedRitual.map(item => {
            const escaped = item.replace(/'/g, "\\'");
            return `
                <div class="cart-item">
                    <span>${item}</span>
                    <button onclick="removeIngredient('${escaped}')">Rimuovi</button>
                </div>
            `;
        }).join('');
        nextBtn.disabled = false;
    }
    
    document.querySelectorAll('.ingredient-item').forEach(el => {
        const ingredient = el.dataset.ingredient;
        if (state.selectedRitual.includes(ingredient)) {
            el.classList.add('added');
        } else {
            el.classList.remove('added');
        }
    });
}

// ============================================
// SCREEN 3: Timer Settings
// ============================================

function initTimerSettings() {
    renderTimerPresets();
    
    document.getElementById('btn-back-ritual').addEventListener('click', () => {
        showScreen('screen-ritual-builder');
    });
    
    document.getElementById('btn-start-ritual').addEventListener('click', () => {
        state.timerSettings.work = parseInt(document.getElementById('work-duration').value);
        state.timerSettings.shortBreak = parseInt(document.getElementById('short-break').value);
        state.timerSettings.longBreak = parseInt(document.getElementById('long-break').value);
        
        const musicSelected = document.querySelector('input[name="music"]:checked').value;
        state.musicChoice = musicSelected;
        
        showScreen('screen-ritual-execution');
        initRitualExecution();
    });
}

function renderTimerPresets() {
    const container = document.getElementById('timer-presets-list');
    const presets = timerPresets[state.profile];
    
    container.innerHTML = presets.map((preset, index) => `
        <div class="preset-btn ${index === 0 ? 'active' : ''}" onclick="selectPreset(${preset.work}, ${preset.short}, ${preset.long}, event)">
            <h4>${preset.name}</h4>
            <p>${preset.work}/${preset.short}/${preset.long} min</p>
            <p style="font-size: 0.85rem; color: #a0aec0; margin-top: 0.5rem;">${preset.desc}</p>
        </div>
    `).join('');
    
    const first = presets[0];
    document.getElementById('work-duration').value = first.work;
    document.getElementById('short-break').value = first.short;
    document.getElementById('long-break').value = first.long;
}

function selectPreset(work, shortBreak, longBreak, event) {
    document.getElementById('work-duration').value = work;
    document.getElementById('short-break').value = shortBreak;
    document.getElementById('long-break').value = longBreak;
    
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

// ============================================
// SCREEN 4: Ritual Execution
// ============================================

function initRitualExecution() {
    renderChecklist();
    updateRitualProgress();
    
    document.getElementById('btn-start-timer').addEventListener('click', () => {
        showScreen('screen-timer');
        startTimer();
    });
}

function renderChecklist() {
    const container = document.getElementById('ritual-checklist');
    
    container.innerHTML = state.selectedRitual.map((item, index) => `
        <div class="checklist-item" data-index="${index}">
            <input type="checkbox" id="check-${index}" onchange="updateRitualProgress()">
            <label for="check-${index}">${item}</label>
        </div>
    `).join('');
}

function updateRitualProgress() {
    const checkboxes = document.querySelectorAll('.checklist-item input[type="checkbox"]');
    const checked = Array.from(checkboxes).filter(cb => cb.checked).length;
    const total = checkboxes.length;
    const percentage = total > 0 ? (checked / total) * 100 : 0;
    
    document.getElementById('ritual-progress').style.width = `${percentage}%`;
    document.getElementById('ritual-progress-text').textContent = `${checked} di ${total} completate`;
    
    const startBtn = document.getElementById('btn-start-timer');
    startBtn.disabled = checked !== total;
    
    checkboxes.forEach(cb => {
        const item = cb.closest('.checklist-item');
        if (cb.checked) {
            item.classList.add('completed');
        } else {
            item.classList.remove('completed');
        }
    });
}

// ============================================
// SCREEN 5: Timer
// ============================================

function startTimer() {
    state.currentPhase = 'work';
    state.isTimerRunning = true;
    state.isPaused = false;
    state.timeRemaining = state.timerSettings.work * 60;
    state.totalTime = state.timeRemaining;
    state.pomodorosCompleted = getTodayPomodoros();
    state.pomodorosThisSession = 0;
    
    // Inizializza crescita pomodoro
    initTomatoGrowth();
    
    updateTimerDisplay();
    updateIdentityBanner();
    updatePomodoroCount();
    
    // Mostra cesto
    document.querySelector('.tomato-basket').style.display = 'flex';
    
    if (state.musicChoice !== 'none') {
        startMusic();
    }
    
    state.timerInterval = setInterval(tick, 1000);
    
    const btnPause = document.getElementById('btn-pause');
    const btnResume = document.getElementById('btn-resume');
    const btnStop = document.getElementById('btn-stop');
    
    btnPause.replaceWith(btnPause.cloneNode(true));
    btnResume.replaceWith(btnResume.cloneNode(true));
    btnStop.replaceWith(btnStop.cloneNode(true));
    
    document.getElementById('btn-pause').addEventListener('click', pauseTimer);
    document.getElementById('btn-resume').addEventListener('click', resumeTimer);
    document.getElementById('btn-stop').addEventListener('click', stopTimer);
    
    if (state.musicChoice !== 'none') {
        setupMusicControls();
    }
}

function setupMusicControls() {
    document.getElementById('music-controls').style.display = 'flex';
    
    const musicToggle = document.getElementById('btn-music-toggle');
    const volumeSlider = document.getElementById('volume-slider');
    
    const newMusicToggle = musicToggle.cloneNode(true);
    musicToggle.parentNode.replaceChild(newMusicToggle, musicToggle);
    
    const newVolumeSlider = volumeSlider.cloneNode(true);
    volumeSlider.parentNode.replaceChild(newVolumeSlider, volumeSlider);
    
    newMusicToggle.addEventListener('click', toggleMusic);
    newVolumeSlider.addEventListener('input', (e) => {
        setMusicVolume(parseInt(e.target.value));
    });
}

function tick() {
    if (!state.isPaused && state.timeRemaining > 0) {
        state.timeRemaining--;
        updateTimerDisplay();
        updateTomatoGrowth(); // Aggiorna crescita pianta
    } else if (state.timeRemaining === 0) {
        handlePhaseComplete();
    }
}

function handlePhaseComplete() {
    clearInterval(state.timerInterval);
    playSound();
    
    if (state.currentPhase === 'work') {
        state.pomodorosCompleted++;
        state.pomodorosThisSession++;
        addPomodoroToHistory();
        updatePomodoroCount();
        updateIdentityBanner();
        
        // Animazione raccolta
        animateHarvest();
        
        if (state.profile === 'student') {
            createConfetti();
        }
        
        setTimeout(() => {
            if (state.pomodorosThisSession % 4 === 0) {
                const wantsLongBreak = confirm('🎉 Hai completato 4 pomodori! Vuoi fare una pausa lunga?');
                if (wantsLongBreak) {
                    startBreak('longBreak');
                } else {
                    const continueWorking = confirm('Vuoi continuare con un altro pomodoro?');
                    if (continueWorking) {
                        startWorkSession();
                    } else {
                        stopMusic();
                        showRecap();
                    }
                }
            } else {
                const wantsShortBreak = confirm('✅ Pomodoro completato! Vuoi fare una pausa breve?');
                if (wantsShortBreak) {
                    startBreak('shortBreak');
                } else {
                    const continueWorking = confirm('Vuoi continuare con un altro pomodoro?');
                    if (continueWorking) {
                        startWorkSession();
                    } else {
                        stopMusic();
                        showRecap();
                    }
                }
            }
        }, 2000);
    } else {
        const continueWorking = confirm('⏰ Pausa terminata! Pronto per il prossimo pomodoro?');
        if (continueWorking) {
            startWorkSession();
        } else {
            stopMusic();
            showRecap();
        }
    }
}

function startWorkSession() {
    state.currentPhase = 'work';
    state.timeRemaining = state.timerSettings.work * 60;
    state.totalTime = state.timeRemaining;
    
    // Reset crescita
    const container = document.querySelector('.tomato-container');
    container.innerHTML = '';
    initTomatoGrowth();
    
    updateTimerDisplay();
    
    if (youtubePlayer && state.musicChoice !== 'none') {
        resumeMusic();
    }
    
    state.timerInterval = setInterval(tick, 1000);
}

function startBreak(type) {
    state.currentPhase = type;
    const duration = type === 'longBreak' ? state.timerSettings.longBreak : state.timerSettings.shortBreak;
    state.timeRemaining = duration * 60;
    state.totalTime = state.timeRemaining;
    
    // Nascondi pianta durante pausa
    const container = document.querySelector('.tomato-container');
    if (container) {
        container.style.opacity = '0.3';
    }
    
    updateTimerDisplay();
    
    if (youtubePlayer && state.isMusicPlaying) {
        pauseMusic();
    }
    
    state.timerInterval = setInterval(tick, 1000);
}

function pauseTimer() {
    state.isPaused = true;
    document.getElementById('btn-pause').style.display = 'none';
    document.getElementById('btn-resume').style.display = 'inline-block';
    
    if (youtubePlayer && state.isMusicPlaying) {
        pauseMusic();
    }
}

function resumeTimer() {
    state.isPaused = false;
    document.getElementById('btn-pause').style.display = 'inline-block';
    document.getElementById('btn-resume').style.display = 'none';
    
    if (youtubePlayer && state.musicChoice !== 'none' && state.currentPhase === 'work') {
        resumeMusic();
    }
}

function stopTimer() {
    if (confirm('Sei sicuro di voler interrompere la sessione?')) {
        clearInterval(state.timerInterval);
        stopMusic();
        showRecap();
    }
}

function updateTimerDisplay() {
    const phaseNames = {
        work: 'Sessione di lavoro',
        shortBreak: 'Pausa breve',
        longBreak: 'Pausa lunga'
    };
    
    document.getElementById('timer-phase').textContent = phaseNames[state.currentPhase];
    document.getElementById('timer-countdown').textContent = formatTime(state.timeRemaining);
}

function updatePomodoroCount() {
    document.getElementById('pomodoro-count').textContent = state.pomodorosCompleted;
}

function updateIdentityBanner() {
    const banner = document.getElementById('identity-banner');
    const count = state.pomodorosThisSession;
    
    if (count === 0) {
        banner.textContent = "Sei una persona che si presenta al lavoro ogni giorno";
    } else if (count < 3) {
        banner.textContent = "Sei una persona che protegge il proprio tempo di concentrazione";
    } else if (count < 5) {
        banner.textContent = "Sei una persona che costruisce abitudini di eccellenza";
    } else {
        banner.textContent = "Sei una persona che padroneggia la propria attenzione";
    }
}

function playSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch(e) {
        console.log('Sound not available');
    }
}

// ============================================
// MUSIC FUNCTIONS (YouTube Iframe API)
// ============================================

function loadYouTubeAPI() {
    if (document.getElementById('youtube-iframe-api')) {
        return;
    }
    
    const tag = document.createElement('script');
    tag.id = 'youtube-iframe-api';
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

window.onYouTubeIframeAPIReady = function() {
    isYouTubeAPIReady = true;
};

function startMusic() {
    if (state.musicChoice === 'none') return;
    
    if (!isYouTubeAPIReady) {
        loadYouTubeAPI();
        
        const checkAPI = setInterval(() => {
            if (isYouTubeAPIReady) {
                clearInterval(checkAPI);
                createYouTubePlayer();
            }
        }, 100);
    } else {
        createYouTubePlayer();
    }
}

function createYouTubePlayer() {
    const existingDiv = document.getElementById('youtube-player-div');
    if (existingDiv) {
        existingDiv.remove();
    }
    
    const playerDiv = document.createElement('div');
    playerDiv.id = 'youtube-player-div';
    playerDiv.style.position = 'fixed';
    playerDiv.style.bottom = '-500px';
    playerDiv.style.left = '0';
    playerDiv.style.zIndex = '-1';
    document.body.appendChild(playerDiv);
    
    const videoId = getYouTubeVideoId(state.musicChoice);
    
    if (!videoId) {
        return;
    }
    
    youtubePlayer = new YT.Player('youtube-player-div', {
        height: '360',
        width: '640',
        videoId: videoId,
        playerVars: {
            autoplay: 1,
            controls: 0,
            loop: 1,
            playlist: videoId,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            fs: 0,
            playsinline: 1
        },
        events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
            onError: onPlayerError
        }
    });
}

function onPlayerReady(event) {
    event.target.setVolume(50);
    event.target.playVideo();
    state.isMusicPlaying = true;
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        state.isMusicPlaying = true;
        const btn = document.getElementById('btn-music-toggle');
        if (btn) btn.textContent = '🔊 Musica ON';
    } else if (event.data === YT.PlayerState.PAUSED) {
        state.isMusicPlaying = false;
        const btn = document.getElementById('btn-music-toggle');
        if (btn) btn.textContent = '🔇 Musica OFF';
    }
}

function onPlayerError(event) {
    console.error('Errore YouTube Player:', event.data);
}

function getYouTubeVideoId(musicType) {
    const videoIds = {
        lofi: 'jfKfPfyJRdk',
        ambient: 'lTRiuFIWV54',
        nature: 'eKFTSSKCzWA',
        classical: 'jgpJVI3tDbY',
        whitenoise: 'nMfPqeZjc2c'
    };
    
    return videoIds[musicType] || null;
}

function stopMusic() {
    if (youtubePlayer && typeof youtubePlayer.stopVideo === 'function') {
        youtubePlayer.stopVideo();
        state.isMusicPlaying = false;
    }
}

function pauseMusic() {
    if (youtubePlayer && typeof youtubePlayer.pauseVideo === 'function') {
        youtubePlayer.pauseVideo();
        state.isMusicPlaying = false;
    }
}

function resumeMusic() {
    if (youtubePlayer && typeof youtubePlayer.playVideo === 'function') {
        youtubePlayer.playVideo();
        state.isMusicPlaying = true;
    }
}

function toggleMusic() {
    const btn = document.getElementById('btn-music-toggle');
    
    if (!youtubePlayer) {
        return;
    }
    
    if (state.isMusicPlaying) {
        pauseMusic();
        btn.textContent = '🔇 Musica OFF';
    } else {
        resumeMusic();
        btn.textContent = '🔊 Musica ON';
    }
}

function setMusicVolume(volume) {
    if (youtubePlayer && typeof youtubePlayer.setVolume === 'function') {
        youtubePlayer.setVolume(volume);
    }
}

// ============================================
// CONFETTI
// ============================================

function createConfetti() {
    const colors = ['#FF6B35', '#F7931E', '#4ECDC4', '#A56EFF'];
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.top = '-10px';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 3000);
        }, i * 30);
    }
}

// ============================================
// SCREEN 6: Recap
// ============================================

function showRecap() {
    clearInterval(state.timerInterval);
    showScreen('screen-recap');
    
    document.getElementById('recap-pomodoros').textContent = state.pomodorosCompleted;
    document.getElementById('recap-streak').textContent = state.streak;
    
    renderWeekChart();
    
    const btnNewSession = document.getElementById('btn-new-session');
    const btnResetAll = document.getElementById('btn-reset-all');
    
    btnNewSession.replaceWith(btnNewSession.cloneNode(true));
    btnResetAll.replaceWith(btnResetAll.cloneNode(true));
    
    document.getElementById('btn-new-session').addEventListener('click', () => {
        state.selectedRitual = [];
        state.isTimerRunning = false;
        state.isPaused = false;
        state.pomodorosThisSession = 0;
        showScreen('screen-profile');
    });
    
    document.getElementById('btn-reset-all').addEventListener('click', () => {
        if (confirm('Sei sicuro di voler cancellare tutti i dati? Questa azione è irreversibile.')) {
            localStorage.clear();
            location.reload();
        }
    });
}

function renderWeekChart() {
    const container = document.getElementById('week-chart');
    const last7Days = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 86400000);
        const dateString = date.toDateString();
        const data = state.dailyPomodoros.find(d => d.date === dateString);
        const count = data ? data.count : 0;
        
        last7Days.push({
            label: date.toLocaleDateString('it-IT', { weekday: 'short' }),
            count: count
        });
    }
    
    const maxCount = Math.max(...last7Days.map(d => d.count), 1);
    
    container.innerHTML = last7Days.map(day => {
        const height = (day.count / maxCount) * 100;
        return `
            <div class="chart-bar" style="height: ${height}%;" title="${day.count} pomodori">
                <div class="chart-bar-label">${day.label}<br>${day.count}🍅</div>
            </div>
        `;
    }).join('');
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initProfileSelection();
    
    // Crea Pomo guida (nascosto inizialmente)
    createPomoGuideElement();
    
    // Crea basket (nascosto inizialmente)
    createBasketElement();
});

function createPomoGuideElement() {
    const pomoGuide = document.createElement('div');
    pomoGuide.id = 'pomo-guide';
    pomoGuide.className = 'pomo-guide';
    pomoGuide.style.display = 'none';
    pomoGuide.innerHTML = `
        <svg class="pomo-mascot" viewBox="0 0 200 200">
            <use href="#pomo-neutral"></use>
        </svg>
        <div class="pomo-speech">
            <p>Ciao! Sono Pomo, il tuo compagno di crescita!</p>
        </div>
    `;
    document.body.appendChild(pomoGuide);
}

function createBasketElement() {
    const basket = document.createElement('div');
    basket.className = 'tomato-basket';
    basket.style.display = 'none';
    basket.innerHTML = `
        <div class="basket-icon">🧺</div>
        <div>
            <div class="basket-count">0</div>
            <div class="basket-label">raccolti oggi</div>
        </div>
    `;
    document.body.appendChild(basket);
}

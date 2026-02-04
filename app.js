// ============================================
// STATE MANAGEMENT
// ============================================

let state = {
    profile: null, // 'studente' o 'professionista'
    selectedRitual: [],
    timerSettings: {
        work: 25,
        shortBreak: 5,
        longBreak: 15
    },
    currentPhase: 'work', // 'work', 'shortBreak', 'longBreak'
    pomodorosCompleted: 0,
    isTimerRunning: false,
    isPaused: false,
    timeRemaining: 0,
    timerInterval: null,
    dailyPomodoros: [],
    streak: 0
};

// ============================================
// DATA: Rituali e Ingredienti
// ============================================

const ritualTemplates = {
    studente: [
        {
            name: "Rituale Focus Esame",
            items: ["Chiudi social e notifiche", "Prepara materiale di studio", "Definisci argomento da studiare", "Prepara acqua e snack"]
        },
        {
            name: "Rituale Scrittura Tesi",
            items: ["Apri solo il documento tesi", "Chiudi email e chat", "Definisci paragrafo da scrivere", "Prepara bibliografia a portata"]
        }
    ],
    professionista: [
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
    studente: [
        "Chiudi social e notifiche",
        "Prepara materiale di studio",
        "Definisci argomento preciso",
        "Prepara acqua e snack",
        "Apri solo app/siti necessari",
        "Metti telefono lontano",
        "Prepara timer carta e penna",
        "Fai 3 respiri profondi"
    ],
    professionista: [
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
    studente: [
        { name: "Classico", work: 25, short: 5, long: 15, desc: "Il classico Pomodoro" },
        { name: "Studio Intenso", work: 45, short: 10, long: 20, desc: "Sessioni più lunghe" },
        { name: "Quick Sprint", work: 15, short: 3, long: 10, desc: "Sessioni brevi e veloci" }
    ],
    professionista: [
        { name: "Deep Work", work: 50, short: 10, long: 30, desc: "Per lavoro complesso" },
        { name: "Classico", work: 25, short: 5, long: 15, desc: "Il classico Pomodoro" },
        { name: "Ultra Focus", work: 90, short: 15, long: 30, desc: "Massima concentrazione" }
    ]
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function saveState() {
    localStorage.setItem('focusflow_state', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('focusflow_state');
    if (saved) {
        const loaded = JSON.parse(saved);
        // Mantieni solo dati persistenti, non timer attivi
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
        
        if (lastDate === yesterday || lastDate === today) {
            // Streak continua
        } else {
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
    
    // Mantieni solo ultimi 30 giorni
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

// ============================================
// SCREEN 1: Profile Selection
// ============================================

function initProfileSelection() {
    const profileBtns = document.querySelectorAll('.profile-btn');
    
    profileBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            state.profile = btn.dataset.profile;
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
    
    container.innerHTML = items.map((item, index) => `
        <div class="ingredient-item" data-ingredient="${item}" onclick="addIngredient('${item}')">
            ${item}
        </div>
    `).join('');
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
        container.innerHTML = state.selectedRitual.map(item => `
            <div class="cart-item">
                <span>${item}</span>
                <button onclick="removeIngredient('${item}')">Rimuovi</button>
            </div>
        `).join('');
        nextBtn.disabled = false;
    }
    
    // Aggiorna visual ingredienti
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
        // Leggi valori custom
        state.timerSettings.work = parseInt(document.getElementById('work-duration').value);
        state.timerSettings.shortBreak = parseInt(document.getElementById('short-break').value);
        state.timerSettings.longBreak = parseInt(document.getElementById('long-break').value);
        
        showScreen('screen-ritual-execution');
        initRitualExecution();
    });
}

function renderTimerPresets() {
    const container = document.getElementById('timer-presets-list');
    const presets = timerPresets[state.profile];
    
    container.innerHTML = presets.map((preset, index) => `
        <div class="preset-btn ${index === 0 ? 'active' : ''}" onclick="selectPreset(${preset.work}, ${preset.short}, ${preset.long})">
            <h4>${preset.name}</h4>
            <p>${preset.work}/${preset.short}/${preset.long} min</p>
            <p style="font-size: 0.85rem; color: #a0aec0;">${preset.desc}</p>
        </div>
    `).join('');
    
    // Imposta default al primo preset
    const first = presets[0];
    document.getElementById('work-duration').value = first.work;
    document.getElementById('short-break').value = first.short;
    document.getElementById('long-break').value = first.long;
}

function selectPreset(work, shortBreak, longBreak) {
    document.getElementById('work-duration').value = work;
    document.getElementById('short-break').value = shortBreak;
    document.getElementById('long-break').value = longBreak;
    
    // Visual feedback
    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

// ============================================
// SCREEN 4: Ritual Execution (Checklist)
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
    
    // Visual feedback per item completati
    checkboxes.forEach((cb, index) => {
        const item = cb.closest('.checklist-item');
        if (cb.checked) {
            item.classList.add('completed');
        } else {
            item.classList.remove('completed');
        }
    });
}

// ============================================
// SCREEN 5: Timer Pomodoro
// ============================================

function startTimer() {
    state.currentPhase = 'work';
    state.isTimerRunning = true;
    state.isPaused = false;
    state.timeRemaining = state.timerSettings.work * 60;
    state.pomodorosCompleted = getTodayPomodoros();
    
    updateTimerDisplay();
    updateIdentityBanner();
    
    state.timerInterval = setInterval(tick, 1000);
    
    // Event listeners per controlli
    document.getElementById('btn-pause').addEventListener('click', pauseTimer);
    document.getElementById('btn-resume').addEventListener('click', resumeTimer);
    document.getElementById('btn-stop').addEventListener('click', stopTimer);
}

function tick() {
    if (!state.isPaused && state.timeRemaining > 0) {
        state.timeRemaining--;
        updateTimerDisplay();
    } else if (state.timeRemaining === 0) {
        handlePhaseComplete();
    }
}

function handlePhaseComplete() {
    clearInterval(state.timerInterval);
    
    // Riproduci suono (opzionale, puoi usare Web Audio API)
    playSound();
    
    if (state.currentPhase === 'work') {
        // Pomodoro completato!
        state.pomodorosCompleted++;
        addPomodoroToHistory();
        updatePomodoroCount();
        
        // Determina prossima fase
        if (state.pomodorosCompleted % 4 === 0) {
            // Pausa lunga dopo 4 pomodori
            if (confirm('🎉 Hai completato 4 pomodori! Vuoi fare una pausa lunga?')) {
                startBreak('longBreak');
            } else {
                showRecap();
            }
        } else {
            // Pausa breve
            if (confirm('✅ Pomodoro completato! Vuoi fare una pausa breve?')) {
                startBreak('shortBreak');
            } else {
                startWorkSession();
            }
        }
    } else {
        // Pausa completata
        if (confirm('⏰ Pausa terminata! Pronto per il prossimo pomodoro?')) {
            startWorkSession();
        } else {
            showRecap();
        }
    }
}

function startWorkSession() {
    state.currentPhase = 'work';
    state.timeRemaining = state.timerSettings.work * 60;
    updateTimerDisplay();
    state.timerInterval = setInterval(tick, 1000);
}

function startBreak(type) {
    state.currentPhase = type;
    const duration = type === 'longBreak' ? state.timerSettings.longBreak : state.timerSettings.shortBreak;
    state.timeRemaining = duration * 60;
    updateTimerDisplay();
    state.timerInterval = setInterval(tick, 1000);
}

function pauseTimer() {
    state.isPaused = true;
    document.getElementById('btn-pause').style.display = 'none';
    document.getElementById('btn-resume').style.display = 'inline-block';
}

function resumeTimer() {
    state.isPaused = false;
    document.getElementById('btn-pause').style.display = 'inline-block';
    document.getElementById('btn-resume').style.display = 'none';
}

function stopTimer() {
    if (confirm('Sei sicuro di voler interrompere la sessione?')) {
        clearInterval(state.timerInterval);
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
    const count = state.pomodorosCompleted;
    
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
    // Semplice beep usando Web Audio API
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
    
    document.getElementById('btn-new-session').addEventListener('click', () => {
        // Reset per nuova sessione
        state.selectedRitual = [];
        state.isTimerRunning = false;
        state.isPaused = false;
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
            <div class="chart-bar" style="height: ${height}%;">
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
});

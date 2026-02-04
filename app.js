function handlePhaseComplete() {
    clearInterval(state.timerInterval);
    
    // Riproduci suono
    playSound();
    
    if (state.currentPhase === 'work') {
        // Pomodoro completato!
        state.pomodorosCompleted++;
        addPomodoroToHistory();
        updatePomodoroCount();
        updateIdentityBanner();
        
        // Determina prossima fase
        if (state.pomodorosCompleted % 4 === 0) {
            // Pausa lunga dopo 4 pomodori
            const wantsLongBreak = confirm('🎉 Hai completato 4 pomodori! Vuoi fare una pausa lunga?');
            if (wantsLongBreak) {
                startBreak('longBreak');
            } else {
                const continueWorking = confirm('Vuoi continuare con un altro pomodoro?');
                if (continueWorking) {
                    startWorkSession();
                } else {
                    showRecap();
                }
            }
        } else {
            // Pausa breve
            const wantsShortBreak = confirm('✅ Pomodoro completato! Vuoi fare una pausa breve?');
            if (wantsShortBreak) {
                startBreak('shortBreak');
            } else {
                const continueWorking = confirm('Vuoi continuare con un altro pomodoro?');
                if (continueWorking) {
                    startWorkSession();
                } else {
                    showRecap();
                }
            }
        }
    } else {
        // Pausa completata
        const continueWorking = confirm('⏰ Pausa terminata! Pronto per il prossimo pomodoro?');
        if (continueWorking) {
            startWorkSession();
        } else {
            showRecap();
        }
    }
}

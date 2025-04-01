// Définition des objectifs
const objectives = {
    personal: [
        { id: 'running', title: 'Courir', target: 150, unit: 'km', current: 0, xpPerUnit: 10 },
        { id: 'pushups', title: 'Pompes', target: 1500, unit: 'pompes', current: 0, xpPerUnit: 1 },
        { id: 'pullups', title: 'Tractions', target: 300, unit: 'tractions', current: 0, xpPerUnit: 5 },
        { id: 'frenchAudio', title: 'Lecture audio français/arabe', target: 300, unit: 'pages', current: 0, xpPerUnit: 5 },
        { id: 'birthBook', title: 'Livre naissance', target: 200, unit: 'pages', current: 0, xpPerUnit: 5 },
        { id: 'quranReading', title: 'Lecture du Coran (4 pages)', target: 30, unit: 'lectures', current: 0, xpPerUnit: 20 },
        { id: 'quranLearning', title: 'Mémorisation Coran', target: 2, unit: 'pages', current: 0, xpPerUnit: 50 },
        { id: 'mosquePrayer', title: 'Prières à la mosquée', target: 30, unit: 'prières', current: 0, xpPerUnit: 10 },
        { id: 'extraPrayers', title: 'Prières surérogatoires', target: 150, unit: 'unités', current: 0, xpPerUnit: 2 },
        { id: 'fasting', title: 'Jeûne', target: 8, unit: 'jours', current: 0, xpPerUnit: 30 },
        { id: 'sleep', title: 'Sommeil', target: 250, unit: 'heures', isReverse: true, current: 0, xpPerUnit: 1 }
    ],
    professional: [
        { id: 'shortVideos', title: 'Vidéos courtes', target: 60, unit: 'vidéos', current: 0, xpPerUnit: 15 },
        { id: 'focusTime', title: 'Sessions focus (max 3x25min)', target: 1, unit: 'sessions', isDaily: true, current: 0, xpPerUnit: 20 }
    ]
};

// Configuration du système de niveau
const levelConfig = {
    baseXP: 100,
    multiplier: 1.5,
    maxLevel: 50
};

// Badges disponibles
const badges = [
    { id: 'firstDay', title: 'Premier jour', icon: '🏆', description: 'Premier jour de suivi', condition: stats => stats.daysActive >= 1 },
    { id: 'streak3', title: 'Série de 3', icon: '🔥', description: '3 jours consécutifs', condition: stats => stats.currentStreak >= 3 },
    { id: 'streak7', title: 'Semaine parfaite', icon: '🎯', description: '7 jours consécutifs', condition: stats => stats.currentStreak >= 7 },
    { id: 'halfwayThere', title: 'À mi-chemin', icon: '⏳', description: '50% des objectifs atteints', condition: stats => stats.completionPercentage >= 50 },
    { id: 'fullComplete', title: 'Mission accomplie', icon: '🚀', description: 'Tous les objectifs atteints', condition: stats => stats.completionPercentage >= 100 },
    { id: 'runner', title: 'Coureur', icon: '🏃', description: '50km de course', condition: stats => getObjectiveProgress('running') >= 50 },
    { id: 'marathoner', title: 'Marathonien', icon: '🏅', description: '100km de course', condition: stats => getObjectiveProgress('running') >= 100 },
    { id: 'pushupKing', title: 'Roi des pompes', icon: '💪', description: '500 pompes', condition: stats => getObjectiveProgress('pushups') >= 500 },
    { id: 'quranReader', title: 'Lecteur assidu', icon: '📖', description: '10 lectures du Coran', condition: stats => getObjectiveProgress('quranReading') >= 10 },
    { id: 'earlyBird', title: 'Lève-tôt', icon: '🌅', description: 'Maximum 200h de sommeil', condition: stats => getObjectiveProgress('sleep') >= 200 },
    { id: 'contentCreator', title: 'Créateur de contenu', icon: '📱', description: '30 vidéos créées', condition: stats => getObjectiveProgress('shortVideos') >= 30 }
];

// État de l'application
let appState = {
    xp: 0,
    level: 1,
    currentStreak: 0,
    bestStreak: 0,
    lastActiveDate: null,
    daysActive: 0,
    dailyInputs: {},
    completedObjectives: [],
    unlockedBadges: [],
    history: {}
};

// Éléments DOM principaux
const elements = {
    currentDate: document.getElementById('current-date'),
    currentLevel: document.getElementById('current-level'),
    xpCount: document.getElementById('xp-count'),
    xpProgress: document.getElementById('xp-progress'),
    dailyInputs: document.getElementById('daily-inputs'),
    progressContainer: document.getElementById('progress-container'),
    saveButton: document.getElementById('save-progress'),
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    categoryButtons: document.querySelectorAll('.category-btn'),
    currentStreak: document.getElementById('current-streak'),
    bestStreak: document.getElementById('best-streak'),
    objectivesCompleted: document.getElementById('objectives-completed'),
    completionPercentage: document.getElementById('completion-percentage'),
    badgesContainer: document.getElementById('badges-container'),
    levelUpModal: document.getElementById('level-up-modal'),
    newLevel: document.getElementById('new-level'),
    closeModal: document.getElementById('close-modal')
};

// Fonctions utilitaires
function formatDate(date) {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(date);
}

function getXpForNextLevel(level) {
    return Math.round(levelConfig.baseXP * Math.pow(levelConfig.multiplier, level - 1));
}

function getObjectiveProgress(objectiveId) {
    for (const category in objectives) {
        const objective = objectives[category].find(obj => obj.id === objectiveId);
        if (objective) {
            return objective.current;
        }
    }
    return 0;
}

function calculateXpProgress() {
    const currentLevelXp = getXpForNextLevel(appState.level - 1) || 0;
    const nextLevelXp = getXpForNextLevel(appState.level);
    const levelProgress = appState.xp - currentLevelXp;
    const levelTotal = nextLevelXp - currentLevelXp;
    
    return Math.min(Math.floor((levelProgress / levelTotal) * 100), 100);
}

function addXp(amount) {
    const previousLevel = appState.level;
    appState.xp += amount;
    
    // Vérifiez si le joueur a gagné un niveau
    while (appState.xp >= getXpForNextLevel(appState.level) && appState.level < levelConfig.maxLevel) {
        appState.level++;
    }
    
    // Afficher l'animation de niveau supérieur si nécessaire
    if (appState.level > previousLevel) {
        elements.newLevel.textContent = appState.level;
        elements.levelUpModal.style.display = 'flex';
    }
    
    updateUIState();
}

function calculateCompletionPercentage() {
    let totalProgress = 0;
    let totalTarget = 0;
    
    for (const category in objectives) {
        objectives[category].forEach(objective => {
            if (!objective.isDaily) {
                const progressValue = objective.isReverse 
                    ? Math.min(objective.current, objective.target) 
                    : objective.current;
                
                totalProgress += progressValue;
                totalTarget += objective.target;
            }
        });
    }
    
    return totalTarget > 0 ? Math.floor((totalProgress / totalTarget) * 100) : 0;
}

function checkForNewBadges() {
    const stats = {
        currentStreak: appState.currentStreak,
        daysActive: appState.daysActive,
        completionPercentage: calculateCompletionPercentage()
    };
    
    badges.forEach(badge => {
        const hasUnlocked = appState.unlockedBadges.includes(badge.id);
        if (!hasUnlocked && badge.condition(stats)) {
            appState.unlockedBadges.push(badge.id);
            
            // Notification de badge (à implémenter)
            console.log(`Badge débloqué: ${badge.title}`);
        }
    });
}

function checkStreak() {
    if (!appState.lastActiveDate) return;
    
    const lastDate = new Date(appState.lastActiveDate);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Formatez les dates en chaînes YYYY-MM-DD pour comparer seulement les jours
    const lastDateStr = lastDate.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    
    if (lastDateStr === yesterdayStr || lastDateStr === todayStr) {
        // Continuer le streak seulement si la dernière activité était hier ou aujourd'hui
        appState.currentStreak++;
    } else {
        // Réinitialiser le streak
        appState.currentStreak = 1;
    }
    
    // Mettre à jour le meilleur streak si nécessaire
    if (appState.currentStreak > appState.bestStreak) {
        appState.bestStreak = appState.currentStreak;
    }
    
    appState.lastActiveDate = todayStr;
}

function updateUIState() {
    // Mettre à jour la date
    const today = new Date();
    elements.currentDate.textContent = formatDate(today);
    
    // Mettre à jour le niveau et XP
    elements.currentLevel.textContent = appState.level;
    elements.xpCount.textContent = `${appState.xp} XP`;
    
    // Mettre à jour la barre de progression XP
    const xpPercent = calculateXpProgress();
    elements.xpProgress.style.width = `${xpPercent}%`;
    
    // Mettre à jour les statistiques
    elements.currentStreak.textContent = appState.currentStreak;
    elements.bestStreak.textContent = appState.bestStreak;
    elements.objectivesCompleted.textContent = appState.completedObjectives.length;
    
    const completionPercent = calculateCompletionPercentage();
    elements.completionPercentage.textContent = `${completionPercent}%`;
    
    renderBadges();
    renderProgressView();
}

// Rendu de l'interface utilisateur
function renderDailyInputs() {
    elements.dailyInputs.innerHTML = '';
    
    const today = new Date().toISOString().split('T')[0];
    const todayData = appState.dailyInputs[today] || {};
    
    // Générer les champs de saisie pour les objectifs personnels
    const personalGroup = document.createElement('div');
    personalGroup.className = 'daily-input-group';
    personalGroup.innerHTML = '<h3>Objectifs Personnels</h3>';
    
    objectives.personal.forEach(objective => {
        const inputValue = todayData[objective.id] || 0;
        
        const inputItem = document.createElement('div');
        inputItem.className = 'input-header';
        inputItem.innerHTML = `
            <div class="objective-title">${objective.title}</div>
            <div class="input-container">
                <input type="number" id="input-${objective.id}" value="${inputValue}" min="0" step="1">
                <span>${objective.unit}</span>
            </div>
        `;
        
        personalGroup.appendChild(inputItem);
    });
    
    // Générer les champs de saisie pour les objectifs professionnels
    const professionalGroup = document.createElement('div');
    professionalGroup.className = 'daily-input-group';
    professionalGroup.innerHTML = '<h3>Objectifs Professionnels</h3>';
    
    objectives.professional.forEach(objective => {
        const inputValue = todayData[objective.id] || 0;
        
        const inputItem = document.createElement('div');
        inputItem.className = 'input-header';
        inputItem.innerHTML = `
            <div class="objective-title">${objective.title}</div>
            <div class="input-container">
                <input type="number" id="input-${objective.id}" value="${inputValue}" min="0" step="1">
                <span>${objective.unit}</span>
            </div>
        `;
        
        professionalGroup.appendChild(inputItem);
    });
    
    elements.dailyInputs.appendChild(personalGroup);
    elements.dailyInputs.appendChild(professionalGroup);
}

function renderProgressView() {
    elements.progressContainer.innerHTML = '';
    
    // Déterminer quelle catégorie est active
    const activeCategory = document.querySelector('.category-btn.active').dataset.category;
    
    objectives[activeCategory].forEach(objective => {
        const progressPercent = Math.min(Math.floor((objective.current / objective.target) * 100), 100);
        const isComplete = objective.current >= objective.target;
        
        const objectiveItem = document.createElement('div');
        objectiveItem.className = `objective-item ${isComplete ? 'completed' : ''}`;
        
        objectiveItem.innerHTML = `
            <div class="objective-header">
                <div class="objective-title">${objective.title}</div>
                <div class="objective-progress">${objective.current} / ${objective.target} ${objective.unit}</div>
            </div>
            <div class="progress-bar">
                <div class="progress-value" style="width: ${progressPercent}%; background-color: ${getProgressColor(progressPercent)};"></div>
            </div>
        `;
        
        elements.progressContainer.appendChild(objectiveItem);
    });
}

function getProgressColor(percent) {
    if (percent < 25) return 'var(--danger-color)';
    if (percent < 50) return '#f39c12';
    if (percent < 75) return '#3498db';
    return 'var(--secondary-color)';
}

function renderBadges() {
    elements.badgesContainer.innerHTML = '';
    
    badges.forEach(badge => {
        const isUnlocked = appState.unlockedBadges.includes(badge.id);
        
        const badgeElement = document.createElement('div');
        badgeElement.className = `badge ${isUnlocked ? 'badge-unlocked' : 'badge-locked'}`;
        badgeElement.innerHTML = `
            <div class="badge-icon">${badge.icon}</div>
            <div class="badge-title">${badge.title}</div>
        `;
        
        // Ajouter une info-bulle pour la description
        badgeElement.title = badge.description;
        
        elements.badgesContainer.appendChild(badgeElement);
    });
}

// Gestionnaires d'événements
function setupEventListeners() {
    // Gestion des onglets
    elements.tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.id.replace('tab-', '');
            
            // Désactiver tous les onglets
            elements.tabButtons.forEach(btn => btn.classList.remove('active'));
            elements.tabContents.forEach(content => content.classList.remove('active'));
            
            // Activer l'onglet sélectionné
            button.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
    
    // Gestion des catégories dans l'onglet de progression
    elements.categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            elements.categoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            renderProgressView();
        });
    });
    
    // Sauvegarde des progrès quotidiens
    elements.saveButton.addEventListener('click', saveProgress);
    
    // Fermeture du modal de niveau supérieur
    elements.closeModal.addEventListener('click', () => {
        elements.levelUpModal.style.display = 'none';
    });
}

function saveProgress() {
    const today = new Date().toISOString().split('T')[0];
    appState.dailyInputs[today] = {};
    
    let totalXpEarned = 0;
    
    // Récupérer toutes les valeurs des champs de saisie
    for (const category in objectives) {
        objectives[category].forEach(objective => {
            const inputElement = document.getElementById(`input-${objective.id}`);
            const inputValue = parseInt(inputElement.value, 10) || 0;
            
            // Enregistrer la valeur d'entrée pour aujourd'hui
            appState.dailyInputs[today][objective.id] = inputValue;
            
            // Calculer l'XP gagnée aujourd'hui (différence entre la valeur précédente)
            const previousDayValue = getPreviousDayValue(objective.id);
            const dailyProgress = inputValue - previousDayValue;
            
            if (dailyProgress > 0) {
                const xpEarned = dailyProgress * objective.xpPerUnit;
                totalXpEarned += xpEarned;
            }
            
            // Mettre à jour la valeur totale
            if (objective.isDaily) {
                objective.current += inputValue > 0 ? 1 : 0; // Compter comme un jour fait si la valeur est > 0
            } else {
                objective.current = Math.max(inputValue, objective.current);
            }
            
            // Vérifier si l'objectif est nouvellement complété
            if (objective.current >= objective.target && !appState.completedObjectives.includes(objective.id)) {
                appState.completedObjectives.push(objective.id);
                
                // Bonus XP pour objectif complet
                totalXpEarned += objective.xpPerUnit * 10;
            }
        });
    }
    
    // Vérifier/mettre à jour les streaks
    appState.daysActive++;
    checkStreak();
    
    // Ajouter l'XP gagnée
    if (totalXpEarned > 0) {
        addXp(totalXpEarned);
    }
    
    // Vérifier les nouveaux badges déverrouillés
    checkForNewBadges();
    
    // Sauvegarder l'état
    saveAppState();
    
    // Feedback utilisateur
    alert(`Progression sauvegardée ! +${totalXpEarned} XP gagnés`);
}

function getPreviousDayValue(objectiveId) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    return (appState.dailyInputs[yesterdayStr] && appState.dailyInputs[yesterdayStr][objectiveId]) || 0;
}

// Sauvegarde et chargement de l'état
function saveAppState() {
    const stateToSave = {
        ...appState,
        objectives // Inclure l'état des objectifs
    };
    
    localStorage.setItem('objectiveTrackerState', JSON.stringify(stateToSave));
}

function loadAppState() {
    const savedState = localStorage.getItem('objectiveTrackerState');
    
    if (savedState) {
        const parsedState = JSON.parse(savedState);
        
        // Restaurer les objectifs
        if (parsedState.objectives) {
            for (const category in parsedState.objectives) {
                parsedState.objectives[category].forEach((savedObj, index) => {
                    if (objectives[category] && objectives[category][index]) {
                        objectives[category][index].current = savedObj.current;
                    }
                });
            }
            
            delete parsedState.objectives; // Retirer les objectifs de l'état après restauration
        }
        
        // Restaurer le reste de l'état
        appState = {
            ...appState, // Garder les valeurs par défaut
            ...parsedState // Écraser avec les valeurs sauvegardées
        };
    }
}

// Définir des notifications (rappel à faire plus tard)
function setupNotifications() {
    // À implémenter pour rappeler l'utilisateur de saisir ses données quotidiennes
}

// Initialisation de l'application
function initApp() {
    loadAppState();
    renderDailyInputs();
    updateUIState();
    setupEventListeners();
    setupNotifications();
}

// Démarrer l'application
document.addEventListener('DOMContentLoaded', initApp); 
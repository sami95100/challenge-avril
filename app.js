console.log("APP.JS CHARGÉ");

// Import des fonctions Supabase
import { supabase, getCurrentUser, loginUser, signupUser, logoutUser, loadUserData, saveUserProgress } from './supabase.js';

// Définition des objectifs (sera remplacée par les données de Supabase après connexion)
// Rendre les objectifs accessibles globalement
window.objectives = {
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

// Référence à la variable objectives pour usage dans le script
const objectives = window.objectives;

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
    history: {},
    objectiveStreaks: {},
    lastMissedDay: {}
};

// Éléments DOM
const elements = {
    // Onglets et conteneurs principaux
    dailyTab: document.getElementById('daily-tab'),
    progressTab: document.getElementById('progress-tab'),
    statsTab: document.getElementById('stats-tab'),
    
    // Boutons d'onglets
    tabDaily: document.getElementById('tab-daily'),
    tabProgress: document.getElementById('tab-progress'),
    tabStats: document.getElementById('tab-stats'),
    
    // Conteneurs pour les entrées et les objectifs
    dailyInputs: document.getElementById('daily-inputs'),
    progressContainer: document.getElementById('progress-container'),
    statsContainer: document.getElementById('stats-container'),
    
    // Boutons de catégorie
    categoryBtnPersonal: document.getElementById('category-btn-personal'),
    categoryBtnProfessional: document.getElementById('category-btn-professional'),
    
    // Autres éléments
    saveButton: document.createElement('button'),
    currentDate: document.getElementById('current-date'),
    currentLevel: document.getElementById('current-level'),
    xpCount: document.getElementById('xp-count'),
    xpProgress: document.getElementById('xp-progress'),
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
    
    updateUI();
}

function calculateCompletionPercentage() {
    let totalTargets = 0;
    let totalProgress = 0;
    
    // Parcourir toutes les catégories d'objectifs
    for (const category in objectives) {
        objectives[category].forEach(objective => {
            if (objective.isDaily) return; // Ignorer les objectifs quotidiens
            
            totalTargets += objective.target;
            
            // Limiter la progression à la cible (pas plus de 100%)
            if (objective.current >= objective.target) {
                totalProgress += objective.target;
            } else {
                totalProgress += objective.current;
            }
        });
    }
    
    if (totalTargets === 0) return 0;
    
    const completionPercent = Math.min(Math.round((totalProgress / totalTargets) * 100), 100);
    return completionPercent;
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

function updateUI() {
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
    console.log("Rendu des inputs quotidiens");
    
    // Vérifier si elements.dailyInputs existe
    if (!elements.dailyInputs) {
        console.error("Le conteneur dailyInputs n'existe pas");
        elements.dailyInputs = document.getElementById('daily-inputs');
        if (!elements.dailyInputs) {
            console.error("Impossible de trouver le conteneur #daily-inputs dans le DOM");
            return;
        }
    }
    
    elements.dailyInputs.innerHTML = '';
    
    // Vérifier si objectives est correctement initialisé
    if (!objectives || typeof objectives !== 'object') {
        console.error("La variable objectives n'est pas correctement initialisée:", objectives);
        elements.dailyInputs.innerHTML = '<p class="error-message">Erreur de chargement des objectifs. Veuillez rafraîchir la page.</p>';
        return;
    }
    
    console.log("Catégories d'objectifs:", Object.keys(objectives));
    
    // Forcer l'initialisation des objectifs par défaut si nécessaire
    if (!objectives.personal || !objectives.professional || 
        !Array.isArray(objectives.personal) || !Array.isArray(objectives.professional) ||
        objectives.personal.length === 0 || objectives.professional.length === 0) {
        console.log("Objectifs manquants ou vides, initialisation des objectifs par défaut");
        initializeDefaultObjectives();
        
        // Vérification après initialisation
        if (!objectives.personal || !objectives.professional || 
            !Array.isArray(objectives.personal) || !Array.isArray(objectives.professional) ||
            objectives.personal.length === 0 || objectives.professional.length === 0) {
            console.error("L\'initialisation des objectifs a échoué");
            elements.dailyInputs.innerHTML = '<p class="error-message">Erreur critique: Impossible d\'initialiser les objectifs.</p>';
            return;
        }
    }
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayData = appState.history[todayStr] || {};
    
    // Calculer la date d'hier
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdayData = appState.history[yesterdayStr] || {};
    
    // Log des objectifs pour le débogage
    console.log("Nombre d'objectifs personnels:", objectives.personal.length);
    console.log("Nombre d'objectifs professionnels:", objectives.professional.length);
    
    // Ajouter un sélecteur de date (hier/aujourd'hui) - inverser l'ordre
    const dateSelector = document.createElement('div');
    dateSelector.className = 'date-selector';
    dateSelector.innerHTML = `
        <button id="yesterday-btn" class="date-btn">Hier (${formatDate(yesterday)})</button>
        <button id="today-btn" class="date-btn active">Aujourd'hui (${formatDate(today)})</button>
    `;
    elements.dailyInputs.appendChild(dateSelector);
    
    // Conteneur pour les inputs selon la date
    const inputsContainer = document.createElement('div');
    inputsContainer.id = 'date-inputs-container';
    inputsContainer.className = 'date-inputs-container';
    elements.dailyInputs.appendChild(inputsContainer);
    
    // Fonction pour rendre les inputs d'une journée spécifique
    function renderDateInputs(dateStr, dateData, dateTitle) {
        console.log(`Rendu des inputs pour ${dateTitle}`, dateData);
        inputsContainer.innerHTML = '';
        elements.currentDate.textContent = dateTitle;
        
        // Parcourir les catégories d'objectifs
        for (const category in objectives) {
            if (!objectives[category] || !Array.isArray(objectives[category]) || objectives[category].length === 0) {
                console.error(`Catégorie d'objectifs invalide ou vide: ${category}`);
                continue;
            }
            
            const categoryTitle = category === 'personal' ? 'Objectifs Personnels' : 'Objectifs Professionnels';
            
            const categorySection = document.createElement('div');
            categorySection.className = 'objective-category';
            categorySection.innerHTML = `<h3>${categoryTitle}</h3>`;
            
            // Parcourir les objectifs de cette catégorie
            objectives[category].forEach(objective => {
                const inputWrapper = document.createElement('div');
                inputWrapper.className = 'input-wrapper';
                
                // Récupérer la valeur déjà saisie pour cette date (si elle existe)
                const currentValue = dateData[objective.id] || '';
                
                const inputHTML = `
                    <div class="input-header">
                        <label for="${objective.id}-input">${objective.title}</label>
                    </div>
                    <div class="input-container">
                        <input 
                            type="number" 
                            id="${objective.id}-input" 
                            min="0" 
                            step="1" 
                            placeholder="0"
                            value="${currentValue}"
                            data-date="${dateStr}"
                        >
                        <span class="unit">${objective.unit}</span>
                    </div>
                `;
                
                inputWrapper.innerHTML = inputHTML;
                categorySection.appendChild(inputWrapper);
            });
            
            inputsContainer.appendChild(categorySection);
        }
        
        // Ajouter un seul bouton de sauvegarde pour cette journée
        const saveButton = document.createElement('button');
        saveButton.className = 'action-btn save-progress-btn';
        saveButton.textContent = `SAUVEGARDER (${dateTitle})`;
        saveButton.setAttribute('data-date', dateStr);
        saveButton.addEventListener('click', () => saveProgress(dateStr));
        
        inputsContainer.appendChild(saveButton);
    }
    
    // Afficher par défaut aujourd'hui
    renderDateInputs(todayStr, todayData, formatDate(today));
    
    // Événements pour les boutons de sélection de date
    document.getElementById('today-btn').addEventListener('click', (e) => {
        document.querySelectorAll('.date-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        renderDateInputs(todayStr, todayData, formatDate(today));
    });
    
    document.getElementById('yesterday-btn').addEventListener('click', (e) => {
        document.querySelectorAll('.date-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        renderDateInputs(yesterdayStr, yesterdayData, formatDate(yesterday));
    });
    
    console.log("Inputs quotidiens rendus avec succès");
}

function renderProgressView() {
    console.log("Rendu de la vue de progression");
    elements.progressContainer.innerHTML = '';
    
    // Ajouter un titre global avec le pourcentage de progression
    const completionPercent = calculateCompletionPercentage();
    const globalProgressHeader = document.createElement('div');
    globalProgressHeader.className = 'global-progress-header';
    globalProgressHeader.innerHTML = `
        <h3>Progression Globale</h3>
        <div class="global-percent">${completionPercent}%</div>
    `;
    elements.progressContainer.appendChild(globalProgressHeader);
    
    // Ajouter une barre de progression globale
    const globalProgressBar = document.createElement('div');
    globalProgressBar.className = 'progress-bar global-progress-bar';
    globalProgressBar.innerHTML = `
        <div class="progress-value" style="width: ${completionPercent}%; background-color: ${getProgressColor(completionPercent)};"></div>
    `;
    elements.progressContainer.appendChild(globalProgressBar);
    
    // Ajouter un séparateur
    const separator = document.createElement('div');
    separator.className = 'separator';
    elements.progressContainer.appendChild(separator);
    
    // Déterminer quelle catégorie est active
    const activeCategoryElement = document.querySelector('.category-btn.active');
    const activeCategory = activeCategoryElement ? activeCategoryElement.getAttribute('data-category') : 'personal';
    
    // Si aucune catégorie n'est active, activer "personal" par défaut
    if (!activeCategoryElement) {
        const personalBtn = document.querySelector('.category-btn[data-category="personal"]');
        if (personalBtn) {
            personalBtn.classList.add('active');
        }
    }
    
    // Filtrer les objectifs par catégorie active
    if (objectives[activeCategory]) {
        objectives[activeCategory].forEach(objective => {
            if (objective.isDaily) return; // Ignorer les objectifs quotidiens
            
            // Calculer le pourcentage de progression, forcer à 100% si current >= target
            let progressPercent = 0;
            if (objective.current >= objective.target) {
                progressPercent = 100;
            } else {
                progressPercent = Math.round((objective.current / objective.target) * 100);
            }
            
            // Forcer l'affichage de la barre à 100% si la cible est atteinte
            const barWidth = objective.current >= objective.target ? "100%" : `${progressPercent}%`;
            
            const objectiveElement = document.createElement('div');
            objectiveElement.className = 'objective-progress';
            objectiveElement.innerHTML = `
                <div class="objective-info">
                    <span class="objective-title">${objective.title}</span>
                    <div class="objective-value-container">
                        <span class="objective-value">${objective.current}/${objective.target} ${objective.unit}</span>
                        <span class="progress-percent">${progressPercent}%</span>
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress-value" style="width: ${barWidth}; background-color: ${getProgressColor(progressPercent, objective.isReverse)};"></div>
                </div>
            `;
            
            elements.progressContainer.appendChild(objectiveElement);
        });
    } else {
        elements.progressContainer.innerHTML = '<p>Aucun objectif trouvé pour cette catégorie.</p>';
    }
}

// Fonction pour obtenir la couleur de la barre de progression
function getProgressColor(percent, isReverse = false) {
    if (isReverse) {
        // Pour les objectifs où moins c'est mieux
        if (percent >= 90) return '#ff4d4d'; // Rouge
        if (percent >= 70) return '#ff9933'; // Orange
        return '#4caf50'; // Vert
    } else {
        // Pour les objectifs normaux
        if (percent >= 90) return '#4caf50'; // Vert
        if (percent >= 70) return '#ff9933'; // Orange
        return '#ff4d4d'; // Rouge
    }
}

function renderBadges() {
    console.log("Rendu des badges");
    if (!elements.badgesContainer) {
        console.error("Container de badges non trouvé");
        return;
    }
    
    elements.badgesContainer.innerHTML = '';
    
    // Si aucun badge n'est débloqué, afficher au moins le badge premier jour
    if (!appState.unlockedBadges || appState.unlockedBadges.length === 0) {
        appState.unlockedBadges = ['firstDay'];
        console.log("Badge 'Premier jour' ajouté par défaut");
    }
    
    badges.forEach(badge => {
        const isUnlocked = appState.unlockedBadges.includes(badge.id);
        
        const badgeElement = document.createElement('div');
        badgeElement.className = `badge-item ${isUnlocked ? 'badge-unlocked' : 'badge-locked'}`;
        
        badgeElement.innerHTML = `
            <div class="badge-icon">${badge.icon}</div>
            <div class="badge-info">
                <div class="badge-title">${badge.title}</div>
                <div class="badge-description">${badge.description}</div>
            </div>
        `;
        
        elements.badgesContainer.appendChild(badgeElement);
    });
    console.log(`${elements.badgesContainer.childElementCount} badges rendus`);
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

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Initialisation de l'application");
    
    // Forcer l'initialisation des objectifs par défaut dès le démarrage
    initializeDefaultObjectives();
    console.log("Initialisation des objectifs par défaut...");
    console.log("Objectifs personnels:", objectives.personal.length);
    console.log("Objectifs professionnels:", objectives.professional.length);
    
    // Vérifier si l'utilisateur est déjà connecté
    try {
        const user = await getCurrentUser();
        console.log("User status:", user ? "Connecté" : "Non connecté", user);
        
        if (user) {
            // Utilisateur connecté, charger ses données
            hideAuthScreen();
            showLoadingIndicator();
            
            try {
                const userData = await loadUserData(user.id);
                console.log("Données utilisateur brutes:", userData);
                
                if (userData) {
                    // Mettre à jour les objectifs et l'appState avec les données de l'utilisateur
                    if (userData.objectives) {
                        // S'assurer que les objectifs sont correctement structurés
                        if (userData.objectives.personal && userData.objectives.personal.length > 0) {
                            objectives.personal = userData.objectives.personal;
                            console.log("Objectifs personnels chargés:", objectives.personal.length);
                        } else {
                            console.warn("Aucun objectif personnel trouvé dans Supabase, utilisation des valeurs par défaut");
                        }
                        
                        if (userData.objectives.professional && userData.objectives.professional.length > 0) {
                            objectives.professional = userData.objectives.professional;
                            console.log("Objectifs professionnels chargés:", objectives.professional.length);
                        } else {
                            console.warn("Aucun objectif professionnel trouvé dans Supabase, utilisation des valeurs par défaut");
                        }
                    } else {
                        console.warn("Aucun objectif trouvé dans les données utilisateur");
                    }
                    
                    if (userData.profile) {
                        appState.level = userData.profile.level || 1;
                        appState.xp = userData.profile.xp || 0;
                        appState.currentStreak = userData.profile.current_streak || 0;
                        appState.bestStreak = userData.profile.best_streak || 0;
                        appState.daysActive = userData.profile.days_active || 1;
                        appState.lastActiveDate = userData.profile.last_active_date;
                    }
                    
                    appState.unlockedBadges = userData.unlockedBadges || ['firstDay'];
                    appState.history = userData.history || {};
                    
                    console.log("Données utilisateur chargées:", userData);
                } else {
                    console.warn("Aucune donnée utilisateur trouvée, objectifs par défaut déjà initialisés");
                }
            } catch (error) {
                console.error("Erreur lors du chargement des données:", error);
                console.log("Utilisation des objectifs par défaut (déjà initialisés)");
            } finally {
                hideLoadingIndicator();
                initApp();
            }
        } else {
            // Utilisateur non connecté, afficher l'écran de connexion
            showAuthScreen();
            setupAuthEvents();
        }
    } catch (error) {
        console.error("Erreur lors de la vérification de l'utilisateur:", error);
        showAuthScreen();
        setupAuthEvents();
    }
});

// Fonction pour initialiser des objectifs par défaut (si les données ne sont pas disponibles)
// Cette fonction est maintenant définie dans supabase.js
// On garde juste un wrapper pour compatibilité
function initializeDefaultObjectives() {
    // Appel de la fonction dans supabase.js
    import('./supabase.js').then(module => {
        // Si la fonction est exportée
        if (module.initializeDefaultObjectives) {
            module.initializeDefaultObjectives();
        } else {
            console.warn("Utilisation de la version locale de initializeDefaultObjectives");
            // Appel direct de la fonction non-exportée via un appel global
            window.initializeDefaultObjectivesLocally && window.initializeDefaultObjectivesLocally();
        }
    }).catch(error => {
        console.error("Erreur lors de l'import de supabase.js:", error);
        // Fallback direct
        if (window.objectives) {
            window.objectives.personal = [
                { id: 'running', title: 'Courir', target: 150, unit: 'km', current: 0, xpPerUnit: 10 },
                { id: 'pushups', title: 'Pompes', target: 1500, unit: 'pompes', current: 0, xpPerUnit: 1 },
                // Autres objectifs...
            ];
            
            window.objectives.professional = [
                { id: 'shortVideos', title: 'Vidéos courtes', target: 60, unit: 'vidéos', current: 0, xpPerUnit: 15 },
                { id: 'focusTime', title: 'Sessions focus (max 3x25min)', target: 1, unit: 'sessions', isDaily: true, current: 0, xpPerUnit: 20 }
            ];
        }
    });
}

// Configuration des événements d'authentification
function setupAuthEvents() {
    console.log("Configuration des événements d'authentification");
    
    // Basculer entre les formulaires de connexion et d'inscription
    document.getElementById('show-signup').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('signup-form').style.display = 'block';
        document.getElementById('auth-title').textContent = 'Créer un compte';
        document.getElementById('login-error').textContent = '';
    });
    
    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('signup-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('auth-title').textContent = 'Connexion';
        document.getElementById('signup-error').textContent = '';
    });
    
    // Mode hors ligne
    const offlineBtn = document.getElementById('offline-mode-btn');
    if (offlineBtn) {
        offlineBtn.addEventListener('click', () => {
            console.log("Mode hors ligne activé");
            // Forcer l'initialisation locale des objectifs
            window.forceDisplayApp();
        });
    }
    
    // Connexion
    document.getElementById('login-submit').addEventListener('click', async () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorElement = document.getElementById('login-error');
        
        // Réinitialiser le message d'erreur
        errorElement.textContent = '';
        errorElement.style.display = 'none';
        
        if (!email || !password) {
            errorElement.textContent = "Veuillez remplir tous les champs";
            errorElement.style.display = 'block';
            return;
        }
        
        showLoadingIndicator();
        
        try {
            await loginUser(email, password);
            const user = await getCurrentUser();
            
            if (user) {
                const userData = await loadUserData(user.id);
                if (userData) {
                    // Mettre à jour les objectifs et l'appState avec les données de l'utilisateur
                    if (userData.objectives) {
                        objectives.personal = userData.objectives.personal || [];
                        objectives.professional = userData.objectives.professional || [];
                    }
                    
                    if (userData.profile) {
                        appState.level = userData.profile.level || 1;
                        appState.xp = userData.profile.xp || 0;
                        appState.currentStreak = userData.profile.current_streak || 0;
                        appState.bestStreak = userData.profile.best_streak || 0;
                        appState.daysActive = userData.profile.days_active || 1;
                        appState.lastActiveDate = userData.profile.last_active_date;
                    }
                    
                    appState.unlockedBadges = userData.unlockedBadges || ['firstDay'];
                    appState.history = userData.history || {};
                }
                
                hideAuthScreen();
                initApp();
            }
        } catch (error) {
            console.error("Erreur de connexion:", error);
            errorElement.textContent = `Erreur de connexion: ${error.message || "Vérifiez vos identifiants"}`;
            errorElement.style.display = 'block';
        } finally {
            hideLoadingIndicator();
        }
    });
    
    // Inscription
    document.getElementById('signup-submit').addEventListener('click', async () => {
        const username = document.getElementById('signup-username').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const errorElement = document.getElementById('signup-error');
        
        // Réinitialiser le message d'erreur
        errorElement.textContent = '';
        
        if (!username || !email || !password) {
            errorElement.textContent = "Veuillez remplir tous les champs";
            return;
        }
        
        if (password.length < 6) {
            errorElement.textContent = "Le mot de passe doit contenir au moins 6 caractères";
            return;
        }
        
        showLoadingIndicator();
        
        try {
            await signupUser(email, password, username);
            alert("Compte créé avec succès! Vous pouvez maintenant vous connecter.");
            
            // Afficher le formulaire de connexion
            document.getElementById('signup-form').style.display = 'none';
            document.getElementById('login-form').style.display = 'block';
            document.getElementById('auth-title').textContent = 'Connexion';
            
            // Pré-remplir l'email
            document.getElementById('login-email').value = email;
        } catch (error) {
            console.error("Erreur d'inscription:", error);
            errorElement.textContent = `Erreur d'inscription: ${error.message || "Vérifiez vos informations"}`;
        } finally {
            hideLoadingIndicator();
        }
    });
    
    // Ajouter des écouteurs d'événements pour soumettre les formulaires avec Enter
    document.getElementById('login-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('login-submit').click();
        }
    });
    
    document.getElementById('signup-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('signup-submit').click();
        }
    });
    
    // Déconnexion
    document.getElementById('logout-btn').addEventListener('click', async () => {
        try {
            await logoutUser();
            showAuthScreen();
        } catch (error) {
            console.error("Erreur de déconnexion:", error);
            alert(`Erreur de déconnexion: ${error.message}`);
        }
    });
}

// Fonction pour cacher l'écran d'authentification et afficher l'application
function hideAuthScreen() {
    document.getElementById('auth-container').style.display = 'none';
    document.querySelector('.app-container').style.display = 'flex';
}

// Fonction pour afficher l'écran d'authentification et cacher l'application
function showAuthScreen() {
    document.getElementById('auth-container').style.display = 'flex';
    document.querySelector('.app-container').style.display = 'none';
}

// Fonction pour afficher un indicateur de chargement
function showLoadingIndicator() {
    // Créer un élément de chargement s'il n'existe pas déjà
    if (!document.getElementById('loading-indicator')) {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'loading-indicator';
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.innerHTML = '<div class="spinner"></div><p>Chargement...</p>';
        document.body.appendChild(loadingIndicator);
    }
    
    document.getElementById('loading-indicator').style.display = 'flex';
}

// Fonction pour cacher l'indicateur de chargement
function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

// Mise à jour de la fonction saveProgress pour utiliser Supabase
async function saveProgress(dateStr) {
    // Si aucune date n'est spécifiée, utiliser la date d'aujourd'hui
    if (!dateStr) {
        dateStr = new Date().toISOString().split('T')[0];
    }
    
    console.log(`Sauvegarde des progrès pour la date: ${dateStr}`);
    
    if (!appState.history) {
        appState.history = {};
    }
    
    if (!appState.history[dateStr]) {
        appState.history[dateStr] = {};
        
        // Incrémenter le nombre de jours actifs uniquement si c'est une nouvelle journée
        appState.daysActive++;
    }
    
    // Collecter les valeurs d'entrée et mettre à jour les objectifs
    let totalXpEarned = 0;
    
    for (const category in objectives) {
        objectives[category].forEach(objective => {
            // Sélectionner les inputs avec la date spécifiée
            const inputElement = document.querySelector(`#${objective.id}-input[data-date="${dateStr}"]`);
            if (!inputElement) {
                console.log(`Input pour ${objective.id} non trouvé pour la date ${dateStr}`);
                return;
            }
            
            const inputValue = parseInt(inputElement.value) || 0;
            
            // Calculer la différence avec l'ancienne valeur
            const oldValue = appState.history[dateStr][objective.id] || 0;
            const valueDiff = inputValue - oldValue;
            
            // Enregistrer la nouvelle valeur d'entrée pour cette date
            appState.history[dateStr][objective.id] = inputValue;
            
            // Mettre à jour la progression de l'objectif uniquement si la valeur a changé
            if (valueDiff !== 0) {
                objective.current += valueDiff;
                
                // Calculer l'XP gagnée pour la différence
                let xpEarned = valueDiff * objective.xpPerUnit;
                
                // Si l'objectif est atteint pour la première fois, bonus d'XP
                if (!appState.completedObjectives.includes(objective.id) && objective.current >= objective.target) {
                    appState.completedObjectives.push(objective.id);
                    xpEarned += 50; // Bonus d'XP pour avoir complété un objectif
                }
                
                totalXpEarned += xpEarned;
            }
        });
    }
    
    // Si la date est aujourd'hui, mettre à jour les streaks
    const today = new Date().toISOString().split('T')[0];
    if (dateStr === today) {
        // Vérifier et mettre à jour les flammes des objectifs
        checkObjectiveStreaks();
        
        // Mettre à jour la date de dernière activité pour le streak global
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (appState.lastActiveDate === yesterdayStr) {
            // Continuer le streak
            appState.currentStreak++;
            
            if (appState.currentStreak > appState.bestStreak) {
                appState.bestStreak = appState.currentStreak;
            }
        } else if (appState.lastActiveDate !== today) {
            // Réinitialiser le streak si le dernier jour actif n'était pas hier ni aujourd'hui
            appState.currentStreak = 1;
        }
        
        appState.lastActiveDate = today;
    }
    
    // Ajouter l'XP gagnée au total du joueur
    if (totalXpEarned > 0) {
        addXp(totalXpEarned);
    }
    
    // Vérifier les nouveaux badges
    checkForNewBadges();
    
    // Sauvegarder les données sur Supabase
    const user = await getCurrentUser();
    if (user) {
        showLoadingIndicator();
        try {
            await saveUserProgress(
                user.id, 
                dateStr, 
                appState.history[dateStr], 
                appState, 
                objectives
            );
            console.log("Données sauvegardées sur Supabase");
        } catch (error) {
            console.error("Erreur lors de la sauvegarde sur Supabase:", error);
            // Fallback: sauvegarder en local
            saveAppState();
        } finally {
            hideLoadingIndicator();
        }
    } else {
        // Fallback: sauvegarder en local si non connecté
        saveAppState();
    }
    
    // Afficher une notification de réussite
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <p>Progrès sauvegardé pour ${formatDate(new Date(dateStr))} ! +${totalXpEarned} XP</p>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
    
    // Mettre à jour l'interface
    renderDailyInputs();
    renderProgressView();
    renderBadges();
    renderStats();
    
    return totalXpEarned;
}

function getPreviousDayValue(objectiveId) {
    if (!appState.history) return 0;
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (appState.history[yesterdayStr] && appState.history[yesterdayStr][objectiveId] !== undefined) {
        return appState.history[yesterdayStr][objectiveId];
    }
    
    return 0;
}

// Sauvegarde et chargement de l'état
function saveAppState() {
    console.log("Sauvegarde de l'état de l'application");
    
    // Créer un état à sauvegarder avec les objectifs
    const stateToSave = {
        ...appState,
        objectives: objectives
    };
    
    // Sauvegarder l'état complet
    try {
        localStorage.setItem('challengeAvrilAppState', JSON.stringify(stateToSave));
        console.log("État sauvegardé avec succès");
    } catch (error) {
        console.error("Erreur lors de la sauvegarde de l'état:", error);
    }
}

function loadAppState() {
    console.log("Chargement de l'état de l'application");
    try {
        const savedState = localStorage.getItem('challengeAvrilAppState');
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
            
            console.log("État chargé:", appState);
        } else {
            console.log("Aucun état sauvegardé trouvé, initialisation de l'état par défaut");
        }
        
        // S'assurer que toutes les propriétés existent
        if (!appState.objectiveStreaks) appState.objectiveStreaks = {};
        if (!appState.lastMissedDay) appState.lastMissedDay = {};
        if (!appState.history) appState.history = {};
        if (!appState.dailyInputs) appState.dailyInputs = {};
        if (!appState.completedObjectives) appState.completedObjectives = [];
        if (!appState.unlockedBadges) appState.unlockedBadges = [];
        
    } catch (error) {
        console.error("Erreur lors du chargement de l'état:", error);
    }
}

// Définir des notifications (rappel à faire plus tard)
function setupNotifications() {
    // À implémenter pour rappeler l'utilisateur de saisir ses données quotidiennes
}

// Initialisation de l'application
function initApp() {
    console.log("Initialisation de l'application...");
    
    // Charger l'état précédent
    loadAppState();
    
    // Vérifier les éléments DOM
    console.log("Vérification des éléments DOM:");
    console.log("- dailyInputs:", elements.dailyInputs ? "OK" : "MANQUANT");
    console.log("- progressContainer:", elements.progressContainer ? "OK" : "MANQUANT");
    
    // Stocker les références globales aux éléments tabButtons et tabContents
    elements.tabButtons = document.querySelectorAll('.tab-btn');
    elements.tabContents = document.querySelectorAll('.tab-content');
    elements.categoryButtons = document.querySelectorAll('.category-btn');
    
    console.log(`${elements.tabButtons.length} boutons d'onglets trouvés`);
    
    // Configuration des onglets
    elements.tabButtons.forEach(button => {
        const tabId = button.id.replace('tab-', '');
        console.log(`Configuration du bouton pour l'onglet: ${tabId}`);
        
        button.addEventListener('click', () => {
            console.log(`Clic sur l'onglet: ${tabId}`);
            switchTab(tabId);
        });
    });
    
    // Configuration des boutons de catégorie
    console.log(`${elements.categoryButtons.length} boutons de catégorie trouvés`);
    
    elements.categoryButtons.forEach(button => {
        const category = button.getAttribute('data-category');
        console.log(`Configuration du bouton pour la catégorie: ${category}`);
        
        button.addEventListener('click', () => {
            console.log(`Clic sur la catégorie: ${category}`);
            
            // Désactiver tous les boutons de catégorie
            elements.categoryButtons.forEach(btn => btn.classList.remove('active'));
            
            // Activer le bouton cliqué
            button.classList.add('active');
            
            // Mettre à jour la vue de progression avec la nouvelle catégorie
            renderProgressView();
        });
    });
    
    // Configuration du bouton de fermeture de la modal
    const closeModal = document.getElementById('close-modal');
    if (closeModal) {
        console.log("Configuration du bouton de fermeture de la modal");
        closeModal.addEventListener('click', () => {
            console.log("Clic sur le bouton de fermeture de la modal");
            const levelUpModal = document.getElementById('level-up-modal');
            if (levelUpModal) {
                levelUpModal.style.display = 'none';
            }
        });
    } else {
        console.error("Bouton de fermeture de la modal non trouvé");
    }
    
    // Afficher l'onglet par défaut (Aujourd'hui)
    switchTab('daily');
    
    // Mettre à jour la date
    updateDate();
    
    // Mettre à jour l'interface utilisateur
    updateUI();
    
    // Afficher les objectifs après l'initialisation
    console.log("Rendu forcé des objectifs");
    renderDailyInputs();
    
    console.log("Initialisation de l'application terminée");
}

// Démarrer l'application
document.addEventListener('DOMContentLoaded', initApp);

function checkObjectiveStreaks() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Initialiser objectiveStreaks si nécessaire
    if (!appState.objectiveStreaks) {
        appState.objectiveStreaks = {};
    }
    
    if (!appState.lastMissedDay) {
        appState.lastMissedDay = {};
    }
    
    // Vérifier chaque objectif
    for (const category in objectives) {
        objectives[category].forEach(objective => {
            const objectiveId = objective.id;
            
            // Initialiser streak si nécessaire
            if (!appState.objectiveStreaks[objectiveId]) {
                appState.objectiveStreaks[objectiveId] = 0;
            }
            
            // Vérifier si l'objectif a été réalisé aujourd'hui
            const completedToday = appState.history[todayStr] && appState.history[todayStr][objectiveId] > 0;
            
            // Vérifier si l'objectif a été réalisé hier
            const completedYesterday = appState.history[yesterdayStr] && appState.history[yesterdayStr][objectiveId] > 0;
            
            if (completedToday) {
                // L'objectif a été réalisé aujourd'hui
                appState.objectiveStreaks[objectiveId]++;
                
                // Réinitialiser le dernier jour manqué
                appState.lastMissedDay[objectiveId] = null;
            } else {
                // L'objectif n'a pas été réalisé aujourd'hui
                
                if (!completedYesterday && appState.lastMissedDay[objectiveId]) {
                    // Deux jours consécutifs manqués - réinitialiser la flamme
                    appState.objectiveStreaks[objectiveId] = 0;
                }
                
                // Enregistrer le jour manqué
                appState.lastMissedDay[objectiveId] = todayStr;
            }
        });
    }
    
    // Vérifier le streak global (flamme bleue)
    const allObjectivesActive = Object.values(appState.objectiveStreaks).every(streak => streak > 0);
    
    if (allObjectivesActive) {
        appState.currentStreak++;
        
        if (appState.currentStreak > appState.bestStreak) {
            appState.bestStreak = appState.currentStreak;
        }
    } else {
        appState.currentStreak = 0;
    }
}

function renderObjectiveStreaks() {
    // D'abord, vérifions si les conteneurs d'affichage des flammes existent
    if (!document.getElementById('objective-flames-container')) {
        // Créer le conteneur pour les flammes des objectifs
        const flamesContainer = document.createElement('div');
        flamesContainer.id = 'objective-flames-container';
        flamesContainer.className = 'flames-container';
        document.querySelector('.app-container').appendChild(flamesContainer);
    }
    
    const flamesContainer = document.getElementById('objective-flames-container');
    flamesContainer.innerHTML = '<h3>Flammes & Streaks</h3>';
    
    // Créer une section pour la flamme bleue (streak global)
    const globalStreak = document.createElement('div');
    globalStreak.className = 'flame-item global-flame';
    
    let globalFlameIcon = '';
    if (appState.currentStreak >= 3) {
        globalFlameIcon = '<div class="flame-icon blue">🔥</div>';
    } else {
        globalFlameIcon = '<div class="flame-icon inactive">🔥</div>';
    }
    
    globalStreak.innerHTML = `
        ${globalFlameIcon}
        <div class="flame-details">
            <div class="flame-title">Streak Global</div>
            <div class="flame-count">${appState.currentStreak} jours</div>
        </div>
    `;
    flamesContainer.appendChild(globalStreak);
    
    // Ajouter une séparation
    flamesContainer.appendChild(document.createElement('hr'));
    
    // Ajouter les flammes pour chaque objectif
    for (const category in objectives) {
        objectives[category].forEach(objective => {
            const objectiveId = objective.id;
            const streakCount = appState.objectiveStreaks[objectiveId] || 0;
            
            const flameItem = document.createElement('div');
            flameItem.className = 'flame-item';
            
            let streakIcon = '';
            
            // Vérifier si nous avons raté un jour récemment
            const missedDay = appState.lastMissedDay && appState.lastMissedDay[objectiveId];
            const showHourglass = missedDay !== null;
            
            if (streakCount >= 3) {
                // Flamme active si 3+ jours
                streakIcon = `<div class="flame-icon active">🔥</div>`;
                
                // Ajouter un sablier si un jour a été raté
                if (showHourglass) {
                    streakIcon += `<div class="hourglass-icon">⌛</div>`;
                }
            } else if (streakCount > 0) {
                // Streak commencé mais < 3 jours
                streakIcon = `<div class="flame-icon building">${streakCount}</div>`;
            } else {
                // Pas de streak
                streakIcon = `<div class="flame-icon inactive">·</div>`;
            }
            
            flameItem.innerHTML = `
                <div class="streak-icons">
                    ${streakIcon}
                </div>
                <div class="flame-details">
                    <div class="flame-title">${objective.title}</div>
                    <div class="flame-count">${streakCount} jours</div>
                </div>
            `;
            
            flamesContainer.appendChild(flameItem);
        });
    }
}

function switchTab(tabId) {
    console.log("Changement d'onglet vers:", tabId);
    
    // Vérifier si les éléments sont bien définis
    if (!elements.tabButtons || !elements.tabContents) {
        console.error("Les références aux onglets ne sont pas correctement initialisées");
        elements.tabButtons = document.querySelectorAll('.tab-btn');
        elements.tabContents = document.querySelectorAll('.tab-content');
        
        if (!elements.tabButtons || !elements.tabContents) {
            console.error("Impossible de trouver les éléments des onglets dans le DOM");
            return;
        }
    }
    
    // Masquer tous les contenus d'onglets
    elements.tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Désactiver tous les boutons d'onglets
    elements.tabButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Trouver l'onglet et le bouton à activer
    const targetTab = document.getElementById(`${tabId}-tab`);
    const targetButton = document.getElementById(`tab-${tabId}`);
    
    // Activer l'onglet et le bouton sélectionnés
    if (targetTab) {
        targetTab.classList.add('active');
        console.log(`Onglet ${tabId}-tab activé`);
    } else {
        console.error(`Onglet ${tabId}-tab non trouvé`);
    }
    
    if (targetButton) {
        targetButton.classList.add('active');
        console.log(`Bouton tab-${tabId} activé`);
    } else {
        console.error(`Bouton tab-${tabId} non trouvé`);
    }
    
    // Mettre à jour les vues selon l'onglet
    if (tabId === 'daily') {
        console.log("Rendu des inputs quotidiens pour l'onglet 'daily'");
        renderDailyInputs();
    } else if (tabId === 'progress') {
        console.log("Rendu de la progression pour l'onglet 'progress'");
        renderProgressView();
    } else if (tabId === 'stats') {
        console.log("Rendu des statistiques pour l'onglet 'stats'");
        renderStats();
    }
}

function switchCategory(category) {
    // Désactiver tous les boutons de catégorie
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Activer la catégorie sélectionnée
    document.querySelector(`.category-btn[data-category="${category}"]`).classList.add('active');
    
    // Mettre à jour la vue de progression
    renderProgressView();
}

function renderStats() {
    console.log("Rendu des statistiques");
    
    // Mise à jour des statistiques de base
    elements.currentStreak.textContent = appState.currentStreak || 0;
    elements.bestStreak.textContent = appState.bestStreak || 0;
    elements.objectivesCompleted.textContent = appState.completedObjectives.length || 0;
    elements.completionPercentage.textContent = calculateCompletionPercentage() + '%';
    
    // Vérifier si l'élément badgesContainer existe
    if (!elements.badgesContainer) {
        console.error("Container de badges non trouvé dans renderStats");
        return;
    }
    
    // Afficher les badges débloqués
    elements.badgesContainer.innerHTML = '';
    
    // Afficher les badges du système
    badges.forEach(badge => {
        const isUnlocked = appState.unlockedBadges && appState.unlockedBadges.includes(badge.id);
        
        const badgeElement = document.createElement('div');
        badgeElement.className = `badge-item ${isUnlocked ? 'badge-unlocked' : 'badge-locked'}`;
        
        badgeElement.innerHTML = `
            <div class="badge-icon">${badge.icon}</div>
            <div class="badge-info">
                <div class="badge-title">${badge.title}</div>
                <div class="badge-description">${badge.description}</div>
            </div>
        `;
        
        elements.badgesContainer.appendChild(badgeElement);
    });
    
    console.log(`${elements.badgesContainer.childElementCount} badges rendus`);
}

function updateDate() {
    const currentDateEl = document.getElementById('current-date');
    if (currentDateEl) {
        const today = new Date();
        currentDateEl.textContent = formatDate(today);
    }
}

// Fonction pour tester sans Supabase
window.forceDisplayApp = function() {
    console.log("Forçage de l'affichage de l'application pour les tests");
    
    // Forcer l'initialisation des objectifs par défaut
    initializeDefaultObjectives();
    console.log("Objectifs forcés:", objectives);
    
    // S'assurer que les objectifs sont correctement initialisés
    if (!objectives.personal || !objectives.professional || 
        !Array.isArray(objectives.personal) || !Array.isArray(objectives.professional) ||
        objectives.personal.length === 0 || objectives.professional.length === 0) {
        console.error("Échec de l'initialisation des objectifs");
        const debugElement = document.getElementById('debug-info');
        if (debugElement) {
            debugElement.style.display = 'block';
            debugElement.textContent = `Erreur critique: Objectifs non initialisés`;
        }
        return "Erreur d'initialisation des objectifs";
    }
    
    // Afficher l'application et masquer l'authentification
    document.querySelector('.app-container').style.display = 'flex';
    document.getElementById('auth-container').style.display = 'none';
    
    // Initialiser l'application
    initApp();
    
    // Afficher les objectifs dans la console
    console.log("OBJECTIFS PERSONNELS:", objectives.personal);
    console.log("OBJECTIFS PROFESSIONNELS:", objectives.professional);
    
    // Afficher les objectifs dans le débugger
    const debugElement = document.getElementById('debug-info');
    if (debugElement) {
        debugElement.style.display = 'block';
        debugElement.textContent = `Objectifs personnels: ${objectives.personal.length}, Objectifs pro: ${objectives.professional.length}`;
    }
    
    // Forcer le rendu des vues
    renderDailyInputs();
    
    return "Application affichée en mode test";
};

// Appeler automatiquement la fonction en cas d'erreur
// Ne plus appeler automatiquement - nécessite une action utilisateur
// setTimeout(() => {
//    window.forceDisplayApp();
// }, 2000); 
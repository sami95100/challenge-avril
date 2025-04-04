console.log("SUPABASE.JS CHARGÉ");

// Importer les dépendances Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Informations de connexion Supabase
const SUPABASE_URL = 'https://mpeleexbatcsknosekap.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZWxlZXhiYXRjc2tub3Nla2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NDE0MjksImV4cCI6MjA1OTExNzQyOX0.0PIC0MifqMwSN5ah4zvAHmwtiN1rVYcGcOtzho95fuE';

// Options pour la persistance de session
const supabaseOptions = {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        storage: {
            getItem: (key) => {
                const value = localStorage.getItem(key);
                console.log(`Session récupérée: ${key.substring(0, 10)}...`);
                return value;
            },
            setItem: (key, value) => {
                console.log(`Session sauvegardée: ${key.substring(0, 10)}...`);
                localStorage.setItem(key, value);
            },
            removeItem: (key) => {
                console.log(`Session supprimée: ${key}`);
                localStorage.removeItem(key);
            },
        },
    },
};

// Initialiser le client Supabase avec les options de persistance
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, supabaseOptions);

// Fonctions d'authentification
export async function loginUser(email, password) {
  console.log(`Tentative de connexion avec l'email: ${email}`);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    console.error("Erreur de connexion Supabase:", error);
    throw error;
  }
  
  console.log("Connexion réussie:", data);
  return data.user;
}

export async function signupUser(email, password, username) {
  console.log(`Tentative d'inscription avec l'email: ${email} et username: ${username}`);
  
  // Inscription
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (authError) {
    console.error("Erreur d'inscription Supabase:", authError);
    throw authError;
  }
  
  console.log("Inscription réussie:", authData);
  
  // Création du profil
  if (authData.user) {
    console.log("Création du profil pour l'utilisateur:", authData.user.id);
    
    // Contourner le RLS en utilisant une requête SQL directe avec rpc
    const { error: profileError } = await supabase.rpc('create_new_profile', {
      user_id: authData.user.id,
      user_name: username
    });
    
    if (profileError) {
      console.error("Erreur lors de la création du profil:", profileError);
      throw profileError;
    }
    
    // Initialiser les objectifs par défaut
    try {
      await initializeDefaultObjectives(authData.user.id);
      console.log("Objectifs par défaut initialisés avec succès");
    } catch (error) {
      console.error("Erreur lors de l'initialisation des objectifs:", error);
      throw error;
    }
  }
  
  return authData.user;
}

// Initialisation des objectifs par défaut pour un nouvel utilisateur
export async function initializeDefaultObjectives(userId) {
  console.log("Initialisation des objectifs par défaut pour", userId || "l'utilisateur local");
  
  try {
    if (userId) {
      // Avec Supabase: utiliser une fonction RPC pour contourner le RLS
      const { error } = await supabase.rpc('create_default_objectives', {
        user_id: userId
      });
      
      if (error) {
        console.error("Erreur d'initialisation des objectifs via RPC:", error);
        // En cas d'erreur, initialiser localement
        initializeDefaultObjectivesLocally();
      } else {
        console.log("Objectifs par défaut initialisés avec succès sur Supabase");
      }
    } else {
      // Sans userId: initialiser localement
      initializeDefaultObjectivesLocally();
    }
  } catch (error) {
    console.error("Erreur lors de l'initialisation des objectifs:", error);
    // Toujours initialiser localement en cas d'erreur
    initializeDefaultObjectivesLocally();
  }
}

// Fonction pour initialiser les objectifs localement (sans Supabase)
function initializeDefaultObjectivesLocally() {
  console.log("Initialisation des objectifs par défaut en local");
  
  if (window.objectives) {
    window.objectives.personal = [
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
    ];
    
    window.objectives.professional = [
      { id: 'shortVideos', title: 'Vidéos courtes', target: 60, unit: 'vidéos', current: 0, xpPerUnit: 15 },
      { id: 'focusTime', title: 'Sessions focus (max 3x25min)', target: 1, unit: 'sessions', isDaily: true, current: 0, xpPerUnit: 20 }
    ];
    
    console.log("Objectifs locaux initialisés:", window.objectives);
  } else {
    console.error("La variable window.objectives n'est pas définie");
  }
}

// Exposer également initializeDefaultObjectivesLocally globalement pour le fallback
window.initializeDefaultObjectivesLocally = initializeDefaultObjectivesLocally;

// Vérification session active
export async function getCurrentUser() {
  console.log("Vérification de l'utilisateur actuellement connecté");
  
  try {
    // 1. Vérifier si une session existe réellement
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Erreur lors de la vérification de la session:", sessionError);
      return null;
    }
    
    if (!session) {
      console.log("Aucune session active trouvée");
      return null;
    }
    
    // 2. Vérifier que l'utilisateur est valide
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("Erreur lors de la récupération de l'utilisateur:", userError);
      return null;
    }
    
    if (!user || !user.id) {
      console.log("Session trouvée mais utilisateur invalide");
      return null;
    }
    
    // 3. Double vérification que l'utilisateur peut accéder aux données (optionnel)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', user.id)
      .single();
      
    if (profileError || !profile) {
      console.warn("Utilisateur authentifié mais profil inaccessible, possible problème d'autorisation");
      // On continue quand même car le profil pourrait ne pas exister pour un nouvel utilisateur
    } else {
      console.log("Profil vérifié:", profile.username);
    }
    
    console.log("Utilisateur actuel confirmé:", user.email);
    return user;
  } catch (error) {
    console.error("Erreur globale lors de la vérification de l'utilisateur:", error);
    return null;
  }
}

// Déconnexion
export async function logoutUser() {
  console.log("Déconnexion de l'utilisateur...");
  
  try {
    // D'abord, déconnexion via l'API Supabase
    const { error } = await supabase.auth.signOut({
      scope: 'global' // Déconnecter de tous les appareils
    });
    
    if (error) {
      console.error("Erreur lors de la déconnexion Supabase:", error);
      throw error;
    }
    
    // Ensuite, supprimer manuellement toutes les clés de session dans le localStorage
    // pour s'assurer que la session est complètement effacée
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('sb-'))) {
        console.log("Suppression de la clé de session:", key);
        localStorage.removeItem(key);
      }
    }
    
    console.log("Déconnexion réussie, toutes les données de session ont été effacées");
    return true;
  } catch (error) {
    console.error("Erreur critique lors de la déconnexion:", error);
    // Même en cas d'erreur, tenter de nettoyer le localStorage
    try {
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('supabase.auth.refreshToken');
    } catch (e) {
      console.error("Impossible de nettoyer le localStorage:", e);
    }
    throw error;
  }
}

// Chargement des données utilisateur
export async function loadUserData(userId) {
  // Charger le profil
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (profileError) {
    console.error("Erreur de chargement du profil:", profileError);
    return null;
  }
  
  // Charger les objectifs
  const { data: objectivesData, error: objectivesError } = await supabase
    .from('objectives')
    .select('*')
    .eq('user_id', userId);
    
  if (objectivesError) {
    console.error("Erreur de chargement des objectifs:", objectivesError);
    return null;
  }
  
  // Charger les badges
  const { data: badges, error: badgesError } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', userId);
  
  // Charger l'historique
  const { data: historyData, error: historyError } = await supabase
    .from('history')
    .select('*')
    .eq('user_id', userId);
  
  // Construire la structure de données
  const userData = {
    profile: profile,
    objectives: {
      personal: [],
      professional: []
    },
    unlockedBadges: badges ? badges.map(b => b.badge_id) : [],
    history: {}
  };
  
  // Transformer les objectifs dans le format attendu
  objectivesData.forEach(obj => {
    userData.objectives[obj.category].push({
      id: obj.id,
      title: obj.title,
      current: obj.current_value,
      target: obj.target_value,
      unit: obj.unit,
      isDaily: obj.is_daily || false,
      isReverse: obj.is_reverse || false,
      xpPerUnit: obj.xp_per_unit
    });
  });
  
  // Transformer l'historique dans le format attendu
  if (historyData) {
    historyData.forEach(entry => {
      if (!userData.history[entry.date]) {
        userData.history[entry.date] = {};
      }
      
      userData.history[entry.date][entry.objective_id] = entry.value;
    });
  }
  
  return userData;
}

// Sauvegarde des données utilisateur
export async function saveUserProgress(userId, dateStr, dateData, appState, objectives) {
  try {
    // Mettre à jour le profil
    await supabase
      .from('profiles')
      .update({
        level: appState.level,
        xp: appState.xp,
        days_active: appState.daysActive,
        current_streak: appState.currentStreak,
        best_streak: appState.bestStreak,
        last_active_date: appState.lastActiveDate
      })
      .eq('id', userId);
    
    // Sauvegarder l'historique pour la date spécifiée
    if (dateData) {
      for (const objectiveId in dateData) {
        const value = dateData[objectiveId];
        
        // Chercher si l'entrée existe déjà
        const { data: existingEntry } = await supabase
          .from('history')
          .select('id')
          .eq('user_id', userId)
          .eq('objective_id', objectiveId)
          .eq('date', dateStr)
          .maybeSingle();
        
        if (existingEntry) {
          // Mettre à jour l'entrée existante
          await supabase
            .from('history')
            .update({ value })
            .eq('id', existingEntry.id);
        } else {
          // Insérer une nouvelle entrée
          await supabase
            .from('history')
            .insert([{
              user_id: userId,
              objective_id: objectiveId,
              date: dateStr,
              value
            }]);
        }
      }
    }
    
    // Mettre à jour les objectifs
    for (const category in objectives) {
      for (const objective of objectives[category]) {
        await supabase
          .from('objectives')
          .update({ current_value: objective.current })
          .eq('id', objective.id);
      }
    }
    
    // Ajouter les badges débloqués
    for (const badgeId of appState.unlockedBadges) {
      await supabase
        .from('user_badges')
        .insert([{ user_id: userId, badge_id: badgeId }])
        .on_conflict(['user_id', 'badge_id'])
        .do_nothing();
    }
    
    return true;
  } catch (error) {
    console.error("Erreur lors de la sauvegarde des données:", error);
    return false;
  }
} 
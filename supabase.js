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
async function initializeDefaultObjectives(userId) {
  console.log("Initialisation des objectifs par défaut pour", userId);
  
  try {
    // Au lieu d'insérer directement, utiliser une fonction RPC pour contourner le RLS
    const { error } = await supabase.rpc('create_default_objectives', {
      user_id: userId
    });
    
    if (error) {
      console.error("Erreur d'initialisation des objectifs via RPC:", error);
      throw error;
    }
    
    console.log("Objectifs par défaut initialisés avec succès");
  } catch (error) {
    console.error("Erreur lors de l'initialisation des objectifs:", error);
    throw error;
  }
}

// Vérification session active
export async function getCurrentUser() {
  console.log("Vérification de l'utilisateur actuellement connecté");
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Ne retourner l'utilisateur que si une session existe réellement
    if (session) {
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Utilisateur actuel:", user);
      return user;
    } else {
      console.log("Aucune session active trouvée");
      return null;
    }
  } catch (error) {
    console.error("Erreur lors de la vérification de l'utilisateur:", error);
    return null;
  }
}

// Déconnexion
export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
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
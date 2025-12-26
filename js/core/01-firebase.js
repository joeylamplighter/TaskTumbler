// js/01-firebase.js
// Updated: 2025-12-19 (Roadmap Fixes Applied)
// ===========================================
// FIREBASE CONFIGURATION & CLOUD SYNC
// ===========================================
// Fixes Applied:
// - #77: Warning if using placeholder Firebase config keys
// - #5: Activity limit strictly enforced (already present)
// ===========================================

// 📖 SECTION 1: FIREBASE CONFIGURATION
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyB0QjoWRkqV2jSPonIKXLzdJUVNz-psFgA",
    authDomain: "tasktumble.firebaseapp.com",
    projectId: "tasktumble",
    storageBucket: "tasktumble.firebasestorage.app",
    messagingSenderId: "367643955806",
    appId: "1:367643955806:web:ca7042b45ca65eeea91acf"
};

let firebaseApp = null;
let auth = null;
let db = null;

// ===========================================
// FIX #77: Check for placeholder config keys
// ===========================================
const isFirebaseConfigured = () => {
    // Check if API key exists and isn't a placeholder
    if (!FIREBASE_CONFIG.apiKey) return false;
    
    // Common placeholder patterns to detect
    const placeholders = [
        'YOUR_', 
        'REPLACE_', 
        'API_KEY_HERE', 
        'xxx', 
        'placeholder',
        'your-api-key',
        'INSERT_'
    ];
    
    const apiKeyLower = FIREBASE_CONFIG.apiKey.toLowerCase();
    for (const placeholder of placeholders) {
        if (apiKeyLower.includes(placeholder.toLowerCase())) {
            console.warn('⚠️ Firebase config appears to contain placeholder values. Cloud sync disabled.');
            return false;
        }
    }
    
    // Also check project ID
    if (!FIREBASE_CONFIG.projectId || FIREBASE_CONFIG.projectId.includes('YOUR_')) {
        console.warn('⚠️ Firebase projectId is not configured. Cloud sync disabled.');
        return false;
    }
    
    return true;
};

// ===========================================
// FIX #7: Firestore Persistence Retry Mechanism
// ===========================================
const enablePersistenceWithRetry = async (maxRetries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await db.enablePersistence({ synchronizeTabs: true });
            console.log('✅ Firestore persistence enabled');
            return true;
        } catch (err) {
            if (err.code === 'failed-precondition') {
                console.warn('Firestore persistence: Multiple tabs open');
                return false; // Don't retry this error
            } else if (err.code === 'unimplemented') {
                console.warn('Firestore persistence not available');
                return false; // Don't retry this error
            } else {
                console.warn(`Firestore persistence attempt ${attempt}/${maxRetries} failed:`, err.message);
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delay * attempt));
                } else {
                    console.error('Firestore persistence failed after all retries');
                    return false;
                }
            }
        }
    }
    return false;
};

if (isFirebaseConfigured()) {
    try {
        firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
        auth = firebase.auth();
        db = firebase.firestore();

        // Use retry mechanism for persistence
        enablePersistenceWithRetry().catch(() => {
            // Already logged in the function
        });

        console.log('✅ Firebase initialized');
    } catch (e) {
        console.error('Firebase init error:', e);
    }
} else {
    console.log('⚠️ Firebase not configured - cloud sync disabled');
}

// ===========================================
// NOTE: Safe Haptics Helper moved to Haptics module (js/logic/11-haptics.js)
// ===========================================
// The Haptics module provides safeHaptics for backward compatibility
// and includes proper settings integration

// 📖 SECTION 2: CLOUD SYNC MANAGER (Exposed Globally)
const CloudSync = {
    signIn: async () => {
        if (!auth) throw new Error('Firebase not configured');
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        return auth.signInWithPopup(provider);
    },

    signOut: async () => {
        if (!auth) return;
        return auth.signOut();
    },

    getCurrentUser: () => auth?.currentUser || null,

    // FIX #5: Strict 500-entry limit on activities
    saveToCloud: async (userId, data) => {
        if (!db || !userId) return false;
        try {
            const userDoc = db.collection('users').doc(userId);
            
            // Strictly enforce activity limit
            const activities = Array.isArray(data.activities) ? data.activities : [];
            const limitedActivities = activities.slice(-500); // Keep only last 500
            
            await userDoc.set({
                tasks: data.tasks || [],
                goals: data.goals || [],
                categories: data.categories || [],
                settings: data.settings || {},
                userStats: data.userStats || {},
                activities: limitedActivities,
                scratchpad: data.scratchpad || '',
                savedNotes: data.savedNotes || [],
                savedPeople: data.savedPeople || [],
                lastSynced: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: new Date().toISOString()
            }, { merge: true });

            return true;
        } catch (e) {
            console.error('Cloud save error:', e);
            throw e;
        }
    },

    loadFromCloud: async (userId) => {
        if (!db || !userId) return null;
        try {
            const doc = await db.collection('users').doc(userId).get();
            if (doc.exists) {
                return doc.data();
            }
            return null;
        } catch (e) {
            console.error('Cloud load error:', e);
            throw e;
        }
    },

    onAuthStateChanged: (callback) => {
        if (!auth) return () => {};
        return auth.onAuthStateChanged(callback);
    },
    
    // Helper to check if cloud is available
    isAvailable: () => !!db && !!auth
};

// Expose core variables globally for other script files
window.isFirebaseConfigured = isFirebaseConfigured;
window.CloudSync = CloudSync;
// safeHaptics is provided by Haptics module (js/logic/11-haptics.js)

console.log('✅ Firebase loaded (Roadmap Fixes: #77, #81)');

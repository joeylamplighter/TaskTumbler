// src/core/firebase.js
// ===========================================
// FIREBASE CONFIGURATION & CLOUD SYNC
// ===========================================

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

const isFirebaseConfigured = () => {
    if (!FIREBASE_CONFIG.apiKey) return false;
    
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
    
    if (!FIREBASE_CONFIG.projectId || FIREBASE_CONFIG.projectId.includes('YOUR_')) {
        console.warn('⚠️ Firebase projectId is not configured. Cloud sync disabled.');
        return false;
    }
    
    return true;
};

const enablePersistenceWithRetry = async (maxRetries = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await db.enablePersistence({ synchronizeTabs: true });
            console.log('✅ Firestore persistence enabled');
            return true;
        } catch (err) {
            if (err.code === 'failed-precondition') {
                console.warn('Firestore persistence: Multiple tabs open');
                return false;
            } else if (err.code === 'unimplemented') {
                console.warn('Firestore persistence not available');
                return false;
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

// Initialize Firebase when it becomes available
const initializeFirebase = () => {
    if (!isFirebaseConfigured()) {
        console.log('⚠️ Firebase not configured - cloud sync disabled');
        return;
    }
    
    // Check if firebase is available (from CDN)
    if (typeof firebase === 'undefined') {
        // Wait for Firebase to load from CDN
        setTimeout(() => {
            if (typeof firebase !== 'undefined') {
                initializeFirebase();
            } else {
                console.warn('⚠️ Firebase library not loaded - cloud sync disabled');
            }
        }, 100);
        return;
    }
    
    try {
        firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
        auth = firebase.auth();
        db = firebase.firestore();
        
        // Expose firebase globally for other modules
        window.firebase = firebase;

        enablePersistenceWithRetry().catch(() => {
            // Already logged in the function
        });

        console.log('✅ Firebase initialized');
    } catch (e) {
        console.error('Firebase init error:', e);
    }
};

// Start initialization
initializeFirebase();

const safeHaptics = (pattern = [50]) => {
    try {
        if (window.navigator && typeof window.navigator.vibrate === 'function') {
            window.navigator.vibrate(pattern);
            return true;
        }
    } catch (e) {
        // Silently fail on desktop or unsupported devices
    }
    return false;
};

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

    saveToCloud: async (userId, data) => {
        if (!db || !userId) return false;
        try {
            const userDoc = db.collection('users').doc(userId);
            
            const activities = Array.isArray(data.activities) ? data.activities : [];
            const limitedActivities = activities.slice(-500);
            
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
    
    isAvailable: () => !!db && !!auth
};

window.isFirebaseConfigured = isFirebaseConfigured;
window.CloudSync = CloudSync;
window.safeHaptics = safeHaptics;

console.log('✅ Firebase loaded');


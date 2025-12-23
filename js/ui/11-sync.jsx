// js/components/11-sync.jsx
// ===========================================
// 🔖 CLOUD SYNC UI COMPONENTS
// ===========================================
// NOTE: React hooks are declared globally in 13-all-tabs-1.jsx
// Do NOT redeclare: const { useState, useEffect } = React;

function SyncButton({ user, syncState, onOpenModal }) {
    // Shared text style for consistency
    const textStyle = { fontSize: 13, fontWeight: 500, marginLeft: 6 };
    const iconStyle = { fontSize: 18 };

    // 1. Not Configured / Not Signed In
    // Very faint gray. Barely visible until hovered.
    if (!isFirebaseConfigured() || !user) {
        return (
            <button 
                className="sync-btn-ghost" 
                onClick={onOpenModal}
                title="Click to Setup"
                style={{ opacity: 0.5 }}
            >
                <span style={iconStyle}>☁️</span>
                <span style={textStyle}>Sync</span>
            </button>
        );
    }

    // 2. Syncing State
    // Pulsing opacity. No color change, just "breathing".
    if (syncState === 'syncing') {
        return (
            <button 
                className="sync-btn-ghost" 
                disabled
                title="Syncing..."
            >
                <span className="sync-pulse" style={iconStyle}>☁️</span>
                <span style={textStyle}>Sync</span>
            </button>
        );
    }

    // 3. Error State
    // Subtle red tint on the icon only.
    if (syncState === 'error') {
        return (
            <button 
                className="sync-btn-ghost" 
                onClick={onOpenModal}
                title="Sync Error"
            >
                <span style={{ ...iconStyle, color: '#ff8a8a' }}>⚠️</span>
                <span style={{ ...textStyle, color: '#ff8a8a' }}>Sync</span>
            </button>
        );
    }

    // 4. Synced State
    // Very subtle pastel green.
    return (
        <button 
            className="sync-btn-ghost" 
            onClick={onOpenModal}
            title="Synced"
        >
            <span style={{ 
                ...iconStyle, 
                color: '#A8E6CF', // Pastel Mint (Very Subtle)
                opacity: 0.9
            }}>☁️</span>
            <span style={textStyle}>Sync</span>
        </button>
    );
}
window.SyncButton = SyncButton;

// ==========================================
// SYNC MODAL (Full sync management UI)
// ==========================================
function SyncModal({ user, syncState, lastSyncTime, onClose, onSignIn, onSignOut, onSyncNow, onPullFromCloud }) {
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isEmailSigningIn, setIsEmailSigningIn] = useState(false);
    const [isResetSending, setIsResetSending] = useState(false);
    const [message, setMessage] = useState(null);

    const formatLastSync = () => {
        if (!lastSyncTime) return 'Never';
        const date = new Date(lastSyncTime);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
        return date.toLocaleDateString();
    };

    const handleSignIn = async () => {
        setMessage(null);
        setIsSigningIn(true);
        try {
            await onSignIn();
        } catch (e) {
            console.error('Sign in error:', e);
            setMessage({ type: 'error', text: 'Google sign in failed. Please try again.' });
        }
        setIsSigningIn(false);
    };

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);

        if (!firebase || !firebase.apps || !firebase.apps.length) {
            setMessage({ type: 'error', text: 'Cloud sync is not configured.' });
            return;
        }
        if (!email || !password) {
            setMessage({ type: 'error', text: 'Please enter both email and password.' });
            return;
        }

        setIsEmailSigningIn(true);
        try {
            const auth = firebase.auth();
            const trimmedEmail = email.trim();
            const methods = await auth.fetchSignInMethodsForEmail(trimmedEmail);

            if (!methods.length) {
                await auth.createUserWithEmailAndPassword(trimmedEmail, password);
                setMessage({ type: 'success', text: 'Account created and signed in.' });
            } else if (methods.includes('password')) {
                await auth.signInWithEmailAndPassword(trimmedEmail, password);
                setMessage(null);
            } else if (methods.includes('google.com')) {
                setMessage({
                    type: 'error',
                    text: 'This email is already linked to Google sign-in. Please use "Continue with Google".'
                });
                setIsEmailSigningIn(false);
                return;
            }

            setShowEmailForm(false);
            setEmail('');
            setPassword('');
        } catch (err) {
            console.error('Email sign in error:', err);
            if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setMessage({
                    type: 'error',
                    text: 'Incorrect password. If you signed up with Google, use "Continue with Google".'
                });
            } else {
                setMessage({
                    type: 'error',
                    text: err.message || 'Email sign in failed. Please try again.'
                });
            }
        }
        setIsEmailSigningIn(false);
    };

    const handlePasswordReset = async () => {
        setMessage(null);
        if (!email.trim()) {
            setMessage({ type: 'error', text: 'Enter your email above first.' });
            return;
        }

        setIsResetSending(true);
        try {
            const auth = firebase.auth();
            await auth.sendPasswordResetEmail(email.trim());
            setMessage({
                type: 'success',
                text: 'Password reset email sent. Check your inbox.'
            });
        } catch (err) {
            setMessage({
                type: 'error',
                text: err.message || 'Failed to send password reset email.'
            });
        }
        setIsResetSending(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth: 380}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
                    <h2 style={{fontFamily: 'Fredoka', margin: 0}}>☁️ Cloud Sync</h2>
                    <span onClick={onClose} style={{fontSize: 24, cursor: 'pointer', color: 'var(--text)'}}>×</span>
                </div>

                {!isFirebaseConfigured() ? (
                    <div className="sync-modal-content">
                        <div style={{fontSize: 48, marginBottom: 16}}>🔧</div>
                        <h3>Setup Required</h3>
                        <p>To enable cloud sync, add your Firebase config to 01-firebase.js</p>
                    </div>
                ) : !user ? (
                    <div className="sync-modal-content">
                        <div style={{fontSize: 48, marginBottom: 16}}>☁️</div>
                        <h3>Sync Your Tasks</h3>
                        <p>Sign in to sync across all your devices.</p>

                        {message && (
                            <div style={{
                                marginBottom: 10,
                                padding: '8px 10px',
                                borderRadius: 8,
                                fontSize: 12,
                                textAlign: 'left',
                                background: message.type === 'error' ? 'rgba(255,0,0,0.08)' : 'rgba(0,200,0,0.08)',
                                color: message.type === 'error' ? '#ff8a8a' : '#7fd87f',
                                border: `1px solid ${message.type === 'error' ? 'rgba(255,0,0,0.4)' : 'rgba(0,200,0,0.4)'}`
                            }}>
                                {message.text}
                            </div>
                        )}

                        <button
                            className="google-signin-btn"
                            onClick={handleSignIn}
                            disabled={isSigningIn || isEmailSigningIn}
                        >
                            {isSigningIn ? (
                                <><div className="sync-spinner"></div> Signing in...</>
                            ) : (
                                <>
                                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                                    Continue with Google
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => setShowEmailForm(!showEmailForm)}
                            style={{
                                marginTop: 16,
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: 999,
                                border: '1px solid var(--border)',
                                background: 'transparent',
                                color: 'var(--text-light)',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            {showEmailForm ? 'Hide Email Login' : 'Sign in with Email'}
                        </button>

                        {showEmailForm && (
                            <form onSubmit={handleEmailSubmit} style={{marginTop: 12, width: '100%'}}>
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="f-input"
                                    style={{marginBottom: 8}}
                                />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="f-input"
                                    style={{marginBottom: 8}}
                                />
                                <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: 8}}>
                                    <button
                                        type="button"
                                        onClick={handlePasswordReset}
                                        disabled={isResetSending || !email.trim()}
                                        style={{
                                            border: 'none',
                                            background: 'none',
                                            fontSize: 11,
                                            color: 'var(--primary)',
                                            cursor: 'pointer',
                                            textDecoration: 'underline'
                                        }}
                                    >
                                        {isResetSending ? 'Sending…' : 'Forgot password?'}
                                    </button>
                                </div>
                                <button
                                    type="submit"
                                    className="btn-orange"
                                    disabled={isEmailSigningIn || !email || !password}
                                >
                                    {isEmailSigningIn ? 'Signing in…' : 'Sign in / Create Account'}
                                </button>
                            </form>
                        )}
                    </div>
                ) : (
                    <div>
                        <div className="sync-status-card">
                            {user.photoURL && <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />}
                            <div className="sync-status-info">
                                <div className="name">{user.displayName || 'User'}</div>
                                <div className="email">{user.email || ''}</div>
                                <div className="last-sync">✓ Last synced: {formatLastSync()}</div>
                            </div>
                        </div>

                        <div className="sync-actions">
                            <button
                                className="btn-sync-now"
                                onClick={onSyncNow}
                                disabled={syncState === 'syncing'}
                            >
                                {syncState === 'syncing' ? '🔄 Syncing...' : '⬆️ Push to Cloud'}
                            </button>
                            <button
                                className="btn-white-outline"
                                onClick={onPullFromCloud}
                                disabled={syncState === 'syncing'}
                                style={{width: '100%'}}
                            >
                                ⬇️ Pull from Cloud
                            </button>
                            <button className="btn-signout" onClick={onSignOut}>
                                Sign Out
                            </button>
                        </div>

                        <div style={{marginTop: 20, padding: 12, background: 'var(--input-bg)', borderRadius: 8, fontSize: 12, color: 'var(--text-light)'}}>
                            <strong>Auto-sync:</strong> Your data syncs automatically when you make changes.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
window.SyncModal = SyncModal;

console.log('✅ Sync components loaded');

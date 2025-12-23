// js/06-confetti.js
// Updated: Enhanced with multiple styles and colors for different events
// ===========================================
// CONFETTI EFFECTS
// ===========================================

// Color palettes for different events
const COLOR_PALETTES = {
    default: ['#ff6b35', '#ff9f43', '#00b894', '#0984e3', '#a29bfe'],
    celebration: ['#ff6b6b', '#ff9f43', '#ffd93d', '#6bcf7f', '#4d96ff', '#9b59b6'],
    victory: ['#ffd700', '#ff6b35', '#ff1744', '#00e676', '#00b0ff'],
    levelup: ['#ff6b6b', '#ff9f43', '#ffd93d', '#6bcf7f', '#4d96ff'],
    task: ['#ff6b35', '#ff9f43', '#00b894', '#0984e3'],
    duel: ['#ff1744', '#ff6b35', '#ffd700', '#00e676'],
    achievement: ['#ffd700', '#ff6b6b', '#9b59b6', '#3498db'],
    rainbow: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3']
};

// Check if confetti library is available
const isConfettiAvailable = () => {
    // Check both global confetti and window.confetti
    return typeof confetti === 'function' || typeof window.confetti === 'function';
};

// Get confetti function (handle both global and window.confetti)
const getConfetti = () => {
    if (typeof confetti === 'function') return confetti;
    if (typeof window.confetti === 'function') return window.confetti;
    return null;
};

// Base confetti function
const fireConfetti = (opts = {}) => {
    const confettiFn = getConfetti();
    if (!confettiFn) {
        console.warn('Confetti library not loaded');
        return;
    }
    const defaults = {
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: COLOR_PALETTES.default
    };
    confettiFn({ ...defaults, ...opts });
};

// Classic burst
const fireConfettiBurst = (colors = COLOR_PALETTES.default) => {
    const confettiFn = getConfetti();
    if (!confettiFn) return;
    const count = 200;
    const defaults = { origin: { y: 0.7 }, colors };
    confettiFn({ ...defaults, spread: 26, startVelocity: 55, particleCount: count * 0.25 });
    confettiFn({ ...defaults, spread: 60, particleCount: count * 0.2 });
    confettiFn({ ...defaults, spread: 100, decay: 0.91, scalar: 0.8, particleCount: count * 0.35 });
    confettiFn({ ...defaults, spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, particleCount: count * 0.1 });
    confettiFn({ ...defaults, spread: 120, startVelocity: 45, particleCount: count * 0.1 });
};

// Side cannons
const fireSideCannons = (colors = COLOR_PALETTES.default, duration = 500) => {
    const confettiFn = getConfetti();
    if (!confettiFn) return;
    const end = Date.now() + duration;
    (function frame() {
        confettiFn({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors });
        confettiFn({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
    }());
};

// Fireworks style
const fireFireworks = (colors = COLOR_PALETTES.celebration) => {
    const confettiFn = getConfetti();
    if (!confettiFn) return;
    const duration = 2000;
    const end = Date.now() + duration;
    const interval = setInterval(() => {
        if (Date.now() > end) {
            clearInterval(interval);
            return;
        }
        confettiFn({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: Math.random() },
            colors,
            startVelocity: 45,
            decay: 0.9
        });
    }, 100);
};

// Star burst
const fireStarBurst = (colors = COLOR_PALETTES.victory) => {
    const confettiFn = getConfetti();
    if (!confettiFn) return;
    const count = 300;
    const defaults = { origin: { y: 0.5 }, colors, shapes: ['star'] };
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            confettiFn({
                ...defaults,
                angle: 60 + (i * 12),
                spread: 55,
                startVelocity: 45,
                particleCount: count / 5
            });
        }, i * 100);
    }
};

// Rainbow shower
const fireRainbow = () => {
    const confettiFn = getConfetti();
    if (!confettiFn) return;
    const duration = 3000;
    const end = Date.now() + duration;
    const colors = COLOR_PALETTES.rainbow;
    (function frame() {
        confettiFn({
            particleCount: 10,
            angle: 60,
            spread: 55,
            origin: { x: Math.random() },
            colors,
            startVelocity: 30
        });
        confettiFn({
            particleCount: 10,
            angle: 120,
            spread: 55,
            origin: { x: Math.random() },
            colors,
            startVelocity: 30
        });
        if (Date.now() < end) requestAnimationFrame(frame);
    }());
};

// Level up celebration
const fireLevelUp = () => {
    const confettiFn = getConfetti();
    if (!confettiFn) return;
    const colors = COLOR_PALETTES.levelup;
    // Center burst
    fireConfettiBurst(colors);
    // Side cannons
    setTimeout(() => fireSideCannons(colors, 800), 200);
    // Fireworks
    setTimeout(() => fireFireworks(colors), 400);
};

// Task completion
const fireTaskComplete = () => {
    const confettiFn = getConfetti();
    if (!confettiFn) return;
    const colors = COLOR_PALETTES.task;
    confettiFn({
        particleCount: 150,
        spread: 60,
        origin: { y: 0.6 },
        colors,
        startVelocity: 45
    });
};

// Duel victory
const fireDuelVictory = () => {
    const confettiFn = getConfetti();
    if (!confettiFn) return;
    const colors = COLOR_PALETTES.duel;
    fireConfettiBurst(colors);
    setTimeout(() => fireSideCannons(colors, 1000), 300);
};

// Achievement unlock
const fireAchievement = () => {
    const confettiFn = getConfetti();
    if (!confettiFn) return;
    const colors = COLOR_PALETTES.achievement;
    fireStarBurst(colors);
    setTimeout(() => fireFireworks(colors), 500);
};

// Smart confetti - chooses style based on event type
const fireSmartConfetti = (eventType = 'default', settings = {}) => {
    if (settings?.confetti === false) return;
    
    switch(eventType) {
        case 'levelup':
        case 'level':
            fireLevelUp();
            break;
        case 'task':
        case 'complete':
        case 'taskComplete':
            fireTaskComplete();
            break;
        case 'duel':
        case 'victory':
        case 'win':
            fireDuelVictory();
            break;
        case 'achievement':
        case 'unlock':
            fireAchievement();
            break;
        case 'celebration':
        case 'celebrate':
            fireConfettiBurst(COLOR_PALETTES.celebration);
            setTimeout(() => fireSideCannons(COLOR_PALETTES.celebration, 600), 200);
            break;
        case 'rainbow':
            fireRainbow();
            break;
        case 'fireworks':
            fireFireworks();
            break;
        case 'starburst':
        case 'star':
            fireStarBurst();
            break;
        case 'burst':
            fireConfettiBurst();
            break;
        case 'sides':
        case 'cannons':
            fireSideCannons();
            break;
        default:
            fireConfetti({ colors: COLOR_PALETTES.default });
    }
};

// Export all functions
window.fireConfetti = fireSmartConfetti; // Default to smart confetti
window.fireConfettiBurst = fireConfettiBurst;
window.fireSideCannons = fireSideCannons;
window.fireFireworks = fireFireworks;
window.fireStarBurst = fireStarBurst;
window.fireRainbow = fireRainbow;
window.fireLevelUp = fireLevelUp;
window.fireTaskComplete = fireTaskComplete;
window.fireDuelVictory = fireDuelVictory;
window.fireAchievement = fireAchievement;
window.fireSmartConfetti = fireSmartConfetti;

console.log('✅ Confetti loaded (Enhanced with multiple styles)');

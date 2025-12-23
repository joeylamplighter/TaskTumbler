// src/utils/SoundFX.js
// ===========================================
// 🔖 SOUND EFFECTS SYSTEM
// ===========================================
// Uses Web Audio API for low-latency game sounds

const SoundFX = {
    ctx: null,
    
    /**
     * Initialize audio context (must be called after user gesture)
     */
    init: function() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Audio not supported');
        }
    },
    
    /**
     * Resume audio context if suspended
     */
    resume: function() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },
    
    /**
     * Play tick sound (during spin animation)
     */
    playTick: function() {
        if (!this.ctx) this.init();
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
        
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.008, now + 0.05);
        
        osc.start(now);
        osc.stop(now + 0.05);
    },
    
    /**
     * Play win sound (when spin lands)
     */
    playWin: function() {
        if (!this.ctx) this.init();
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        
        // Chord of notes for victory feel
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.05);
            
            gain.gain.setValueAtTime(0.08, now + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.3);
            
            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.3);
        });
    },
    
    /**
     * Play completion sound (task done)
     */
    playComplete: function() {
        if (!this.ctx) this.init();
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        
        // Rising arpeggio
        [440, 554.37, 659.25, 880].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);
            
            gain.gain.setValueAtTime(0.07, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.2);
            
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.2);
        });
    },
    
    /**
     * Play error/warning sound
     */
    playError: function() {
        if (!this.ctx) this.init();
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.setValueAtTime(150, now + 0.1);
        
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        
        osc.start(now);
        osc.stop(now + 0.2);
    },
    
    /**
     * Play click/tap sound (very subtle)
     */
    playClick: function() {
        if (!this.ctx) this.init();
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        
        gain.gain.setValueAtTime(0.025, now);
        gain.gain.exponentialRampToValueAtTime(0.002, now + 0.015);
        
        osc.start(now);
        osc.stop(now + 0.015);
    },
    
    /**
     * Play very subtle hover/soft interaction sound
     */
    playSubtle: function() {
        if (!this.ctx) this.init();
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.002, now + 0.01);
        
        osc.start(now);
        osc.stop(now + 0.01);
    },
    
    /**
     * Play level up fanfare
     */
    playLevelUp: function() {
        if (!this.ctx) this.init();
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now + i * 0.1);
            
            gain.gain.setValueAtTime(0.06, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.4);
            
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.4);
        });
    },
    
    /**
     * Play duel selection sound (when task is selected in duel)
     * Smooth, pleasant chime-like sound
     */
    playDuelSelect: function() {
        if (!this.ctx) this.init();
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        
        // Soft, pleasant two-tone chime
        [440, 554.37].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.05);
            
            gain.gain.setValueAtTime(0.06, now + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.25);
            
            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.25);
        });
    }
};

// Expose globally for backward compatibility
if (typeof window !== 'undefined') {
    window.SoundFX = SoundFX;
}

export default SoundFX;


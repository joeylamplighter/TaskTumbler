// DuelTabLegacy - Migrated from legacy 13-10-duel.jsx
// ===========================================
// DUEL MODE
// ===========================================

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";

function DuelTabLegacy({ tasks = [], onUpdate, settings = {}, notify = () => {}, fireConfetti, addActivity, setUserStats }) {
  
  const [pair, setPair] = useState([]);
  const [animState, setAnimState] = useState(null);
  const [fighter1Anim, setFighter1Anim] = useState('');
  const [fighter2Anim, setFighter2Anim] = useState('');
  const [weightChange, setWeightChange] = useState({ id: null, text: '' });
  const [xpChange, setXpChange] = useState({ text: '', visible: false });
  const [fighter1Action, setFighter1Action] = useState(null);
  const [fighter2Action, setFighter2Action] = useState(null);
  const [screenShake, setScreenShake] = useState(false);

  const activeTasks = useMemo(
    () => (tasks || []).filter(t => !t.completed),
    [tasks]
  );

  const getFighterColor = (priority) => {
    if (!priority) return 'blue';
    const colors = {
      Urgent: 'red',
      High: 'yellow',
      Medium: 'blue',
      Low: 'green'
    };
    return colors[priority] || 'blue';
  };

  // Simple, consistent action text - no random variety to keep flow fast
  const WINNER_ACTION = 'WIN!';
  const LOSER_ACTION = 'LOST';

  const pickPair = useCallback(() => {
    if (activeTasks.length < 2) {
      setPair([]);
      setAnimState(null);
      setFighter1Anim('');
      setFighter2Anim('');
      setWeightChange({ id: null, text: '' });
      setFighter1Action(null);
      setFighter2Action(null);
      return;
    }

    const useWeightClasses = settings.enableWeightClasses !== false;

    if (!useWeightClasses) {
      const idx1 = Math.floor(Math.random() * activeTasks.length);
      let idx2 = Math.floor(Math.random() * activeTasks.length);
      while (idx2 === idx1) {
        idx2 = Math.floor(Math.random() * activeTasks.length);
      }
      setPair([activeTasks[idx1], activeTasks[idx2]]);
      setAnimState(null);
      setFighter1Anim('');
      setFighter2Anim('');
      setWeightChange({ id: null, text: '' });
      setFighter1Action(null);
      setFighter2Action(null);
      return;
    }

    for (let attempt = 0; attempt < 10; attempt++) {
        const idx1 = Math.floor(Math.random() * activeTasks.length);
        const taskA = activeTasks[idx1];
        const weightA = Number(taskA.weight ?? 10);
        
        const minWeight = weightA - 10;
        const maxWeight = weightA + 10;
        
        const validOpponents = activeTasks.filter((t, i) => {
            if (i === idx1) return false;
            const weightB = Number(t.weight ?? 10);
            return Math.abs(weightA - weightB) <= 10; 
        });

        if (validOpponents.length > 0) {
            const idx2 = Math.floor(Math.random() * validOpponents.length);
            const taskB = validOpponents[idx2];
            
            setPair([taskA, taskB]);
            setAnimState(null);
            setFighter1Anim('');
            setFighter2Anim('');
            setWeightChange({ id: null, text: '' });
            setFighter1Action(null);
            setFighter2Action(null);
            return;
        }
    }

    setPair([]);
    notify("Tasks are too spread out in weight. Try completing some or adjusting weights.", "⚠️");
  }, [activeTasks, notify, settings.enableWeightClasses]); 

  useEffect(() => {
    // Only pick a new pair if we don't have one and there are enough tasks
    // Don't auto-pick if we're in the middle of an animation or have a pair
    if (activeTasks.length >= 2 && pair.length === 0 && !animState && fighter1Anim === '' && fighter2Anim === '') {
      pickPair();
    } else if (activeTasks.length < 2) {
      setPair([]);
      setAnimState(null);
      setFighter1Anim('');
      setFighter2Anim('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTasks.length]);


  const isUrgent = useCallback((task) => {
    if (!task) return false;
    if (task.priority === 'Urgent') return true;
    if (task.dueDate) {
      const due = new Date(task.dueDate);
      const now = new Date();
      return due < now;
    }
    return false;
  }, []);

  const getWeightScale = useCallback((weight) => {
    const baseWeight = 10;
    const maxWeight = Number(settings?.weightMax ?? 100);
    const normalizedWeight = Math.min((weight ?? 10) / maxWeight, 1);
    return 0.95 + (normalizedWeight * 0.1);
  }, [settings?.weightMax]);

  const handleChoice = (winnerIndex) => {
    // Prevent multiple clicks during animation
    if (animState && animState !== 'complete') return;
    if (pair.length !== 2) return;
    // Prevent clicking if animations are already playing
    if (fighter1Anim === 'win' || fighter1Anim === 'lose' || fighter2Anim === 'win' || fighter2Anim === 'lose') return;

    const winner = pair[winnerIndex];
    const loser = pair[winnerIndex === 0 ? 1 : 0];

    if (!winner || !loser) return;

    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 300);

    // Set initial attack/defend states briefly, then immediately set win/lose
    // This gives a brief moment before the main animations
    if (winnerIndex === 0) {
      setFighter1Anim('attacking');
      setFighter2Anim('defending');
    } else {
      setFighter1Anim('defending');
      setFighter2Anim('attacking');
    }

    setAnimState(winnerIndex === 0 ? 'left' : 'right');
    
    // Set win/lose animations immediately for snappy fidget-toy feel (ultra-fast for rapid-fire)
    setTimeout(() => {
      if (winnerIndex === 0) {
        setFighter1Anim('win');
        setFighter2Anim('lose');
      } else {
        setFighter1Anim('lose');
        setFighter2Anim('win');
      }
    }, 50); // Ultra-brief moment for attack/defend, then quick win/lose

    try {
      if (typeof SoundFX !== 'undefined' && settings?.sound !== false) {
        SoundFX.playDuelSelect();
      }
    } catch (e) {}

    const winBoost = Number(settings.duelWinBoost ?? 10);
    const lossPenalty = Number(settings.duelLossPenalty ?? 5);
    const weightMax = Number(settings.weightMax ?? 100);

    const winnerBase = Number(winner.weight ?? 10);
    const loserBase = Number(loser.weight ?? 10);

    const newWinnerWeight = Math.min(weightMax, winnerBase + winBoost);
    const newLoserWeight = Math.max(1, loserBase - lossPenalty);

    const animDelay = 150; // Ultra-fast delay for rapid-fire duels

    setTimeout(() => {
      onUpdate(winner.id, { weight: newWinnerWeight });
      onUpdate(loser.id, { weight: newLoserWeight });

      setWeightChange({ id: winner.id, text: `+${winBoost}` });

      const winnerActionText = WINNER_ACTION;
      const loserActionText = LOSER_ACTION;

      if (typeof addActivity === "function") {
        try {
          const now = new Date().toISOString();
          const duelActivity = {
            id: window.generateId ? window.generateId("act") : "act_" + Date.now() + "_" + Math.random().toString(36).slice(2),
            title: `Duel: ${winner.title || "Untitled"} vs ${loser.title || "Untitled"}`,
            category: winner.category || "General",
            duration: 0,
            type: "duel",
            taskId: winner.id,
            people: Array.isArray(winner.people) ? winner.people : [],
            location: winner.location || '',
            createdAt: now,
            timestamp: now,
            priority: winner.priority || "Medium",
            metadata: {
              winner: {
                id: winner.id,
                title: winner.title,
                weight: newWinnerWeight,
                weightChange: winBoost
              },
              loser: {
                id: loser.id,
                title: loser.title,
                weight: newLoserWeight,
                weightChange: -lossPenalty
              },
            }
          };
          console.log("⚔️ Logging duel activity:", JSON.stringify(duelActivity, null, 2));
          addActivity(duelActivity);
        } catch (e) {
          console.error("Failed to log duel activity:", e);
        }
      }

      // Set action text (speech bubbles) - keeping it simple
      if (winnerIndex === 0) {
        setFighter1Action(winnerActionText);
        setFighter2Action(loserActionText);
      } else {
        setFighter1Action(loserActionText);
        setFighter2Action(winnerActionText);
      }

      setTimeout(() => {
        const loserCardIndex = winnerIndex === 0 ? 1 : 0;
        const loserCards = document.querySelectorAll('.duel-card');
        if (loserCards[loserCardIndex]) {
          createParticleExplosion(loserCards[loserCardIndex]);
        }
      }, animDelay);

      if (settings.confetti && typeof window.fireSmartConfetti === "function") window.fireSmartConfetti('duel', settings);
    }, animDelay);

    // Ultra-fast snappy timing for rapid-fire duels
    // Total time: 50ms delay + 200ms animation + buffer = ~350ms
    const finishTimeout = window.setTimeout(() => {
      // Calculate and award XP based on duels per hour
      if (typeof setUserStats === 'function') {
        try {
          const now = Date.now();
          const oneHourAgo = now - (60 * 60 * 1000);
          
          // Get stored duel timestamps
          const storedTimestamps = JSON.parse(localStorage.getItem('duelTimestamps') || '[]');
          
          // Filter to only keep timestamps from the last hour
          const recentTimestamps = storedTimestamps.filter(ts => ts > oneHourAgo);
          
          // Add current duel timestamp
          recentTimestamps.push(now);
          
          // Save updated timestamps
          localStorage.setItem('duelTimestamps', JSON.stringify(recentTimestamps));
          
          // Calculate XP based on duel count
          const duelCount = recentTimestamps.length;
          let xpChange = 0;
          
          if (duelCount <= 15) {
            // First 15 duels: add small XP (1-2 XP per duel)
            xpChange = 1 + (duelCount <= 10 ? 1 : 0); // 2 XP for first 10, 1 XP for 11-15
          } else {
            // After 15: incrementally subtract XP
            // Duel 16: -1, Duel 17: -2, Duel 18: -3, etc.
            const excessDuels = duelCount - 15;
            xpChange = -excessDuels;
          }
          
          // Update userStats with XP change and show subtle fade indicator
          if (xpChange !== 0) {
            setUserStats((prev) => {
              const currentXp = Number(prev?.xp || 0);
              const newXp = Math.max(0, currentXp + xpChange); // Don't go below 0
              return { ...prev, xp: newXp };
            });
            
            // Show subtle slowly fading XP indicator (not distracting, away from fighters)
            const xpText = xpChange > 0 ? `+${xpChange} XP` : `${xpChange} XP`;
            setXpChange({ text: xpText, visible: true });
            
            // Fade out slowly after a moment
            setTimeout(() => {
              setXpChange({ text: '', visible: false });
            }, 2500); // Slow fade - 2.5 seconds
          }
        } catch (e) {
          console.error("Failed to update XP from duel:", e);
        }
      }
      
      // No distracting toast notifications - just update silently
      
      // Ultra-quick clear for rapid-fire feel
      setTimeout(() => {
        setWeightChange({ id: null, text: '' });
        setFighter1Action(null);
        setFighter2Action(null);

        // Auto-advance is ON by default for fidget-toy rapid choosing
        if (settings?.duelAutoAdvance !== false) {
          setAnimState(null);
          setFighter1Anim('');
          setFighter2Anim('');
          pickPair();
        } else {
          setAnimState('complete');
        }
      }, 200); // Ultra-quick clear for rapid-fire
    }, 350); // Ultra-fast total time: 50ms delay + 200ms animation + 100ms buffer
  };


  if (activeTasks.length < 2) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: 'var(--text-light)'
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 10 }}>🏁</div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Not Enough Tasks</div>
        <div style={{ fontSize: 12 }}>Add at least 2 active tasks to start a duel.</div>
      </div>
    );
  }

  if (pair.length !== 2) return null;

  const showNextButton = animState === 'complete' && !settings.duelAutoAdvance;

  return (
    <div className={`duel-container ${screenShake ? 'screen-shake' : ''}`}>
      {xpChange.visible && (
        <div 
          className="xp-change-fx"
          style={{ 
            color: xpChange.text.startsWith('+') ? 'var(--success)' : 'var(--danger)'
          }}
        >
          {xpChange.text}
        </div>
      )}

      <div
        className={`duel-card ${animState === 'left' ? 'winner' : animState === 'right' ? 'loser' : ''} ${isUrgent && isUrgent(pair[0]) ? 'urgent-pulse' : ''}`}
        onClick={() => handleChoice(0)}
        style={{
          pointerEvents: animState && animState !== 'complete' ? 'none' : 'auto',
          position: 'relative',
          transform: `scale(${getWeightScale ? getWeightScale(pair[0]?.weight ?? 10) : 1})`,
          transition: 'transform 0.2s ease-out'
        }}
      >
        {weightChange.id === pair[0].id && (
          <span
            className="weight-change-fx"
            style={{ color: 'var(--success)', left: '50%', transform: 'translateX(-50%)' }}
          >
            {weightChange.text}
          </span>
        )}

        <div style={{ flex: '2 1 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', width: '100%', minHeight: 0, marginBottom: 12 }}>
          <div className={`pixel-fighter pixel-fighter-${getFighterColor(pair[0]?.priority)} ${fighter1Anim}`}>
            <div className="pixel-fighter-sprite"></div>
            {fighter1Action && settings?.duelShowActionBubbles !== false && (
              <div className={`duel-action-badge ${fighter1Anim === 'win' ? 'duel-action-winner' : 'duel-action-loser'}`}>
                {fighter1Action}
              </div>
            )}
          </div>
        </div>

        {/* Animated characters removed - keeping it clean with just fighters and speech bubbles */}

        <div style={{ flex: '1 1 0', textAlign: 'center', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, lineHeight: 1.1 }}>
            {pair[0].title}
          </div>
          <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 8,
                padding: '1px 4px',
                borderRadius: 3,
                fontWeight: 700,
                textTransform: 'uppercase',
                background: 'var(--input-bg)',
                color: 'var(--text-light)',
                border: '1px solid var(--border)'
              }}
            >
              {pair[0].category}
            </span>
            <span
              style={{
                fontSize: 8,
                padding: '1px 4px',
                borderRadius: 3,
                fontWeight: 700,
                textTransform: 'uppercase',
                border: `1px solid ${
                  pair[0].priority === 'Urgent'
                    ? 'var(--danger)'
                    : pair[0].priority === 'High'
                    ? 'var(--primary)'
                    : pair[0].priority === 'Medium'
                    ? '#0984e3'
                    : 'var(--success)'
                }`,
                color:
                  pair[0].priority === 'Urgent'
                    ? 'var(--danger)'
                    : pair[0].priority === 'High'
                    ? 'var(--primary)'
                    : pair[0].priority === 'Medium'
                    ? '#0984e3'
                    : 'var(--success)',
                background: 'transparent'
              }}
            >
              {pair[0].priority}
            </span>
          </div>
          <div
            style={{
              fontSize: 9,
              background: 'rgba(255, 107, 53, 0.1)',
              color: 'var(--primary)',
              padding: '2px 8px',
              borderRadius: 10,
              fontWeight: 600,
              border: '1px solid rgba(255, 107, 53, 0.2)',
              display: 'inline-block'
            }}
          >
            Weight: {pair[0].weight}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '24px 0', zIndex: 10, position: 'relative' }}>
        <div 
          onClick={pickPair}
          style={{ 
            color: 'var(--text-light)', 
            fontFamily: 'Fredoka', 
            fontWeight: 700, 
            fontSize: 16, 
            background: 'var(--bg)', 
            padding: '8px 20px', 
            borderRadius: 20, 
            border: '2px solid var(--border)', 
            letterSpacing: '2px',
            cursor: 'pointer'
          }}
        >
          VS
        </div>
      </div>

      <div
        className={`duel-card ${animState === 'right' ? 'winner' : animState === 'left' ? 'loser' : ''} ${isUrgent && isUrgent(pair[1]) ? 'urgent-pulse' : ''}`}
        onClick={() => handleChoice(1)}
        style={{
          pointerEvents: animState && animState !== 'complete' ? 'none' : 'auto',
          position: 'relative',
          transform: `scale(${getWeightScale ? getWeightScale(pair[1]?.weight ?? 10) : 1})`,
          transition: 'transform 0.2s ease-out'
        }}
      >
        {weightChange.id === pair[1].id && (
          <span
            className="weight-change-fx"
            style={{ color: 'var(--success)' }}
          >
            {weightChange.text}
          </span>
        )}

        <div style={{ flex: '2 1 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', width: '100%', minHeight: 0, marginBottom: 12 }}>
          <div className={`pixel-fighter pixel-fighter-${getFighterColor(pair[1]?.priority)} ${fighter2Anim}`}>
            <div className="pixel-fighter-sprite"></div>
            {fighter2Action && settings?.duelShowActionBubbles !== false && (
              <div className={`duel-action-badge ${fighter2Anim === 'win' ? 'duel-action-winner' : 'duel-action-loser'}`}>
                {fighter2Action}
              </div>
            )}
          </div>
        </div>

        {/* Animated characters removed - keeping it clean with just fighters and speech bubbles */}

        <div style={{ flex: '1 1 0', textAlign: 'center', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, lineHeight: 1.1 }}>
            {pair[1].title}
          </div>
          <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 8,
                padding: '1px 4px',
                borderRadius: 3,
                fontWeight: 700,
                textTransform: 'uppercase',
                background: 'var(--input-bg)',
                color: 'var(--text-light)',
                border: '1px solid var(--border)'
              }}
            >
              {pair[1].category}
            </span>
            <span
              style={{
                fontSize: 8,
                padding: '1px 4px',
                borderRadius: 3,
                fontWeight: 700,
                textTransform: 'uppercase',
                border: `1px solid ${
                  pair[1].priority === 'Urgent'
                    ? 'var(--danger)'
                    : pair[1].priority === 'High'
                    ? 'var(--primary)'
                    : pair[1].priority === 'Medium'
                    ? '#0984e3'
                    : 'var(--success)'
                }`,
                color:
                  pair[1].priority === 'Urgent'
                    ? 'var(--danger)'
                    : pair[1].priority === 'High'
                    ? 'var(--primary)'
                    : pair[1].priority === 'Medium'
                    ? '#0984e3'
                    : 'var(--success)',
                background: 'transparent'
              }}
            >
              {pair[1].priority}
            </span>
          </div>
          <div
            style={{
              fontSize: 9,
              background: 'rgba(255, 107, 53, 0.1)',
              color: 'var(--primary)',
              padding: '2px 8px',
              borderRadius: 10,
              fontWeight: 600,
              border: '1px solid rgba(255, 107, 53, 0.2)',
              display: 'inline-block'
            }}
          >
            Weight: {pair[1].weight}
          </div>
        </div>
      </div>
    </div>
  );
}

// Keep window assignment for backward compatibility
if (typeof window !== 'undefined') {
  window.DuelTab = DuelTabLegacy;
}

export default DuelTabLegacy;


// 🔖 SECTION 14: Duel Mode
import React from 'react'

function DuelTab({ tasks = [], onUpdate, settings = {}, notify = () => {}, fireConfetti, addActivity }) {
  const { useState, useEffect, useRef, useMemo, useCallback } = React; // Ensure hooks are imported at the top of the component
  
  const [pair, setPair] = useState([]);
  const [animState, setAnimState] = useState(null);
  const [fighter1Anim, setFighter1Anim] = useState('');
  const [fighter2Anim, setFighter2Anim] = useState('');
  const [weightChange, setWeightChange] = useState({ id: null, text: '' });
  const [loserWeightChange, setLoserWeightChange] = useState({ id: null, text: '' });
  const [fighter1Emoji, setFighter1Emoji] = useState(null);
  const [fighter2Emoji, setFighter2Emoji] = useState(null);
  const [comboCount, setComboCount] = useState(0);
  const [lastChoiceTime, setLastChoiceTime] = useState(null);
  const [progress, setProgress] = useState(0);
  const [particles, setParticles] = useState([]);
  const [screenShake, setScreenShake] = useState(false);
  const [winnerCharacters, setWinnerCharacters] = useState([]);
  const [loserCharacters, setLoserCharacters] = useState([]);
  const interactionSpeedRef = useRef(50); // Start at base speed
  const comboTimeoutRef = useRef(null);

  const activeTasks = useMemo(
    () => (tasks || []).filter(t => !t.completed),
    [tasks]
  );

  const getFighterColor = (priority) => {
    if (!priority) return 'blue'; // Fallback if priority is missing
    const colors = {
      Urgent: 'red',
      High: 'yellow',
      Medium: 'blue',
      Low: 'green'
    };
    return colors[priority] || 'blue';
  };

  // Quick, snappy, ADHD-friendly actions - Expanded variety
  const WINNER_ACTIONS = [
    '💥 BOOM!', '🔥 DOMINATED!', '⚡ ZAPPED!', '🎯 PERFECT!', '💪 CRUSHED!',
    '🚀 BLASTED!', '⭐ CHAMPION!', '✨ VICTORY!', '🎉 WON!', '🏆 CHAMP!',
    '💫 STUNNED!', '🔥 ON FIRE!', '⚡ LIGHTNING!', '💥 SMASHED!', '🎯 BULLSEYE!',
    '🚀 LAUNCHED!', '⭐ SHINING!', '✨ MAGIC!', '💪 POWER!', '🔥 BURNED!',
    '🎊 EPIC!', '💎 DIAMOND!', '🌟 STAR!', '⚔️ SLAYED!', '🔥 INFERNO!',
    '💨 ZOOM!', '🎯 DEADEYE!', '⚡ THUNDER!', '💥 KABOOM!', '🚀 ROCKET!',
    '🏅 GOLD!', '👑 CROWN!', '💪 BEAST!', '🔥 FLAME!', '⭐ GLOW!',
    '🎪 SHOW!', '💫 COMET!', '⚡ BOLT!', '🔥 BLAZE!', '🎯 HIT!',
    '🚀 SOAR!', '💎 GEM!', '🌟 BRIGHT!', '⚔️ STRIKE!', '💥 BANG!'
  ];

  const LOSER_ACTIONS = [
    '😢 OOF!', '💔 DEFEATED!', '😓 MISSED!', '😔 SORRY!', '😞 DOWN!',
    '😰 WHIFF!', '😪 TIRED!', '😭 LOST!', '😤 GRR!', '😑 MEH!',
    '😕 OOPS!', '😟 SIGH!', '😣 OUCH!', '😩 FAIL!', '😫 NOPE!',
    '😤 HMPH!', '😒 WHATEVER!', '😓 WHEW!', '😔 ALAS!', '😞 NEXT!',
    '😴 ZZZ!', '😮‍💨 PHEW!', '😵 WOAH!', '😬 YIKES!', '😅 OOPS!',
    '😰 EEP!', '😱 GASP!', '😨 YIKES!', '😧 WHOA!', '😦 HUH!',
    '😯 OH!', '😮 WOW!', '😲 GEEZ!', '😳 OOF!', '😵‍💫 SPIN!',
    '🤷 SHRUG!', '😑 BLANK!', '😐 FLAT!', '😶 MUTE!', '😏 SMIRK!',
    '🤔 HMM!', '😌 RELAX!', '😊 OKAY!', '🙃 FLIP!', '😉 WINK!'
  ];

  const getRandomAction = (actions) => {
    return actions[Math.floor(Math.random() * actions.length)];
  };

  const pickPair = useCallback(() => {
    if (activeTasks.length < 2) {
      setPair([]);
      setAnimState(null);
      setFighter1Anim('');
      setFighter2Anim('');
      setWeightChange({ id: null, text: '' });
      setFighter1Emoji(null);
      setFighter2Emoji(null);
      setWinnerCharacters([]);
      setLoserCharacters([]);
      return;
    }

    // Check if weight classes are enabled
    const useWeightClasses = settings.enableWeightClasses !== false; // Default to true if undefined

    if (!useWeightClasses) {
      // --- DISABLED: Pick any two random tasks ---
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
      setFighter1Emoji(null);
      setFighter2Emoji(null);
      setWinnerCharacters([]);
      setLoserCharacters([]);
      return;
    }

    // --- START WEIGHT CLASS LOGIC (Max 10 point difference) ---
    // Attempt to select a valid pair up to 10 times to prevent infinite loop
    for (let attempt = 0; attempt < 10; attempt++) {
        // Pick a random starter task (Task A)
        const idx1 = Math.floor(Math.random() * activeTasks.length);
        const taskA = activeTasks[idx1];
        const weightA = Number(taskA.weight ?? 10);
        
        // Define the weight range for Task B (Weight A +/- 10)
        const minWeight = weightA - 10;
        const maxWeight = weightA + 10;
        
        // Filter the remaining tasks to find opponents in the weight class
        const validOpponents = activeTasks.filter((t, i) => {
            if (i === idx1) return false; // Cannot duel self
            const weightB = Number(t.weight ?? 10);
            
            // Check if the difference is <= 10
            return Math.abs(weightA - weightB) <= 10; 
        });

        if (validOpponents.length > 0) {
            // Found compatible tasks! Pick one opponent (Task B) randomly
            const idx2 = Math.floor(Math.random() * validOpponents.length);
            const taskB = validOpponents[idx2];
            
            // Success: set the pair and exit the function
            setPair([taskA, taskB]);
            setAnimState(null);
            setFighter1Anim('');
            setFighter2Anim('');
            setWeightChange({ id: null, text: '' });
            setFighter1Emoji(null);
            setFighter2Emoji(null);
            setWinnerCharacters([]);
            setLoserCharacters([]);
            return;
        }
    }

    // If no valid pair is found after 10 attempts (tasks are too spread out)
    setPair([]);
    notify("Tasks are too spread out in weight. Try completing some or adjusting weights.", "⚠️");
    // --- END WEIGHT CLASS LOGIC ---
    
  }, [activeTasks, notify, settings.enableWeightClasses]); 

  // Use useEffect to ensure pickPair runs on initial load and when task list changes
  useEffect(() => {
    if (activeTasks.length >= 2) {
      pickPair();
    } else {
      setPair([]); // Clear pair if not enough active tasks
    }
    // pickPair is stable (useCallback), but we only want to run when task count changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTasks.length]);

  // Calculate combo streak based on time between choices
  const updateCombo = useCallback(() => {
    const now = Date.now();
    if (lastChoiceTime && now - lastChoiceTime < 3000) {
      // Fast choice = combo
      setComboCount(prev => prev + 1);
      interactionSpeedRef.current = Math.min(100, interactionSpeedRef.current + 10);
    } else {
      setComboCount(1);
      interactionSpeedRef.current = 50;
    }
    setLastChoiceTime(now);
    
    // Reset combo after delay
    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    comboTimeoutRef.current = setTimeout(() => {
      setComboCount(0);
      interactionSpeedRef.current = 50;
    }, 3000);
  }, [lastChoiceTime]);

  // Create particle explosion for loser
  const createParticleExplosion = useCallback((element) => {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const newParticles = [];
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 50 + Math.random() * 50;
      newParticles.push({
        id: Date.now() + i,
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  // Check if task is urgent/overdue
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

  // Calculate weight-based scale (heavier = larger)
  const getWeightScale = useCallback((weight) => {
    const baseWeight = 10;
    const maxWeight = Number(settings?.weightMax ?? 100);
    const normalizedWeight = Math.min((weight ?? 10) / maxWeight, 1);
    return 0.95 + (normalizedWeight * 0.1); // Scale between 0.95 and 1.05
  }, [settings?.weightMax]);

  const handleChoice = (winnerIndex) => {
    if (animState) return;
    if (pair.length !== 2) return;

    const winner = pair[winnerIndex];
    const loser = pair[winnerIndex === 0 ? 1 : 0];

    if (!winner || !loser) return;

    // Update combo
    updateCombo();

    // Screen shake
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 300);

    // Progress bar animation
    setProgress(0);
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 20);
    
    // Cleanup progress interval
    setTimeout(() => clearInterval(progressInterval), 500);

    if (winnerIndex === 0) {
      setFighter1Anim('attacking');
      setFighter2Anim('defending');
    } else {
      setFighter1Anim('defending');
      setFighter2Anim('attacking');
    }

    setAnimState(winnerIndex === 0 ? 'left' : 'right');

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

    // Timing adjusted for new dynamic animations
    const animDelay = 300; // Matches attacking/defending animation duration

    setTimeout(() => {
      onUpdate(winner.id, { weight: newWinnerWeight });
      onUpdate(loser.id, { weight: newLoserWeight });

      setWeightChange({ id: winner.id, text: `+${winBoost}` });
      setLoserWeightChange({ id: loser.id, text: `-${lossPenalty}` });

      // Set random actions for winner and loser
      const winnerActionText = getRandomAction(WINNER_ACTIONS);
      const loserActionText = getRandomAction(LOSER_ACTIONS);

      // ✅ LOG DUEL RESULT TO ACTIVITIES
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
              comboCount: comboCount
            }
          };
          console.log("⚔️ Logging duel activity:", JSON.stringify(duelActivity, null, 2));
          addActivity(duelActivity);
        } catch (e) {
          console.error("Failed to log duel activity:", e);
        }
      }

      // Randomly select animation variant (1-5 for each)
      const winnerAnimVariant = Math.floor(Math.random() * 5) + 1;
      const loserAnimVariant = Math.floor(Math.random() * 5) + 1;
      const winnerAnim = winnerAnimVariant === 1 ? 'win' : `win${winnerAnimVariant}`;
      const loserAnim = loserAnimVariant === 1 ? 'lose' : `lose${loserAnimVariant}`;

      if (winnerIndex === 0) {
        setFighter1Anim(winnerAnim);
        setFighter2Anim(loserAnim);
        setFighter1Emoji(randomEmoji);
        setFighter2Emoji(null);
        
        // Decorative characters removed - keeping it clean
        setWinnerCharacters([]);
        setLoserCharacters([]);
      } else {
        setFighter1Anim(loserAnim);
        setFighter2Anim(winnerAnim);
        setFighter1Emoji(null);
        setFighter2Emoji(randomEmoji);
        
        // Decorative characters removed - keeping it clean
        setWinnerCharacters([]);
        setLoserCharacters([]);
      }

      // Particle explosion for loser
      setTimeout(() => {
        const loserCardIndex = winnerIndex === 0 ? 1 : 0;
        const loserCards = document.querySelectorAll('.duel-card');
        if (loserCards[loserCardIndex]) {
          createParticleExplosion(loserCards[loserCardIndex]);
        }
      }, animDelay);

      if (settings.confetti && typeof window.fireSmartConfetti === "function") window.fireSmartConfetti('duel', settings);
    }, animDelay);


    // Finish timeout adjusted for new longer animations
    const finishTimeout = window.setTimeout(() => {
      // No toast notifications - keeping it clean like a video game
      setWeightChange({ id: null, text: '' });
      setLoserWeightChange({ id: null, text: '' });
      setFighter1Emoji(null);
      setFighter2Emoji(null);

      if (settings?.duelAutoAdvance !== false) { // Default to true
          // Advance after animations complete
          setAnimState(null);
          setFighter1Anim('');
          setFighter2Anim('');
          pickPair();
      } else {
          setAnimState('complete');
      }
    }, 900); // 300ms attack/defend + 500ms win/lose + 100ms buffer
  };

  // Particle animation effect - MUST be before any early returns
  useEffect(() => {
    if (!particles || particles.length === 0) {
      return;
    }
    
    const interval = setInterval(() => {
      setParticles(prev => {
        if (!prev || prev.length === 0) return [];
        const updated = prev.map(p => ({
          ...p,
          x: (p.x || 0) + (p.vx || 0) * 0.1,
          y: (p.y || 0) + (p.vy || 0) * 0.1,
          vy: (p.vy || 0) + 2, // gravity
          life: (p.life || 0) - 0.02
        })).filter(p => (p.life || 0) > 0 && (p.y || 0) < (window.innerHeight || 1000));
        return updated;
      });
    }, 16);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [particles.length]);

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


      {/* Particle Effects */}
      {particles && particles.length > 0 && particles.map(particle => (
        <div
          key={particle.id}
          className="duel-particle"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            opacity: particle.life || 0,
            transform: `scale(${particle.life || 0})`
          }}
        />
      ))}

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
            className="weight-change-fx winner-score"
            style={{ color: 'var(--success)' }}
          >
            {weightChange.text}
          </span>
        )}
        {loserWeightChange.id === pair[0].id && (
          <span
            className="weight-change-fx loser-score"
            style={{ color: 'var(--danger)' }}
          >
            {loserWeightChange.text}
          </span>
        )}

        <div className={`pixel-fighter pixel-fighter-${getFighterColor(pair[0]?.priority)} ${fighter1Anim}`}>
          <div className="pixel-fighter-sprite"></div>
          {fighter1Emoji && fighter1Anim.startsWith('win') && (
            <div className="duel-emoji-fx">
              {fighter1Emoji}
            </div>
          )}
        </div>

        {/* Animated characters removed - keeping it clean with just fighters and speech bubbles */}

        <div style={{ textAlign: 'center', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, lineHeight: 1.1, wordBreak: 'break-word' }}>
            {pair[0].title}
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 6, flexWrap: 'wrap', maxWidth: '100%', overflow: 'hidden' }}>
            <span
              style={{
                fontSize: 9,
                padding: '2px 6px',
                borderRadius: 4,
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
                fontSize: 9,
                padding: '2px 6px',
                borderRadius: 4,
                fontWeight: 700,
                textTransform: 'uppercase',
                borderColor:
                  pair[0].priority === 'Urgent'
                    ? 'var(--danger)'
                    : pair[0].priority === 'High'
                    ? 'var(--primary)'
                    : pair[0].priority === 'Medium'
                    ? '#0984e3'
                    : 'var(--success)',
                color:
                  pair[0].priority === 'Urgent'
                    ? 'var(--danger)'
                    : pair[0].priority === 'High'
                    ? 'var(--primary)'
                    : pair[0].priority === 'Medium'
                    ? '#0984e3'
                    : 'var(--success)',
                background: 'transparent',
                border: '1px solid'
              }}
            >
              {pair[0].priority}
            </span>
            {pair[0].tags && Array.isArray(pair[0].tags) && pair[0].tags.length > 0 && pair[0].tags.map((tag, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: 9,
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontWeight: 700,
                  background: 'rgba(255, 107, 53, 0.1)',
                  color: 'var(--primary)',
                  border: '1px solid rgba(255, 107, 53, 0.3)',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flexShrink: 1
                }}
              >
                #{tag} {tag}
              </span>
            ))}
          </div>
          <div
            style={{
              fontSize: 10,
              background: 'rgba(255, 107, 53, 0.1)',
              color: 'var(--primary)',
              padding: '4px 10px',
              borderRadius: 12,
              fontWeight: 600,
              border: '1px solid rgba(255, 107, 53, 0.2)',
              display: 'inline-block'
            }}
          >
            Weight: {pair[0].weight}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '-10px 0', zIndex: 10, position: 'relative' }}>
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
            className="weight-change-fx winner-score"
            style={{ color: 'var(--success)' }}
          >
            {weightChange.text}
          </span>
        )}
        {loserWeightChange.id === pair[1].id && (
          <span
            className="weight-change-fx loser-score"
            style={{ color: 'var(--danger)' }}
          >
            {loserWeightChange.text}
          </span>
        )}

        <div className={`pixel-fighter pixel-fighter-${getFighterColor(pair[1]?.priority)} ${fighter2Anim}`}>
          <div className="pixel-fighter-sprite"></div>
          {fighter2Emoji && fighter2Anim.startsWith('win') && (
            <div className="duel-emoji-fx">
              {fighter2Emoji}
            </div>
          )}
        </div>

        {/* Animated characters removed - keeping it clean with just fighters and speech bubbles */}

        <div style={{ textAlign: 'center', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, lineHeight: 1.1, wordBreak: 'break-word' }}>
            {pair[1].title}
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 6, flexWrap: 'wrap', maxWidth: '100%', overflow: 'hidden' }}>
            <span
              style={{
                fontSize: 9,
                padding: '2px 6px',
                borderRadius: 4,
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
                fontSize: 9,
                padding: '2px 6px',
                borderRadius: 4,
                fontWeight: 700,
                textTransform: 'uppercase',
                borderColor:
                  pair[1].priority === 'Urgent'
                    ? 'var(--danger)'
                    : pair[1].priority === 'High'
                    ? 'var(--primary)'
                    : pair[1].priority === 'Medium'
                    ? '#0984e3'
                    : 'var(--success)',
                color:
                  pair[1].priority === 'Urgent'
                    ? 'var(--danger)'
                    : pair[1].priority === 'High'
                    ? 'var(--primary)'
                    : pair[1].priority === 'Medium'
                    ? '#0984e3'
                    : 'var(--success)',
                background: 'transparent',
                border: '1px solid'
              }}
            >
              {pair[1].priority}
            </span>
            {pair[1].tags && Array.isArray(pair[1].tags) && pair[1].tags.length > 0 && pair[1].tags.map((tag, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: 9,
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontWeight: 700,
                  background: 'rgba(255, 107, 53, 0.1)',
                  color: 'var(--primary)',
                  border: '1px solid rgba(255, 107, 53, 0.3)',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flexShrink: 1
                }}
              >
                #{tag} {tag}
              </span>
            ))}
          </div>
          <div
            style={{
              fontSize: 10,
              background: 'rgba(255, 107, 53, 0.1)',
              color: 'var(--primary)',
              padding: '4px 10px',
              borderRadius: 12,
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
window.DuelTab = DuelTab;
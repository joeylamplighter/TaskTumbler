// js/components/22-app-FocusOverlay.jsx
function FocusOverlay({ task, onStop, onComplete, updateTask, addActivity }) {
  if (!task) return null;

  const [timerSeconds, setTimerSeconds] = React.useState(0);
  const [isTimerRunning, setIsTimerRunning] = React.useState(true);
  const timerRef = React.useRef(null);

  React.useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => setTimerSeconds((prev) => prev + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const handleExit = (shouldComplete = false) => {
    const sessionMins = Math.max(1, Math.round(timerSeconds / 60));
    
    // Update task stats
    if (typeof updateTask === "function") {
      updateTask(task.id, {
        actualTime: (task.actualTime || 0) + sessionMins,
        lastFocusedAt: new Date().toISOString(),
      });
    }

    // Log activity
    addActivity?.({
      taskId: task.id,
      title: task.title,
      type: "focus",
      duration: sessionMins,
      timestamp: new Date().toISOString(),
    });

    if (shouldComplete && typeof onComplete === "function") onComplete(task.id);
    onStop?.();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10000, background: "#0a0a0a", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "fixed", inset: 0 }}>
      {/* ... (The rest of your UI JSX goes here) ... */}
      <h1 style={{fontSize: 42}}>{task.title}</h1>
      <div style={{fontSize: 140, fontFamily: 'monospace'}}>{formatTime(timerSeconds)}</div>
      {/* ... Buttons ... */}
    </div>
  );
}

window.FocusOverlay = FocusOverlay;
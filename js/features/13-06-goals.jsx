// 13-06-goals.jsx
// ===========================================
// GOALS: GoalFormModal, GoalsTab
// FIXES (2025-12-22):
// - Removes default browser button styling (sleek segmented toggle)
// - Fixes broken toggle vars (view vs viewMode, setView vs setViewMode, counts)
// - Fixes stray/extra closing div that was breaking layout
// - Adds safe guards for missing props (notify, setTasks)
// - Keeps your existing goal logic + styling conventions
// ===========================================

import React from 'react'

(function () {
  const { useState, useMemo, useCallback } = React;

  function GoalFormModal({ goal, onClose, onSave, onDelete, notify }) {
    const isEdit = !!goal;
    const safeNotify = typeof notify === "function" ? notify : () => {};

    const [data, setData] = useState({
      title: "",
      description: "",
      targetType: "completion",
      targetValue: 1,
      manualProgress: 0,
      currentValue: 0,
      unit: "",
      dueDate: "",
      ...goal,
    });

    const handleSave = () => {
      if (!data.title) return safeNotify("Goal Title is required.", "⚠️");

      if (["completion", "time", "numeric"].includes(data.targetType) && (!data.targetValue || data.targetValue <= 0)) {
        return safeNotify("Target Value is required and must be positive.", "⚠️");
      }

      const finalData = data.targetType === "manual" ? { ...data, targetValue: 1 } : data;
      onSave?.(finalData);
    };

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, borderRadius: 16, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontFamily: "Fredoka", margin: 0, fontSize: 22 }}>{isEdit ? "Edit Goal" : "New Goal"}</h2>
            <span onClick={onClose} style={{ fontSize: 24, cursor: "pointer", opacity: 0.6 }} aria-label="Close">
              ×
            </span>
          </div>

          <label className="f-label">Goal Title *</label>
          <input className="f-input" value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} placeholder="e.g. Save for Vacation" autoFocus />

          <label className="f-label">Description</label>
          <textarea className="f-textarea" value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} placeholder="Why is this goal important?" />

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label className="f-label">Target Date</label>
              <input type="date" className="f-input" value={window.dateUtils?.utcToLocalDateStr?.(data.dueDate) || data.dueDate || ""} onChange={(e) => setData({ ...data, dueDate: window.dateUtils?.localToUtcDateStr?.(e.target.value) || e.target.value })} style={{ colorScheme: "dark" }} />
            </div>
          </div>

          <label className="f-label">Goal Target Type</label>
          <select className="f-select" value={data.targetType} onChange={(e) => setData({ ...data, targetType: e.target.value })}>
            <option value="completion">Task Completions (e.g., 5 tasks)</option>
            <option value="time">Time Logged (e.g., 600 minutes)</option>
            <option value="numeric">Numeric Target (Money, Weight, etc.)</option>
            <option value="manual">Manual Progress Tracking (%)</option>
          </select>

          {data.targetType === "numeric" && (
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label className="f-label">Unit Label</label>
                <input className="f-input" value={data.unit} onChange={(e) => setData({ ...data, unit: e.target.value })} placeholder="$, lbs, days" />
              </div>
              <div style={{ flex: 2 }}>
                <label className="f-label">Target Value *</label>
                <input type="number" className="f-input" value={data.targetValue} onChange={(e) => setData({ ...data, targetValue: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
          )}

          {(data.targetType === "completion" || data.targetType === "time") && (
            <>
              <label className="f-label">Target Value ({data.targetType === "completion" ? "Tasks" : "Minutes"}) *</label>
              <input type="number" className="f-input" value={data.targetValue} onChange={(e) => setData({ ...data, targetValue: parseInt(e.target.value || "1", 10) || 1 })} min="1" />
            </>
          )}

          {data.targetType === "manual" && (
            <>
              <label className="f-label">Initial Progress Percentage: {data.manualProgress || 0}%</label>
              <input type="range" min="0" max="100" value={data.manualProgress || 0} onChange={(e) => setData({ ...data, manualProgress: parseInt(e.target.value || "0", 10) || 0 })} style={{ marginBottom: 0, width: "100%" }} />
              <div style={{ textAlign: "center", marginBottom: 16, fontWeight: 700, color: "var(--primary)" }}>{data.manualProgress || 0}%</div>
            </>
          )}

          {/* MODAL ACTION BUTTONS */}
          <div style={{ marginTop: 26, display: "flex", gap: 12, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            {isEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Are you sure you want to delete this goal?")) {
                    onDelete?.(goal.id);
                    onClose?.();
                  }
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: "12px",
                  border: "none",
                  background: "rgba(255, 118, 117, 0.15)",
                  color: "#ff7675",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                Delete
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "transparent",
                color: "var(--text)",
                fontWeight: "600",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Cancel
            </button>

            <button onClick={handleSave} className="btn-primary" style={{ flex: 2 }}>
              {isEdit ? "Update Goal" : "Create Goal"}
            </button>
          </div>
        </div>
      </div>
    );
  }
  window.GoalFormModal = GoalFormModal;

  function GoalsTab({ goals, setGoals, tasks, activities, onViewTask, notify, setTasks }) {
    const safeGoals = Array.isArray(goals) ? goals : [];
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const safeActivities = Array.isArray(activities) ? activities : [];
    const safeNotify = typeof notify === "function" ? notify : () => {};

    const setGoalsSafe = typeof setGoals === "function" ? setGoals : () => {};
    const setTasksSafe = typeof setTasks === "function" ? setTasks : () => {};

    const [showGoalModal, setShowGoalModal] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const [viewMode, setViewMode] = useState("active"); // 'active' | 'completed'

    const handleManualProgress = useCallback(
      (goalId, newProgress) => {
        const p = Math.max(0, Math.min(100, parseInt(newProgress || "0", 10) || 0));
        const update = { manualProgress: p, completedDate: p === 100 ? new Date().toISOString() : null };
        setGoalsSafe((prev) => (Array.isArray(prev) ? prev : safeGoals).map((g) => (g.id === goalId ? { ...g, ...update } : g)));
        if (p === 100) safeNotify("Goal Progress Achieved!", "🏆");
      },
      [setGoalsSafe, safeNotify, safeGoals]
    );

    const handleNumericProgress = useCallback(
      (goalId, newVal, targetVal) => {
        const val = parseFloat(newVal);
        const t = parseFloat(targetVal);
        const safeVal = Number.isFinite(val) ? val : 0;
        const update = { currentValue: safeVal, completedDate: safeVal >= t ? new Date().toISOString() : null };
        setGoalsSafe((prev) => (Array.isArray(prev) ? prev : safeGoals).map((g) => (g.id === goalId ? { ...g, ...update } : g)));
        if (safeVal >= t) safeNotify("Target Reached!", "🏆");
      },
      [setGoalsSafe, safeNotify, safeGoals]
    );

    const goalStats = useMemo(() => {
      const stats = {};

      safeGoals.forEach((goal) => {
        const linkedTasks = safeTasks.filter((t) => t.goalId === goal.id);

        let currentProgress = 0;
        let progressPercent = 0;
        let isCompleted = !!goal.completedDate;

        if (goal.targetType === "completion") {
          currentProgress = linkedTasks.filter((t) => t.completed).length;
          progressPercent = Math.min(100, (currentProgress / (goal.targetValue || 1)) * 100);
          isCompleted = isCompleted || currentProgress >= (goal.targetValue || 1);
        } else if (goal.targetType === "time") {
          const totalTaskTime = linkedTasks.reduce((acc, t) => acc + (t.actualTime || 0), 0);
          currentProgress = Math.round(totalTaskTime / 60);
          progressPercent = Math.min(100, (currentProgress / (goal.targetValue || 1)) * 100);
          isCompleted = isCompleted || currentProgress >= (goal.targetValue || 1);
        } else if (goal.targetType === "manual") {
          const progress = goal.manualProgress || 0;
          currentProgress = progress;
          progressPercent = progress;
          isCompleted = isCompleted || progress === 100;
        } else if (goal.targetType === "numeric") {
          currentProgress = goal.currentValue || 0;
          progressPercent = Math.min(100, (currentProgress / (goal.targetValue || 1)) * 100);
          isCompleted = isCompleted || currentProgress >= (goal.targetValue || 1);
        }

        // Days left / overdue
        let daysLeft = null;
        let isOverdue = false;
        if (goal.dueDate && !isCompleted) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const due = new Date(goal.dueDate);
          due.setHours(0, 0, 0, 0);
          const diffTime = due - today;
          daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (daysLeft < 0) isOverdue = true;
        }

        stats[goal.id] = { currentProgress, progressPercent, linkedTasks, isCompleted, daysLeft, isOverdue };
      });

      return stats;
    }, [safeGoals, safeTasks, safeActivities]);

    const filteredGoals = useMemo(() => {
      return safeGoals.filter((g) => (viewMode === "active" ? !goalStats[g.id]?.isCompleted : !!goalStats[g.id]?.isCompleted));
    }, [safeGoals, viewMode, goalStats]);

    const activeCount = useMemo(() => safeGoals.filter((g) => !goalStats[g.id]?.isCompleted).length, [safeGoals, goalStats]);
    const completedCount = useMemo(() => safeGoals.filter((g) => !!goalStats[g.id]?.isCompleted).length, [safeGoals, goalStats]);

    const handleSaveGoal = (data) => {
      if (!data) return;

      if (editingGoal) {
        setGoalsSafe((prev) => (Array.isArray(prev) ? prev : safeGoals).map((g) => (g.id === data.id ? { ...g, ...data } : g)));
        safeNotify("Goal Updated", "💾");
      } else {
        const id = window.generateId ? window.generateId("g") : "g_" + Date.now();
        setGoalsSafe((prev) => [{ ...data, id, createdAt: new Date().toISOString(), completedDate: null }, ...(Array.isArray(prev) ? prev : safeGoals)]);
        safeNotify("Goal Created", "🎯");
      }
      setShowGoalModal(false);
      setEditingGoal(null);
    };

    const handleDeleteGoal = (id) => {
      if (!id) return;
      setGoalsSafe((prev) => (Array.isArray(prev) ? prev : safeGoals).filter((g) => g.id !== id));
      setTasksSafe((prevTasks) => (Array.isArray(prevTasks) ? prevTasks : safeTasks).map((t) => (t.goalId === id ? { ...t, goalId: null } : t)));
      safeNotify("Goal Deleted", "🗑");
    };

    const handleEditGoal = (goal) => {
      setEditingGoal(goal);
      setShowGoalModal(true);
    };

    const formatGoalProgress = (goalId) => {
      const goal = safeGoals.find((g) => g.id === goalId);
      const stats = goalStats[goalId];
      if (!goal || !stats) return "0 / 0";

      if (goal.targetType === "manual") return stats.isCompleted ? "Achieved" : `Progress: ${Math.round(stats.progressPercent)}%`;
      if (goal.targetType === "numeric") {
        const unit = goal.unit || "";
        return `${stats.currentProgress}${unit} / ${goal.targetValue}${unit}`;
      }
      const unit = goal.targetType === "completion" ? "tasks" : "minutes";
      return `${stats.currentProgress} / ${goal.targetValue} ${unit}`;
    };

    const getGoalIcon = (goalId) => {
      const stats = goalStats[goalId];
      if (!stats) return "🎯";
      if (stats.isCompleted) return "🏆";
      if (stats.isOverdue) return "⚠️";
      if (stats.progressPercent > 75) return "🔥";
      return "⏳";
    };

    const renderDateBadge = (stats, goal) => {
      if (stats.isCompleted && goal.completedDate) {
        return <span style={{ fontSize: 10, color: "var(--success)", fontWeight: "bold" }}>Done {new Date(goal.completedDate).toLocaleDateString()}</span>;
      }
      if (!goal.dueDate) return null;
      if (stats.isOverdue) return <span style={{ fontSize: 10, color: "var(--danger)", fontWeight: "bold" }}>Overdue by {Math.abs(stats.daysLeft)} days</span>;
      if (stats.daysLeft === 0) return <span style={{ fontSize: 10, color: "orange", fontWeight: "bold" }}>Due Today</span>;
      return <span style={{ fontSize: 10, color: "var(--text-light)" }}>{stats.daysLeft} days left</span>;
    };

    // Sleek segmented toggle (no default browser buttons)
    const SegToggle = (
      <div style={{ display: "flex", justifyContent: "center", margin: "8px 0 12px" }}>
        <div
          style={{
            display: "inline-flex",
            gap: 6,
            padding: 6,
            borderRadius: 999,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 12px 28px rgba(0,0,0,0.26)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode("active")}
            style={{
              border: "none",
              cursor: "pointer",
              padding: "8px 12px",
              borderRadius: 999,
              fontWeight: 900,
              fontSize: 13,
              color: viewMode === "active" ? "#fff" : "rgba(255,255,255,0.70)",
              background: viewMode === "active" ? "rgba(255,107,53,0.22)" : "transparent",
            }}
          >
            Active ({activeCount})
          </button>

          <button
            type="button"
            onClick={() => setViewMode("completed")}
            style={{
              border: "none",
              cursor: "pointer",
              padding: "8px 12px",
              borderRadius: 999,
              fontWeight: 900,
              fontSize: 13,
              color: viewMode === "completed" ? "#fff" : "rgba(255,255,255,0.70)",
              background: viewMode === "completed" ? "rgba(255,107,53,0.22)" : "transparent",
            }}
          >
            Completed ({completedCount})
          </button>
        </div>
      </div>
    );

    return (
      <div style={{ paddingBottom: 20 }}>
        {SegToggle}

        {/* Header row: left = New Goal, right = optional small meta */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
          <button
            onClick={() => setShowGoalModal(true)}
            style={{
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              padding: "8px 16px",
              borderRadius: 20,
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New Goal
          </button>
        </div>

        {filteredGoals.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">🎯</span>
            <div className="empty-state-text">No Goals Found</div>
            <div className="empty-state-subtext">Start by creating a new goal to track your big projects.</div>
          </div>
        ) : (
          filteredGoals.map((g) => {
            const stats = goalStats[g.id] || { progressPercent: 0, linkedTasks: [], isCompleted: false, isOverdue: false };
            const icon = getGoalIcon(g.id);

            return (
              <div key={g.id} className="goal-card" style={{ borderLeft: stats.isOverdue ? "4px solid var(--danger)" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => handleEditGoal(g)}>
                    <span>{icon}</span> {g.title}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: "var(--text-light)", marginBottom: 10 }}>{g.description}</div>

                {(g.targetType === "completion" || g.targetType === "time") && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 600, color: stats.isCompleted ? "var(--success)" : "var(--text)" }}>{formatGoalProgress(g.id)}</div>
                    <div className="goal-progress-bar">
                      <div
                        className="goal-progress-fill"
                        style={{
                          width: `${stats.progressPercent}%`,
                          background: stats.isCompleted ? "var(--success)" : "linear-gradient(90deg, #6c5ce7, #a29bfe)",
                        }}
                      />
                    </div>
                  </>
                )}

                {g.targetType === "manual" && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 600, color: stats.isCompleted ? "var(--success)" : "var(--text)" }}>{formatGoalProgress(g.id)}</div>
                    <input type="range" min="0" max="100" value={stats.progressPercent} onChange={(e) => handleManualProgress(g.id, e.target.value)} style={{ marginBottom: 0, width: "100%" }} />
                    <div className="goal-progress-bar">
                      <div
                        className="goal-progress-fill"
                        style={{
                          width: `${stats.progressPercent}%`,
                          background: stats.isCompleted ? "var(--success)" : "linear-gradient(90deg, #a29bfe, #6c5ce7)",
                        }}
                      />
                    </div>
                  </>
                )}

                {g.targetType === "numeric" && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 600, color: stats.isCompleted ? "var(--success)" : "var(--text)" }}>{formatGoalProgress(g.id)}</div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "8px 0" }}>
                      <input
                        type="number"
                        className="f-input"
                        style={{ padding: "4px 8px", fontSize: 14 }}
                        value={g.currentValue || 0}
                        onChange={(e) => handleNumericProgress(g.id, e.target.value, g.targetValue)}
                        placeholder="Current"
                      />
                      <span style={{ fontSize: 12, color: "var(--text-light)" }}>
                        of {g.targetValue} {g.unit}
                      </span>
                    </div>

                    <div className="goal-progress-bar">
                      <div
                        className="goal-progress-fill"
                        style={{
                          width: `${stats.progressPercent}%`,
                          background: stats.isCompleted ? "var(--success)" : "linear-gradient(90deg, #00b894, #55efc4)",
                        }}
                      />
                    </div>
                  </>
                )}

                <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "var(--text-light)" }}>
                    {g.targetType === "completion" || g.targetType === "time"
                      ? `${stats.linkedTasks.length} linked tasks`
                      : g.targetType === "numeric"
                      ? "Numeric Target"
                      : "Manual Progress Goal"}
                  </span>
                  {renderDateBadge(stats, g)}
                </div>
              </div>
            );
          })
        )}

        {showGoalModal && (
          <GoalFormModal
            goal={editingGoal}
            onClose={() => {
              setShowGoalModal(false);
              setEditingGoal(null);
            }}
            onSave={handleSaveGoal}
            onDelete={handleDeleteGoal}
            notify={safeNotify}
          />
        )}
      </div>
    );
  }

  window.GoalsTab = GoalsTab;
  console.log("✅ 13-06-goals.jsx loaded (fixed toggle styling + vars)");
})();

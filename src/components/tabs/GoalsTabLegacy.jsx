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

import React, { useState, useMemo, useCallback } from "react";

function GoalFormModal({ goal, onClose, onSave, onDelete, notify, onAiGenerate, settings, categories, aiLoading }) {
  const isEdit = !!goal;
  const safeNotify = typeof notify === "function" ? notify : () => {};
  const safeSettings = settings || {};
  const safeCategories = Array.isArray(categories) ? categories : ["Work", "Personal", "Health", "Learning", "Finance", "Home Project"];

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

  const handleAiClick = async (e) => {
    e.stopPropagation();
    if (!safeSettings?.geminiApiKey) {
      safeNotify("Please add your Gemini API key in Settings", "⚠️");
      return;
    }
    if (!data.title) {
      safeNotify("Please enter a goal title first", "⚠️");
      return;
    }

    // Step 1: Fill out the form fields first
    let updatedData = { ...data };
    try {
      const formPrompt = `Analyze this goal title: "${data.title}"

Based on the goal, suggest:
1. A brief description (1-2 sentences explaining why this goal is important)
2. A realistic target date (YYYY-MM-DD format, should be in the future)
3. The best target type: "completion" (for task-based goals), "time" (for time-based goals like "spend 100 hours"), "numeric" (for measurable goals like money, weight), or "manual" (for goals that need manual tracking)
4. If target type is "completion" or "time", suggest a reasonable target value (number)
5. If target type is "numeric", suggest a unit label (like "$", "lbs", "days") and target value

Return ONLY a JSON object with these exact fields:
{
  "description": "string",
  "dueDate": "YYYY-MM-DD",
  "targetType": "completion|time|numeric|manual",
  "targetValue": number,
  "unit": "string (only if targetType is numeric)"
}`;

      const formResponse = await window.callGemini?.(formPrompt, safeSettings.geminiApiKey);
      
      if (formResponse?.text) {
        const jsonMatch = formResponse.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const formData = JSON.parse(jsonMatch[0]);
          
          // Update form with AI suggestions (only fill empty fields or improve defaults)
          const updates = {};
          if (formData.description && !data.description) {
            updates.description = formData.description;
            updatedData.description = formData.description;
          }
          if (formData.dueDate && !data.dueDate) {
            updates.dueDate = formData.dueDate;
            updatedData.dueDate = formData.dueDate;
          }
          if (formData.targetType && (!data.targetType || data.targetType === "completion")) {
            updates.targetType = formData.targetType;
            updatedData.targetType = formData.targetType;
          }
          if (formData.targetValue && (!data.targetValue || data.targetValue === 1)) {
            updates.targetValue = formData.targetValue;
            updatedData.targetValue = formData.targetValue;
          }
          if (formData.unit && formData.targetType === "numeric" && !data.unit) {
            updates.unit = formData.unit;
            updatedData.unit = formData.unit;
          }
          
          if (Object.keys(updates).length > 0) {
            setData(prev => ({ ...prev, ...updates }));
            safeNotify("Form filled by AI!", "✨");
            
            // Wait a moment for user to see the updates
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
    } catch (error) {
      console.error("AI form fill error:", error);
      // Continue to task generation even if form fill fails
    }

    // Step 2: Generate tasks based on the (now filled) form data
    const goalForAi = {
      ...updatedData,
      id: goal?.id || "temp",
      createdAt: goal?.createdAt || new Date().toISOString(),
      completedDate: goal?.completedDate || null,
    };
    
    // Generate tasks
    onAiGenerate?.(goalForAi);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: "flex-start", paddingTop: "20px" }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, borderRadius: 16, padding: 14, maxHeight: "calc(100vh - 40px)", overflowY: "auto", marginTop: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2 style={{ fontFamily: "Fredoka", margin: 0, fontSize: 18 }}>{isEdit ? "Edit Goal" : "New Goal"}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* AI Robot Head Button */}
            <button
              onClick={handleAiClick}
              disabled={aiLoading}
              title={aiLoading ? "Generating tasks..." : "Generate tasks with AI"}
              style={{
                background: "transparent",
                border: "none",
                cursor: aiLoading ? "not-allowed" : "pointer",
                padding: "4px 8px",
                borderRadius: 6,
                fontSize: 20,
                lineHeight: 1,
                opacity: aiLoading ? 0.6 : 1,
                transition: "transform 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (!aiLoading) {
                  e.target.style.transform = "scale(1.15)";
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "scale(1)";
              }}
            >
              <span style={{ 
                display: "inline-block", 
                animation: aiLoading ? "spin 1s linear infinite" : "none",
                transform: aiLoading ? "rotate(0deg)" : "none"
              }}>
                🤖
              </span>
            </button>
            <span onClick={onClose} style={{ fontSize: 24, cursor: "pointer", opacity: 0.6 }} aria-label="Close">
              ×
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label className="f-label" style={{ marginBottom: 4, fontSize: 11 }}>Goal Title *</label>
          <input className="f-input" value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} placeholder="e.g. Save for Vacation" autoFocus style={{ padding: "8px 10px", fontSize: 14 }} />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label className="f-label" style={{ marginBottom: 4, fontSize: 11 }}>Description</label>
          <textarea className="f-textarea" value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} placeholder="Why is this goal important?" style={{ padding: "8px 10px", fontSize: 14, minHeight: 45, resize: "vertical" }} />
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <label className="f-label" style={{ marginBottom: 4, fontSize: 11 }}>Target Date</label>
            <input type="date" className="f-input" value={data.dueDate} onChange={(e) => setData({ ...data, dueDate: e.target.value })} style={{ colorScheme: "dark", padding: "8px 10px", fontSize: 14 }} />
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label className="f-label" style={{ marginBottom: 4, fontSize: 11 }}>Goal Target Type</label>
          <select className="f-select" value={data.targetType} onChange={(e) => setData({ ...data, targetType: e.target.value })} style={{ padding: "8px 10px", fontSize: 14 }}>
            <option value="completion">Task Completions (e.g., 5 tasks)</option>
            <option value="time">Time Logged (e.g., 600 minutes)</option>
            <option value="numeric">Numeric Target (Money, Weight, etc.)</option>
            <option value="manual">Manual Progress Tracking (%)</option>
          </select>
        </div>

        {data.targetType === "numeric" && (
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <label className="f-label" style={{ marginBottom: 4, fontSize: 11 }}>Unit Label</label>
              <input className="f-input" value={data.unit} onChange={(e) => setData({ ...data, unit: e.target.value })} placeholder="$, lbs, days" style={{ padding: "8px 10px", fontSize: 14 }} />
            </div>
            <div style={{ flex: 2 }}>
              <label className="f-label" style={{ marginBottom: 4, fontSize: 11 }}>Target Value *</label>
              <input type="number" className="f-input" value={data.targetValue} onChange={(e) => setData({ ...data, targetValue: parseFloat(e.target.value) || 0 })} style={{ padding: "8px 10px", fontSize: 14 }} />
            </div>
          </div>
        )}

        {(data.targetType === "completion" || data.targetType === "time") && (
          <div style={{ marginBottom: 8 }}>
            <label className="f-label" style={{ marginBottom: 4, fontSize: 11 }}>Target Value ({data.targetType === "completion" ? "Tasks" : "Minutes"}) *</label>
            <input type="number" className="f-input" value={data.targetValue} onChange={(e) => setData({ ...data, targetValue: parseInt(e.target.value || "1", 10) || 1 })} min="1" style={{ padding: "8px 10px", fontSize: 14 }} />
          </div>
        )}

        {data.targetType === "manual" && (
          <div style={{ marginBottom: 8 }}>
            <label className="f-label" style={{ marginBottom: 4, fontSize: 11 }}>Initial Progress: {data.manualProgress || 0}%</label>
            <input type="range" min="0" max="100" value={data.manualProgress || 0} onChange={(e) => setData({ ...data, manualProgress: parseInt(e.target.value || "0", 10) || 0 })} style={{ marginBottom: 3, width: "100%" }} />
            <div style={{ textAlign: "center", fontWeight: 700, color: "var(--primary)", fontSize: 12 }}>{data.manualProgress || 0}%</div>
          </div>
        )}

        {/* MODAL ACTION BUTTONS */}
        <div style={{ marginTop: 12, display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)", flexWrap: "wrap" }}>
          {/* Delete button - only for existing goals */}
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
                padding: "8px 12px",
                borderRadius: "8px",
                border: "none",
                background: "rgba(255, 118, 117, 0.15)",
                color: "#ff7675",
                fontWeight: "600",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Delete
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent",
              color: "var(--text)",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: 12,
              minWidth: 70,
            }}
          >
            Cancel
          </button>

          <button onClick={handleSave} className="btn-primary" style={{ flex: 2, padding: "8px 12px", fontSize: 12, minWidth: 100 }}>
            {isEdit ? "Update Goal" : "Create Goal"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GoalsTabLegacy({ goals, setGoals, tasks, activities, onViewTask, notify, setTasks, settings, categories }) {
  const safeGoals = Array.isArray(goals) ? goals : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeActivities = Array.isArray(activities) ? activities : [];
  const safeNotify = typeof notify === "function" ? notify : () => {};
  const safeSettings = settings || {};
  const safeCategories = Array.isArray(categories) ? categories : ["Work", "Personal", "Health", "Learning", "Finance", "Home Project"];

  const setGoalsSafe = typeof setGoals === "function" ? setGoals : () => {};
  const setTasksSafe = typeof setTasks === "function" ? setTasks : () => {};

  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [viewingGoal, setViewingGoal] = useState(null);
  const [viewMode, setViewMode] = useState("active"); // 'active' | 'completed'
  const [aiLoading, setAiLoading] = useState({});

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

  const handleViewGoal = (goal) => {
    setViewingGoal(goal);
  };

  const handleEditGoal = (goal) => {
    setViewingGoal(null);
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

  const handleAiGenerateTasks = useCallback(async (goal) => {
    if (!safeSettings?.geminiApiKey) {
      safeNotify("Please add your Gemini API key in Settings", "⚠️");
      return;
    }

    // If goal doesn't have a real ID yet (being created), save it first
    let goalId = goal.id;
    if (!goalId || goalId === "temp") {
      // Check if goal already exists with this title (avoid duplicates)
      const existingGoal = safeGoals.find(g => g.title === goal.title && g.id !== "temp");
      if (existingGoal) {
        goalId = existingGoal.id;
      } else {
        // Create a new goal to get an ID
        const tempId = window.generateId ? window.generateId("g") : "g_" + Date.now();
        const newGoal = {
          ...goal,
          id: tempId,
          createdAt: new Date().toISOString(),
          completedDate: null,
        };
        setGoalsSafe((prev) => [newGoal, ...(Array.isArray(prev) ? prev : safeGoals)]);
        goalId = tempId;
        safeNotify("Goal saved, generating tasks...", "💾");
      }
    }

    setAiLoading((prev) => ({ ...prev, [goalId]: true }));

    try {
      const today = new Date();
      const goalDueDate = goal.dueDate ? new Date(goal.dueDate) : null;
      const daysUntilDue = goalDueDate ? Math.ceil((goalDueDate - today) / (1000 * 60 * 60 * 24)) : 30;
      
      // Calculate how many tasks to generate based on target value
      const numTasks = goal.targetType === "completion" 
        ? Math.max(3, Math.min(goal.targetValue || 5, 10))
        : 5;

      const prompt = `Generate ${numTasks} actionable tasks with subtasks to help achieve this goal:

Goal Title: "${goal.title}"
Goal Description: "${goal.description || 'No description provided'}"
Target Type: ${goal.targetType}
Target Value: ${goal.targetValue || 1}
Due Date: ${goal.dueDate || 'No specific due date'}

For each task, provide:
- title: A clear, actionable task title
- description: A brief 1-2 sentence description
- category: One of these categories: ${safeCategories.join(", ")}
- priority: One of: Low, Medium, High, Urgent
- estimatedTime: Estimated minutes (10-120)
- startDate: A realistic start date (YYYY-MM-DD format, should be soon)
- dueDate: A realistic due date (YYYY-MM-DD format, should be before or on the goal due date if provided)
- weight: A number between 1-20 indicating importance
- subtasks: An array of 2-4 subtask strings that break down the task into smaller actionable steps

Return ONLY a valid JSON array of task objects. Each task object should have these exact fields: title, description, category, priority, estimatedTime, startDate, dueDate, weight, subtasks.

Example format:
[
  {
    "title": "Research vacation destinations",
    "description": "Look into 3-5 potential vacation spots that match budget and preferences",
    "category": "Personal",
    "priority": "Medium",
    "estimatedTime": 45,
    "startDate": "2025-01-15",
    "dueDate": "2025-01-20",
    "weight": 12,
    "subtasks": ["Research top 5 destinations online", "Compare prices and availability", "Check visa requirements", "Read reviews and ratings"]
  }
]`;

      const response = await window.callGemini?.(prompt, safeSettings.geminiApiKey);
      
      if (!response?.text) {
        throw new Error("No response from AI");
      }

      // Extract JSON from response
      const jsonMatch = response.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Could not parse AI response");
      }

      const aiTasks = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(aiTasks) || aiTasks.length === 0) {
        throw new Error("Invalid task format");
      }

      // Create tasks with proper structure including subtasks
      const newTasks = aiTasks.map((task) => {
        const taskId = window.generateId ? window.generateId("t") : "t_" + Date.now() + "_" + Math.random();
        
        // Convert subtasks array to proper format
        const subtasks = Array.isArray(task.subtasks) 
          ? task.subtasks.map((subtitle) => ({
              title: String(subtitle || "").trim(),
              completed: false,
            })).filter((st) => st.title) // Remove empty subtasks
          : [];
        
        return {
          id: taskId,
          title: String(task.title || "Untitled Task").trim(),
          description: String(task.description || "").trim(),
          category: safeCategories.includes(task.category) ? task.category : safeCategories[0],
          priority: ["Low", "Medium", "High", "Urgent"].includes(task.priority) ? task.priority : "Medium",
          estimatedTime: parseInt(task.estimatedTime) || 30,
          estimatedTimeUnit: "min",
          startDate: task.startDate || "",
          startTime: "",
          dueDate: task.dueDate || "",
          dueTime: "",
          weight: Math.max(1, Math.min(20, parseInt(task.weight) || 10)),
          completed: false,
          goalId: goalId,
          createdAt: new Date().toISOString(),
          subtasks: subtasks,
          tags: [],
          people: [],
          blockedBy: [],
          excludeFromTumbler: false,
          recurring: "None",
        };
      });

      // Add all tasks at once
      setTasksSafe((prev) => [...(Array.isArray(prev) ? prev : safeTasks), ...newTasks]);
      safeNotify(`Generated ${newTasks.length} tasks for "${goal.title}"!`, "✨");
    } catch (error) {
      console.error("AI task generation error:", error);
      safeNotify("Failed to generate tasks. Please try again.", "❌");
    } finally {
      setAiLoading((prev) => ({ ...prev, [goalId]: false }));
    }
  }, [safeSettings, safeCategories, safeNotify, setTasksSafe, safeTasks]);

  // Improved segmented toggle with better styling and smooth transitions
  const SegToggle = (
    <div style={{ display: "flex", justifyContent: "flex-end", flex: 1 }}>
      <div
        style={{
          display: "inline-flex",
          gap: 0,
          padding: 4,
          borderRadius: 12,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Animated background indicator */}
        <div
          style={{
            position: "absolute",
            top: 4,
            left: viewMode === "active" ? 4 : "50%",
            width: "calc(50% - 4px)",
            height: "calc(100% - 8px)",
            background: "linear-gradient(135deg, rgba(255,107,53,0.3), rgba(255,142,83,0.25))",
            borderRadius: 8,
            transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: "0 2px 8px rgba(255,107,53,0.2)",
            zIndex: 0,
          }}
        />
        
        <button
          type="button"
          onClick={() => setViewMode("active")}
          style={{
            border: "none",
            cursor: "pointer",
            padding: "10px 20px",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            color: viewMode === "active" ? "#fff" : "rgba(255,255,255,0.6)",
            background: "transparent",
            position: "relative",
            zIndex: 1,
            transition: "color 0.2s ease",
            minWidth: 100,
            textAlign: "center",
          }}
          onMouseEnter={(e) => {
            if (viewMode !== "active") {
              e.target.style.color = "rgba(255,255,255,0.85)";
            }
          }}
          onMouseLeave={(e) => {
            if (viewMode !== "active") {
              e.target.style.color = "rgba(255,255,255,0.6)";
            }
          }}
        >
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <span>Active</span>
            <span style={{ 
              fontSize: 11, 
              opacity: 0.8,
              background: viewMode === "active" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
              padding: "2px 6px",
              borderRadius: 10,
              fontWeight: 600,
            }}>
              {activeCount}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode("completed")}
          style={{
            border: "none",
            cursor: "pointer",
            padding: "10px 20px",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            color: viewMode === "completed" ? "#fff" : "rgba(255,255,255,0.6)",
            background: "transparent",
            position: "relative",
            zIndex: 1,
            transition: "color 0.2s ease",
            minWidth: 100,
            textAlign: "center",
          }}
          onMouseEnter={(e) => {
            if (viewMode !== "completed") {
              e.target.style.color = "rgba(255,255,255,0.85)";
            }
          }}
          onMouseLeave={(e) => {
            if (viewMode !== "completed") {
              e.target.style.color = "rgba(255,255,255,0.6)";
            }
          }}
        >
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <span>Completed</span>
            <span style={{ 
              fontSize: 11, 
              opacity: 0.8,
              background: viewMode === "completed" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
              padding: "2px 6px",
              borderRadius: 10,
              fontWeight: 600,
            }}>
              {completedCount}
            </span>
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ paddingBottom: 20 }}>
      {/* Header with New Goal button and toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12 }}>
        <button
          onClick={() => setShowGoalModal(true)}
          style={{
            background: "var(--primary)",
            color: "#fff",
            border: "none",
            padding: "8px 16px",
            borderRadius: 12,
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 14,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New Goal
        </button>
        {SegToggle}
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
                <div style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flex: 1 }} onClick={() => handleViewGoal(g)}>
                  <span>{icon}</span> {g.title}
                </div>
                {!stats.isCompleted && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAiGenerateTasks(g);
                    }}
                    disabled={aiLoading[g.id]}
                    title={aiLoading[g.id] ? "Generating tasks..." : "Generate tasks with AI"}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: aiLoading[g.id] ? "not-allowed" : "pointer",
                      padding: "4px 8px",
                      borderRadius: 6,
                      fontSize: 18,
                      lineHeight: 1,
                      opacity: aiLoading[g.id] ? 0.6 : 1,
                      transition: "transform 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!aiLoading[g.id]) {
                        e.target.style.transform = "scale(1.15)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = "scale(1)";
                    }}
                  >
                    <span style={{ 
                      display: "inline-block", 
                      animation: aiLoading[g.id] ? "spin 1s linear infinite" : "none",
                      transform: aiLoading[g.id] ? "rotate(0deg)" : "none"
                    }}>
                      🤖
                    </span>
                  </button>
                )}
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
          onAiGenerate={handleAiGenerateTasks}
          settings={safeSettings}
          categories={safeCategories}
          aiLoading={editingGoal ? aiLoading[editingGoal.id] : false}
        />
      )}

      {viewingGoal && (
        <GoalViewModal
          goal={viewingGoal}
          stats={goalStats[viewingGoal.id]}
          linkedTasks={goalStats[viewingGoal.id]?.linkedTasks || []}
          onClose={() => setViewingGoal(null)}
          onEdit={() => {
            setViewingGoal(null);
            handleEditGoal(viewingGoal);
          }}
          onViewTask={onViewTask}
          formatProgress={formatGoalProgress}
        />
      )}
    </div>
  );
}

// Goal View Modal Component
function GoalViewModal({ goal, stats, linkedTasks, onClose, onEdit, onViewTask, formatProgress }) {
  if (!goal) return null;

  const progressPercent = stats?.progressPercent || 0;
  const isCompleted = stats?.isCompleted || false;
  const isOverdue = stats?.isOverdue || false;
  const daysLeft = stats?.daysLeft;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: "flex-start", paddingTop: "20px" }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600, borderRadius: 16, padding: 20, maxHeight: "calc(100vh - 40px)", overflowY: "auto", marginTop: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontFamily: "Fredoka", margin: 0, fontSize: 22, display: "flex", alignItems: "center", gap: 8 }}>
            <span>{isCompleted ? "🏆" : isOverdue ? "⚠️" : progressPercent > 75 ? "🔥" : "🎯"}</span>
            {goal.title}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={onEdit}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)",
                color: "var(--text)",
                fontWeight: "600",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Edit
            </button>
            <span onClick={onClose} style={{ fontSize: 24, cursor: "pointer", opacity: 0.6 }} aria-label="Close">
              ×
            </span>
          </div>
        </div>

        {goal.description && (
          <div style={{ marginBottom: 16, padding: 12, background: "rgba(255,255,255,0.05)", borderRadius: 8 }}>
            <div style={{ fontSize: 13, color: "var(--text-light)", lineHeight: 1.6 }}>{goal.description}</div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
          <div style={{ padding: 12, background: "rgba(255,255,255,0.05)", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 4 }}>Target Type</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {goal.targetType === "completion" ? "Task Completions" :
               goal.targetType === "time" ? "Time Logged" :
               goal.targetType === "numeric" ? "Numeric Target" :
               "Manual Progress"}
            </div>
          </div>

          <div style={{ padding: 12, background: "rgba(255,255,255,0.05)", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 4 }}>Target Value</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {goal.targetType === "numeric" 
                ? `${goal.targetValue || 0} ${goal.unit || ""}`
                : `${goal.targetValue || 0} ${goal.targetType === "completion" ? "tasks" : "minutes"}`}
            </div>
          </div>

          {goal.dueDate && (
            <div style={{ padding: 12, background: "rgba(255,255,255,0.05)", borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 4 }}>Target Date</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {new Date(goal.dueDate).toLocaleDateString()}
              </div>
              {daysLeft !== null && (
                <div style={{ fontSize: 10, color: isOverdue ? "var(--danger)" : daysLeft === 0 ? "orange" : "var(--text-light)", marginTop: 2 }}>
                  {isOverdue ? `Overdue by ${Math.abs(daysLeft)} days` : daysLeft === 0 ? "Due Today" : `${daysLeft} days left`}
                </div>
              )}
            </div>
          )}

          <div style={{ padding: 12, background: "rgba(255,255,255,0.05)", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: "var(--text-light)", marginBottom: 4 }}>Progress</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: isCompleted ? "var(--success)" : "var(--text)" }}>
              {formatProgress(goal.id)}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {(goal.targetType === "completion" || goal.targetType === "time" || goal.targetType === "manual" || goal.targetType === "numeric") && (
          <div style={{ marginBottom: 20 }}>
            <div className="goal-progress-bar" style={{ marginBottom: 8 }}>
              <div
                className="goal-progress-fill"
                style={{
                  width: `${progressPercent}%`,
                  background: isCompleted 
                    ? "var(--success)" 
                    : goal.targetType === "numeric"
                    ? "linear-gradient(90deg, #00b894, #55efc4)"
                    : goal.targetType === "manual"
                    ? "linear-gradient(90deg, #a29bfe, #6c5ce7)"
                    : "linear-gradient(90deg, #6c5ce7, #a29bfe)",
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: "var(--text-light)", textAlign: "center" }}>
              {Math.round(progressPercent)}% Complete
            </div>
          </div>
        )}

        {/* Linked Tasks */}
        {linkedTasks.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Linked Tasks ({linkedTasks.length})</span>
              <span style={{ fontSize: 12, color: "var(--text-light)", fontWeight: 400 }}>
                {linkedTasks.filter(t => t.completed).length} completed
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
              {linkedTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => {
                    onViewTask?.(task);
                    onClose();
                  }}
                  style={{
                    padding: "10px 12px",
                    background: task.completed ? "rgba(0,184,148,0.1)" : "rgba(255,255,255,0.05)",
                    borderRadius: 8,
                    cursor: "pointer",
                    border: task.completed ? "1px solid rgba(0,184,148,0.3)" : "1px solid rgba(255,255,255,0.1)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = task.completed ? "rgba(0,184,148,0.15)" : "rgba(255,255,255,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = task.completed ? "rgba(0,184,148,0.1)" : "rgba(255,255,255,0.05)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{task.completed ? "✅" : "⭕"}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, textDecoration: task.completed ? "line-through" : "none", opacity: task.completed ? 0.6 : 1 }}>
                        {task.title}
                      </div>
                      {task.description && (
                        <div style={{ fontSize: 11, color: "var(--text-light)", marginTop: 2 }}>
                          {task.description.substring(0, 60)}{task.description.length > 60 ? "..." : ""}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 10, color: "var(--text-light)" }}>
                        {task.category && <span>{task.category}</span>}
                        {task.priority && <span>• {task.priority}</span>}
                        {task.dueDate && <span>• Due {new Date(task.dueDate).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {linkedTasks.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: "var(--text-light)", fontSize: 13 }}>
            No tasks linked to this goal yet.
          </div>
        )}

        {/* Goal Metadata */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: 11, color: "var(--text-light)" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Created: {goal.createdAt ? new Date(goal.createdAt).toLocaleDateString() : "Unknown"}</span>
            {goal.completedDate && (
              <span style={{ color: "var(--success)" }}>Completed: {new Date(goal.completedDate).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Keep window assignment for backward compatibility
if (typeof window !== 'undefined') {
  window.GoalFormModal = GoalFormModal;
  window.GoalsTab = GoalsTabLegacy;
}


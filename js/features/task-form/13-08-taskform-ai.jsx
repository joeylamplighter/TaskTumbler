// js/components/13-08-taskform-ai.jsx
// ===========================================
// TaskFormModal AI Handlers
// Updated: 2025-12-18 09:55 PT
// ===========================================

(function () {
  const React = window.React;
  const { useCallback } = React;

  function useTaskFormAI({ data, setData, visibleCategories, settings, notify, setExpanded, setIsAiLoading }) {

    const callAI = useCallback(async (prompt, onSuccess) => {
      if (!settings?.geminiApiKey) return notify?.("Add API Key in Settings", "⚠️");
      if (!data?.title) return notify?.("Add a title first.", "⚠️");

      setIsAiLoading?.(true);
      try {
        const res = await window.callGemini(prompt, settings.geminiApiKey);
        if (res?.text) onSuccess(res.text);
        else notify?.("No response from AI.", "🤔");
      } catch {
        notify?.("AI failed.", "❌");
      } finally {
        setIsAiLoading?.(false);
      }
    }, [settings, data?.title, notify, setIsAiLoading]);

    const handleAutoTime = useCallback(() => {
      return callAI(`Estimate minutes for task: "${data.title}". Respond with number only.`, (t) => {
        const m = parseInt((t.match(/\d+/)?.[0] || "0"), 10);
        if (m > 0) {
          if (m >= 60) setData(p => ({ ...p, estimatedTime: Math.round((m / 60) * 10) / 10, estimatedTimeUnit: "hr" }));
          else setData(p => ({ ...p, estimatedTime: m, estimatedTimeUnit: "min" }));
          notify?.("Time estimated!", "🧠");
        }
      });
    }, [callAI, data?.title, notify, setData]);

    const handleAiSubtasks = useCallback(() => {
      return callAI(`Break down "${data.title}" into 3-5 concise actionable subtasks. Return JSON array of strings.`, (t) => {
        try {
          const m = t.match(/\[[\s\S]*\]/);
          if (!m) throw new Error("no array");
          const s = JSON.parse(m[0]);
          if (Array.isArray(s) && s.length) {
            const generateId = window.generateId || ((prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
            setData(p => ({ ...p, subtasks: [...(p.subtasks||[]), ...s.map(x => ({ id: generateId('st'), title: x, text: x, completed: false }))] }));
            notify?.(`Added ${s.length} steps.`, "🧠");
            setExpanded?.((p)=>({ ...p, details: true }));
          }
        } catch {
          notify?.("Could not parse steps.", "🤔");
        }
      });
    }, [callAI, data?.title, notify, setData, setExpanded]);

    const handleAiDesc = useCallback(() => {
      return callAI(`Write a 1 sentence description for task: "${data.title}".`, (t) => {
        setData(d => ({ ...d, description: t }));
        notify?.("Description written.", "✨");
        setExpanded?.((p)=>({ ...p, details: true }));
      });
    }, [callAI, data?.title, notify, setData, setExpanded]);

    const handleAiCat = useCallback(() => {
      const cats = (visibleCategories || []).join(",");
      return callAI(`Best category for "${data.title}" from: ${cats}. Return ONE word.`, (t) => {
        const best = (visibleCategories || []).find(c => t.includes(c));
        if (best) setData(d => ({ ...d, category: best }));
      });
    }, [callAI, data?.title, visibleCategories, setData]);

    const handleAiPriority = useCallback(() => {
      return callAI(`Priority for "${data.title}" (Low, Medium, High, Urgent)? Return ONE word.`, (t) => {
        const p = ["Low","Medium","High","Urgent"].find(x => t.includes(x));
        if (p) setData(d => ({ ...d, priority: p }));
      });
    }, [callAI, data?.title, setData]);

    const handleAiTags = useCallback(() => {
      return callAI(`Suggest 3 tags for "${data.title}". Return JSON string array.`, (t) => {
        try {
          const m = t.match(/\[[\s\S]*\]/);
          if (!m) return;
          const tags = JSON.parse(m[0]);
          if (!Array.isArray(tags)) return;
          setData(d => ({ ...d, tags: [...new Set([...(d.tags||[]), ...tags])] }));
        } catch {}
      });
    }, [callAI, data?.title, setData]);

    const handleMagicFill = useCallback(async () => {
      if (!settings?.geminiApiKey) return notify?.("Add API Key", "⚠️");
      if (!data?.title) return notify?.("Add Title", "⚠️");
      setIsAiLoading?.(true);
      try {
        const cats = (visibleCategories || []).join(",");
        const prompt = `Analyze task "${data.title}". Return JSON object with keys: "description", "category" (from: ${cats}), "priority" (Low, Medium, High, Urgent), "estimatedTime" (minutes number), "subtasks" (array of strings), "tags" (array of strings).`;
        const res = await window.callGemini(prompt, settings.geminiApiKey);
        const jsonMatch = res?.text?.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const aiData = JSON.parse(jsonMatch[0]);
          setData(p => ({
            ...p,
            description: p.description || aiData.description || "",
            category: ((visibleCategories || []).includes(aiData.category) ? aiData.category : p.category),
            priority: aiData.priority || p.priority,
            estimatedTime: aiData.estimatedTime || p.estimatedTime,
            estimatedTimeUnit: "min",
            subtasks: Array.isArray(aiData.subtasks) ? (() => {
              const generateId = window.generateId || ((prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
              return [...(p.subtasks||[]), ...aiData.subtasks.map(t => ({ id: generateId('st'), title: t, text: t, completed: false }))];
            })() : (p.subtasks||[]),
            tags: Array.isArray(aiData.tags) ? [...new Set([...(p.tags||[]), ...aiData.tags])] : (p.tags||[])
          }));
          setExpanded?.((p)=>({ ...p, details: true }));
          notify?.("Auto-filled!", "✨");
        }
      } catch {
        notify?.("AI Failed", "❌");
      } finally {
        setIsAiLoading?.(false);
      }
    }, [settings, data?.title, visibleCategories, notify, setData, setExpanded, setIsAiLoading]);

    return {
      handleAutoTime,
      handleAiSubtasks,
      handleAiDesc,
      handleAiCat,
      handleAiPriority,
      handleAiTags,
      handleMagicFill
    };
  }

  window.useTaskFormAI = useTaskFormAI;
})(); 

// src/utils/ai.js
// ===========================================
// 🔖 AI INTEGRATION (Gemini API)
// ===========================================

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Call Gemini API with retry logic
 * @param {string} prompt - The prompt to send
 * @param {string} apiKey - Gemini API key
 * @param {number} maxRetries - Maximum retry attempts (default 3)
 * @returns {Promise<{text: string} | {error: string}>}
 */
const callGemini = async (prompt, apiKey, maxRetries = 3) => {
    if (!apiKey) {
        return { error: "API key not configured" };
    }
    
    const url = `${GEMINI_API_URL}?key=${apiKey}`;
    
    try {
        for (let i = 0; i < maxRetries; i++) {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contents: [{ 
                        parts: [{ text: prompt }] 
                    }] 
                })
            });

            // Handle rate limiting with exponential backoff
            if (res.status === 429) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                continue;
            }

            const d = await res.json();
            
            if (d.error) {
                throw new Error(d.error.message);
            }
            
            const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
            return { text };
        }
        
        return { error: "Rate limited - try again later" };
    } catch (e) {
        return { error: e.message };
    }
};

/**
 * Extract JSON from mixed text response
 * Handles responses that include markdown code blocks
 * @param {string} text - Raw response text
 * @returns {string} Extracted JSON string
 */
const extractJSON = (text) => {
    if (!text) return text;
    
    // Try to find JSON array
    const arrayStart = text.indexOf('[');
    const arrayEnd = text.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
        return text.substring(arrayStart, arrayEnd + 1);
    }
    
    // Try to find JSON object
    const objStart = text.indexOf('{');
    const objEnd = text.lastIndexOf('}');
    if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
        return text.substring(objStart, objEnd + 1);
    }
    
    // Return as-is if no JSON found
    return text;
};

/**
 * Parse tasks from AI response
 * @param {string} text - AI response text
 * @param {string[]} categories - Valid category names
 * @returns {object[]} Array of task objects
 */
const parseAITasks = (text, categories = []) => {
    try {
        const jsonStr = extractJSON(text);
        const parsed = JSON.parse(jsonStr);
        
        if (!Array.isArray(parsed)) {
            return [];
        }
        
        return parsed.map(t => ({
            title: t.title || 'Untitled Task',
            category: categories.includes(t.category) ? t.category : (categories[0] || 'General'),
            priority: ['Urgent', 'High', 'Medium', 'Low'].includes(t.priority) ? t.priority : 'Medium',
            weight: 10,
            estimatedTime: parseInt(t.estimatedTime) || 0
        }));
    } catch (e) {
        console.error('AI parse error:', e);
        return [];
    }
};

/**
 * Generate brainstorming prompt
 * @param {string} context - Optional context from scratchpad
 * @returns {string} Formatted prompt
 */
const getBrainstormPrompt = (context = '') => {
    if (context) {
        return `Analyze these notes: "${context}". Append 5-10 related creative ideas, tasks, or brainstorming points to the end. Format as a simple bulleted list.`;
    }
    return "Generate 10 creative task ideas for productivity. Format as a bulleted list.";
};

/**
 * Generate task parsing prompt
 * @param {string} text - Raw text to parse
 * @param {string[]} categories - Valid categories
 * @returns {string} Formatted prompt
 */
const getTaskParsePrompt = (text, categories = []) => {
    return `Parse these tasks. Return ONLY a JSON array of objects with fields: title, category (one of: ${categories.join(', ')}), priority (Urgent/High/Medium/Low). Text: "${text}"`;
};

/**
 * Generate a robust set of demo data using Gemini
 */
async function generateRobustSamples(apiKey, notify) {
    if (!apiKey) {
        notify("Gemini API Key missing. Cannot generate robust samples.", "❌");
        return null;
    }

    const goalPrompt = `Generate 5 structured Goal objects for a productivity app user. For each goal, create 10 linked tasks, 10 related activities (focus sessions/completions), and 5 saved notes.
    
    The final output MUST be a single JSON object containing these keys: 'goals', 'tasks', 'activities', and 'savedNotes'.
    
    Goals should have fields: id (unique string), title, description, targetType ('completion' or 'time'), targetValue (number).
    
    Tasks should have fields: id, title, description, category (must be 'Work', 'Personal', 'Health', 'Learning', 'Finance', or 'Home Project'), priority ('Low'/'Medium'/'High'/'Urgent'), weight (1-20), estimatedTime (10-120 minutes), dueDate (YYYY-MM-DD), completed (boolean), goalId (must link to a generated Goal ID).
    
    Activities should have fields: id, title, duration (seconds), category, type ('focus', 'completion', 'creation'), createdAt (ISO string).
    
    SavedNotes should have fields: id, title, body (string, 1-2 paragraphs), date (ISO string).
    
    Ensure data is diverse and covers all fields. Generate realistic data.`;

    notify("🧠 Requesting robust demo data from Gemini...", "⏳");
    const res = await callGemini(goalPrompt, apiKey);

    if (res.text) {
        try {
            const data = JSON.parse(extractJSON(res.text));
            notify("Data successfully generated by Gemini.", "✅");
            return data;
        } catch (e) {
            console.error("AI JSON Parsing Error:", e);
            notify("AI generation failed to produce valid JSON.", "❌");
            return null;
        }
    } else if (res.error) {
        notify(res.error, "❌");
        return null;
    }
    return null;
}

// Expose globally for backward compatibility
if (typeof window !== 'undefined') {
    window.callGemini = callGemini;
    window.extractJSON = extractJSON;
    window.parseAITasks = parseAITasks;
    window.getBrainstormPrompt = getBrainstormPrompt;
    window.getTaskParsePrompt = getTaskParsePrompt;
    window.generateRobustSamples = generateRobustSamples;
}

export {
    callGemini,
    extractJSON,
    parseAITasks,
    getBrainstormPrompt,
    getTaskParsePrompt,
    generateRobustSamples
};


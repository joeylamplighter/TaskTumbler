// 13-05-ideas.jsx
// ===========================================
// IDEAS TAB (Scratchpad/AI Import)
// ===========================================

import React, { useState, useEffect } from 'react'

const CURRENT_NOTE_ID_KEY = 'tt_ideas_current_note_id';

function IdeasTab({ text, setText, onAddTasks, settings, notify, savedNotes, setSavedNotes }) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [noteTitle, setNoteTitle] = useState('');
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showLoadModal, setShowLoadModal] = useState(false);
    const [showOCRModal, setShowOCRModal] = useState(false);
    
    // Load currentNoteId from localStorage on mount
    const [currentNoteId, setCurrentNoteId] = useState(() => {
        try {
            return localStorage.getItem(CURRENT_NOTE_ID_KEY) || null;
        } catch {
            return null;
        }
    });

    const currentNote = savedNotes.find(n => n.id === currentNoteId);

    // Restore currentNoteId when component mounts - check if text matches saved note
    useEffect(() => {
        if (currentNoteId && currentNote) {
            // If we have a currentNoteId, check if text still matches
            if (text === currentNote.body) {
                // Text matches, keep the currentNoteId
                return;
            }
            // Text doesn't match, but don't clear it automatically - let user decide
            // The currentNoteId will be cleared when they save as new or start new
        } else if (!currentNoteId && savedNotes && savedNotes.length > 0 && text) {
            // No currentNoteId but we have text - try to find matching note
            const matchingNote = savedNotes.find(note => note.body === text);
            if (matchingNote) {
                setCurrentNoteId(matchingNote.id);
            }
        }
    }, [savedNotes]); // Run when savedNotes changes (including on mount)

    // Track text changes - if text changes and doesn't match current note, clear currentNoteId
    useEffect(() => {
        if (currentNoteId && currentNote) {
            if (text !== currentNote.body) {
                // Text has changed from saved note, clear currentNoteId
                setCurrentNoteId(null);
                try {
                    localStorage.removeItem(CURRENT_NOTE_ID_KEY);
                } catch {}
            }
        }
    }, [text, currentNoteId, currentNote]); // Track text changes and current note

    // Save currentNoteId to localStorage whenever it changes
    useEffect(() => {
        try {
            if (currentNoteId) {
                localStorage.setItem(CURRENT_NOTE_ID_KEY, currentNoteId);
            } else {
                localStorage.removeItem(CURRENT_NOTE_ID_KEY);
            }
        } catch {}
    }, [currentNoteId]);

    const handleAiBrainstorm = async () => {
        if (!settings.geminiApiKey) return notify("Add API Key in Settings", "⚠️");
        if (typeof window.callGemini !== 'function') return notify("AI utilities not loaded.", "❌");

        setIsGenerating(true);
        // FIX: Use global function to generate prompt
        const prompt = window.getBrainstormPrompt(text);

        const res = await callGemini(prompt, settings.geminiApiKey);

        if (res.text) {
            setText(prev => (prev ? prev + "\n\n" : "") + res.text.trim());
            notify("Ideas Generated!", "✨");
        } else if (res.error) {
            notify(res.error, "❌");
        } else {
            notify("AI Error", "❌");
        }
        setIsGenerating(false);
    };

    const handleConvertToTasks = () => {
        if (!text.trim()) return notify("Scratchpad is empty", "⚠️");

        const lines = text.split('\n');
        let count = 0;

        lines.forEach(line => {
            const cleanLine = line.replace(/^[-*•]\s*/, '').trim();
            if (cleanLine.length > 2) {
                onAddTasks(normalizeTask({ title: cleanLine, category: 'General' }));
                count++;
            }
        });

        if (count > 0) {
            notify(`Created ${count} Tasks`, "✅");
            setText('');
            setCurrentNoteId(null);
            try {
                localStorage.removeItem(CURRENT_NOTE_ID_KEY);
            } catch {}
        } else {
            notify("No valid tasks found", "⚠️");
        }
    };

    const handleNew = () => {
        setText('');
        setCurrentNoteId(null);
        notify("New Note", "📝");
    };

    const handleSmartSave = () => {
        if (!text.trim()) return notify("Note is empty.", "⚠️");
        
        // Check if text matches any existing note
        if (currentNoteId && currentNote) {
            // If text matches the current note exactly, just confirm
            if (text === currentNote.body) {
                notify("Note is already saved", "💾");
                return;
            }
            // Text has changed, update the note
            const updatedNotes = savedNotes.map(n =>
                n.id === currentNoteId
                ? { ...n, body: text, date: new Date().toISOString() }
                : n
            );
            setSavedNotes(updatedNotes);
            notify("Note Updated", "💾");
        } else {
            // Check if text matches any other saved note
            const matchingNote = savedNotes.find(note => note.body === text);
            if (matchingNote) {
                // Text matches an existing note, restore it
                setCurrentNoteId(matchingNote.id);
                notify(`Restored: ${matchingNote.title}`, "📂");
            } else {
                // New note, prompt for title
                setNoteTitle('');
                setShowSaveModal(true);
            }
        }
    };

    const saveNewNote = () => {
        if (!noteTitle) return notify("Enter a title", "⚠️");
        const newId = generateId();
        const newNote = { id: newId, title: noteTitle, body: text, date: new Date().toISOString() };
        setSavedNotes([newNote, ...savedNotes]);
        setCurrentNoteId(newId);
        try {
            localStorage.setItem(CURRENT_NOTE_ID_KEY, newId);
        } catch {}
        setNoteTitle('');
        setShowSaveModal(false);
        notify("Note Saved", "💾");
    };

    const loadNote = (note) => {
        setText(note.body);
        setCurrentNoteId(note.id);
        setShowLoadModal(false);
        notify(`Loaded: ${note.title}`, "📂");
    };

    const deleteNote = (id) => {
        if(confirm('Delete this note?')) {
            setSavedNotes(savedNotes.filter(n => n.id !== id));
            if (currentNoteId === id) {
                setCurrentNoteId(null);
                try {
                    localStorage.removeItem(CURRENT_NOTE_ID_KEY);
                } catch {}
            }
            notify("Note Deleted", "🗑");
        }
    };

    const handleOCRTextExtracted = (tasks, ocrResult) => {
        if (ocrResult && ocrResult.text) {
            // Add extracted text to Ideas textarea
            const separator = text && text.trim() ? "\n\n--- OCR Text ---\n\n" : "";
            setText(prev => (prev || "") + separator + ocrResult.text);
            notify("Text extracted and added to Ideas", "📄");
        }
        
        // Optionally add tasks if user wants
        if (tasks && tasks.length > 0) {
            const addTasks = confirm(`Found ${tasks.length} task(s) in the document. Add them as tasks?`);
            if (addTasks && onAddTasks) {
                tasks.forEach(task => {
                    const normalizeTask = window.normalizeTask || ((t) => ({
                        title: t.title || 'Untitled Task',
                        category: t.category || 'General',
                        priority: t.priority || 'Medium',
                        description: t.description || '',
                        dueDate: t.dueDate || null,
                        ...t
                    }));
                    onAddTasks(normalizeTask(task));
                });
                notify(`Added ${tasks.length} task(s)`, "✅");
            }
        }
        
        setShowOCRModal(false);
    };

    return (
        <div style={{display:'flex', flexDirection:'column', height:'100%', position:'relative'}}>
            <div style={{paddingBottom:8, borderBottom:'1px solid var(--border)', marginBottom:12, display:'flex', flexDirection: 'column', gap:4}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h3 style={{margin:0}}>Ideas</h3>
                    <div style={{display:'flex', gap:6, alignItems:'center'}}>
                        <button 
                            className="btn-white-outline" 
                            style={{padding:'6px 10px', fontSize:16, border:'none', background:'transparent', cursor:'pointer'}} 
                            onClick={handleNew}
                            title="New Note"
                        >
                            ➕
                        </button>
                        <button 
                            className="btn-white-outline" 
                            style={{padding:'6px 10px', fontSize:16, border:'none', background:'transparent', cursor:'pointer'}} 
                            onClick={() => setShowLoadModal(true)}
                            title="Load Note"
                        >
                            📂
                        </button>
                        <button 
                            className="btn-white-outline" 
                            style={{padding:'6px 10px', fontSize:16, border:'none', background:'transparent', cursor:'pointer', color:'var(--primary)'}} 
                            onClick={handleSmartSave}
                            title="Save Note"
                        >
                            💾
                        </button>
                        <button 
                            className="btn-white-outline" 
                            style={{padding:'6px 10px', fontSize:16, border:'none', background:'transparent', cursor:'pointer'}} 
                            onClick={handleAiBrainstorm}
                            disabled={isGenerating}
                            title="AI Brainstorm"
                        >
                            {isGenerating ? '⏳' : '🤖'}
                        </button>
                        <button 
                            className="btn-white-outline" 
                            style={{padding:'6px 10px', fontSize:16, border:'none', background:'transparent', cursor:'pointer'}} 
                            onClick={handleConvertToTasks}
                            title="Convert to Tasks"
                        >
                            📋
                        </button>
                        <button 
                            className="btn-white-outline" 
                            style={{padding:'6px 10px', fontSize:16, border:'none', background:'transparent', cursor:'pointer'}} 
                            onClick={() => setShowOCRModal(true)}
                            title="Scan Document with OCR"
                        >
                            📷
                        </button>
                    </div>
                </div>
                {currentNote && <div style={{fontSize:10, color:'var(--primary)', fontWeight:700}}>Editing: {currentNote.title}</div>}
            </div>

            <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                <textarea
                    className="f-textarea"
                    style={{minHeight: '300px', flexGrow: 1, resize: 'vertical', fontFamily: 'monospace', fontSize: 14, lineHeight: 1.6, padding:16, border:'1px solid var(--border)', borderRadius:12}}
                    placeholder="Type freely, paste lists, or use AI..."
                    value={text}
                    onChange={e => setText(e.target.value)}
                />
            </div>

            {showSaveModal && (
                <div className="modal-overlay" onClick={()=>setShowSaveModal(false)}>
                    <div className="modal" onClick={e=>e.stopPropagation()}>
                        <h3>{currentNoteId ? 'Save Copy As' : 'Save New Note'}</h3>
                        <input className="f-input" placeholder="Note Title..." value={noteTitle} onChange={e=>setNoteTitle(e.target.value)} autoFocus />
                        <div style={{display:'flex', gap:10, marginTop:16}}>
                            <button className="btn-white-outline" style={{flex:1}} onClick={()=>setShowSaveModal(false)}>Cancel</button>
                            <button className="btn-orange" style={{flex:1}} onClick={saveNewNote}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            {showLoadModal && (
                <div className="modal-overlay" onClick={()=>setShowLoadModal(false)}>
                    <div className="modal" onClick={e=>e.stopPropagation()}>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:16}}>
                            <h3>Load Note</h3>
                            <button onClick={()=>setShowLoadModal(false)} style={{background:'none', border:'none', fontSize:20, color:'var(--text)'}}>×</button>
                        </div>
                        <div style={{maxHeight:'50vh', overflowY:'auto'}}>
                            {savedNotes.length === 0 && <div style={{textAlign:'center', color:'var(--text-light)', padding:20}}>No saved notes found.</div>}
                            {savedNotes.map(note => (
                                <div key={note.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:12, borderBottom:'1px solid var(--border)', background:'var(--input-bg)', borderRadius:8, marginBottom:8}}>
                                    <div onClick={() => loadNote(note)} style={{cursor:'pointer', flex:1}}>
                                        <div style={{fontWeight:700}}>{note.title}</div>
                                        <div style={{fontSize:11, color:'var(--text-light)'}}>{new Date(note.date).toLocaleDateString()}</div>
                                    </div>
                                    <button onClick={() => deleteNote(note.id)} style={{background:'none', border:'none', color:'var(--danger)', fontSize:18, cursor:'pointer', padding:8}}>🗑</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {showOCRModal && window.OCRModal && React.createElement(window.OCRModal, {
                onClose: () => setShowOCRModal(false),
                onTasksExtracted: handleOCRTextExtracted,
                settings: settings
            })}
        </div>
    );
}
window.IdeasTab = IdeasTab;

console.log('✅ 13-05-ideas.jsx loaded');
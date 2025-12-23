// 13-05-ideas.jsx
// ===========================================
// IDEAS TAB (Scratchpad/AI Import)
// ===========================================

import React, { useState } from 'react'

function IdeasTab({ text, setText, onAddTasks, settings, notify, savedNotes, setSavedNotes }) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [noteTitle, setNoteTitle] = useState('');
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showLoadModal, setShowLoadModal] = useState(false);
    const [currentNoteId, setCurrentNoteId] = useState(null);

    const currentNote = savedNotes.find(n => n.id === currentNoteId);

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
        if (currentNoteId && currentNote) {
            const updatedNotes = savedNotes.map(n =>
                n.id === currentNoteId
                ? { ...n, body: text, date: new Date().toISOString() }
                : n
            );
            setSavedNotes(updatedNotes);
            notify("Note Updated", "💾");
        } else {
            setNoteTitle('');
            setShowSaveModal(true);
        }
    };

    const saveNewNote = () => {
        if (!noteTitle) return notify("Enter a title", "⚠️");
        const newId = generateId();
        const newNote = { id: newId, title: noteTitle, body: text, date: new Date().toISOString() };
        setSavedNotes([newNote, ...savedNotes]);
        setCurrentNoteId(newId);
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
            if (currentNoteId === id) setCurrentNoteId(null);
            notify("Note Deleted", "🗑");
        }
    };

    return (
        <div style={{display:'flex', flexDirection:'column', height:'100%', position:'relative'}}>
            <div style={{paddingBottom:8, borderBottom:'1px solid var(--border)', marginBottom:12, display:'flex', flexDirection: 'column', gap:4}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h3 style={{margin:0}}>Ideas</h3>
                    <div style={{display:'flex', gap:4}}>
                        <button className="btn-white-outline" style={{padding:'6px 8px', fontSize:11}} onClick={handleNew}>+ New</button>
                        <button className="btn-white-outline" style={{padding:'6px 8px', fontSize:11}} onClick={() => setShowLoadModal(true)}>📂 Load</button>
                        <button className="btn-white-outline" style={{padding:'6px 8px', fontSize:11, borderColor:'var(--primary)', color:'var(--primary)'}} onClick={handleSmartSave}>💾 Save</button>
                    </div>
                </div>
                {currentNote && <div style={{fontSize:10, color:'var(--primary)', fontWeight:700}}>Editing: {currentNote.title}</div>}
                <div style={{display: 'flex', gap: 16, paddingTop: 4}}>
                    <button
                        onClick={handleAiBrainstorm}
                        disabled={isGenerating}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: isGenerating ? 'wait' : 'pointer',
                            padding: 0,
                            textDecoration: 'underline',
                            opacity: isGenerating ? 0.5 : 1
                        }}
                    >
                        {isGenerating ? '✨ Dreaming...' : '✨ AI Brainstorm'}
                    </button>
                    <button
                        onClick={handleConvertToTasks}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--orange)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: 0,
                            textDecoration: 'underline'
                        }}
                    >
                        📋 Convert to Tasks
                    </button>
                </div>
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
        </div>
    );
}
window.IdeasTab = IdeasTab;

console.log('✅ 13-05-ideas.jsx loaded');
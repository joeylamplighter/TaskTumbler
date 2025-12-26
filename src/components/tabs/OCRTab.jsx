// src/components/tabs/OCRTab.jsx
// ===========================================
// 📄 OCR TAB - Standalone OCR Scanner
// ===========================================

import React, { useState } from 'react';
import OCRScanner from '../ocr/OCRScanner';

export default function OCRTab({ settings = {}, dataManager, notify }) {
    const [extractedTasks, setExtractedTasks] = useState([]);

    const handleTasksExtracted = async (tasks, ocrResult) => {
        if (!tasks || tasks.length === 0) {
            if (notify) {
                notify('No tasks were extracted from the document', '⚠️');
            }
            return;
        }

        setExtractedTasks(tasks);

        // Auto-save tasks if DataManager is available
        if (dataManager && dataManager.tasks && dataManager.tasks.add) {
            try {
                let savedCount = 0;
                for (const task of tasks) {
                    // Normalize task to match app's task structure
                    const normalizedTask = {
                        id: `ocr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        title: task.title,
                        description: task.description || '',
                        category: task.category || 'General',
                        priority: task.priority || 'Medium',
                        weight: task.weight || 10,
                        estimatedTime: task.estimatedTime || 0,
                        dueDate: task.dueDate || null,
                        completed: false,
                        createdAt: new Date().toISOString(),
                        metadata: task.metadata || {}
                    };

                    if (dataManager.tasks.add) {
                        dataManager.tasks.add(normalizedTask);
                        savedCount++;
                    } else if (dataManager.tasks.setAll) {
                        // Fallback: get all tasks, add new one, set all
                        const allTasks = dataManager.tasks.getAll() || [];
                        allTasks.push(normalizedTask);
                        dataManager.tasks.setAll(allTasks);
                        savedCount++;
                    }
                }

                if (notify) {
                    notify(`Successfully imported ${savedCount} task${savedCount !== 1 ? 's' : ''} from OCR`, '✅');
                }

                // Clear extracted tasks after saving
                setExtractedTasks([]);
            } catch (error) {
                console.error('Error saving OCR tasks:', error);
                if (notify) {
                    notify('Error saving tasks: ' + error.message, '❌');
                }
            }
        } else {
            // Just show the tasks without auto-saving
            if (notify) {
                notify(`${tasks.length} task${tasks.length !== 1 ? 's' : ''} extracted. Review and import manually.`, 'ℹ️');
            }
        }
    };

    return (
        <div style={{
            padding: '20px',
            maxWidth: '1200px',
            margin: '0 auto'
        }}>
            <OCRScanner
                onTasksExtracted={handleTasksExtracted}
                settings={settings}
            />
        </div>
    );
}

// Export to window for legacy compatibility
if (typeof window !== 'undefined') {
    window.OCRTab = OCRTab;
}


// src/components/ocr/OCRModal.jsx
// ===========================================
// 📄 OCR MODAL WRAPPER
// ===========================================

import React from 'react';
import { createPortal } from 'react-dom';
import OCRScanner from './OCRScanner';

export default function OCRModal({ onClose, onTasksExtracted, settings }) {
    const handleTasksExtracted = (tasks, ocrResult) => {
        if (onTasksExtracted) {
            onTasksExtracted(tasks, ocrResult);
        }
    };

    return createPortal(
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflowY: 'auto',
            padding: '20px'
        }}
        onClick={(e) => {
            if (e.target === e.currentTarget && onClose) {
                onClose();
            }
        }}
        >
            <div style={{
                backgroundColor: 'var(--bg, #fff)',
                borderRadius: '12px',
                maxWidth: '900px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
            >
                <OCRScanner
                    onTasksExtracted={handleTasksExtracted}
                    onClose={onClose}
                    settings={settings}
                />
            </div>
        </div>,
        document.body
    );
}

// Export to window for legacy compatibility
if (typeof window !== 'undefined') {
    window.OCRModal = OCRModal;
}


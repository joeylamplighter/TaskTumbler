# OCR Integration Example

## Quick Integration into Task Form

Here's how to add OCR scanning to your task form modal:

```jsx
// In TaskFormModal.jsx or similar component

import { useState } from 'react';
import OCRModal from '../ocr/OCRModal';

export default function TaskFormModal({ onSave, settings, ... }) {
    const [showOCR, setShowOCR] = useState(false);
    const [ocrTasks, setOcrTasks] = useState([]);

    const handleOCRTasksExtracted = (tasks, ocrResult) => {
        setOcrTasks(tasks);
        
        // Option 1: Pre-fill form with first task
        if (tasks.length > 0) {
            const firstTask = tasks[0];
            // Update your form state with firstTask data
            setFormData(prev => ({
                ...prev,
                title: firstTask.title || prev.title,
                description: firstTask.description || prev.description,
                category: firstTask.category || prev.category,
                priority: firstTask.priority || prev.priority,
            }));
        }
        
        // Option 2: Show all tasks and let user choose
        // You could show a list of extracted tasks and let user select which to import
        
        setShowOCR(false);
    };

    return (
        <div>
            {/* Your existing form fields */}
            
            {/* Add OCR button */}
            <button 
                type="button"
                onClick={() => setShowOCR(true)}
                style={{
                    padding: '8px 16px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginTop: '10px'
                }}
            >
                📄 Scan Document
            </button>

            {/* OCR Modal */}
            {showOCR && (
                <OCRModal
                    onClose={() => setShowOCR(false)}
                    onTasksExtracted={handleOCRTasksExtracted}
                    settings={settings}
                />
            )}
        </div>
    );
}
```

## Adding OCR Tab to Navigation

To add OCR as a standalone tab in the app navigation:

1. **Add to constants** (`js/core/02-constants.js` or `src/core/constants.js`):
```javascript
navItemsOrder: [..., "ocr"],
navBarVisibleItems: {
    // ... existing items
    ocr: true
}
```

2. **Add to navigation items** (in `js/logic/22-app.jsx` or similar):
```javascript
const allNavItems = [
    // ... existing items
    { key: "ocr", icon: "📄", label: "Scanner", displayLabel: "Scanner" }
];
```

3. **Add to app render logic**:
```javascript
const OCRTab = window.OCRTab;

// In render:
{tab === 'ocr' && (
    <OCRTab
        settings={settings}
        dataManager={DM}
        notify={notify}
    />
)}
```

## Using OCR Programmatically

```javascript
// Import the utility
import { processDocumentOCR } from './utils/ocr';

// Process an image file
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

try {
    const result = await processDocumentOCR(
        file,
        'receipt',  // or 'todo', 'document'
        settings?.geminiApiKey,  // Optional API key
        (progress) => {
            console.log(`Processing: ${progress}%`);
        }
    );

    console.log('Extracted text:', result.text);
    console.log('Structured data:', result.structured);
    console.log('Tasks:', result.tasks);

    // Save tasks
    if (result.tasks && result.tasks.length > 0) {
        result.tasks.forEach(task => {
            dataManager.tasks.add(task);
        });
    }
} catch (error) {
    console.error('OCR error:', error);
}
```

## Direct Component Usage

```javascript
import OCRScanner from './components/ocr/OCRScanner';

function MyComponent() {
    const handleTasks = (tasks, ocrResult) => {
        console.log('Tasks extracted:', tasks);
        // Process tasks...
    };

    return (
        <OCRScanner
            onTasksExtracted={handleTasks}
            settings={{ geminiApiKey: 'your-key' }}
        />
    );
}
```


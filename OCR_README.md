# 📄 OCR System Documentation

## Overview

The OCR (Optical Character Recognition) system allows you to scan receipts, documents, and to-do lists to extract actionable data and automatically create tasks in TaskTumbler.

## Features

- **Multiple Document Types**: Supports receipts, to-do lists, and general documents
- **Dual OCR Engines**: 
  - **Tesseract.js** (client-side, no API key needed)
  - **Gemini Vision API** (cloud-based, more accurate, requires API key)
- **Automatic Task Extraction**: Converts scanned content into actionable tasks
- **Smart Parsing**: Understands different document structures and extracts relevant information

## Installation

The OCR system is already integrated into TaskTumbler. The required dependency (`tesseract.js`) has been installed.

## Usage

### Method 1: Standalone OCR Tab

1. Navigate to the OCR tab in the app (if enabled in navigation)
2. Select the document type (Receipt, To-Do List, or General Document)
3. Upload an image file
4. Click "Process Document"
5. Review extracted tasks and click "Import Tasks" to add them to your task list

### Method 2: Programmatic Usage

```javascript
import { processDocumentOCR } from './utils/ocr';

// Process a document
const result = await processDocumentOCR(
    imageFile,           // File object or base64 string
    'receipt',          // Document type: 'receipt', 'todo', or 'document'
    apiKey,             // Optional: Gemini API key
    (progress) => {     // Optional: Progress callback
        console.log(`Progress: ${progress}%`);
    }
);

// Result contains:
// - text: Extracted raw text
// - structured: Parsed structured data (if available)
// - tasks: Array of extracted task objects
// - method: 'tesseract' or 'gemini'
// - confidence: OCR confidence score (Tesseract only)
```

### Method 3: Using OCR Modal

```javascript
import OCRModal from './components/ocr/OCRModal';

function MyComponent() {
    const [showOCR, setShowOCR] = useState(false);
    
    const handleTasksExtracted = (tasks, ocrResult) => {
        // tasks is an array of task objects ready to be saved
        console.log('Extracted tasks:', tasks);
        // Save tasks using your data manager
    };
    
    return (
        <>
            <button onClick={() => setShowOCR(true)}>Scan Document</button>
            {showOCR && (
                <OCRModal
                    onClose={() => setShowOCR(false)}
                    onTasksExtracted={handleTasksExtracted}
                    settings={{ geminiApiKey: 'your-api-key' }}
                />
            )}
        </>
    );
}
```

## Document Types

### Receipts
Extracts:
- Merchant name
- Purchase date
- Total amount
- Individual items with prices
- Tax amount
- Payment method
- Merchant address

Creates tasks for:
- Expense tracking
- Return/warranty follow-ups (if mentioned)

### To-Do Lists
Extracts:
- Task titles
- Priorities (if mentioned)
- Due dates (if mentioned)
- Completion status
- Additional notes

Creates tasks for:
- All incomplete items in the list

### General Documents
Extracts:
- Document title
- Key points/bullet items
- Important dates
- People mentioned
- Summary

Creates tasks for:
- Key action items
- Date-based follow-ups

## API Configuration

### Gemini Vision API (Optional but Recommended)

For better accuracy, configure your Gemini API key in settings:

1. Go to Settings → AI
2. Enter your Gemini API key
3. The OCR system will automatically use Gemini Vision when available, falling back to Tesseract if the API key is missing

**Benefits of Gemini Vision:**
- Higher accuracy
- Better understanding of document structure
- Structured data extraction
- Handles complex layouts better

**Tesseract.js (Always Available):**
- Works offline
- No API key required
- Good for simple documents
- Free and open-source

## Task Structure

Extracted tasks follow this structure:

```javascript
{
    title: string,              // Task title
    description: string,        // Additional context
    category: string,          // Task category (e.g., 'Finance', 'General')
    priority: string,          // 'Urgent', 'High', 'Medium', or 'Low'
    weight: number,            // Task weight (default: 10)
    estimatedTime: number,     // Estimated time in minutes
    dueDate: string | null,    // Due date if extracted
    metadata: {                // Additional OCR metadata
        type: string,          // Document type
        // ... other fields based on document type
    }
}
```

## Examples

### Example 1: Scan a Receipt

```javascript
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

const result = await processDocumentOCR(file, 'receipt', apiKey);
console.log('Extracted tasks:', result.tasks);
// Tasks will include expense tracking and any follow-up items
```

### Example 2: Scan a To-Do List

```javascript
const result = await processDocumentOCR(imageBase64, 'todo', null, (progress) => {
    console.log(`Processing: ${progress}%`);
});

// Import all extracted tasks
result.tasks.forEach(task => {
    dataManager.tasks.add(task);
});
```

### Example 3: Custom Processing

```javascript
import { extractTextWithTesseract, parseDocumentToTasks } from './utils/ocr';

// Use Tesseract directly
const { text, confidence } = await extractTextWithTesseract(imageFile);

// Parse manually
const tasks = parseDocumentToTasks({
    keyPoints: ['Task 1', 'Task 2', 'Task 3'],
    dates: ['2025-12-25'],
    summary: 'Document summary'
});
```

## Integration with Task Form

To add OCR to the task form modal:

```javascript
import OCRModal from './components/ocr/OCRModal';

// In your TaskFormModal component
const [showOCR, setShowOCR] = useState(false);

const handleOCRTasks = (tasks) => {
    // Pre-fill form with first task or show all tasks
    if (tasks.length > 0) {
        const firstTask = tasks[0];
        setFormData({
            title: firstTask.title,
            description: firstTask.description,
            category: firstTask.category,
            priority: firstTask.priority,
            // ... other fields
        });
    }
    setShowOCR(false);
};

// Add button in form
<button onClick={() => setShowOCR(true)}>📄 Scan Document</button>
{showOCR && (
    <OCRModal
        onClose={() => setShowOCR(false)}
        onTasksExtracted={handleOCRTasks}
        settings={settings}
    />
)}
```

## Troubleshooting

### Low Accuracy
- Ensure image is clear and well-lit
- Use higher resolution images
- Enable Gemini Vision API for better results
- Preprocess images (the system does this automatically)

### No Tasks Extracted
- Check if the document type matches the content
- Review the extracted text to see what was recognized
- Try different document types
- For to-do lists, ensure items are clearly formatted

### API Errors
- Verify Gemini API key is correct
- Check API quota/limits
- System will automatically fall back to Tesseract if Gemini fails

## File Structure

```
src/
├── utils/
│   └── ocr.js                 # Core OCR utilities
├── components/
│   ├── ocr/
│   │   ├── OCRScanner.jsx     # Main scanner component
│   │   └── OCRModal.jsx       # Modal wrapper
│   └── tabs/
│       └── OCRTab.jsx          # Standalone OCR tab
```

## Browser Compatibility

- **Tesseract.js**: Works in all modern browsers
- **Gemini Vision**: Requires fetch API support (all modern browsers)
- **Image Processing**: Requires Canvas API support

## Performance

- **Tesseract.js**: Processing time depends on image size (typically 2-10 seconds)
- **Gemini Vision**: Faster processing (typically 1-3 seconds) but requires network
- **Image Preprocessing**: Automatic enhancement improves accuracy

## Future Enhancements

Potential improvements:
- Batch processing multiple images
- PDF support
- Handwriting recognition
- Multi-language support
- Custom document templates
- OCR history/archive

## Support

For issues or questions:
1. Check the extracted text to verify OCR accuracy
2. Try different document types
3. Ensure images are clear and properly oriented
4. Use Gemini Vision API for better results


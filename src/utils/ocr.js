// src/utils/ocr.js
// ===========================================
// 📄 OCR SYSTEM - Document Scanning & Data Extraction
// ===========================================

import Tesseract from 'tesseract.js';
import { callGemini } from './ai.js';

/**
 * Convert image file to base64
 * @param {File} file - Image file
 * @returns {Promise<string>} Base64 encoded image
 */
export const imageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

/**
 * Preprocess image for better OCR accuracy
 * @param {string} imageSrc - Image source (base64 or URL)
 * @returns {Promise<string>} Preprocessed image as base64
 */
export const preprocessImage = async (imageSrc) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Scale up for better OCR (2x)
            canvas.width = img.width * 2;
            canvas.height = img.height * 2;
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Apply image enhancement
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Increase contrast and brightness
            for (let i = 0; i < data.length; i += 4) {
                // Increase contrast
                data[i] = Math.min(255, data[i] * 1.2);     // R
                data[i + 1] = Math.min(255, data[i + 1] * 1.2); // G
                data[i + 2] = Math.min(255, data[i + 2] * 1.2); // B
            }
            
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = imageSrc;
    });
};

/**
 * Extract text from image using Tesseract.js
 * @param {File|string} image - Image file or base64 string
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<{text: string, confidence: number}>}
 */
export const extractTextWithTesseract = async (image, onProgress = null) => {
    try {
        let imageSrc = image;
        
        // Convert File to data URL if needed
        if (image instanceof File) {
            imageSrc = await imageToBase64(image);
        }
        
        // Preprocess image
        const processedImage = await preprocessImage(imageSrc);
        
        const { data } = await Tesseract.recognize(processedImage, 'eng', {
            logger: (m) => {
                if (onProgress && m.status === 'recognizing text') {
                    const progress = Math.round(m.progress * 100);
                    onProgress(progress);
                }
            }
        });
        
        return {
            text: data.text.trim(),
            confidence: data.confidence || 0
        };
    } catch (error) {
        console.error('Tesseract OCR error:', error);
        throw new Error(`OCR failed: ${error.message}`);
    }
};

/**
 * Extract text and structure using Gemini Vision API
 * @param {File|string} image - Image file or base64 string
 * @param {string} apiKey - Gemini API key
 * @param {string} documentType - Type of document: 'receipt', 'todo', 'document'
 * @returns {Promise<{text: string, structured: object}>}
 */
export const extractWithGeminiVision = async (image, apiKey, documentType = 'document') => {
    if (!apiKey) {
        throw new Error('Gemini API key required for vision OCR');
    }
    
    try {
        let imageBase64 = image;
        
        // Convert File to base64 if needed
        if (image instanceof File) {
            imageBase64 = await imageToBase64(image);
        } else if (image.startsWith('data:')) {
            // Extract base64 from data URL
            imageBase64 = image.split(',')[1];
        }
        
        // Determine MIME type
        const mimeType = image instanceof File 
            ? image.type 
            : (image.startsWith('data:') ? image.match(/data:([^;]+)/)?.[1] : 'image/png');
        
        // Create prompt based on document type
        const prompts = {
            receipt: `Analyze this receipt image and extract structured data. Return a JSON object with:
            - merchant: store/restaurant name
            - date: purchase date (YYYY-MM-DD format)
            - total: total amount (number)
            - items: array of {name, price, quantity}
            - tax: tax amount if visible
            - paymentMethod: payment method if visible
            - address: merchant address if visible
            Also provide the raw text from the receipt.`,
            
            todo: `Analyze this to-do list image and extract tasks. Return a JSON object with:
            - tasks: array of {title, priority (if mentioned: urgent/high/medium/low), dueDate (if mentioned), completed (boolean)}
            - notes: any additional notes or context
            Also provide the raw text from the list.`,
            
            document: `Analyze this document image and extract key information. Return a JSON object with:
            - title: document title if visible
            - keyPoints: array of important points or bullet items
            - dates: array of any dates mentioned
            - people: array of names mentioned
            - summary: brief summary of the document
            Also provide the raw text from the document.`
        };
        
        const prompt = prompts[documentType] || prompts.document;
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: mimeType || 'image/png',
                                data: imageBase64
                            }
                        }
                    ]
                }]
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Gemini Vision API error');
        }
        
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // Try to extract JSON from response
        let structured = null;
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                structured = JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.warn('Could not parse structured data from Gemini response');
        }
        
        return {
            text: text,
            structured: structured
        };
    } catch (error) {
        console.error('Gemini Vision OCR error:', error);
        throw new Error(`Gemini Vision failed: ${error.message}`);
    }
};

/**
 * Hybrid OCR: Try Gemini first, fallback to Tesseract
 * @param {File|string} image - Image file or base64 string
 * @param {string} apiKey - Gemini API key (optional)
 * @param {string} documentType - Type of document
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<{text: string, structured: object, method: string}>}
 */
export const extractTextHybrid = async (image, apiKey = null, documentType = 'document', onProgress = null) => {
    // Try Gemini Vision first if API key is available
    if (apiKey) {
        try {
            if (onProgress) onProgress(10);
            const result = await extractWithGeminiVision(image, apiKey, documentType);
            if (onProgress) onProgress(100);
            return {
                ...result,
                method: 'gemini'
            };
        } catch (error) {
            console.warn('Gemini Vision failed, falling back to Tesseract:', error);
            // Fall through to Tesseract
        }
    }
    
    // Fallback to Tesseract
    if (onProgress) onProgress(20);
    const result = await extractTextWithTesseract(image, (progress) => {
        if (onProgress) {
            // Map Tesseract progress (0-100) to our range (20-100)
            onProgress(20 + (progress * 0.8));
        }
    });
    
    return {
        text: result.text,
        structured: null,
        method: 'tesseract',
        confidence: result.confidence
    };
};

/**
 * Parse receipt data into actionable tasks/expenses
 * @param {object} receiptData - Structured receipt data
 * @returns {object[]} Array of task/expense objects
 */
export const parseReceiptToTasks = (receiptData) => {
    const tasks = [];
    
    if (!receiptData) return tasks;
    
    // Create expense tracking task
    if (receiptData.total) {
        tasks.push({
            title: `Expense: ${receiptData.merchant || 'Purchase'}`,
            description: `Total: $${receiptData.total}${receiptData.date ? ` | Date: ${receiptData.date}` : ''}`,
            category: 'Finance',
            priority: 'Medium',
            metadata: {
                type: 'expense',
                amount: receiptData.total,
                merchant: receiptData.merchant,
                date: receiptData.date,
                items: receiptData.items || []
            }
        });
    }
    
    // Create tasks for specific items if they're actionable
    if (receiptData.items && Array.isArray(receiptData.items)) {
        receiptData.items.forEach(item => {
            if (item.name && item.price) {
                // Only create task for items that might be actionable (e.g., "Return item X")
                const itemName = item.name.toLowerCase();
                if (itemName.includes('return') || itemName.includes('warranty') || itemName.includes('follow up')) {
                    tasks.push({
                        title: `Follow up: ${item.name}`,
                        description: `Price: $${item.price}`,
                        category: 'Finance',
                        priority: 'Low',
                        metadata: {
                            type: 'receipt_item',
                            item: item
                        }
                    });
                }
            }
        });
    }
    
    return tasks;
};

/**
 * Parse to-do list data into tasks
 * @param {object} todoData - Structured to-do list data
 * @returns {object[]} Array of task objects
 */
export const parseTodoListToTasks = (todoData) => {
    const tasks = [];
    
    if (!todoData || !todoData.tasks) return tasks;
    
    if (Array.isArray(todoData.tasks)) {
        todoData.tasks.forEach(todo => {
            if (todo.completed) return; // Skip completed items
            
            tasks.push({
                title: todo.title || 'Untitled Task',
                description: todo.notes || '',
                category: 'General',
                priority: todo.priority || 'Medium',
                dueDate: todo.dueDate || null,
                metadata: {
                    type: 'todo_list_item',
                    originalPriority: todo.priority
                }
            });
        });
    }
    
    return tasks;
};

/**
 * Parse document data into tasks and notes
 * @param {object} docData - Structured document data
 * @returns {object[]} Array of task objects
 */
export const parseDocumentToTasks = (docData) => {
    const tasks = [];
    
    if (!docData) return tasks;
    
    // Create tasks from key points
    if (docData.keyPoints && Array.isArray(docData.keyPoints)) {
        docData.keyPoints.forEach((point, index) => {
            if (typeof point === 'string' && point.trim()) {
                tasks.push({
                    title: point.length > 100 ? point.substring(0, 100) + '...' : point,
                    description: docData.summary || '',
                    category: 'General',
                    priority: 'Medium',
                    metadata: {
                        type: 'document_key_point',
                        index: index
                    }
                });
            }
        });
    }
    
    // Create follow-up tasks from dates
    if (docData.dates && Array.isArray(docData.dates)) {
        docData.dates.forEach(date => {
            tasks.push({
                title: `Follow up on ${date}`,
                description: `Date mentioned in document: ${date}`,
                category: 'General',
                priority: 'Medium',
                dueDate: date,
                metadata: {
                    type: 'document_date_followup'
                }
            });
        });
    }
    
    return tasks;
};

/**
 * Main OCR processing function
 * @param {File|string} image - Image file or base64 string
 * @param {string} documentType - 'receipt', 'todo', or 'document'
 * @param {string} apiKey - Gemini API key (optional)
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<{text: string, structured: object, tasks: object[]}>}
 */
export const processDocumentOCR = async (image, documentType = 'document', apiKey = null, onProgress = null) => {
    try {
        // Extract text and structured data
        const ocrResult = await extractTextHybrid(image, apiKey, documentType, onProgress);
        
        // Parse into actionable tasks based on document type
        let tasks = [];
        
        if (ocrResult.structured) {
            switch (documentType) {
                case 'receipt':
                    tasks = parseReceiptToTasks(ocrResult.structured);
                    break;
                case 'todo':
                    tasks = parseTodoListToTasks(ocrResult.structured);
                    break;
                case 'document':
                    tasks = parseDocumentToTasks(ocrResult.structured);
                    break;
            }
        }
        
        // If no structured data but we have text, try to extract tasks from plain text
        if (tasks.length === 0 && ocrResult.text) {
            // Simple pattern matching for to-do lists
            const lines = ocrResult.text.split('\n').filter(line => line.trim());
            lines.forEach(line => {
                const trimmed = line.trim();
                // Check for common to-do patterns
                if (/^[-*•✓☑☐]\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed)) {
                    const taskText = trimmed.replace(/^[-*•✓☑☐]\s*/, '').replace(/^\d+[.)]\s*/, '');
                    if (taskText.length > 3) {
                        tasks.push({
                            title: taskText,
                            category: 'General',
                            priority: 'Medium',
                            metadata: {
                                type: 'extracted_from_text'
                            }
                        });
                    }
                }
            });
        }
        
        return {
            text: ocrResult.text,
            structured: ocrResult.structured,
            tasks: tasks,
            method: ocrResult.method,
            confidence: ocrResult.confidence
        };
    } catch (error) {
        console.error('OCR processing error:', error);
        throw error;
    }
};

// Export all functions
const ocrUtils = {
    imageToBase64,
    preprocessImage,
    extractTextWithTesseract,
    extractWithGeminiVision,
    extractTextHybrid,
    processDocumentOCR,
    parseReceiptToTasks,
    parseTodoListToTasks,
    parseDocumentToTasks
};

// Export to window for legacy compatibility
if (typeof window !== 'undefined') {
    window.OCRUtils = ocrUtils;
    // Also export individual functions for convenience
    Object.keys(ocrUtils).forEach(key => {
        window[`ocr_${key}`] = ocrUtils[key];
    });
}

export default ocrUtils;


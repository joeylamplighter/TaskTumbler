// src/components/ocr/OCRScanner.jsx
// ===========================================
// 📄 OCR SCANNER COMPONENT
// ===========================================

import React, { useState, useRef, useEffect } from 'react';
import { processDocumentOCR } from '../../utils/ocr.js';

export default function OCRScanner({ onTasksExtracted, onClose, settings = {} }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [preview, setPreview] = useState(null);
    const [documentType, setDocumentType] = useState('document');
    const [ocrResult, setOcrResult] = useState(null);
    const [error, setError] = useState(null);
    const [cameraMode, setCameraMode] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const fileInputRef = useRef(null);
    const canvasRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        setError(null);
        setOcrResult(null);

        // Create preview
        const reader = new FileReader();
        reader.onload = (event) => {
            setPreview(event.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleProcess = async () => {
        if (!preview) {
            setError('Please select an image first');
            return;
        }

        setIsProcessing(true);
        setProgress(0);
        setError(null);

        try {
            const apiKey = settings?.geminiApiKey || null;
            const result = await processDocumentOCR(
                preview,
                documentType,
                apiKey,
                (prog) => setProgress(prog)
            );

            setOcrResult(result);

            // If tasks were extracted, notify parent
            if (result.tasks && result.tasks.length > 0 && onTasksExtracted) {
                onTasksExtracted(result.tasks, result);
            }
        } catch (err) {
            console.error('OCR processing error:', err);
            setError(err.message || 'Failed to process document');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleImportTasks = () => {
        if (ocrResult && ocrResult.tasks && ocrResult.tasks.length > 0 && onTasksExtracted) {
            onTasksExtracted(ocrResult.tasks, ocrResult);
            if (onClose) onClose();
        }
    };

    const handleReset = () => {
        setPreview(null);
        setOcrResult(null);
        setError(null);
        setProgress(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        stopCamera();
    };

    const startCamera = async () => {
        try {
            setError(null);
            setIsCameraActive(true);
            setCameraMode(true);
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Prefer back camera
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            streamRef.current = stream;
            
            // Set stream on video element when it's available
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error('Camera error:', err);
            setError(err.message || 'Failed to access camera. Please check permissions.');
            setIsCameraActive(false);
            setCameraMode(false);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
        setCameraMode(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setPreview(dataUrl);
        stopCamera();
    };

    // Set stream on video element when it becomes available
    useEffect(() => {
        if (isCameraActive && streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [isCameraActive]);

    // Cleanup camera on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    return (
        <div className="ocr-scanner" style={{
            padding: '20px',
            maxWidth: '800px',
            margin: '0 auto'
        }}>
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ marginBottom: '10px' }}>📄 Document Scanner</h2>
                <p style={{ color: '#666', fontSize: '14px' }}>
                    Use your camera or upload an image of a receipt, to-do list, or document to extract actionable tasks
                </p>
            </div>

            {/* Document Type Selection */}
            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Document Type:
                </label>
                <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    disabled={isProcessing}
                    style={{
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                        width: '100%',
                        maxWidth: '300px'
                    }}
                >
                    <option value="document">General Document</option>
                    <option value="receipt">Receipt</option>
                    <option value="todo">To-Do List</option>
                </select>
            </div>

            {/* Input Method Selection */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                    onClick={startCamera}
                    disabled={isProcessing || isCameraActive}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: isCameraActive ? '#4CAF50' : '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: (isProcessing || isCameraActive) ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        opacity: (isProcessing || isCameraActive) ? 0.7 : 1
                    }}
                >
                    {isCameraActive ? '📷 Camera Active' : '📷 Use Camera'}
                </button>
                {isCameraActive && (
                    <button
                        onClick={stopCamera}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold'
                        }}
                    >
                        Stop Camera
                    </button>
                )}
            </div>

            {/* Camera Video Feed */}
            {isCameraActive && (
                <div style={{ marginBottom: '20px', position: 'relative' }}>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        style={{
                            width: '100%',
                            maxHeight: '400px',
                            border: '2px solid #2196F3',
                            borderRadius: '4px',
                            display: 'block',
                            margin: '0 auto',
                            objectFit: 'contain',
                            backgroundColor: '#000'
                        }}
                    />
                    <button
                        onClick={capturePhoto}
                        disabled={isProcessing}
                        style={{
                            position: 'absolute',
                            bottom: '20px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            padding: '15px 30px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '70px',
                            height: '70px',
                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                            fontSize: '24px',
                            fontWeight: 'bold',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                            opacity: isProcessing ? 0.6 : 1
                        }}
                    >
                        📸
                    </button>
                </div>
            )}

            {/* File Upload */}
            {!isCameraActive && (
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                        Or Upload Image:
                    </label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileSelect}
                        disabled={isProcessing}
                        style={{ marginBottom: '10px' }}
                    />
                </div>
            )}

            {/* Preview */}
            {preview && !isCameraActive && (
                <div style={{ marginBottom: '20px' }}>
                    <img
                        src={preview}
                        alt="Preview"
                        style={{
                            maxWidth: '100%',
                            maxHeight: '400px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            display: 'block',
                            margin: '0 auto'
                        }}
                    />
                </div>
            )}

            {/* Hidden Canvas for Photo Capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Progress Bar */}
            {isProcessing && (
                <div style={{ marginBottom: '20px' }}>
                    <div style={{
                        width: '100%',
                        height: '20px',
                        backgroundColor: '#f0f0f0',
                        borderRadius: '10px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${progress}%`,
                            height: '100%',
                            backgroundColor: '#4CAF50',
                            transition: 'width 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}>
                            {progress}%
                        </div>
                    </div>
                    <p style={{ textAlign: 'center', marginTop: '8px', color: '#666' }}>
                        Processing document...
                    </p>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div style={{
                    padding: '12px',
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    borderRadius: '4px',
                    marginBottom: '20px'
                }}>
                    {error}
                </div>
            )}

            {/* OCR Results */}
            {ocrResult && !isProcessing && (
                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ marginBottom: '10px' }}>Extracted Text:</h3>
                    <div style={{
                        padding: '12px',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '4px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        fontSize: '14px',
                        whiteSpace: 'pre-wrap',
                        marginBottom: '15px'
                    }}>
                        {ocrResult.text || 'No text extracted'}
                    </div>

                    {ocrResult.tasks && ocrResult.tasks.length > 0 && (
                        <div style={{ marginBottom: '15px' }}>
                            <h3 style={{ marginBottom: '10px' }}>
                                Extracted Tasks ({ocrResult.tasks.length}):
                            </h3>
                            <ul style={{
                                listStyle: 'none',
                                padding: 0,
                                margin: 0
                            }}>
                                {ocrResult.tasks.map((task, index) => (
                                    <li key={`ocr-task-${index}-${task.title || 'task'}`} style={{
                                        padding: '10px',
                                        backgroundColor: '#fff',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        marginBottom: '8px'
                                    }}>
                                        <strong>{task.title}</strong>
                                        {task.description && (
                                            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                                {task.description}
                                            </div>
                                        )}
                                        <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                                            Category: {task.category} | Priority: {task.priority}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
                        Method: {ocrResult.method || 'unknown'} 
                        {ocrResult.confidence && ` | Confidence: ${ocrResult.confidence.toFixed(1)}%`}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap'
            }}>
                {!isProcessing && preview && (
                    <button
                        onClick={handleProcess}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold'
                        }}
                    >
                        Process Document
                    </button>
                )}

                {ocrResult && ocrResult.tasks && ocrResult.tasks.length > 0 && (
                    <button
                        onClick={handleImportTasks}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold'
                        }}
                    >
                        Import {ocrResult.tasks.length} Task{ocrResult.tasks.length !== 1 ? 's' : ''}
                    </button>
                )}

                {preview && (
                    <button
                        onClick={handleReset}
                        disabled={isProcessing}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#757575',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            opacity: isProcessing ? 0.6 : 1
                        }}
                    >
                        Reset
                    </button>
                )}

                {onClose && (
                    <button
                        onClick={onClose}
                        disabled={isProcessing}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            opacity: isProcessing ? 0.6 : 1
                        }}
                    >
                        Close
                    </button>
                )}
            </div>
        </div>
    );
}

// Export to window for legacy compatibility
if (typeof window !== 'undefined') {
    window.OCRScanner = OCRScanner;
}


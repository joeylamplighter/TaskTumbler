// src/components/tabs/FoodTrackTab.jsx
// ===========================================
// FOOD TRACK TAB - AI-Powered Food Logging
// ===========================================

import React, { useState, useRef, useEffect } from 'react';

export default function FoodTrackTab({
  settings = {},
  notify = () => {},
  addActivity = () => {},
  userStats = { xp: 0, level: 1 },
  setUserStats = () => {}
}) {
  const [foodLogs, setFoodLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [cameraMode, setCameraMode] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [textInput, setTextInput] = useState('');
  const [inputMode, setInputMode] = useState('photo'); // 'photo' or 'text'
  
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Load food logs from DataManager on mount
  useEffect(() => {
    const loadFoodLogs = () => {
      try {
        const DM = window.DataManager;
        if (DM?.foodLogs?.getAll) {
          const logs = DM.foodLogs.getAll();
          setFoodLogs(Array.isArray(logs) ? logs : []);
        } else {
          // Fallback to localStorage
          const stored = localStorage.getItem('foodLogs');
          if (stored) {
            const parsed = JSON.parse(stored);
            setFoodLogs(Array.isArray(parsed) ? parsed : []);
          }
        }
      } catch (e) {
        console.error('Failed to load food logs:', e);
        setFoodLogs([]);
      }
    };

    loadFoodLogs();

    // Listen for food logs updates
    const handleUpdate = () => loadFoodLogs();
    window.addEventListener('foodLogs-updated', handleUpdate);
    return () => window.removeEventListener('foodLogs-updated', handleUpdate);
  }, []);

  // Save food logs to DataManager
  const saveFoodLogs = (logs) => {
    try {
      const DM = window.DataManager;
      if (DM?.foodLogs?.setAll) {
        DM.foodLogs.setAll(logs);
      } else if (DM?.foodLogs?.add) {
        // If setAll doesn't exist, clear and add all
        const current = DM.foodLogs.getAll();
        current.forEach(log => {
          if (DM.foodLogs.remove) DM.foodLogs.remove(log.id);
        });
        logs.forEach(log => DM.foodLogs.add(log));
      } else {
        // Fallback to localStorage
        localStorage.setItem('foodLogs', JSON.stringify(logs));
        window.dispatchEvent(new Event('foodLogs-updated'));
      }
    } catch (e) {
      console.error('Failed to save food logs:', e);
    }
  };

  // Check daily logging and update XP (runs once per day)
  useEffect(() => {
    const checkDailyLogging = () => {
      const today = new Date().toISOString().split('T')[0];
      const lastCheck = localStorage.getItem('foodTrack_lastXpCheck');
      
      // Only check once per day
      if (lastCheck === today) return;

      const todayLogs = foodLogs.filter(log => {
        const logDate = new Date(log.date).toISOString().split('T')[0];
        return logDate === today;
      });

      const hasLoggedToday = todayLogs.length > 0;
      const lastLogDate = localStorage.getItem('foodTrack_lastLogDate');

      if (hasLoggedToday) {
        // Check if we already awarded XP for today
        const lastAwardDate = localStorage.getItem('foodTrack_lastXpAward');
        if (lastAwardDate !== today) {
          // Award XP for logging (only once per day)
          const xpAward = 15; // Base XP for logging food
          setUserStats(prev => {
            const newXp = (prev.xp || 0) + xpAward;
            return { ...prev, xp: newXp };
          });

          // Log activity
          addActivity({
            type: 'food_logged',
            date: new Date().toISOString(),
            xp: xpAward,
            description: 'Logged food entry'
          });

          localStorage.setItem('foodTrack_lastXpAward', today);
          localStorage.setItem('foodTrack_lastLogDate', today);
        }
      } else {
        // Check if we missed logging yesterday (only if we had logged before)
        if (lastLogDate) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          if (lastLogDate < yesterdayStr) {
            // Check if we already penalized for yesterday
            const lastPenaltyDate = localStorage.getItem('foodTrack_lastPenaltyDate');
            if (lastPenaltyDate !== yesterdayStr) {
              // Subtract XP for missing a day
              const xpPenalty = -10;
              setUserStats(prev => {
                const newXp = Math.max(0, (prev.xp || 0) + xpPenalty);
                return { ...prev, xp: newXp };
              });

              // Log activity
              addActivity({
                type: 'food_missed',
                date: yesterday.toISOString(),
                xp: xpPenalty,
                description: 'Missed food logging day'
              });

              notify(`⚠️ Missed food logging yesterday. -${Math.abs(xpPenalty)} XP`, '⚠️');
              localStorage.setItem('foodTrack_lastPenaltyDate', yesterdayStr);
            }
          }
        }
      }

      localStorage.setItem('foodTrack_lastXpCheck', today);
    };

    // Check on mount and when foodLogs change
    checkDailyLogging();
    
    // Also check periodically (every hour) to catch missed days
    const interval = setInterval(checkDailyLogging, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [foodLogs, setUserStats, addActivity, notify]);

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      setCameraMode(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      notify(err.message || 'Failed to access camera', '⚠️');
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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPreview(dataUrl);
    stopCamera();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify('Please select an image file', '⚠️');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const analyzeFoodText = async (textDescription) => {
    const apiKey = settings?.geminiApiKey;
    if (!apiKey) {
      notify('Please configure Gemini API key in settings', '⚠️');
      return null;
    }

    try {
      const prompt = `Analyze this food description and provide comprehensive nutritional information: "${textDescription}"

      Return a JSON object with:
      - description: A detailed description of the food
      - items: Array of food items with {name, estimatedCalories}
      - mealType: The type of meal (breakfast, lunch, dinner, snack)
      - calories: Total calories (number)
      - protein: Protein in grams (number)
      - carbs: Carbohydrates in grams (number)
      - fats: Fats in grams (number)
      - fiber: Fiber in grams (number, optional)
      - sugar: Sugar in grams (number, optional)
      - sodium: Sodium in milligrams (number, optional)
      - vitaminC: Vitamin C in milligrams (number, optional)
      - calcium: Calcium in milligrams (number, optional)
      - iron: Iron in milligrams (number, optional)
      - healthiness: Rating from 1-10 (1=unhealthy, 10=very healthy)
      - notes: Any additional observations
      
      Estimate nutritional values based on standard serving sizes. If portion size is mentioned, use that. Otherwise, estimate reasonable portions.`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'AI analysis failed');
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Extract JSON from response
      let foodData = null;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          foodData = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn('Could not parse food data from AI response');
        foodData = {
          description: textDescription,
          mealType: 'meal',
          calories: null,
          healthiness: 5,
          notes: text
        };
      }

      return foodData;
    } catch (error) {
      console.error('Food text analysis error:', error);
      notify(`AI analysis failed: ${error.message}`, '⚠️');
      return null;
    }
  };

  const analyzeFoodImage = async (imageData) => {
    const apiKey = settings?.geminiApiKey;
    if (!apiKey) {
      notify('Please configure Gemini API key in settings', '⚠️');
      return null;
    }

    try {
      let imageBase64 = imageData;
      
      if (imageData.startsWith('data:')) {
        imageBase64 = imageData.split(',')[1];
      }

      const mimeType = imageData.startsWith('data:') 
        ? imageData.match(/data:([^;]+)/)?.[1] 
        : 'image/png';

      const prompt = `Analyze this food image and provide comprehensive nutritional information. Return a JSON object with:
      - description: A detailed description of the food items visible
      - items: Array of food items with {name, estimatedCalories, category}
      - mealType: The type of meal (breakfast, lunch, dinner, snack)
      - calories: Total calories (number)
      - protein: Protein in grams (number)
      - carbs: Carbohydrates in grams (number)
      - fats: Fats in grams (number)
      - fiber: Fiber in grams (number, optional)
      - sugar: Sugar in grams (number, optional)
      - sodium: Sodium in milligrams (number, optional)
      - vitaminC: Vitamin C in milligrams (number, optional)
      - calcium: Calcium in milligrams (number, optional)
      - iron: Iron in milligrams (number, optional)
      - healthiness: Rating from 1-10 (1=unhealthy, 10=very healthy)
      - notes: Any additional observations about the food
      
      Estimate nutritional values based on what you see. Be as accurate as possible with portion sizes.`;

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
        throw new Error(error.error?.message || 'AI analysis failed');
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Extract JSON from response
      let foodData = null;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          foodData = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn('Could not parse food data from AI response');
        // Fallback: create basic structure from text
        foodData = {
          description: text.substring(0, 200),
          mealType: 'meal',
          calories: null,
          healthiness: 5,
          notes: text
        };
      }

      return foodData;
    } catch (error) {
      console.error('Food analysis error:', error);
      notify(`AI analysis failed: ${error.message}`, '⚠️');
      return null;
    }
  };

  const handleProcessFood = async () => {
    if (inputMode === 'photo' && !preview) {
      notify('Please take or select a photo first', '⚠️');
      return;
    }
    if (inputMode === 'text' && !textInput.trim()) {
      notify('Please enter a food description', '⚠️');
      return;
    }

    setIsProcessing(true);
    try {
      let foodData;
      if (inputMode === 'photo') {
        foodData = await analyzeFoodImage(preview);
      } else {
        foodData = await analyzeFoodText(textInput.trim());
      }
      
      if (foodData) {
        const generateId = window.generateId || ((prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
        
        const newLog = {
          id: generateId('food'),
          date: selectedDate,
          timestamp: new Date().toISOString(),
          image: inputMode === 'photo' ? preview : '',
          description: foodData.description || 'Food entry',
          mealType: foodData.mealType || 'meal',
          items: foodData.items || [],
          calories: foodData.calories || foodData.estimatedTotalCalories || null,
          protein: foodData.protein || null,
          carbs: foodData.carbs || null,
          fats: foodData.fats || null,
          fiber: foodData.fiber || null,
          sugar: foodData.sugar || null,
          sodium: foodData.sodium || null,
          vitaminC: foodData.vitaminC || null,
          calcium: foodData.calcium || null,
          iron: foodData.iron || null,
          healthiness: foodData.healthiness || 5,
          notes: foodData.notes || '',
          aiAnalyzed: true,
          inputMethod: inputMode
        };

        const updatedLogs = [...foodLogs, newLog];
        setFoodLogs(updatedLogs);
        saveFoodLogs(updatedLogs);

        // Award XP for logging (only once per day)
        const today = new Date().toISOString().split('T')[0];
        const lastAwardDate = localStorage.getItem('foodTrack_lastXpAward');
        
        if (lastAwardDate !== today) {
          const xpAward = 15;
          setUserStats(prev => {
            const newXp = (prev.xp || 0) + xpAward;
            return { ...prev, xp: newXp };
          });

          addActivity({
            type: 'food_logged',
            date: new Date().toISOString(),
            xp: xpAward,
            description: `Logged ${foodData.mealType || 'meal'}`
          });

          localStorage.setItem('foodTrack_lastXpAward', today);
          localStorage.setItem('foodTrack_lastLogDate', today);
          notify(`✅ Food logged! +${xpAward} XP`, '🍽️');
        } else {
          notify(`✅ Food logged!`, '🍽️');
        }
        
        // Reset inputs
        setPreview(null);
        setTextInput('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      console.error('Processing error:', error);
      notify(`Failed to process: ${error.message}`, '⚠️');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteLog = (logId) => {
    const updatedLogs = foodLogs.filter(log => log.id !== logId);
    setFoodLogs(updatedLogs);
    saveFoodLogs(updatedLogs);
    notify('Food log deleted', '🗑️');
  };

  // Get logs for selected date
  const selectedDateLogs = foodLogs.filter(log => {
    const logDate = new Date(log.date).toISOString().split('T')[0];
    return logDate === selectedDate;
  });

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="fade-in" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🍽️ Food Track
        </h1>
        <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>
          Take photos or describe your meals and let AI analyze them with detailed nutrition info. Log daily to earn XP!
        </p>
      </div>

      {/* Date Selector */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Select Date:
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid var(--border)',
            fontSize: '14px',
            backgroundColor: 'var(--bg)',
            color: 'var(--text)'
          }}
        />
      </div>

      {/* Input Mode Toggle */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={() => setInputMode('photo')}
          style={{
            padding: '10px 20px',
            backgroundColor: inputMode === 'photo' ? '#2196F3' : 'var(--card-bg)',
            color: inputMode === 'photo' ? 'white' : 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: inputMode === 'photo' ? 'bold' : 'normal'
          }}
        >
          📷 Photo
        </button>
        <button
          onClick={() => setInputMode('text')}
          style={{
            padding: '10px 20px',
            backgroundColor: inputMode === 'text' ? '#2196F3' : 'var(--card-bg)',
            color: inputMode === 'text' ? 'white' : 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: inputMode === 'text' ? 'bold' : 'normal'
          }}
        >
          ✍️ Text Description
        </button>
      </div>

      {/* Food Input Section */}
      <div style={{
        backgroundColor: 'var(--card-bg)',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px',
        border: '1px solid var(--border)'
      }}>
        <h2 style={{ fontSize: '20px', marginBottom: '15px' }}>
          {inputMode === 'photo' ? '📷 Capture Food Photo' : '✍️ Describe Your Food'}
        </h2>
        
        {/* Text Input Mode */}
        {inputMode === 'text' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Food Description:
            </label>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="e.g., Grilled chicken breast (6oz), brown rice (1 cup), steamed broccoli (1 cup)"
              disabled={isProcessing}
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                fontSize: '14px',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
            <p style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '8px' }}>
              Describe your meal in detail. Include portion sizes if possible. AI will estimate nutrition values.
            </p>
          </div>
        )}
        
        {/* Camera Controls (Photo Mode Only) */}
        {inputMode === 'photo' && (
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
              fontWeight: 'bold'
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
        )}

        {/* Camera Video Feed (Photo Mode Only) */}
        {inputMode === 'photo' && isCameraActive && (
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
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
              }}
            >
              📸
            </button>
          </div>
        )}

        {/* File Upload (Photo Mode Only) */}
        {inputMode === 'photo' && !isCameraActive && (
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

        {/* Preview (Photo Mode Only) */}
        {inputMode === 'photo' && preview && !isCameraActive && (
          <div style={{ marginBottom: '20px' }}>
            <img
              src={preview}
              alt="Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '400px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                display: 'block',
                margin: '0 auto'
              }}
            />
          </div>
        )}

        {/* Hidden Canvas */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Process Button */}
        {((inputMode === 'photo' && preview) || (inputMode === 'text' && textInput.trim())) && (
          <button
            onClick={handleProcessFood}
            disabled={isProcessing}
            style={{
              padding: '12px 24px',
              backgroundColor: isProcessing ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              width: '100%'
            }}
          >
            {isProcessing ? '🔄 Analyzing with AI...' : '✨ Analyze & Log Food'}
          </button>
        )}
      </div>

      {/* Food Logs for Selected Date */}
      <div>
        <h2 style={{ fontSize: '20px', marginBottom: '15px' }}>
          📋 Logs for {new Date(selectedDate).toLocaleDateString()}
        </h2>
        
        {selectedDateLogs.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: 'var(--text-light)',
            backgroundColor: 'var(--card-bg)',
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🍽️</div>
            <div>No food logs for this date</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {selectedDateLogs.map(log => (
              <div
                key={log.id}
                style={{
                  backgroundColor: 'var(--card-bg)',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  gap: '20px',
                  flexWrap: 'wrap'
                }}
              >
                {log.image && (
                  <img
                    src={log.image}
                    alt={log.description}
                    style={{
                      width: '150px',
                      height: '150px',
                      objectFit: 'cover',
                      borderRadius: '4px',
                      border: '1px solid var(--border)'
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '18px', margin: 0 }}>
                      {log.mealType ? log.mealType.charAt(0).toUpperCase() + log.mealType.slice(1) : 'Meal'}
                    </h3>
                    <button
                      onClick={() => handleDeleteLog(log.id)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                  <p style={{ color: 'var(--text)', marginBottom: '8px', fontWeight: '500' }}>
                    {log.description}
                  </p>
                  
                  {/* Calories */}
                  {(log.calories || log.estimatedCalories) && (
                    <div style={{ fontSize: '16px', color: 'var(--text)', marginBottom: '12px', fontWeight: 'bold' }}>
                      🔥 {log.calories || log.estimatedCalories} calories
                    </div>
                  )}
                  
                  {/* Macros */}
                  {(log.protein || log.carbs || log.fats) && (
                    <div style={{ 
                      marginBottom: '12px', 
                      padding: '12px', 
                      backgroundColor: 'var(--bg)', 
                      borderRadius: '4px',
                      border: '1px solid var(--border)'
                    }}>
                      <strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px' }}>Macros:</strong>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px', fontSize: '12px' }}>
                        {log.protein !== null && log.protein !== undefined && (
                          <div>
                            <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>Protein:</span> {log.protein}g
                          </div>
                        )}
                        {log.carbs !== null && log.carbs !== undefined && (
                          <div>
                            <span style={{ color: '#2196F3', fontWeight: 'bold' }}>Carbs:</span> {log.carbs}g
                          </div>
                        )}
                        {log.fats !== null && log.fats !== undefined && (
                          <div>
                            <span style={{ color: '#FF9800', fontWeight: 'bold' }}>Fats:</span> {log.fats}g
                          </div>
                        )}
                        {log.fiber !== null && log.fiber !== undefined && (
                          <div>
                            <span style={{ color: '#9C27B0', fontWeight: 'bold' }}>Fiber:</span> {log.fiber}g
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Other Nutrition */}
                  {(log.sugar !== null || log.sodium !== null || log.vitaminC !== null || log.calcium !== null || log.iron !== null) && (
                    <div style={{ 
                      marginBottom: '12px', 
                      padding: '12px', 
                      backgroundColor: 'var(--bg)', 
                      borderRadius: '4px',
                      border: '1px solid var(--border)'
                    }}>
                      <strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px' }}>Other Nutrition:</strong>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px', fontSize: '12px' }}>
                        {log.sugar !== null && log.sugar !== undefined && (
                          <div>🍬 Sugar: {log.sugar}g</div>
                        )}
                        {log.sodium !== null && log.sodium !== undefined && (
                          <div>🧂 Sodium: {log.sodium}mg</div>
                        )}
                        {log.vitaminC !== null && log.vitaminC !== undefined && (
                          <div>🍊 Vitamin C: {log.vitaminC}mg</div>
                        )}
                        {log.calcium !== null && log.calcium !== undefined && (
                          <div>🥛 Calcium: {log.calcium}mg</div>
                        )}
                        {log.iron !== null && log.iron !== undefined && (
                          <div>⚙️ Iron: {log.iron}mg</div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Healthiness */}
                  {log.healthiness && (
                    <div style={{ fontSize: '14px', color: 'var(--text-light)', marginBottom: '8px' }}>
                      Healthiness: {log.healthiness}/10 {log.healthiness >= 7 ? '✅' : log.healthiness >= 4 ? '⚠️' : '❌'}
                    </div>
                  )}
                  
                  {/* Items */}
                  {log.items && log.items.length > 0 && (
                    <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '12px' }}>Items:</strong>
                      <ul style={{ margin: '4px 0', paddingLeft: '20px', fontSize: '12px' }}>
                        {log.items.map((item, idx) => (
                          <li key={idx}>{item.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Notes */}
                  {log.notes && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-light)', fontStyle: 'italic' }}>
                      {log.notes}
                    </div>
                  )}
                  
                  {/* Input Method Badge */}
                  {log.inputMethod && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-light)' }}>
                      {log.inputMethod === 'photo' ? '📷 Photo' : '✍️ Text'} • AI Analyzed
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Export to window for legacy compatibility
if (typeof window !== 'undefined') {
  window.FoodTrackTab = FoodTrackTab;
}


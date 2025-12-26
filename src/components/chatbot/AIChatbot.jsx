import React, { useState, useRef, useEffect } from 'react';
import { callGemini } from '../../utils/ai';
import { createChatbotService } from '../../utils/chatbotService';
import { checkPresetCommand } from '../../utils/chatbotCommands';

function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatbotService = useRef(null);
  
  // Check if chatbot is enabled in settings
  const [chatbotEnabled, setChatbotEnabled] = useState(() => {
    try {
      const DM = window.DataManager;
      if (DM?.settings) {
        const settings = DM.settings.get();
        return settings?.chatbotEnabled !== false; // Default to true
      }
    } catch (error) {
      console.error('Error checking chatbot enabled state:', error);
    }
    return true;
  });

  // Chatbot name from settings
  const [chatbotName, setChatbotName] = useState(() => {
    try {
      const DM = window.DataManager;
      if (DM?.settings) {
        const settings = DM.settings.get();
        return settings?.chatbotName || 'AI Assistant';
      }
    } catch (error) {
      console.error('Error loading chatbot name:', error);
    }
    return 'AI Assistant';
  });

  // UI change history for undo functionality
  const [uiChangeHistory, setUiChangeHistory] = useState([]);

  // Chatbot appearance settings - simplified, no dragging, reactive to updates
  const [appearance, setAppearance] = useState(() => {
    const defaultAppearance = {
      buttonSize: 56,
      buttonShape: 'circle',
      buttonColor: 'gradient',
      buttonCustomColor: '#667eea',
      panelWidth: 280, // Narrower default
      panelHeight: 500,
    };
    
    try {
      const DM = window.DataManager;
      if (DM?.settings) {
        const settings = DM.settings.get();
        const saved = settings?.chatbotAppearance || {};
        return {
          buttonSize: saved.buttonSize !== undefined ? saved.buttonSize : defaultAppearance.buttonSize,
          buttonShape: saved.buttonShape || defaultAppearance.buttonShape,
          buttonColor: saved.buttonColor || defaultAppearance.buttonColor,
          buttonCustomColor: saved.buttonCustomColor || defaultAppearance.buttonCustomColor,
          panelWidth: saved.panelWidth !== undefined ? saved.panelWidth : defaultAppearance.panelWidth,
          panelHeight: saved.panelHeight !== undefined ? saved.panelHeight : defaultAppearance.panelHeight,
        };
      }
    } catch (error) {
      console.error('Error loading chatbot appearance:', error);
    }
    return defaultAppearance;
  });

  // Listen for settings changes
  useEffect(() => {
    try {
      const DM = window.DataManager;
      if (!DM?.settings) {
        // Always return a cleanup function, even if there's nothing to clean up
        return () => {};
      }

      const updateSettings = () => {
        try {
          const settings = DM.settings.get();
          setChatbotEnabled(settings?.chatbotEnabled !== false);
          setChatbotName(settings?.chatbotName || 'AI Assistant');
          
          // Update appearance if it changed - merge all properties
          const saved = settings?.chatbotAppearance || {};
          console.log('Updating appearance from settings:', saved);
          setAppearance(prev => {
            const newAppearance = {
              buttonSize: saved.buttonSize !== undefined ? saved.buttonSize : (prev.buttonSize || 56),
              buttonShape: saved.buttonShape !== undefined ? saved.buttonShape : (prev.buttonShape || 'circle'),
              buttonColor: saved.buttonColor !== undefined ? saved.buttonColor : (prev.buttonColor || 'gradient'),
              buttonCustomColor: saved.buttonCustomColor !== undefined ? saved.buttonCustomColor : (prev.buttonCustomColor || '#667eea'),
              panelWidth: saved.panelWidth !== undefined ? saved.panelWidth : (prev.panelWidth || 280),
              panelHeight: saved.panelHeight !== undefined ? saved.panelHeight : (prev.panelHeight || 500),
            };
            console.log('New appearance state:', newAppearance);
            return newAppearance;
          });
        } catch (error) {
          console.error('Error updating chatbot settings:', error);
        }
      };

      // Initial check
      updateSettings();

      // Subscribe to settings changes
      const unsubscribe = DM.settings.subscribe(updateSettings);
      
      // Listen for appearance updates - force immediate update
      const handleAppearanceUpdate = () => {
        console.log('Chatbot appearance update event received');
        // Small delay to ensure settings are saved
        setTimeout(() => {
          updateSettings();
        }, 50);
      };
      window.addEventListener('chatbot-appearance-updated', handleAppearanceUpdate);
      
      // Listen for name updates
      const handleNameUpdate = (e) => {
        if (e.detail?.name) {
          setChatbotName(e.detail.name);
        }
      };
      window.addEventListener('chatbot-name-updated', handleNameUpdate);
      
      return () => {
        try {
          if (unsubscribe && typeof unsubscribe === 'function') {
            unsubscribe();
          }
          window.removeEventListener('chatbot-appearance-updated', handleAppearanceUpdate);
          window.removeEventListener('chatbot-name-updated', handleNameUpdate);
        } catch (error) {
          console.error('Error cleaning up chatbot settings listener:', error);
        }
      };
    } catch (error) {
      console.error('Error setting up chatbot settings listener:', error);
      return () => {};
    }
  }, []);

  useEffect(() => {
    try {
      // Initialize chatbot service
      chatbotService.current = createChatbotService();
    } catch (error) {
      console.error('Error initializing chatbot service:', error);
    }
    
    // Auto-scroll to bottom when messages change
    try {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      // Ignore scroll errors
    }
  }, [messages]);

  useEffect(() => {
    // Focus input when chat opens
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Expose open/close functions globally
  useEffect(() => {
    window.openChatbot = () => {
      if (chatbotEnabled) {
        setIsOpen(true);
      }
    };
    
    window.closeChatbot = () => {
      setIsOpen(false);
    };
    
    window.toggleChatbot = () => {
      if (chatbotEnabled) {
        setIsOpen(prev => !prev);
      }
    };

    // Listen for custom events to open chatbot
    const handleOpenChatbot = () => {
      if (chatbotEnabled) {
        setIsOpen(true);
      }
    };
    
    window.addEventListener('open-chatbot', handleOpenChatbot);
    
    return () => {
      delete window.openChatbot;
      delete window.closeChatbot;
      delete window.toggleChatbot;
      window.removeEventListener('open-chatbot', handleOpenChatbot);
    };
  }, [chatbotEnabled]);

  // Don't render if disabled - check AFTER all hooks
  if (!chatbotEnabled) {
    return null;
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Check for preset commands first (fast, no AI needed)
      const presetCommand = checkPresetCommand(userInput);
      
      if (presetCommand) {
        // Execute preset command
        let response;
        try {
          response = presetCommand.handler(userInput);
        } catch (cmdError) {
          console.error('Error executing preset command:', cmdError);
          throw new Error('Failed to execute command');
        }
        
        if (!response || !response.message) {
          throw new Error('Invalid command response');
        }
        
        const assistantMessage = {
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
          action: response.action
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Execute any actions
        if (response.action) {
          try {
            // Handle special actions
            if (response.action.type === 'clearChat') {
              setMessages([]);
            } else if (response.action.type === 'closeChatbot') {
              setIsOpen(false);
            } else if (chatbotService.current?.executeAction) {
              chatbotService.current.executeAction(response.action);
            }
          } catch (actionError) {
            console.error('Error executing action:', actionError);
          }
        }
        
        setIsLoading(false);
        return;
      }

      // No preset command found, use AI
      if (!chatbotService.current) {
        throw new Error('Chatbot service not initialized');
      }
      
      // Get current app state for context
      let appState;
      try {
        appState = chatbotService.current.getAppState();
      } catch (stateError) {
        console.error('Error getting app state:', stateError);
        appState = {};
      }
      
      // Process message through chatbot service
      const response = await chatbotService.current.processMessage(
        userInput,
        messages,
        appState
      );

      if (!response || !response.message) {
        throw new Error('Invalid response from chatbot service');
      }

      const assistantMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        action: response.action
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Execute any actions
      if (response.action && chatbotService.current?.executeAction) {
        try {
          // Track UI changes for undo functionality
          const actionType = response.action.type;
          const uiChangingActions = [
            'updateChatbotAppearance', 
            'toggleUIElement', 
            'updateSettings', 
            'setAppearance', 
            'setUIElementVisibility',
            'updateChatbotName',
            'setFontSize',
            'setSpacing',
            'toggleAnimations',
            'setOpacity',
            'hideElement',
            'showElement'
          ];
          
          if (uiChangingActions.includes(actionType)) {
            // Save current state before making changes
            const DM = window.DataManager;
            if (DM?.settings) {
              const currentSettings = DM.settings.get();
              // Also save current DOM state for element visibility changes
              const domState = {};
              if (actionType === 'hideElement' || actionType === 'showElement') {
                const selector = response.action.params?.selector;
                if (selector) {
                  try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach((el, idx) => {
                      domState[`${selector}_${idx}`] = {
                        display: el.style.display,
                        hidden: el.getAttribute('data-chatbot-hidden')
                      };
                    });
                  } catch (e) {
                    // Ignore selector errors
                  }
                }
              }
              
              setUiChangeHistory(prev => {
                const newHistory = [...prev, {
                  type: actionType,
                  timestamp: new Date(),
                  previousState: JSON.parse(JSON.stringify(currentSettings)),
                  domState: Object.keys(domState).length > 0 ? domState : undefined,
                  actionParams: response.action.params
                }];
                // Keep only last 10 changes
                return newHistory.slice(-10);
              });
            }
          }
          
          chatbotService.current.executeAction(response.action);
        } catch (actionError) {
          console.error('Error executing action:', actionError);
        }
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage = error?.message || 'An unknown error occurred';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  // Undo last UI change
  const undoLastUIChange = () => {
    if (uiChangeHistory.length === 0) {
      const notify = window.notify || ((msg, icon) => console.log(`${icon} ${msg}`));
      notify('No changes to undo', 'ℹ️');
      return;
    }

    const lastChange = uiChangeHistory[uiChangeHistory.length - 1];
    const DM = window.DataManager;
    
    if (DM?.settings && lastChange.previousState) {
      DM.settings.set(lastChange.previousState);
      setUiChangeHistory(prev => prev.slice(0, -1));
      
      // Restore DOM state if it was saved
      if (lastChange.domState && lastChange.actionParams?.selector) {
        try {
          const elements = document.querySelectorAll(lastChange.actionParams.selector);
          elements.forEach((el, idx) => {
            const key = `${lastChange.actionParams.selector}_${idx}`;
            const savedState = lastChange.domState[key];
            if (savedState) {
              el.style.display = savedState.display || '';
              if (savedState.hidden === 'true') {
                el.setAttribute('data-chatbot-hidden', 'true');
              } else {
                el.removeAttribute('data-chatbot-hidden');
              }
            }
          });
        } catch (e) {
          // Ignore selector errors
        }
      }
      
      // Restore CSS variables if they were changed
      if (lastChange.type === 'setFontSize') {
        document.documentElement.style.removeProperty('--base-font-size');
      } else if (lastChange.type === 'setSpacing') {
        document.documentElement.style.removeProperty('--spacing-unit');
      } else if (lastChange.type === 'toggleAnimations') {
        document.documentElement.removeAttribute('data-animations');
      } else if (lastChange.type === 'setOpacity' && lastChange.actionParams?.element) {
        try {
          const elements = document.querySelectorAll(lastChange.actionParams.element);
          elements.forEach(el => {
            el.style.removeProperty('opacity');
          });
        } catch (e) {
          // Ignore selector errors
        }
      }
      
      // Trigger appearance update event
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('chatbot-appearance-updated'));
        window.dispatchEvent(new CustomEvent('ui-elements-updated'));
        const restoredName = lastChange.previousState?.chatbotName || 'AI Assistant';
        setChatbotName(restoredName);
        window.dispatchEvent(new CustomEvent('chatbot-name-updated', { detail: { name: restoredName } }));
      }, 50);
      
      const notify = window.notify || ((msg, icon) => console.log(`${icon} ${msg}`));
      notify('Last change undone', '↩️');
    }
  };

  // Sample chip suggestions
  const sampleChips = [
    { text: 'Change theme', action: 'Change the app theme to light or dark' },
    { text: 'Hide progress sliders', action: 'Hide progress sliders' },
    { text: 'Make button bigger', action: 'Make the chatbot button bigger' },
    { text: 'Add a task', action: 'Add a new task' },
    { text: 'Show my stats', action: 'Show my productivity statistics' },
    { text: 'Go to tasks', action: 'Navigate to tasks tab' },
  ];

  const handleChipClick = async (chip) => {
    if (isLoading) return;
    const chipAction = chip.action;
    if (!chipAction.trim()) return;

    const userMessage = {
      role: 'user',
      content: chipAction.trim(),
      timestamp: new Date()
    };

    // Update messages immediately
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // Use a small delay to ensure state updates
    setTimeout(async () => {
      const userInput = chipAction.trim();

      try {
        // Check for preset commands first
        const presetCommand = checkPresetCommand(userInput);
        
        if (presetCommand) {
          let response;
          try {
            response = presetCommand.handler(userInput);
          } catch (cmdError) {
            console.error('Error executing preset command:', cmdError);
            throw new Error('Failed to execute command');
          }
          
          if (!response || !response.message) {
            throw new Error('Invalid command response');
          }
          
          const assistantMessage = {
            role: 'assistant',
            content: response.message,
            timestamp: new Date(),
            action: response.action
          };

          setMessages(prev => [...prev, assistantMessage]);

          if (response.action) {
            try {
              if (response.action.type === 'clearChat') {
                setMessages([]);
              } else if (response.action.type === 'closeChatbot') {
                setIsOpen(false);
              } else if (chatbotService.current?.executeAction) {
                chatbotService.current.executeAction(response.action);
              }
            } catch (actionError) {
              console.error('Error executing action:', actionError);
            }
          }
          
          setIsLoading(false);
          return;
        }

        // Use AI
        if (!chatbotService.current) {
          throw new Error('Chatbot service not initialized');
        }
        
        let appState;
        try {
          appState = chatbotService.current.getAppState();
        } catch (stateError) {
          console.error('Error getting app state:', stateError);
          appState = {};
        }
        
        // Get current messages using functional update to avoid stale closure
        setMessages(prev => {
          const currentMessages = [...prev, userMessage];
          
          // Process message asynchronously
          (async () => {
            try {
              const response = await chatbotService.current.processMessage(
                userInput,
                currentMessages,
                appState
              );

              if (!response || !response.message) {
                throw new Error('Invalid response from chatbot service');
              }

              const assistantMessage = {
                role: 'assistant',
                content: response.message,
                timestamp: new Date(),
                action: response.action
              };

              setMessages(prevMsgs => [...prevMsgs, assistantMessage]);

              if (response.action && chatbotService.current?.executeAction) {
                try {
                  const actionType = response.action.type;
                  const uiChangingActions = [
                    'updateChatbotAppearance', 
                    'toggleUIElement', 
                    'updateSettings', 
                    'setAppearance', 
                    'setUIElementVisibility',
                    'updateChatbotName',
                    'setFontSize',
                    'setSpacing',
                    'toggleAnimations',
                    'setOpacity',
                    'hideElement',
                    'showElement'
                  ];
                  
                  if (uiChangingActions.includes(actionType)) {
                    const DM = window.DataManager;
                    if (DM?.settings) {
                      const currentSettings = DM.settings.get();
                      setUiChangeHistory(prevHistory => {
                        const newHistory = [...prevHistory, {
                          type: actionType,
                          timestamp: new Date(),
                          previousState: JSON.parse(JSON.stringify(currentSettings))
                        }];
                        return newHistory.slice(-10);
                      });
                    }
                  }
                  
                  chatbotService.current.executeAction(response.action);
                } catch (actionError) {
                  console.error('Error executing action:', actionError);
                }
              }
            } catch (error) {
              console.error('Chatbot error:', error);
              const errorMessage = error?.message || 'An unknown error occurred';
              setMessages(prevMsgs => [...prevMsgs, {
                role: 'assistant',
                content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
                timestamp: new Date()
              }]);
            } finally {
              setIsLoading(false);
            }
          })();
          
          return currentMessages;
        });
      } catch (error) {
        console.error('Chatbot error:', error);
        const errorMessage = error?.message || 'An unknown error occurred';
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
          timestamp: new Date()
        }]);
        setIsLoading(false);
      }
    }, 50);
  };

  // Simple fixed position styles - always on right side, floating above dock
  const getButtonStyle = () => {
    const size = appearance.buttonSize || 56;
    const clampedSize = Math.min(Math.max(size, 40), 100);
    const shape = appearance.buttonShape || 'circle';
    const color = appearance.buttonColor || 'gradient';
    const customColor = appearance.buttonCustomColor || '#667eea';
    
    // Calculate border radius based on shape
    let borderRadius = '50%'; // circle
    if (shape === 'square') {
      borderRadius = '0px'; // Perfect square with sharp corners
    } else if (shape === 'rounded') {
      borderRadius = '16px';
    }
    
    // Calculate background based on color setting
    let background = 'transparent';
    if (color === 'gradient') {
      background = `linear-gradient(135deg, ${customColor}dd, ${customColor}ff)`;
    } else if (color === 'primary') {
      background = 'var(--primary)';
    } else if (color === 'custom') {
      background = customColor;
    }
    
    return {
      width: `${clampedSize}px`,
      height: `${clampedSize}px`,
      borderRadius,
      background,
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'auto',
      position: 'fixed',
      bottom: '80px',
      right: '20px',
      zIndex: 1000,
    };
  };

  const getPanelStyle = () => {
    const width = appearance.panelWidth || 280;
    const height = appearance.panelHeight || 500;

    return {
      width: `${width}px`,
      height: `${height}px`,
      maxWidth: 'calc(100vw - 40px)',
      maxHeight: 'calc(100vh - 120px)',
      position: 'fixed',
      bottom: '80px',
      right: '20px',
      zIndex: 1000,
    };
  };

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div 
          className="chatbot-panel" 
          style={getPanelStyle()}
        >
          <div className="chatbot-header">
            <div className="chatbot-header-content">
              <span 
                className="chatbot-header-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  const icon = e.currentTarget;
                  icon.style.transform = 'rotate(360deg)';
                  setTimeout(() => {
                    icon.style.transform = 'rotate(0deg)';
                  }, 500);
                }}
                style={{
                  cursor: 'pointer',
                  transition: 'transform 0.5s ease',
                  display: 'inline-block',
                }}
              >
                🤖
              </span>
              <div>
                <h3>{chatbotName}</h3>
                <p>Helper</p>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  undoLastUIChange();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="chatbot-btn-icon"
                title="Undo last UI change"
                aria-label="Undo last UI change"
                disabled={uiChangeHistory.length === 0}
                style={{
                  opacity: uiChangeHistory.length === 0 ? 0.4 : 1,
                  cursor: uiChangeHistory.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                ↩️
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearChat();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="chatbot-btn-icon"
                title="Clear chat"
                aria-label="Clear chat"
              >
                🗑️
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="chatbot-btn-icon"
                title="Close"
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chatbot-message chatbot-message-${msg.role}`}>
                <div className="chatbot-message-content">
                  {msg.content}
                </div>
                {msg.action && (
                  <div className="chatbot-action-indicator">
                    ✓ Action executed: {msg.action.type}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="chatbot-message chatbot-message-assistant">
                <div className="chatbot-message-content">
                  <span className="chatbot-typing">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Sample Chip Suggestions - only show when chat is empty */}
          {messages.length === 0 && !isLoading && (
            <div className="chatbot-chips" style={{
              padding: '12px',
              borderTop: '1px solid var(--border, rgba(255,255,255,0.1))',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              maxHeight: '120px',
              overflowY: 'auto'
            }}>
              {sampleChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChipClick(chip)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '16px',
                    border: '1px solid var(--border, rgba(255,255,255,0.2))',
                    background: 'var(--input-bg, rgba(255,255,255,0.05))',
                    color: 'var(--text, #fff)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--primary, #667eea)';
                    e.currentTarget.style.borderColor = 'var(--primary, #667eea)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--input-bg, rgba(255,255,255,0.05))';
                    e.currentTarget.style.borderColor = 'var(--border, rgba(255,255,255,0.2))';
                  }}
                >
                  {chip.text}
                </button>
              ))}
            </div>
          )}

          <div className="chatbot-input-container">
            <textarea
              ref={inputRef}
              className="chatbot-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about TaskTumbler..."
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              className="chatbot-send-btn"
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
            >
              {isLoading ? '⏳' : '➤'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default AIChatbot;


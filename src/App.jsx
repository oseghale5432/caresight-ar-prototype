import React, { useState, useEffect, useRef } from 'react';
import { Camera, Sparkles, ShieldAlert, Volume2, VolumeX, Settings, X, Shield, MessageCircleQuestion, Mic, Send, Lock } from 'lucide-react';
import Avatar3D from './components/Avatar3D';
import LandingPage from './components/LandingPage';

function App() {
  // Application Flow
  const [showLandingPage, setShowLandingPage] = useState(true);

  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState("Ready to scan");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  
  // Admin & Settings
  const [showSettings, setShowSettings] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  
  // API Key via Environment Variable or Admin Panel
  const [geminiKey, setGeminiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || '');
  const [customSafetyRules, setCustomSafetyRules] = useState('');
  
  // Custom Question Modal
  const [showAskModal, setShowAskModal] = useState(false);
  const [customQuestion, setCustomQuestion] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  
  // Dialogue Box
  const [spokenText, setSpokenText] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
    
    // Check if they overrode the key in local storage, otherwise fallback to hardcoded
    const savedKey = localStorage.getItem('caresight_gemini_key');
    if (savedKey && savedKey.trim() !== '') {
      setGeminiKey(savedKey);
    }
    
    const savedRules = localStorage.getItem('caresight_safety_rules');
    if (savedRules) setCustomSafetyRules(savedRules);

    const handleStart = () => setIsSpeaking(true);
    const handleEnd = () => setIsSpeaking(false);
    window.addEventListener('ai_speaking_start', handleStart);
    window.addEventListener('ai_speaking_end', handleEnd);
    
    return () => {
      window.removeEventListener('ai_speaking_start', handleStart);
      window.removeEventListener('ai_speaking_end', handleEnd);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Start Camera only after landing page finishes
  useEffect(() => {
    if (showLandingPage) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasPermission(true);
        speakText("Welcome to CareSight. Point your camera at any hospital equipment and tap capture, or ask a question.");
      } catch (err) {
        console.error("Camera access denied:", err);
        setAiStatus("Camera access required for AR vision.");
      }
    };
    
    startCamera();
  }, [showLandingPage]);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === "1234") {
      setIsAdminUnlocked(true);
      setPinInput("");
    } else {
      alert("Incorrect PIN");
      setPinInput("");
    }
  };

  const saveSettings = () => {
    localStorage.setItem('caresight_gemini_key', geminiKey);
    localStorage.setItem('caresight_safety_rules', customSafetyRules);
    setShowSettings(false);
    setIsAdminUnlocked(false); // Relock for security
  };

  const speakText = (text) => {
    if (!voiceEnabled) return;
    window.speechSynthesis.cancel();
    
    setSpokenText(text);
    
    const cleanedText = text.replace(/[*#`_\-]/g, '').replace(/\[.*?\]\(.*?\)/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.rate = 1.0;
    utterance.pitch = 1.3;
    
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => 
      v.name.includes('Female') || 
      v.name.includes('Samantha') || 
      v.name.includes('Victoria') ||
      v.name.includes('Karen') ||
      v.name.includes('Zira') ||
      v.name.includes('Google UK English Female') ||
      v.name.includes('Feminine') ||
      v.name.includes('Microsoft Hazel')
    );
    
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }
    
    window.dispatchEvent(new CustomEvent('ai_speaking_start'));
    utterance.onend = () => window.dispatchEvent(new CustomEvent('ai_speaking_end'));
    
    window.speechSynthesis.speak(utterance);
  };

  const startVoiceRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Please type your question.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      setCustomQuestion("");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setCustomQuestion(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  const handleRoomSafety = () => {
    window.speechSynthesis.cancel();
    setAiStatus("Safety Guidelines");
    
    // Use admin rules if present, otherwise fallback
    if (customSafetyRules.trim().length > 0) {
      speakText(customSafetyRules);
    } else {
      speakText("Welcome to CareSight. For your safety, please ensure your bed rails remain up while sleeping. Use the call button if you need assistance getting up. Do not attempt to unplug any medical equipment.");
    }
  };

  const submitCustomQuestion = () => {
    setShowAskModal(false);
    handleCapture(customQuestion || "What is in this image?");
  };

  const handleCapture = async (promptText = "Identify the hospital equipment visible in this image. Explain what it is and what it does in simple, comforting terms (max 2 sentences).") => {
    if (!videoRef.current || !canvasRef.current || loading) return;
    
    if (!geminiKey || geminiKey.trim().length < 10) {
      setShowSettings(true);
      speakText("Please ask your care provider to configure the system API key in the admin panel.");
      return;
    }

    setLoading(true);
    setAiStatus("Analyzing image...");
    window.speechSynthesis.cancel();
    setIsSpeaking(true); 
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const base64Image = canvas.toDataURL('image/jpeg', 0.6);
    await analyzeImageWithGemini(base64Image, promptText);
  };

  const analyzeImageWithGemini = async (base64Image, promptText) => {
    try {
      const rawBase64 = base64Image.split(',')[1];

      // Strict Medical Guardrails in System Prompt
      const strictSystemInstruction = `You are CareSight, a helpful virtual bedside nurse guide for hospital patients. 
      CRITICAL RULE 1: NEVER provide medical advice, diagnoses, or medication recommendations. 
      CRITICAL RULE 2: If the user asks a health-related question, asks for symptom advice, or tries to take their health into their own hands, you MUST rigidly refuse and respond EXACTLY with: "I cannot provide medical advice. Please press your call button to speak with your doctor or nurse."
      CRITICAL RULE 3: If you do not see any hospital equipment, politely state you don't recognize any equipment in the view. 
      CRITICAL RULE 4: Keep all valid answers short, friendly, and under 3 sentences.`;

      const payload = {
        systemInstruction: {
          parts: [{ text: strictSystemInstruction }]
        },
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: rawBase64
                }
              }
            ]
          }
        ]
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      setLoading(false);
      setIsSpeaking(false);
      
      if (data.error) {
        throw new Error(data.error.message);
      }
      
      const analysisText = data.candidates[0].content.parts[0].text;
      setAiStatus("Analysis Complete");
      speakText(analysisText);
      
    } catch (err) {
      console.error("Gemini API Error:", err);
      setLoading(false);
      setIsSpeaking(false);
      
      const errorMessage = err.message || "Connection error";
      
      if (errorMessage.toLowerCase().includes('quota') || errorMessage.includes('429')) {
        setAiStatus("Rate limit reached.");
        speakText("I am receiving too many requests right now. Please wait a few seconds and try again.");
      } else {
        setAiStatus(`Error: ${errorMessage}`);
        speakText("I had trouble connecting to the Gemini servers. Please check the screen for details.");
      }
    }
  };

  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
    if (voiceEnabled) window.speechSynthesis.cancel();
  };

  return (
    <div className="app-container" style={{ background: '#000' }}>
      
      {showLandingPage && (
        <LandingPage onComplete={() => setShowLandingPage(false)} />
      )}

      {/* Live AR Camera Feed */}
      <video 
        ref={videoRef}
        autoPlay 
        playsInline 
        muted 
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 1,
          opacity: hasPermission ? 1 : 0,
          transition: 'opacity 0.5s'
        }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Dark Gradient Overlay for UI legibility */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 20%, transparent 60%, rgba(0,0,0,0.9) 100%)',
        zIndex: 5,
        pointerEvents: 'none'
      }} />

      {/* Top UI Layer */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '24px 20px',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        
        {/* Floating Avatar Widget */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(20, 26, 38, 0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '10px 16px',
          borderRadius: 'var(--radius-full)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden' }}>
            <Avatar3D isSpeaking={isSpeaking} width="100%" height="100%" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-primary)' }}>CareSight Guide</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {loading ? "Thinking..." : aiStatus}
            </span>
          </div>
        </div>

        {/* Top Right Controls */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setShowSettings(true)}
            style={{
              background: 'rgba(20, 26, 38, 0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)',
              width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer'
            }}
          >
            <Settings size={20} />
          </button>
          
          <button 
            onClick={toggleVoice}
            style={{
              background: 'rgba(20, 26, 38, 0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)',
              width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer'
            }}
          >
            {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} color="#ff4d4d" />}
          </button>
        </div>
      </div>

      {/* AR Viewfinder UI */}
      <div style={{
        position: 'absolute',
        top: '40%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '240px',
        height: '240px',
        border: '2px dashed rgba(255, 255, 255, 0.3)',
        borderRadius: '24px',
        zIndex: 5,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {loading && (
          <Sparkles size={40} color="var(--color-primary)" style={{ animation: 'pulse-glow 1.5s infinite alternate' }} />
        )}
      </div>

      {/* AI Speech Transcript Dialogue Box */}
      {isSpeaking && spokenText && (
        <div style={{
          position: 'absolute',
          bottom: '160px', 
          left: '20px',
          right: '20px',
          background: 'rgba(20, 26, 38, 0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          zIndex: 15,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          animation: 'fade-in var(--transition-normal)'
        }}>
          <p style={{
            color: 'white',
            fontSize: '0.95rem',
            lineHeight: 1.5,
            margin: 0,
            fontFamily: 'var(--font-sans)',
            fontWeight: 500
          }}>
            {spokenText}
          </p>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '0 24px 40px',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px'
      }}>
        
        {!hasPermission && (
          <div style={{ background: 'rgba(255,50,50,0.2)', padding: '12px 16px', borderRadius: '8px', border: '1px solid #ff4d4d', color: 'white', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={16} /> Camera permission is required
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '320px'
        }}>
          <button
            onClick={handleRoomSafety}
            style={{
              width: '60px', height: '60px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: '4px'
            }}
          >
            <Shield size={24} color="var(--color-secondary)" />
          </button>

          <button
            onClick={() => handleCapture()}
            disabled={!hasPermission || loading}
            style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: loading ? 'var(--bg-surface)' : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              border: '4px solid white', boxShadow: '0 0 20px rgba(0, 229, 255, 0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: hasPermission && !loading ? 'pointer' : 'not-allowed',
              transition: 'transform 0.2s', transform: loading ? 'scale(0.95)' : 'scale(1)'
            }}
          >
            <Camera size={32} color="white" />
          </button>

          <button
            onClick={() => { setCustomQuestion(""); setShowAskModal(true); }}
            style={{
              width: '60px', height: '60px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: '4px'
            }}
          >
            <MessageCircleQuestion size={24} color="var(--color-primary)" />
          </button>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '320px', padding: '0 10px' }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: '600', textAlign: 'center', width: '60px' }}>Safety</span>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', fontWeight: '600', textAlign: 'center' }}>{loading ? "Analyzing..." : "Identify"}</span>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: '600', textAlign: 'center', width: '60px' }}>Ask AI</span>
        </div>
      </div>

      {/* Ask Question Modal */}
      {showAskModal && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', padding: '24px'
        }}>
          <button onClick={() => setShowAskModal(false)} style={{ alignSelf: 'flex-end', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '8px' }}>
            <X size={28} />
          </button>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '24px' }}>
            <h2 style={{ fontSize: '1.5rem', color: 'white', textAlign: 'center', marginBottom: '8px' }}>What do you want to know?</h2>
            
            <button 
              onClick={startVoiceRecording}
              style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: isRecording ? 'rgba(255,50,50,0.2)' : 'rgba(255,255,255,0.1)', 
                border: isRecording ? '2px solid #ff4d4d' : '1px solid rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: isRecording ? '#ff4d4d' : 'white',
                cursor: 'pointer', transition: 'all 0.2s',
                animation: isRecording ? 'pulse-glow 1s infinite alternate' : 'none'
              }}
            >
              <Mic size={36} />
            </button>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {isRecording ? "Listening..." : "Tap to speak your question"}
            </p>

            <div style={{ width: '100%', maxWidth: '340px', position: 'relative', marginTop: '24px' }}>
              <input 
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Or type your question here..."
                style={{
                  width: '100%', padding: '16px 56px 16px 20px', borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-color)', background: 'var(--bg-surface)',
                  color: 'white', fontSize: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}
              />
              <button 
                onClick={submitCustomQuestion}
                disabled={!customQuestion.trim()}
                style={{
                  position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                  background: customQuestion.trim() ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                  border: 'none', width: '40px', height: '40px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                  cursor: customQuestion.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                <Send size={18} style={{ marginLeft: '2px' }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Settings Modal */}
      {showSettings && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px', padding: '24px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => { setShowSettings(false); setIsAdminUnlocked(false); }} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
              <X size={20} />
            </button>
            
            <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} /> Admin Settings
            </h2>
            
            {!isAdminUnlocked ? (
              <form onSubmit={handlePinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Please enter the Admin PIN to access these settings.</p>
                <input 
                  type="password" 
                  value={pinInput} 
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Enter PIN (1234)"
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'white', fontSize: '1rem', textAlign: 'center', letterSpacing: '4px' }}
                />
                <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>Unlock</button>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fade-in 0.3s' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Google Gemini API Key</label>
                  <input 
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="Paste API Key here..."
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'white', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Custom Room Safety Instructions</label>
                  <textarea 
                    value={customSafetyRules}
                    onChange={(e) => setCustomSafetyRules(e.target.value)}
                    placeholder="Enter the safety rules you want the AI to read to the patient when they tap the shield button..."
                    rows={6}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'white', fontSize: '0.9rem', resize: 'vertical' }}
                  />
                </div>

                <button onClick={saveSettings} className="btn-primary" style={{ width: '100%', marginTop: '10px', justifyContent: 'center' }}>
                  Save Configuration
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default App;

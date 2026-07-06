import React, { useState, useEffect, useRef } from 'react';
import { Camera, Sparkles, ShieldAlert, Volume2, VolumeX, Settings, X, Shield, MessageCircleQuestion, Mic, Send, Lock, Pill } from 'lucide-react';
import Avatar3D from './components/Avatar3D';
import LandingPage from './components/LandingPage';

function App() {
  // Application Flow
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [activeMode, setActiveMode] = useState('identify'); // Tracks which option is focused

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
  const [allowedMedications, setAllowedMedications] = useState('');
  
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
    
    const savedRules = localStorage.getItem('caresight_safety_rules');
    if (savedRules) setCustomSafetyRules(savedRules);

    const savedMeds = localStorage.getItem('caresight_allowed_meds');
    if (savedMeds) setAllowedMedications(savedMeds);

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
        speakText("Welcome to CareSight. Point your camera at any hospital equipment or medication to begin.");
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
    localStorage.setItem('caresight_safety_rules', customSafetyRules);
    localStorage.setItem('caresight_allowed_meds', allowedMedications);
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
    setActiveMode('safety');
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

  // 📸 standard equipment capture
  const handleCapture = async (promptText = "Identify the hospital equipment visible in this image. Explain what it is and what it does in simple, comforting terms (max 2 sentences).") => {
    setActiveMode('identify');
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

  // 💊 new medication verification capture
  const handleMedicationCapture = async () => {
    setActiveMode('medication');
    if (!videoRef.current || !canvasRef.current || loading) return;
    
    if (!geminiKey || geminiKey.trim().length < 10) {
      setShowSettings(true);
      speakText("Please ask your care provider to configure the system API key in the admin panel.");
      return;
    }

    setLoading(true);
    setAiStatus("Verifying medication...");
    window.speechSynthesis.cancel();
    setIsSpeaking(true); 
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const base64Image = canvas.toDataURL('image/jpeg', 0.6);

    const medsPrompt = `You are CareSight, a highly accurate medical verification AI. 
    You are looking at an image of a medication. 
    The authorized medications for this specific room are: ${allowedMedications || "None listed by admin"}.
    CRITICAL RULE 1: Analyze the text and labels on the medication in this image.
    CRITICAL RULE 2: Compare the recognized medication to the authorized list.
    CRITICAL RULE 3: If it matches, confirm it is authorized. If it DOES NOT MATCH, trigger an immediate warning stating the medication is NOT authorized for this room!
    CRITICAL RULE 4: Always end your response with EXACTLY this disclaimer: "This is an AI verification. Please confirm with your human nurse."
    CRITICAL RULE 5: Keep your response under 3 sentences.`;

    const userPrompt = "Analyze this medication and verify if it is on the authorized list.";
    await analyzeImageWithGemini(base64Image, userPrompt, medsPrompt);
  };

  const analyzeImageWithGemini = async (base64Image, promptText, customSystemPrompt = null) => {
    try {
      const rawBase64 = base64Image.split(',')[1];

      // Default Strict Medical Guardrails for general inquiries
      const defaultSystemInstruction = `You are CareSight, a helpful virtual bedside nurse guide for hospital patients. 
      CRITICAL RULE 1: NEVER provide medical advice, diagnoses, or medication recommendations. 
      CRITICAL RULE 2: If the user asks a health-related question, asks for symptom advice, or tries to take their health into their own hands, you MUST rigidly refuse and respond EXACTLY with: "I cannot provide medical advice. Please press your call button to speak with your doctor or nurse."
      CRITICAL RULE 3: If you do not see any hospital equipment, politely state you don't recognize any equipment in the view. 
      CRITICAL RULE 4: Keep all valid answers short, friendly, and under 3 sentences.`;

      const payload = {
        systemInstruction: {
          parts: [{ text: customSystemPrompt || defaultSystemInstruction }]
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

  // Helper function to dynamically generate button styles based on active state
  const getButtonStyles = (modeName) => {
    const isActive = activeMode === modeName;
    return {
      width: isActive ? '70px' : '55px',
      height: isActive ? '70px' : '55px',
      borderRadius: '50%',
      background: isActive 
        ? 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' 
        : 'rgba(255,255,255,0.1)',
      backdropFilter: isActive ? 'none' : 'blur(10px)',
      border: isActive ? '3px solid white' : '1px solid rgba(255,255,255,0.2)',
      boxShadow: isActive ? '0 0 20px rgba(0, 229, 255, 0.4)' : 'none',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: (loading && isActive) ? 'scale(0.95)' : 'scale(1)',
      marginTop: isActive ? '-10px' : '0' // Pops the active button up slightly
    };
  };

  const getIconColor = (modeName, defaultColor) => {
    return activeMode === modeName ? 'white' : defaultColor;
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
          opacity: hasPermission && !showLandingPage ? 1 : 0,
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
            <span style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>
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
          bottom: '140px', 
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

      {/* Bottom Action Bar (4 Buttons) */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '0 20px 30px',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        
        {!hasPermission && !showLandingPage && (
          <div style={{ background: 'rgba(255,50,50,0.2)', padding: '12px 16px', borderRadius: '8px', border: '1px solid #ff4d4d', color: 'white', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={16} /> Camera permission is required
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'flex-end', // Aligns buttons to the bottom so the larger one pops up
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '360px',
          gap: '8px',
          height: '80px' // Provides room for the 70px active button
        }}>
          
          {/* 1. Room Safety Button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '70px' }}>
            <button
              onClick={handleRoomSafety}
              style={getButtonStyles('safety')}
            >
              <Shield size={activeMode === 'safety' ? 28 : 22} color={getIconColor('safety', 'var(--color-secondary)')} />
            </button>
            <span style={{ color: activeMode === 'safety' ? 'white' : 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: '600', transition: 'all 0.3s' }}>Safety</span>
          </div>

          {/* 2. Main Capture/Identify Button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '70px' }}>
            <button
              onClick={() => handleCapture()}
              disabled={!hasPermission || loading}
              style={{ ...getButtonStyles('identify'), cursor: hasPermission && !loading ? 'pointer' : 'not-allowed' }}
            >
              <Camera size={activeMode === 'identify' ? 28 : 22} color={getIconColor('identify', 'white')} />
            </button>
            <span style={{ color: activeMode === 'identify' ? 'white' : 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: '600', transition: 'all 0.3s' }}>Identify</span>
          </div>

          {/* 3. Medication Verification Button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '70px' }}>
            <button
              onClick={() => handleMedicationCapture()}
              disabled={!hasPermission || loading}
              style={{ ...getButtonStyles('medication'), cursor: hasPermission && !loading ? 'pointer' : 'not-allowed' }}
            >
              <Pill size={activeMode === 'medication' ? 28 : 22} color={getIconColor('medication', '#ffb74d')} />
            </button>
            <span style={{ color: activeMode === 'medication' ? 'white' : 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: '600', transition: 'all 0.3s' }}>Meds</span>
          </div>

          {/* 4. Ask Question Button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '70px' }}>
            <button
              onClick={() => { setActiveMode('ask'); setCustomQuestion(""); setShowAskModal(true); }}
              style={getButtonStyles('ask')}
            >
              <MessageCircleQuestion size={activeMode === 'ask' ? 28 : 22} color={getIconColor('ask', 'var(--color-primary)')} />
            </button>
            <span style={{ color: activeMode === 'ask' ? 'white' : 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: '600', transition: 'all 0.3s' }}>Ask AI</span>
          </div>

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
            <p style={{ color: '#e2e8f0', fontSize: '0.85rem' }}>
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
                <p style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>Please enter the Admin PIN to access these settings.</p>
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
                  <label style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: '600' }}>Allowed Medications for this Room</label>
                  <textarea 
                    value={allowedMedications}
                    onChange={(e) => setAllowedMedications(e.target.value)}
                    placeholder="e.g. Aspirin, Saline IV, Penicillin. The AI will verify scanned meds against this list."
                    rows={4}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-base)', color: 'white', fontSize: '0.9rem', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: '600' }}>Custom Room Safety Instructions</label>
                  <textarea 
                    value={customSafetyRules}
                    onChange={(e) => setCustomSafetyRules(e.target.value)}
                    placeholder="Enter the safety rules you want the AI to read to the patient when they tap the shield button..."
                    rows={4}
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

import React, { useState, useRef } from 'react';
import { Play, SkipForward } from 'lucide-react';

function LandingPage({ onComplete }) {
  const [step, setStep] = useState('start'); // 'start' or 'video'
  const videoRef = useRef(null);

  const handleStart = () => {
    setStep('video');
  };

  const handleSkipOrEnd = () => {
    onComplete();
  };

  return (
    <div className="landing-container" style={{
      position: 'absolute',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#000',
      overflow: 'hidden'
    }}>
      
      {step === 'start' && (
        <>
          {/* Animated Gradient Background */}
          <div className="animated-bg" style={{ position: 'absolute', inset: 0, zIndex: 1 }}></div>
          
          {/* Content */}
          <div style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '30px',
            padding: '40px',
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            <div style={{
              width: '100px',
              height: '100px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 40px rgba(0, 229, 255, 0.4)',
              border: '1px solid rgba(255,255,255,0.2)',
              marginBottom: '20px'
            }}>
              <img src="/favicon.svg" alt="Logo" style={{ width: '50px', height: '50px' }} />
            </div>

            <h1 style={{ color: 'white', fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-1px', margin: 0 }}>
              CareSight
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', lineHeight: 1.5, margin: 0 }}>
              Your personal AR nurse guide. Let's get you oriented with your new room.
            </p>

            <button 
              onClick={handleStart}
              className="glass-button"
              style={{
                marginTop: '20px',
                padding: '16px 40px',
                borderRadius: '50px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '1.1rem',
                fontWeight: '600',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(20px)',
                cursor: 'pointer',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                transition: 'all 0.3s ease'
              }}
            >
              <Play fill="white" size={20} />
              Begin Orientation
            </button>
          </div>
        </>
      )}

      {step === 'video' && (
        <div style={{ position: 'absolute', inset: 0, background: '#000', zIndex: 20 }}>
          <video 
            ref={videoRef}
            src="/nurse-guide.mp4"
            autoPlay 
            playsInline 
            onEnded={handleSkipOrEnd}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover' // ensures vertical video fills screen
            }}
          />
          
          <button 
            onClick={handleSkipOrEnd}
            style={{
              position: 'absolute',
              top: '40px',
              right: '20px',
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              zIndex: 30
            }}
          >
            Skip <SkipForward size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default LandingPage;

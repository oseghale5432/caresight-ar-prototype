import React from 'react';

const Avatar3D = ({ isSpeaking, width = '100%', height = '100%' }) => {
  return (
    <div 
      className={`avatar-display-container ${isSpeaking ? 'speaking-active' : ''}`}
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width, 
        height: typeof height === 'number' ? `${height}px` : height,
        position: 'relative',
        borderRadius: 'inherit',
        overflow: 'hidden',
        background: 'transparent',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        boxShadow: isSpeaking ? '0 0 25px rgba(0, 229, 255, 0.4)' : 'none',
        transition: 'all 0.3s ease'
      }}
    >
      <img 
        src="/nurse-avatar.png" 
        alt="AI Clinician" 
        className={isSpeaking ? 'avatar-bounce' : 'avatar-breathe'}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'top center',
          zIndex: 1
        }} 
      />
      
      {/* Speaking Audio Wave Visualizer Ring */}
      {isSpeaking && (
        <div style={{
          position: 'absolute',
          inset: -5,
          borderRadius: 'var(--radius-full)',
          border: '4px solid var(--color-primary)',
          animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
          zIndex: 4,
          pointerEvents: 'none'
        }} />
      )}

      <style>{`
        .avatar-breathe {
          animation: breathe 4s ease-in-out infinite;
          transform-origin: bottom center;
        }
        .avatar-bounce {
          animation: talk-bounce 0.4s ease-in-out infinite alternate;
          transform-origin: bottom center;
        }
        
        @keyframes breathe {
          0% { transform: scale(1); }
          50% { transform: scale(1.04) translateY(-2px); }
          100% { transform: scale(1); }
        }
        @keyframes talk-bounce {
          0% { transform: scale(1.02) translateY(0px); }
          100% { transform: scale(1.06) translateY(-4px); }
        }
        @keyframes ping {
          75%, 100% {
            transform: scale(1.15);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default Avatar3D;

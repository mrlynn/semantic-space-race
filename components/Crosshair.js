'use client';

import { Box } from '@mui/material';
import { useState, useEffect } from 'react';

/**
 * Dynamic targeting crosshair with animations
 * Professional space shooter aesthetic
 */
export default function Crosshair({ themeMode = 'dark', isLocked = false }) {
  const [pulse, setPulse] = useState(false);

  // Pulse effect every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 300);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const primaryColor = '#00ED64'; // MongoDB green
  const secondaryColor = isLocked ? '#FFB800' : '#00ED64'; // Orange when locked
  const glowIntensity = isLocked ? 12 : 8;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 80,
        height: 80,
        pointerEvents: 'none',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Rotating outer ring */}
      <Box
        sx={{
          position: 'absolute',
          width: 70,
          height: 70,
          border: `2px solid ${secondaryColor}`,
          borderRadius: '50%',
          opacity: 0.6,
          borderStyle: 'dashed',
          borderDasharray: '10 15',
          animation: 'rotate 8s linear infinite',
          boxShadow: `0 0 ${glowIntensity}px ${secondaryColor}`,
          transition: 'all 0.3s ease',
          '@keyframes rotate': {
            from: { transform: 'rotate(0deg)' },
            to: { transform: 'rotate(360deg)' },
          },
        }}
      />

      {/* Pulsing middle ring */}
      <Box
        sx={{
          position: 'absolute',
          width: pulse ? 55 : 50,
          height: pulse ? 55 : 50,
          border: `2px solid ${primaryColor}`,
          borderRadius: '50%',
          opacity: pulse ? 0.8 : 0.4,
          transition: 'all 0.3s ease',
          boxShadow: `0 0 ${pulse ? 15 : 6}px ${primaryColor}`,
        }}
      />

      {/* Corner brackets - Top Left */}
      <Box
        sx={{
          position: 'absolute',
          top: 10,
          left: 10,
          width: 12,
          height: 12,
          borderTop: `2px solid ${primaryColor}`,
          borderLeft: `2px solid ${primaryColor}`,
          opacity: 0.9,
          boxShadow: `0 0 4px ${primaryColor}`,
          animation: isLocked ? 'cornerPulse 0.5s ease-in-out infinite' : 'none',
          '@keyframes cornerPulse': {
            '0%, 100%': { opacity: 0.9 },
            '50%': { opacity: 0.3 },
          },
        }}
      />

      {/* Corner brackets - Top Right */}
      <Box
        sx={{
          position: 'absolute',
          top: 10,
          right: 10,
          width: 12,
          height: 12,
          borderTop: `2px solid ${primaryColor}`,
          borderRight: `2px solid ${primaryColor}`,
          opacity: 0.9,
          boxShadow: `0 0 4px ${primaryColor}`,
          animation: isLocked ? 'cornerPulse 0.5s ease-in-out infinite' : 'none',
        }}
      />

      {/* Corner brackets - Bottom Left */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          width: 12,
          height: 12,
          borderBottom: `2px solid ${primaryColor}`,
          borderLeft: `2px solid ${primaryColor}`,
          opacity: 0.9,
          boxShadow: `0 0 4px ${primaryColor}`,
          animation: isLocked ? 'cornerPulse 0.5s ease-in-out infinite' : 'none',
        }}
      />

      {/* Corner brackets - Bottom Right */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          width: 12,
          height: 12,
          borderBottom: `2px solid ${primaryColor}`,
          borderRight: `2px solid ${primaryColor}`,
          opacity: 0.9,
          boxShadow: `0 0 4px ${primaryColor}`,
          animation: isLocked ? 'cornerPulse 0.5s ease-in-out infinite' : 'none',
        }}
      />

      {/* Center crosshair lines */}
      {/* Horizontal */}
      <Box
        sx={{
          position: 'absolute',
          width: 30,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)`,
          opacity: 0.8,
          boxShadow: `0 0 6px ${primaryColor}`,
        }}
      />

      {/* Vertical */}
      <Box
        sx={{
          position: 'absolute',
          width: 2,
          height: 30,
          background: `linear-gradient(180deg, transparent, ${primaryColor}, transparent)`,
          opacity: 0.8,
          boxShadow: `0 0 6px ${primaryColor}`,
        }}
      />

      {/* Center dot - pulsing */}
      <Box
        sx={{
          position: 'absolute',
          width: pulse ? 8 : 6,
          height: pulse ? 8 : 6,
          borderRadius: '50%',
          backgroundColor: primaryColor,
          opacity: pulse ? 1 : 0.9,
          boxShadow: `0 0 ${pulse ? 12 : 6}px ${primaryColor}`,
          transition: 'all 0.3s ease',
        }}
      />

      {/* Lock-on indicator - only visible when locked */}
      {isLocked && (
        <Box
          sx={{
            position: 'absolute',
            width: 85,
            height: 85,
            border: `3px solid ${secondaryColor}`,
            borderRadius: '50%',
            opacity: 0.8,
            animation: 'lockPulse 0.8s ease-in-out infinite',
            boxShadow: `0 0 20px ${secondaryColor}`,
            '@keyframes lockPulse': {
              '0%, 100%': {
                transform: 'scale(1)',
                opacity: 0.8,
              },
              '50%': {
                transform: 'scale(1.1)',
                opacity: 0.4,
              },
            },
          }}
        />
      )}

      {/* Scanning lines for tech feel */}
      <Box
        sx={{
          position: 'absolute',
          width: 1,
          height: 40,
          background: `linear-gradient(180deg, transparent, ${primaryColor}40, transparent)`,
          opacity: 0.6,
          animation: 'scan 3s ease-in-out infinite',
          '@keyframes scan': {
            '0%, 100%': { transform: 'translateX(-20px)' },
            '50%': { transform: 'translateX(20px)' },
          },
        }}
      />
    </Box>
  );
}

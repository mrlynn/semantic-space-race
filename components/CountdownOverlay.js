'use client';

import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material';

/**
 * CountdownOverlay Component
 * Large 8-bit countdown display for when round is about to expire
 */
export default function CountdownOverlay({ timeRemaining, threshold = 10000 }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Only show when time is below threshold
  const secondsLeft = Math.ceil(timeRemaining / 1000);
  const shouldShow = timeRemaining > 0 && timeRemaining <= threshold;

  if (!shouldShow) return null;

  // Color changes as time runs out
  const getCountdownColor = () => {
    if (secondsLeft <= 3) return '#FF0000'; // Red for last 3 seconds
    if (secondsLeft <= 5) return '#FF9F10'; // Orange for 4-5 seconds
    return '#FFC010'; // Yellow for 6-10 seconds
  };

  // Pulse animation intensity based on urgency
  const getPulseIntensity = () => {
    if (secondsLeft <= 3) return 1.15;
    if (secondsLeft <= 5) return 1.1;
    return 1.05;
  };

  const countdownColor = getCountdownColor();
  const pulseIntensity = getPulseIntensity();

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        pointerEvents: 'none', // Allow clicks to pass through
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark
          ? 'rgba(0, 0, 0, 0.5)'
          : 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(2px)',
      }}
    >
      {/* Main countdown number */}
      <Box
        sx={{
          position: 'relative',
          animation: 'countdownPulse 1s ease-in-out infinite',
          '@keyframes countdownPulse': {
            '0%, 100%': {
              transform: 'scale(1)',
            },
            '50%': {
              transform: `scale(${pulseIntensity})`,
            },
          },
        }}
      >
        {/* 8-bit shadow layer */}
        <Typography
          variant="h1"
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            fontFamily: '"PressStart2PRegular", monospace',
            fontSize: { xs: '10rem', sm: '12rem', md: '15rem' },
            fontWeight: 700,
            color: 'rgba(0, 0, 0, 0.8)',
            lineHeight: 1,
            userSelect: 'none',
            textShadow: 'none',
            imageRendering: 'pixelated',
            imageRendering: '-moz-crisp-edges',
            imageRendering: 'crisp-edges',
            WebkitFontSmoothing: 'none',
            MozOsxFontSmoothing: 'unset',
          }}
        >
          {secondsLeft}
        </Typography>

        {/* Main number */}
        <Typography
          variant="h1"
          sx={{
            position: 'relative',
            fontFamily: '"PressStart2PRegular", monospace',
            fontSize: { xs: '10rem', sm: '12rem', md: '15rem' },
            fontWeight: 700,
            color: countdownColor,
            lineHeight: 1,
            userSelect: 'none',
            textShadow: secondsLeft <= 3
              ? `0 0 20px ${countdownColor}, 0 0 40px ${countdownColor}, 0 0 60px ${countdownColor}`
              : `0 0 20px ${countdownColor}`,
            imageRendering: 'pixelated',
            imageRendering: '-moz-crisp-edges',
            imageRendering: 'crisp-edges',
            WebkitFontSmoothing: 'none',
            MozOsxFontSmoothing: 'unset',
          }}
        >
          {secondsLeft}
        </Typography>
      </Box>

      {/* Warning text */}
      <Typography
        variant="h4"
        sx={{
          position: 'absolute',
          bottom: { xs: '20%', sm: '25%' },
          fontFamily: '"PressStart2PRegular", monospace',
          fontSize: { xs: '1rem', sm: '1.5rem', md: '2rem' },
          color: countdownColor,
          textAlign: 'center',
          px: 2,
          lineHeight: 2,
          userSelect: 'none',
          textShadow: `0 0 10px ${countdownColor}`,
          animation: secondsLeft <= 3 ? 'warningBlink 0.5s ease-in-out infinite' : 'none',
          '@keyframes warningBlink': {
            '0%, 100%': {
              opacity: 1,
            },
            '50%': {
              opacity: 0.3,
            },
          },
          imageRendering: 'pixelated',
          imageRendering: '-moz-crisp-edges',
          imageRendering: 'crisp-edges',
          WebkitFontSmoothing: 'none',
          MozOsxFontSmoothing: 'unset',
        }}
      >
        {secondsLeft <= 3 ? 'TIME\'S UP!' : 'HURRY!'}
      </Typography>
    </Box>
  );
}

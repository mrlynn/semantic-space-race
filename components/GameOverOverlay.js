'use client';

import { Box, Typography, Paper, useTheme } from '@mui/material';
import BrandShapeDecoration from './BrandShapeDecoration';

export default function GameOverOverlay({ isOut = false }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (!isOut) {
    return null;
  }

  const overlayGradient = isDark
    ? 'linear-gradient(135deg, rgba(255, 0, 0, 0.3) 0%, rgba(139, 0, 0, 0.8) 100%)'
    : 'linear-gradient(135deg, rgba(255, 0, 0, 0.2) 0%, rgba(255, 255, 255, 0.95) 100%)';

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(5px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto', // Block all interactions
      }}
    >
      <Paper
        elevation={24}
        sx={{
          p: 4,
          maxWidth: 500,
          width: '90%',
          border: '1px solid',
          borderColor: 'rgba(255, 0, 0, 0.4)',
          borderRadius: 3,
          background: overlayGradient,
          boxShadow: '0 24px 64px rgba(255, 0, 0, 0.3)',
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'center',
        }}
      >
        <BrandShapeDecoration
          position="top-right"
          size={120}
          opacity={0.3}
          shapeNumber={28}
          color="red"
        />
        <BrandShapeDecoration
          position="bottom-left"
          size={100}
          opacity={0.25}
          shapeNumber={15}
          color="red"
        />
        
        <Typography
          variant="h2"
          component="h1"
          sx={{
            fontWeight: 900,
            color: 'error.main',
            mb: 2,
            textShadow: '0 4px 16px rgba(255, 0, 0, 0.5)',
            fontSize: { xs: '2.5rem', sm: '3.5rem' },
            position: 'relative',
            zIndex: 1,
          }}
        >
          GAME OVER
        </Typography>
        
        <Typography
          variant="h6"
          sx={{
            color: 'text.primary',
            mb: 3,
            lineHeight: 1.6,
            position: 'relative',
            zIndex: 1,
          }}
        >
          You&apos;ve run out of tokens for this round.
        </Typography>
        
        <Typography
          variant="body1"
          sx={{
            color: 'text.secondary',
            position: 'relative',
            zIndex: 1,
          }}
        >
          You can still view the game but cannot participate until the next round.
        </Typography>
      </Paper>
    </Box>
  );
}

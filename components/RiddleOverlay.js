'use client';

import { Box, Typography, Paper, Collapse, IconButton, useTheme } from '@mui/material';
import { useState } from 'react';

export default function RiddleOverlay({
  definition,
  practiceMode = false,
  currentTarget = null,
  roundPhase = 'TUTORIAL',
  gameActive = false,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [expanded, setExpanded] = useState(true);

  // Only show during active gameplay phases
  const shouldShow = gameActive && (roundPhase === 'TARGET_REVEAL' || roundPhase === 'SEARCH');

  if (!shouldShow || !definition) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1100,
        maxWidth: { xs: '90%', sm: '600px', md: '700px' },
        width: '100%',
        pointerEvents: expanded ? 'auto' : 'none', // Allow clicking through when collapsed
      }}
    >
      <Paper
        elevation={8}
        sx={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(0, 104, 74, 0.95) 0%, rgba(2, 52, 48, 0.98) 100%)'
            : 'linear-gradient(135deg, rgba(0, 237, 100, 0.15) 0%, rgba(255, 255, 255, 0.98) 100%)',
          backdropFilter: 'blur(20px)',
          border: '2px solid',
          borderColor: 'rgba(0, 237, 100, 0.4)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 237, 100, 0.3), 0 0 80px rgba(0, 237, 100, 0.15)',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          pointerEvents: 'auto',
        }}
      >
        {/* Header with collapse button */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 3,
            py: 1.5,
            borderBottom: expanded ? '1px solid' : 'none',
            borderColor: 'rgba(0, 237, 100, 0.2)',
            cursor: 'pointer',
            '&:hover': {
              bgcolor: 'rgba(0, 237, 100, 0.05)',
            },
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Typography
            variant="h6"
            color="primary"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1rem', sm: '1.25rem' },
              textShadow: isDark ? '0 0 20px rgba(0, 237, 100, 0.4)' : 'none',
            }}
          >
            🎯 Target Riddle
          </Typography>
          <IconButton
            size="small"
            sx={{
              color: 'primary.main',
              bgcolor: 'rgba(0, 237, 100, 0.1)',
              '&:hover': {
                bgcolor: 'rgba(0, 237, 100, 0.2)',
              },
            }}
          >
            {expanded ? (
              <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
              </svg>
            ) : (
              <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
              </svg>
            )}
          </IconButton>
        </Box>

        {/* Collapsible content */}
        <Collapse in={expanded}>
          <Box sx={{ px: 3, py: 2.5 }}>
            <Typography
              variant="body1"
              sx={{
                fontSize: { xs: '0.95rem', sm: '1.1rem' },
                lineHeight: 1.7,
                fontWeight: 500,
                color: isDark ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.87)',
                textAlign: 'center',
                mb: practiceMode ? 2 : 0,
              }}
            >
              {definition}
            </Typography>

            {practiceMode && currentTarget && (
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  textAlign: 'center',
                  color: 'text.secondary',
                  fontStyle: 'italic',
                  fontSize: '0.85rem',
                  mt: 1,
                  p: 1,
                  bgcolor: isDark ? 'rgba(255, 192, 16, 0.1)' : 'rgba(255, 192, 16, 0.05)',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'rgba(255, 192, 16, 0.3)',
                }}
              >
                Practice Mode: Try to find &quot;{currentTarget.label}&quot;
              </Typography>
            )}
          </Box>
        </Collapse>

        {/* Subtle glow effect at bottom when collapsed */}
        {!expanded && (
          <Box
            sx={{
              height: 4,
              background: 'linear-gradient(90deg, transparent, rgba(0, 237, 100, 0.6), transparent)',
              animation: 'pulse 2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 0.5 },
                '50%': { opacity: 1 },
              },
            }}
          />
        )}
      </Paper>

      {/* Hint text when collapsed */}
      {!expanded && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            mt: 0.5,
            color: 'rgba(0, 237, 100, 0.7)',
            fontSize: '0.75rem',
            fontStyle: 'italic',
            textShadow: isDark ? '0 0 10px rgba(0, 237, 100, 0.5)' : 'none',
          }}
        >
          Click to expand riddle
        </Typography>
      )}
    </Box>
  );
}

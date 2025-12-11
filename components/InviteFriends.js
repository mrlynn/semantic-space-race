'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';

export default function InviteFriends({ gameCode, onCopy }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(gameCode);
      setCopied(true);
      if (onCopy) {
        onCopy('Game code copied to clipboard!');
      }
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      if (onCopy) {
        onCopy('Failed to copy game code', 'error');
      }
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1.5,
        py: 0.5,
        borderRadius: 2,
        border: '2px solid',
        borderColor: 'primary.main',
        backgroundColor: 'rgba(0, 237, 100, 0.1)',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: 'rgba(0, 237, 100, 0.15)',
          boxShadow: '0 2px 8px rgba(0, 237, 100, 0.3)',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontSize: '0.65rem',
            lineHeight: 1,
            mb: 0.25,
          }}
        >
          Game Code
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: 'primary.main',
            fontWeight: 700,
            fontSize: { xs: '0.9rem', sm: '1rem' },
            letterSpacing: '0.1em',
            fontFamily: 'monospace',
          }}
        >
          {gameCode}
        </Typography>
      </Box>
      <Tooltip title={copied ? 'Copied!' : 'Copy game code'} arrow>
        <IconButton
          onClick={handleCopy}
          size="small"
          sx={{
            color: copied ? 'success.main' : 'primary.main',
            ml: 0.5,
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(0, 237, 100, 0.2)',
            },
          }}
        >
          {copied ? (
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          ) : (
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
            </svg>
          )}
        </IconButton>
      </Tooltip>
    </Box>
  );
}

'use client';

import { Box, IconButton, Tooltip, Paper, Divider } from '@mui/material';
import { useTheme } from '@mui/material';

/**
 * NavigationControls Component
 * Floating navigation panel for 3D graph exploration
 * Provides zoom, pan, and reset controls
 */
export default function NavigationControls({
  onZoomIn,
  onZoomOut,
  onMoveUp,
  onMoveDown,
  onMoveLeft,
  onMoveRight,
  onMoveForward,
  onMoveBackward,
  onReset,
  position = 'bottom-right', // 'bottom-right', 'bottom-left', 'top-right', 'top-left'
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Position mapping
  const positionStyles = {
    'bottom-right': { bottom: 100, right: 16 },
    'bottom-left': { bottom: 100, left: 420 }, // Account for HUD width
    'top-right': { top: 80, right: 16 },
    'top-left': { top: 80, left: 420 },
  };

  const buttonStyle = {
    color: 'primary.main',
    bgcolor: isDark ? 'rgba(2, 52, 48, 0.9)' : 'rgba(255, 255, 255, 0.95)',
    border: '1px solid',
    borderColor: 'rgba(0, 237, 100, 0.3)',
    borderRadius: 2,
    width: 44,
    height: 44,
    boxShadow: '0 2px 8px rgba(0, 237, 100, 0.15)',
    '&:hover': {
      bgcolor: isDark ? 'rgba(0, 104, 74, 0.3)' : 'rgba(0, 237, 100, 0.1)',
      borderColor: 'rgba(0, 237, 100, 0.5)',
      boxShadow: '0 4px 12px rgba(0, 237, 100, 0.25)',
    },
    '&:active': {
      boxShadow: '0 1px 4px rgba(0, 237, 100, 0.2)',
    },
    transition: 'all 0.2s ease',
  };

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 1100,
        p: 1.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'rgba(0, 237, 100, 0.2)',
        background: isDark
          ? 'linear-gradient(135deg, rgba(0, 104, 74, 0.3) 0%, rgba(2, 52, 48, 0.95) 100%)'
          : 'linear-gradient(135deg, rgba(0, 237, 100, 0.1) 0%, rgba(255, 255, 255, 0.98) 100%)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 32px rgba(0, 237, 100, 0.15)',
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        gap: 1,
      }}
    >
      {/* Zoom Controls */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
        <Tooltip title="Zoom In" placement="left" arrow>
          <IconButton onClick={onZoomIn} sx={buttonStyle}>
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom Out" placement="left" arrow>
          <IconButton onClick={onZoomOut} sx={buttonStyle}>
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13H5v-2h14v2z" />
            </svg>
          </IconButton>
        </Tooltip>
      </Box>

      <Divider sx={{ borderColor: 'primary.main', opacity: 0.3 }} />

      {/* Directional Controls - Vertical */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
        <Tooltip title="Move Up" placement="left" arrow>
          <IconButton onClick={onMoveUp} sx={buttonStyle}>
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
            </svg>
          </IconButton>
        </Tooltip>

        {/* Horizontal Controls */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Move Left" placement="left" arrow>
            <IconButton onClick={onMoveLeft} sx={buttonStyle}>
              <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z" />
              </svg>
            </IconButton>
          </Tooltip>

          <Tooltip title="Move Right" placement="left" arrow>
            <IconButton onClick={onMoveRight} sx={buttonStyle}>
              <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
              </svg>
            </IconButton>
          </Tooltip>
        </Box>

        <Tooltip title="Move Down" placement="left" arrow>
          <IconButton onClick={onMoveDown} sx={buttonStyle}>
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
            </svg>
          </IconButton>
        </Tooltip>
      </Box>

      <Divider sx={{ borderColor: 'primary.main', opacity: 0.3 }} />

      {/* Depth Controls */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
        <Tooltip title="Move Forward" placement="left" arrow>
          <IconButton onClick={onMoveForward} sx={buttonStyle}>
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
              <path d="M12 2l-6 6 1.41 1.41L12 4.83l4.59 4.58L18 8z" />
            </svg>
          </IconButton>
        </Tooltip>

        <Tooltip title="Move Backward" placement="left" arrow>
          <IconButton onClick={onMoveBackward} sx={buttonStyle}>
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 16l6-6-1.41-1.41L12 13.17 7.41 8.59 6 10z" />
              <path d="M12 22l6-6-1.41-1.41L12 19.17 7.41 14.59 6 16z" />
            </svg>
          </IconButton>
        </Tooltip>
      </Box>

      <Divider sx={{ borderColor: 'primary.main', opacity: 0.3 }} />

      {/* Reset Control */}
      <Tooltip title="Reset View" placement="left" arrow>
        <IconButton
          onClick={onReset}
          sx={{
            ...buttonStyle,
            bgcolor: isDark ? 'rgba(0, 104, 74, 0.2)' : 'rgba(0, 237, 100, 0.15)',
            '&:hover': {
              bgcolor: isDark ? 'rgba(0, 104, 74, 0.4)' : 'rgba(0, 237, 100, 0.25)',
            },
          }}
        >
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
          </svg>
        </IconButton>
      </Tooltip>
    </Paper>
  );
}

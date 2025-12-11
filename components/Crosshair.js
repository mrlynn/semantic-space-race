'use client';

import { Box } from '@mui/material';

export default function Crosshair({ themeMode = 'dark' }) {
  const color = themeMode === 'dark' ? '#00ED64' : '#00684A';
  const size = 20;
  const thickness = 2;
  const gap = 8;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: size * 2,
        height: size * 2,
        pointerEvents: 'none',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Horizontal line */}
      <Box
        sx={{
          position: 'absolute',
          width: size * 2,
          height: thickness,
          backgroundColor: color,
          opacity: 0.8,
          boxShadow: `0 0 ${thickness * 2}px ${color}`,
        }}
      />
      
      {/* Vertical line */}
      <Box
        sx={{
          position: 'absolute',
          width: thickness,
          height: size * 2,
          backgroundColor: color,
          opacity: 0.8,
          boxShadow: `0 0 ${thickness * 2}px ${color}`,
        }}
      />
      
      {/* Center dot */}
      <Box
        sx={{
          position: 'absolute',
          width: 4,
          height: 4,
          borderRadius: '50%',
          backgroundColor: color,
          opacity: 0.9,
          boxShadow: `0 0 4px ${color}`,
        }}
      />
      
      {/* Outer ring for better visibility */}
      <Box
        sx={{
          position: 'absolute',
          width: size * 2 + gap * 2,
          height: size * 2 + gap * 2,
          border: `1px solid ${color}`,
          borderRadius: '50%',
          opacity: 0.3,
        }}
      />
    </Box>
  );
}

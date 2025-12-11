'use client';

import { IconButton, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export default function ThemeToggle({ mode, onToggle }) {
  const theme = useTheme();

  return (
    <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton
        onClick={onToggle}
        sx={{
          color: 'primary.main',
          '&:hover': {
            backgroundColor: 'rgba(0, 237, 100, 0.1)',
          },
        }}
      >
        {mode === 'dark' ? (
          // Sun icon for light mode
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
          </svg>
        ) : (
          // Moon icon for dark mode
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.34 2.02C6.59 1.82 2 6.42 2 12c0 5.52 4.48 10 10 10 3.71 0 6.93-2.02 8.66-5.02-7.51-.25-13.12-6.11-13.12-13.11 0-.78.07-1.53.2-2.25C8.15 2.28 8.85 2.02 9.66 2.02c.34 0 .68.02 1.01.07.38-.14.78-.24 1.19-.32-.12-.21-.29-.4-.52-.55z" />
          </svg>
        )}
      </IconButton>
    </Tooltip>
  );
}

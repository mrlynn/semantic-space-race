'use client';

import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Drawer,
  IconButton,
} from '@mui/material';

export default function Leaderboard({
  players = [],
  currentPlayerId,
  isMobile = false,
  mobileOpen = false,
  onMobileClose = () => {},
}) {
  // Sort players by score (descending)
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const leaderboardContent = (
    <Box sx={{ width: isMobile ? '85vw' : 280, maxWidth: 320, p: isMobile ? 3 : 0 }}>
      {/* Mobile Header with Close Button */}
      {isMobile && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" color="primary" fontWeight={700}>
            Leaderboard
          </Typography>
          <IconButton onClick={onMobileClose} sx={{ color: 'primary.main' }}>
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </IconButton>
        </Box>
      )}

      <Paper
        elevation={6}
        sx={{
          p: 2.5,
          border: '2px solid',
          borderColor: 'primary.main',
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(0, 104, 74, 0.3) 0%, rgba(2, 52, 48, 0.95) 100%)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 24px rgba(0, 237, 100, 0.2)',
        }}
      >
        {!isMobile && (
          <Typography variant="h6" gutterBottom color="primary">
            Leaderboard
          </Typography>
        )}
        <List dense>
          {sortedPlayers.map((player, index) => (
            <ListItem
              key={player.id}
              sx={{
                bgcolor: player.id === currentPlayerId
                  ? 'rgba(0, 237, 100, 0.2)'
                  : 'transparent',
                borderRadius: 2,
                mb: 0.5,
                border: player.id === currentPlayerId ? '1px solid' : 'none',
                borderColor: 'primary.main',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: 'rgba(0, 237, 100, 0.1)',
                },
              }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: index === 0
                          ? 'primary.main'
                          : index === 1
                          ? 'warning.light'
                          : index === 2
                          ? 'warning.dark'
                          : 'rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: index < 3 ? 'black' : 'white',
                      }}
                    >
                      {index + 1}
                    </Box>
                    <Typography variant="body2" fontWeight={player.id === currentPlayerId ? 700 : 400}>
                      {player.nickname}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Typography variant="caption" sx={{ color: 'primary.light', fontWeight: 600 }}>
                    {player.score} points
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );

  // Mobile: Drawer, Desktop: Fixed position
  if (isMobile) {
    return (
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={onMobileClose}
        sx={{
          '& .MuiDrawer-paper': {
            bgcolor: 'rgba(2, 52, 48, 0.98)',
            backdropFilter: 'blur(10px)',
            borderLeft: '3px solid',
            borderColor: 'primary.main',
            boxShadow: '-4px 0 24px rgba(0, 237, 100, 0.3)',
          },
        }}
      >
        {leaderboardContent}
      </Drawer>
    );
  }

  // Desktop: Fixed position
  return (
    <Box
      sx={{
        position: 'absolute',
        right: 16,
        top: 80,
        zIndex: 1000,
        display: { xs: 'none', md: 'block' },
      }}
    >
      {leaderboardContent}
    </Box>
  );
}


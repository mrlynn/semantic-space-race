'use client';

import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';

export default function Leaderboard({ players = [], currentPlayerId }) {
  // Sort players by score (descending)
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <Box
      sx={{
        position: 'absolute',
        right: 16,
        top: 80, // Account for header
        width: 250,
        zIndex: 1000,
      }}
    >
      <Paper elevation={3} sx={{ p: 2, border: '1px solid', borderColor: 'primary.main' }}>
        <Typography variant="h6" gutterBottom color="primary">
          Leaderboard
        </Typography>
        <List dense>
          {sortedPlayers.map((player, index) => (
            <ListItem
              key={player.id}
              sx={{
                bgcolor: player.id === currentPlayerId ? 'action.selected' : 'transparent',
                borderRadius: 1,
                mb: 0.5,
              }}
            >
              <ListItemText
                primary={`${index + 1}. ${player.nickname}`}
                secondary={`${player.score} points`}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
}


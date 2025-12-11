'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Alert,
  Divider,
} from '@mui/material';
import MongoDBLogo from './MongoDBLogo';

export default function Lobby({
  gameCode,
  players = [],
  isHost = false,
  onStartGame,
  onJoinGame,
  onCreateGame,
}) {
  const [joinCode, setJoinCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');

  const handleCreateGame = async () => {
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }
    setError('');
    await onCreateGame(nickname.trim());
  };

  const handleJoinGame = async () => {
    if (!joinCode.trim() || !nickname.trim()) {
      setError('Please enter both game code and nickname');
      return;
    }
    setError('');
    await onJoinGame(joinCode.trim().toUpperCase(), nickname.trim());
  };

  if (gameCode) {
    // In lobby
    return (
      <Container maxWidth="md" sx={{ mt: 8, position: 'relative', zIndex: 2 }}>
        <Paper
          elevation={6}
          sx={{
            p: 5,
            borderRadius: 4,
            background: 'linear-gradient(135deg, rgba(0, 104, 74, 0.4) 0%, rgba(2, 52, 48, 0.95) 50%, rgba(0, 30, 43, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: '2px solid',
            borderColor: 'primary.main',
            boxShadow: '0 8px 32px rgba(0, 237, 100, 0.2)',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <MongoDBLogo width={150} height={38} />
          </Box>
          <Typography variant="h4" gutterBottom align="center">
            Game Lobby
          </Typography>
          <Typography variant="h6" color="primary" gutterBottom align="center" sx={{ fontWeight: 700 }}>
            Game Code: {gameCode}
          </Typography>

          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
            Players ({players.length})
          </Typography>
          <List>
            {players.map((player) => (
              <ListItem key={player.id}>
                <ListItemText
                  primary={player.nickname}
                  secondary={player.ready ? 'Ready' : 'Not ready'}
                />
              </ListItem>
            ))}
          </List>

          {isHost && (
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={onStartGame}
              sx={{
                mt: 3,
                py: 1.5,
                borderRadius: 2,
                fontSize: '1.1rem',
                fontWeight: 700,
                boxShadow: '0 4px 14px rgba(0, 237, 100, 0.4)',
                '&:hover': {
                  boxShadow: '0 6px 20px rgba(0, 237, 100, 0.6)',
                },
              }}
              disabled={players.length < 1}
            >
              Start Game
            </Button>
          )}
        </Paper>
      </Container>
    );
  }

  // Join/Create screen
  return (
    <Container maxWidth="sm" sx={{ mt: 8, position: 'relative', zIndex: 2 }}>
      <Paper
        elevation={6}
        sx={{
          p: 5,
          borderRadius: 4,
          background: 'linear-gradient(135deg, rgba(0, 104, 74, 0.4) 0%, rgba(2, 52, 48, 0.95) 50%, rgba(0, 30, 43, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          border: '2px solid',
          borderColor: 'primary.main',
          boxShadow: '0 8px 32px rgba(0, 237, 100, 0.2)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <MongoDBLogo width={180} height={45} />
        </Box>
        <Typography variant="h4" gutterBottom align="center" sx={{ mt: 2 }}>
          Semantic Hop
        </Typography>
        <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
          Navigate the semantic graph to find the target word
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          label="Your Nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          variant="outlined"
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            label="Game Code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            variant="outlined"
            inputProps={{ maxLength: 6 }}
          />
          <Button
            variant="contained"
            onClick={handleJoinGame}
            sx={{
              minWidth: 120,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 700,
            }}
          >
            Join Game
          </Button>
        </Box>

        <Divider sx={{ my: 2 }}>OR</Divider>

        <Button
          variant="outlined"
          size="large"
          fullWidth
          onClick={handleCreateGame}
          sx={{
            py: 1.5,
            borderRadius: 2,
            fontSize: '1.1rem',
            fontWeight: 700,
            borderWidth: 2,
            '&:hover': {
              borderWidth: 2,
            },
          }}
        >
          Create New Game
        </Button>
      </Paper>
    </Container>
  );
}


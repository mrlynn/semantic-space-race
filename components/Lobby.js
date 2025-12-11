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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import MongoDBLogo from './MongoDBLogo';
import BrandShapeDecoration from './BrandShapeDecoration';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '@mui/material';

// Topic definitions matching the seed script
const TOPICS = {
  'architecture-deployment': 'Architecture and Deployment',
  'mongodb-query': 'MongoDB Query',
  'aggregation-commands': 'Aggregation and Commands',
  'data-modeling': 'Data Modeling',
  'general-database': 'General Database Concepts',
};

export default function Lobby({
  gameCode,
  players = [],
  isHost = false,
  onStartGame,
  onJoinGame,
  onCreateGame,
  currentTopic = 'general-database',
  themeMode = 'dark',
  onThemeToggle = null,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  const [joinCode, setJoinCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('general-database');
  const [error, setError] = useState('');
  
  // Theme-aware gradient
  const paperGradient = isDark
    ? 'linear-gradient(135deg, rgba(0, 104, 74, 0.4) 0%, rgba(2, 52, 48, 0.95) 50%, rgba(0, 30, 43, 0.95) 100%)'
    : 'linear-gradient(135deg, rgba(0, 237, 100, 0.15) 0%, rgba(255, 255, 255, 0.98) 50%, rgba(245, 245, 245, 0.98) 100%)';

  // Theme-aware brand shape opacities - higher opacity in light mode for visibility
  const brandShapeOpacity = {
    veryLow: isDark ? 0.05 : 0.25,
    low: isDark ? 0.08 : 0.3,
    mediumLow: isDark ? 0.1 : 0.32,
    medium: isDark ? 0.12 : 0.35,
    mediumHigh: isDark ? 0.15 : 0.4,
  };

  const handleCreateGame = async () => {
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }
    setError('');
    await onCreateGame(nickname.trim(), selectedTopic);
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
            borderRadius: 0, // Sharp corners for 8-bit look
            background: paperGradient,
            backdropFilter: 'blur(20px)',
            border: '3px solid',
            borderColor: 'primary.main',
            boxShadow: '6px 6px 0px rgba(0, 237, 100, 0.3)',
            position: 'relative',
            overflow: 'hidden',
            imageRendering: 'pixelated',
          }}
        >
          <BrandShapeDecoration position="top-right" size={150} opacity={brandShapeOpacity.medium} shapeNumber={15} />
          <BrandShapeDecoration position="bottom-left" size={120} opacity={brandShapeOpacity.low} shapeNumber={22} color="chartreuse" />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, position: 'relative', zIndex: 1 }}>
            <Box sx={{ flex: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'center', flex: 1 }}>
              <MongoDBLogo width={150} height={38} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', flex: 1 }}>
              {onThemeToggle && (
                <ThemeToggle mode={themeMode} onToggle={onThemeToggle} />
              )}
            </Box>
          </Box>
          <Typography variant="h4" gutterBottom align="center">
            Game Lobby
          </Typography>
          <Typography variant="h6" color="primary" gutterBottom align="center" sx={{ fontWeight: 700 }}>
            Game Code: {gameCode}
          </Typography>
          
          {currentTopic && (
            <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 2 }}>
              Topic: {TOPICS[currentTopic] || currentTopic}
            </Typography>
          )}

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
          borderRadius: 0, // Sharp corners for 8-bit look
          background: paperGradient,
          backdropFilter: 'blur(20px)',
          border: '3px solid',
          borderColor: 'primary.main',
          boxShadow: '6px 6px 0px rgba(0, 237, 100, 0.3)',
          position: 'relative',
          overflow: 'hidden',
          imageRendering: 'pixelated',
        }}
      >
        <BrandShapeDecoration position="top-left" size={160} opacity={brandShapeOpacity.mediumLow} shapeNumber={8} />
        <BrandShapeDecoration position="bottom-right" size={140} opacity={brandShapeOpacity.mediumHigh} shapeNumber={33} color="purple" />
        <BrandShapeDecoration position="center" size={200} opacity={brandShapeOpacity.veryLow} shapeNumber={41} color="blue" />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, position: 'relative', zIndex: 1 }}>
          <Box sx={{ flex: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'center', flex: 1 }}>
            <MongoDBLogo width={180} height={45} />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', flex: 1 }}>
            {onThemeToggle && (
              <ThemeToggle mode={themeMode} onToggle={onThemeToggle} />
            )}
          </Box>
        </Box>
        
        {/* Title Graphic */}
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            mb: 4,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Box
            component="img"
            src="/title-graphic.png"
            alt="Semantic Hop"
            sx={{
              maxWidth: '100%',
              width: { xs: '300px', sm: '400px', md: '500px' },
              height: 'auto',
              objectFit: 'contain',
              filter: isDark 
                ? 'drop-shadow(0 4px 12px rgba(233, 234, 203, 0.2))' 
                : 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))',
            }}
          />
        </Box>
        
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

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Topic List</InputLabel>
          <Select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            label="Topic List"
          >
            {Object.entries(TOPICS).map(([key, name]) => (
              <MenuItem key={key} value={key}>
                {name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

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


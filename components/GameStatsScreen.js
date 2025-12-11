'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  Chip,
  useTheme,
} from '@mui/material';
import BrandShapeDecoration from './BrandShapeDecoration';
import MongoDBLogo from './MongoDBLogo';

export default function GameStatsScreen({
  finalScores = [],
  gameCode,
  onReturnToLobby,
  themeMode = 'dark',
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  // Sort players by score (descending)
  const sortedScores = [...finalScores].sort((a, b) => (b.score || 0) - (a.score || 0));
  const winner = sortedScores[0];
  
  // Theme-aware gradient
  const paperGradient = isDark
    ? 'linear-gradient(135deg, rgba(0, 104, 74, 0.4) 0%, rgba(2, 52, 48, 0.95) 50%, rgba(0, 30, 43, 0.95) 100%)'
    : 'linear-gradient(135deg, rgba(0, 237, 100, 0.15) 0%, rgba(255, 255, 255, 0.98) 50%, rgba(245, 245, 245, 0.98) 100%)';
  
  const brandShapeOpacity = {
    low: isDark ? 0.08 : 0.3,
    medium: isDark ? 0.12 : 0.35,
    mediumHigh: isDark ? 0.15 : 0.4,
  };

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
          imageRendering: '-moz-crisp-edges',
          imageRendering: 'crisp-edges',
        }}
      >
        <BrandShapeDecoration position="top-right" size={150} opacity={brandShapeOpacity.medium} shapeNumber={15} />
        <BrandShapeDecoration position="bottom-left" size={120} opacity={brandShapeOpacity.low} shapeNumber={22} color="chartreuse" />
        
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3, position: 'relative', zIndex: 1 }}>
          <MongoDBLogo width={180} height={45} />
        </Box>
        
        <Typography variant="h3" align="center" gutterBottom sx={{ mb: 1, position: 'relative', zIndex: 1 }}>
          Game Complete!
        </Typography>
        
        {winner && (
          <Box sx={{ textAlign: 'center', mb: 4, position: 'relative', zIndex: 1 }}>
            <Typography variant="h5" color="primary" gutterBottom>
              🏆 Winner: {winner.nickname}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Final Score: {winner.score || 0} points
            </Typography>
          </Box>
        )}
        
        <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2, position: 'relative', zIndex: 1 }}>
          Final Scores
        </Typography>
        
        <List sx={{ position: 'relative', zIndex: 1 }}>
          {sortedScores.map((player, index) => {
            const isWinner = index === 0 && player.score > 0;
            return (
              <ListItem
                key={player.id || player.nickname}
                sx={{
                  mb: 1,
                  border: '2px solid',
                  borderColor: isWinner ? 'primary.main' : 'divider',
                  borderRadius: 0, // Sharp corners for 8-bit look
                  backgroundColor: isWinner 
                    ? (isDark ? 'rgba(0, 237, 100, 0.1)' : 'rgba(0, 237, 100, 0.05)')
                    : 'transparent',
                  boxShadow: isWinner ? '4px 4px 0px rgba(0, 237, 100, 0.2)' : 'none',
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="h6" component="span">
                        #{index + 1} {player.nickname}
                      </Typography>
                      {isWinner && (
                        <Chip 
                          label="Winner" 
                          color="primary" 
                          size="small"
                          sx={{
                            fontFamily: '"PressStart2PRegular", monospace',
                            fontSize: '0.625rem',
                          }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography variant="body1" color="text.secondary">
                      {player.score || 0} points
                    </Typography>
                  }
                />
              </ListItem>
            );
          })}
        </List>
        
        {gameCode && (
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 3, mb: 2, position: 'relative', zIndex: 1 }}>
            Game Code: {gameCode}
          </Typography>
        )}
        
        {onReturnToLobby && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, position: 'relative', zIndex: 1 }}>
            <Button
              variant="contained"
              size="large"
              onClick={onReturnToLobby}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 0, // Sharp corners for 8-bit look
                fontSize: '1rem',
                fontWeight: 700,
                fontFamily: '"PressStart2PRegular", monospace',
                border: '3px solid',
                borderColor: 'primary.dark',
                boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.3)',
                '&:hover': {
                  transform: 'translate(-1px, -1px)',
                  boxShadow: '5px 5px 0px rgba(0, 0, 0, 0.3)',
                },
                '&:active': {
                  transform: 'translate(2px, 2px)',
                  boxShadow: '2px 2px 0px rgba(0, 0, 0, 0.3)',
                },
              }}
            >
              Return to Lobby
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
}

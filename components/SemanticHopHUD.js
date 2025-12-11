'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  LinearProgress,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  Drawer,
  IconButton,
  useTheme,
} from '@mui/material';
import { getSimilarityFeedback } from '@/lib/utils';
import BrandShapeDecoration from './BrandShapeDecoration';

export default function SemanticHopHUD({
  gameCode,
  roundNumber,
  maxRounds,
  timeRemaining,
  definition,
  onHop,
  bestSimilarity = 0,
  neighbors = [],
  relatedWords = [],
  feedback = null,
  guesses = [],
  isGuessing = false,
  hintUsed = false,
  hintText = '',
  onGetHint = null,
  isMobile = false,
  mobileOpen = false,
  onMobileClose = () => {},
  roundPhase = 'SEARCH',
  playerId = null,
  players = [],
  onMarkReady = null,
  currentTarget = null,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  const [guess, setGuess] = useState('');
  const [isMarkingReady, setIsMarkingReady] = useState(false);
  const [cheatRevealed, setCheatRevealed] = useState(false);
  const keySequenceRef = useRef([]);
  const keyTimeoutRef = useRef(null);
  
  // Development mode check
  const isDevelopment = typeof window !== 'undefined' && (
    process.env.NODE_ENV === 'development' || 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
  );
  
  // Cheat code: Press 'T' three times quickly (within 1 second)
  useEffect(() => {
    if (!isDevelopment) return;
    
    const handleKeyPress = (e) => {
      // Only trigger if not typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      // Check for 'T' key (case insensitive)
      if (e.key.toLowerCase() === 't') {
        const now = Date.now();
        const sequence = keySequenceRef.current;
        
        // Clear old sequence if more than 1 second has passed
        if (sequence.length > 0 && now - sequence[0] > 1000) {
          sequence.length = 0;
        }
        
        // Add current key press
        sequence.push(now);
        
        // Keep only last 3 presses
        if (sequence.length > 3) {
          sequence.shift();
        }
        
        // Check if we have 3 presses within 1 second
        if (sequence.length === 3 && (sequence[2] - sequence[0]) <= 1000) {
          setCheatRevealed(prev => !prev);
          sequence.length = 0; // Reset sequence
          console.log('🎮 [CHEAT] Target word reveal toggled');
        }
        
        // Clear timeout
        if (keyTimeoutRef.current) {
          clearTimeout(keyTimeoutRef.current);
        }
        
        // Reset sequence after 1 second of no activity
        keyTimeoutRef.current = setTimeout(() => {
          sequence.length = 0;
        }, 1000);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (keyTimeoutRef.current) {
        clearTimeout(keyTimeoutRef.current);
      }
    };
  }, [isDevelopment]);
  
  const currentPlayer = players.find(p => p.id === playerId);
  const isReady = currentPlayer?.ready || false;
  const readyCount = players.filter(p => p.ready).length;
  const totalPlayers = players.length;
  
  // Theme-aware gradient backgrounds
  const paperGradient = isDark
    ? 'linear-gradient(135deg, rgba(0, 104, 74, 0.3) 0%, rgba(2, 52, 48, 0.8) 100%)'
    : 'linear-gradient(135deg, rgba(0, 237, 100, 0.1) 0%, rgba(255, 255, 255, 0.95) 100%)';
  
  const warningGradient = isDark
    ? 'linear-gradient(135deg, rgba(255, 192, 16, 0.2) 0%, rgba(2, 52, 48, 0.8) 100%)'
    : 'linear-gradient(135deg, rgba(255, 192, 16, 0.15) 0%, rgba(255, 255, 255, 0.95) 100%)';
  
  const hintGradient = isDark
    ? (hintUsed
        ? 'linear-gradient(135deg, rgba(255, 192, 16, 0.15) 0%, rgba(2, 52, 48, 0.8) 100%)'
        : 'linear-gradient(135deg, rgba(0, 104, 74, 0.3) 0%, rgba(2, 52, 48, 0.8) 100%)')
    : (hintUsed
        ? 'linear-gradient(135deg, rgba(255, 192, 16, 0.1) 0%, rgba(255, 255, 255, 0.95) 100%)'
        : 'linear-gradient(135deg, rgba(0, 237, 100, 0.1) 0%, rgba(255, 255, 255, 0.95) 100%)');

  // Theme-aware brand shape opacities - higher opacity in light mode for visibility
  const brandShapeOpacity = {
    low: isDark ? 0.12 : 0.35,
    medium: isDark ? 0.15 : 0.4,
    high: isDark ? 0.18 : 0.45,
    warning: isDark ? 0.2 : 0.5,
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('🔵 [HUD] handleSubmit called', { guess: guess.trim(), hasOnHop: !!onHop, isGuessing, roundPhase, onHopType: typeof onHop });
    if (!onHop) {
      console.error('🔴 [HUD] onHop is not defined!');
      return;
    }
    if (guess.trim() && !isGuessing) {
      console.log('🔵 [HUD] Calling onHop with:', guess.trim());
      try {
        onHop(guess.trim());
        setGuess('');
      } catch (error) {
        console.error('🔴 [HUD] Error calling onHop:', error);
      }
    } else {
      console.log('🔴 [HUD] handleSubmit blocked:', { hasGuess: !!guess.trim(), isGuessing, roundPhase });
    }
  };

  const handleButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔵 [HUD] Button clicked directly', { guess: guess.trim(), hasOnHop: !!onHop, isGuessing, roundPhase });
    if (guess.trim() && !isGuessing && onHop) {
      console.log('🔵 [HUD] Calling onHop from button click:', guess.trim());
      try {
        onHop(guess.trim());
        setGuess('');
      } catch (error) {
        console.error('🔴 [HUD] Error calling onHop from button:', error);
      }
    }
  };

  const feedbackInfo = feedback ? getSimilarityFeedback(feedback.similarity) : null;

  const hudContent = (
    <Box
      sx={{
        width: isMobile ? '85vw' : 400,
        maxWidth: 400,
        height: '100%',
        overflowY: 'auto',
        p: 3,
        bgcolor: isDark ? 'rgba(2, 52, 48, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Mobile Header with Close Button */}
      {isMobile && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" color="primary" fontWeight={700}>
            Game Info
          </Typography>
          <IconButton onClick={onMobileClose} sx={{ color: 'primary.main' }}>
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </IconButton>
        </Box>
      )}

      {/* Game Info */}
      <Paper elevation={3} sx={{
        p: 2.5,
        mb: 2.5,
        border: '2px solid',
        borderColor: 'primary.main',
        borderRadius: 3,
        background: paperGradient,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <BrandShapeDecoration position="top-right" size={100} opacity={brandShapeOpacity.medium} shapeNumber={3} />
        <Typography variant="h6" gutterBottom color="primary" sx={{ position: 'relative', zIndex: 1 }}>
          Game Code: {gameCode}
        </Typography>
        <Typography variant="body1" gutterBottom>
          Round {roundNumber}/{maxRounds}
        </Typography>
        {timeRemaining !== null && (
          <Typography variant="body2" color="text.secondary">
            Time: {Math.ceil(timeRemaining / 1000)}s
          </Typography>
        )}
      </Paper>

      {/* Riddle/Definition */}
      <Paper elevation={3} sx={{
        p: 2.5,
        mb: 2.5,
        border: '2px solid',
        borderColor: 'primary.main',
        borderRadius: 3,
        background: paperGradient,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <BrandShapeDecoration position="bottom-left" size={120} opacity={brandShapeOpacity.low} shapeNumber={12} />
        <Typography variant="h6" gutterBottom color="primary" sx={{ position: 'relative', zIndex: 1 }}>
          Riddle
        </Typography>
        <Typography variant="body1" sx={{ minHeight: 100 }}>
          {definition || 'Waiting for round to start...'}
        </Typography>
        {/* Dev cheat: Target word reveal */}
        {isDevelopment && cheatRevealed && currentTarget && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              bgcolor: isDark ? 'rgba(255, 192, 16, 0.15)' : 'rgba(255, 192, 16, 0.1)',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'warning.main',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Typography variant="caption" color="warning.main" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
              🎮 DEV MODE - Target Word:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'warning.main' }}>
              {currentTarget.label}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Ready Section - Show when waiting for players to be ready */}
      {roundPhase === 'WAITING_FOR_READY' && (
        <Paper elevation={3} sx={{
          p: 2.5,
          mb: 2.5,
          border: '2px solid',
          borderColor: 'warning.main',
          borderRadius: 3,
          background: warningGradient,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <BrandShapeDecoration position="top-right" size={100} opacity={brandShapeOpacity.warning} shapeNumber={28} color="yellow" />
          <Typography variant="h6" gutterBottom color="warning.main" sx={{ position: 'relative', zIndex: 1 }}>
            Time&apos;s Up!
          </Typography>

          {/* Display the target word that was missed */}
          {currentTarget && (
            <Box
              sx={{
                mb: 2,
                p: 2,
                bgcolor: isDark ? 'rgba(0, 237, 100, 0.15)' : 'rgba(0, 237, 100, 0.1)',
                borderRadius: 2,
                border: '2px solid',
                borderColor: 'primary.main',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                The target word was:
              </Typography>
              <Typography variant="h5" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
                {currentTarget.label}
              </Typography>
              {definition && (
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block' }}>
                  {definition}
                </Typography>
              )}
            </Box>
          )}

          <Typography variant="body2" sx={{ mb: 2 }}>
            Waiting for all players to be ready for the next round...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ready: {readyCount}/{totalPlayers} players
          </Typography>
          <List dense sx={{ mb: 2 }}>
            {players.map((player) => (
              <ListItem key={player.id} disablePadding>
                <ListItemText
                  primary={player.nickname}
                  secondary={player.ready ? '✓ Ready' : 'Waiting...'}
                  sx={{
                    color: player.ready ? 'success.main' : 'text.secondary',
                  }}
                />
              </ListItem>
            ))}
          </List>
          <Button
            variant="contained"
            fullWidth
            color={isReady ? 'success' : 'warning'}
            onClick={async () => {
              if (onMarkReady && !isMarkingReady) {
                setIsMarkingReady(true);
                try {
                  await onMarkReady();
                } finally {
                  setIsMarkingReady(false);
                }
              }
            }}
            disabled={isReady || isMarkingReady}
            sx={{
              py: 1.5,
              fontWeight: 700,
            }}
          >
            {isReady ? '✓ Ready' : isMarkingReady ? 'Marking Ready...' : 'Mark as Ready'}
          </Button>
        </Paper>
      )}

      {/* Hop Input - Hide when waiting for ready */}
      {roundPhase !== 'WAITING_FOR_READY' && (
      <Paper elevation={3} sx={{
        p: 2.5,
        mb: 2.5,
        borderRadius: 3,
        background: paperGradient,
      }}>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Type a word to hop"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            variant="outlined"
            sx={{ mb: 1 }}
            disabled={isGuessing}
            helperText={isGuessing ? 'Processing guess...' : ''}
          />
          <Button 
            type="submit" 
            variant="contained" 
            fullWidth
            disabled={isGuessing || !guess.trim() || !onHop}
            onClick={handleButtonClick}
            sx={{ position: 'relative' }}
          >
            {isGuessing ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                <Typography>Processing...</Typography>
              </Box>
            ) : (
              'Hop'
            )}
          </Button>
        </form>

        {isGuessing && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress 
              sx={{ 
                height: 4, 
                borderRadius: 2,
                backgroundColor: 'rgba(0, 237, 100, 0.1)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: '#00ED64',
                },
              }} 
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Calculating similarity... This may take a moment if the word needs an embedding.
            </Typography>
          </Box>
        )}

        {feedbackInfo && !isGuessing && (
          <Box sx={{ mt: 2 }}>
            <Chip
              label={`${feedbackInfo.percentage}% - ${feedbackInfo.message}`}
              color={feedbackInfo.color}
              sx={{ mb: 1 }}
            />
            {feedback && feedback.inGraph === false && (
              <Chip
                label="Word not in graph"
                size="small"
                color="warning"
                variant="outlined"
                sx={{ mt: 1, display: 'block' }}
              />
            )}
          </Box>
        )}
      </Paper>
      )}

      {/* Guess History */}
      {guesses.length > 0 && (
        <Paper elevation={3} sx={{
          p: 2.5,
          mb: 2.5,
          border: '2px solid',
          borderColor: 'primary.main',
          borderRadius: 3,
          background: paperGradient,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <BrandShapeDecoration position="bottom-right" size={80} opacity={brandShapeOpacity.low} shapeNumber={36} />
          <Typography variant="h6" gutterBottom color="primary" sx={{ position: 'relative', zIndex: 1 }}>
            Your Guesses
          </Typography>
          <List dense>
            {[...guesses].reverse().map((guess, index) => {
              const guessFeedback = getSimilarityFeedback(guess.similarity);
              const inGraph = guess.inGraph !== false; // Default to true if not specified
              return (
                <ListItem key={index} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body2" fontWeight={600}>
                          {guess.word}
                        </Typography>
                        <Chip
                          label={`${Math.round(guess.similarity * 100)}%`}
                          size="small"
                          color={guessFeedback.color}
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                        {!inGraph && (
                          <Chip
                            label="Not in graph"
                            size="small"
                            color="warning"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" component="span">
                          {guessFeedback.message}
                        </Typography>
                        {!inGraph && (
                          <Typography variant="caption" component="div" color="warning.main" sx={{ mt: 0.5, display: 'block' }}>
                            This word is not in the graph, but similarity was calculated.
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </Paper>
      )}

      {/* Progress Indicator */}
      <Paper elevation={3} sx={{
        p: 2.5,
        mb: 2.5,
        borderRadius: 3,
        background: paperGradient,
      }}>
        <Typography variant="body2" gutterBottom>
          Best Similarity: {Math.round(bestSimilarity * 100)}%
        </Typography>
        <LinearProgress
          variant="determinate"
          value={bestSimilarity * 100}
          sx={{
            mt: 1,
            height: 8,
            borderRadius: 1,
            backgroundColor: 'rgba(0, 237, 100, 0.1)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: '#00ED64',
            },
          }}
        />
      </Paper>

      {/* Neighbor Panel */}
      <Paper elevation={3} sx={{
        p: 2.5,
        mb: 2.5,
        borderRadius: 3,
        background: paperGradient,
      }}>
        <Typography variant="h6" gutterBottom>
          Nearby Words
        </Typography>
        <List dense>
          {neighbors.length > 0 ? (
            neighbors.map((neighbor, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔵 [HUD] Neighbor clicked:', neighbor.label, 'onHop type:', typeof onHop);
                    if (onHop && typeof onHop === 'function') {
                      try {
                        onHop(neighbor.label);
                      } catch (error) {
                        console.error('🔴 [HUD] Error calling onHop from neighbor:', error);
                      }
                    } else {
                      console.error('🔴 [HUD] onHop is not a function:', onHop);
                    }
                  }}
                >
                  <ListItemText
                    primary={neighbor.label}
                    secondary={`${Math.round(neighbor.similarity * 100)}% similar`}
                  />
                </ListItemButton>
              </ListItem>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              No neighbors available
            </Typography>
          )}
        </List>
      </Paper>

      {/* Hint Section */}
      <Paper elevation={3} sx={{
        p: 2.5,
        mb: 2.5,
        border: '2px solid',
        borderColor: hintUsed ? 'warning.main' : 'primary.main',
        borderRadius: 3,
        background: hintUsed
          ? hintGradient
          : hintGradient,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <BrandShapeDecoration
          position="top-left"
          size={90}
          opacity={brandShapeOpacity.high}
          shapeNumber={25}
          color={hintUsed ? 'warning' : 'primary'}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
            {hintUsed ? 'Additional Clue' : 'Get a Hint'}
          </Typography>
          {!hintUsed && onGetHint && (
            <Button
              variant="outlined"
              color="warning"
              size="small"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔵 [HUD] Get Hint clicked, onGetHint type:', typeof onGetHint);
                if (onGetHint && typeof onGetHint === 'function') {
                  try {
                    onGetHint();
                  } catch (error) {
                    console.error('🔴 [HUD] Error calling onGetHint:', error);
                  }
                } else {
                  console.error('🔴 [HUD] onGetHint is not a function:', onGetHint);
                }
              }}
              disabled={isGuessing}
            >
              Get Hint (-3 pts)
            </Button>
          )}
          {hintUsed && (
            <Chip label="Used" color="warning" size="small" />
          )}
        </Box>
        {hintUsed && hintText ? (
          <Box sx={{
            mt: 2,
            p: 2,
            bgcolor: 'rgba(255, 171, 0, 0.1)',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'warning.main'
          }}>
            <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
              {hintText}
            </Typography>
          </Box>
        ) : hintUsed ? (
          <Typography variant="body2" color="text.secondary">
            Failed to load hint. Please try again.
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Click &quot;Get Hint&quot; to reveal an additional clue about the target word. This will cost 3 points.
          </Typography>
        )}
      </Paper>

      {/* Related Words Panel (for debugging - shows if words are loaded) */}
      <Paper elevation={3} sx={{
        p: 2.5,
        borderRadius: 3,
        background: paperGradient,
      }}>
        <Typography variant="h6" gutterBottom>
          Words Similar to Target
        </Typography>
        <List dense>
          {relatedWords.length > 0 ? (
            relatedWords.map((word, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔵 [HUD] Related word clicked:', word.label, 'onHop type:', typeof onHop);
                    if (onHop && typeof onHop === 'function') {
                      try {
                        onHop(word.label);
                      } catch (error) {
                        console.error('🔴 [HUD] Error calling onHop from related word:', error);
                      }
                    } else {
                      console.error('🔴 [HUD] onHop is not a function:', onHop);
                    }
                  }}
                >
                  <ListItemText
                    primary={word.label}
                    secondary={`${Math.round(word.similarity * 100)}% similar to target`}
                  />
                </ListItemButton>
              </ListItem>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              No related words available
            </Typography>
          )}
        </List>
      </Paper>
    </Box>
  );

  // Mobile: Drawer, Desktop: Fixed sidebar
  if (isMobile) {
    return (
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={onMobileClose}
        sx={{
          '& .MuiDrawer-paper': {
            bgcolor: isDark ? 'rgba(2, 52, 48, 0.98)' : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(10px)',
            borderRight: '3px solid',
            borderColor: 'primary.main',
            boxShadow: isDark 
              ? '4px 0 24px rgba(0, 237, 100, 0.3)'
              : '4px 0 24px rgba(0, 0, 0, 0.15)',
          },
        }}
      >
        {hudContent}
      </Drawer>
    );
  }

  // Desktop: Fixed sidebar
  return (
    <Box
      sx={{
        position: 'absolute',
        left: 0,
        top: { xs: 56, sm: 64 },
        width: 400,
        height: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
        bgcolor: isDark ? 'rgba(2, 52, 48, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        overflowY: 'auto',
        zIndex: 1000,
        borderRight: '3px solid',
        borderColor: 'primary.main',
        boxShadow: isDark 
          ? '4px 0 24px rgba(0, 237, 100, 0.15)'
          : '4px 0 24px rgba(0, 0, 0, 0.1)',
        display: { xs: 'none', md: 'block' },
      }}
    >
      {hudContent}
    </Box>
  );
}


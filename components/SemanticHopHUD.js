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
  Tabs,
  Tab,
  Collapse,
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
  rerankerUsed = false,
  onUseReranker = null,
  isMobile = false,
  mobileOpen = false,
  onMobileClose = () => {},
  roundPhase = 'SEARCH',
  playerId = null,
  players = [],
  onMarkReady = null,
  currentTarget = null,
  tokens = 15,
  practiceMode = false,
  showRiddle = false, // Riddle moved to main screen overlay
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  const [guess, setGuess] = useState('');
  const [isMarkingReady, setIsMarkingReady] = useState(false);
  const [cheatRevealed, setCheatRevealed] = useState(false);
  const [wordListTab, setWordListTab] = useState(0); // 0 = Neighbors, 1 = Related Words
  const [guessHistoryExpanded, setGuessHistoryExpanded] = useState(true);
  const keySequenceRef = useRef([]);
  const keyTimeoutRef = useRef(null);
  
  // Development mode check - always enabled for cheat code
  const isDevelopment = typeof window !== 'undefined' && (
    process.env.NODE_ENV === 'development' || 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    true // Always enable cheat code for development
  );
  
  // Cheat code: Press 'T' three times quickly (within 1 second)
  // Simply toggles the target word reveal
  useEffect(() => {
    // Always enable cheat code
    
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
          setCheatRevealed(prev => {
            const newValue = !prev;
            console.log('🎮 [CHEAT] Target word reveal toggled:', newValue);
            console.log('🎮 [CHEAT] currentTarget:', currentTarget);
            if (currentTarget) {
              console.log('🎮 [CHEAT] Target word label:', currentTarget.label);
            } else {
              console.warn('🎮 [CHEAT] No currentTarget available!');
            }
            return newValue;
          });
          sequence.length = 0; // Reset sequence
        } else if (sequence.length > 0) {
          // Debug: log sequence progress
          const timeSpan = sequence.length > 1 ? (sequence[sequence.length - 1] - sequence[0]) : 0;
          console.log('🎮 [CHEAT] Sequence progress:', sequence.length, 'presses, time span:', timeSpan, 'ms');
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
  }, [currentTarget]); // Include currentTarget in dependencies
  
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
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
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

      {/* Combined Game Info & Tokens */}
      <Paper elevation={3} sx={{
        p: 2,
        mb: 1.5,
        border: '1px solid',
        borderColor: tokens < 5
          ? 'rgba(255, 192, 16, 0.3)'
          : 'rgba(0, 237, 100, 0.2)',
        borderRadius: 3,
        background: tokens < 5 ? warningGradient : paperGradient,
        boxShadow: tokens < 5
          ? '0 8px 32px rgba(255, 192, 16, 0.2)'
          : '0 8px 32px rgba(0, 237, 100, 0.15)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <BrandShapeDecoration position="top-right" size={100} opacity={brandShapeOpacity.medium} shapeNumber={3} />
        <BrandShapeDecoration 
          position="bottom-left" 
          size={80} 
          opacity={brandShapeOpacity.medium} 
          shapeNumber={7} 
          color={tokens < 5 ? 'warning' : 'primary'}
        />
        
        {/* Game Info Section */}
        <Box sx={{ position: 'relative', zIndex: 1, mb: 2.5 }}>
          {practiceMode ? (
            <Box>
              <Typography variant="h6" gutterBottom color="warning.main" sx={{ fontWeight: 700 }}>
                🎮 Practice Mode
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Free exploration - no game constraints
              </Typography>
            </Box>
          ) : (
            <>
              <Typography variant="h6" gutterBottom color="primary" sx={{ fontWeight: 700 }}>
                Game Code: {gameCode}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Round {roundNumber}/{maxRounds}
                </Typography>
                {timeRemaining !== null && (
                  <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Time: {Math.ceil(timeRemaining / 1000)}s
                  </Typography>
                )}
              </Box>
            </>
          )}
        </Box>

        {/* Divider */}
        <Box sx={{ 
          height: '2px', 
          bgcolor: tokens < 5 ? 'warning.main' : 'primary.main', 
          mb: 2.5,
          position: 'relative',
          zIndex: 1,
          opacity: 0.5,
        }} />

        {/* Tokens Section - Enhanced Visual Design */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                border: '2px solid',
                borderColor: tokens < 5
                  ? 'rgba(255, 192, 16, 0.5)'
                  : 'rgba(0, 237, 100, 0.5)',
                bgcolor: isDark 
                  ? (tokens < 5 ? 'rgba(255, 192, 16, 0.2)' : 'rgba(0, 237, 100, 0.2)')
                  : (tokens < 5 ? 'rgba(255, 192, 16, 0.1)' : 'rgba(0, 237, 100, 0.1)'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.5rem',
                color: tokens < 5 ? 'warning.main' : 'primary.main',
              }}>
                {tokens}
              </Box>
              <Box>
                <Typography 
                  variant="h5" 
                  color={tokens < 5 ? 'warning.main' : 'primary.main'} 
                  sx={{ fontWeight: 900, lineHeight: 1.2 }}
                >
                  TOKENS
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  {tokens === 15 ? 'Full' : tokens === 0 ? 'Out!' : `${15 - tokens} used`}
                </Typography>
              </Box>
            </Box>
            {tokens < 5 && (
              <Chip 
                label="LOW!" 
                color="warning" 
                size="small"
                sx={{ fontWeight: 900, fontSize: '0.75rem', height: 24 }}
              />
            )}
          </Box>

          {/* Token Usage Costs - Visual Grid */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: 1.5,
            mt: 2,
          }}>
            {/* Shooting Cost */}
            <Box sx={{
              p: 1.5,
              borderRadius: 2,
              border: '1px solid',
              borderColor: tokens < 2
                ? 'rgba(255, 0, 0, 0.3)'
                : 'rgba(0, 237, 100, 0.3)',
              bgcolor: isDark 
                ? (tokens < 2 ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 237, 100, 0.1)')
                : (tokens < 2 ? 'rgba(255, 0, 0, 0.05)' : 'rgba(0, 237, 100, 0.05)'),
              textAlign: 'center',
            }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: '0.65rem' }}>
                SHOOT
              </Typography>
              <Typography 
                variant="h6" 
                color={tokens < 2 ? 'error.main' : 'primary.main'}
                sx={{ fontWeight: 900, lineHeight: 1 }}
              >
                2
              </Typography>
            </Box>

            {/* Hop Cost */}
            <Box sx={{
              p: 1.5,
              borderRadius: 2,
              border: '1px solid',
              borderColor: tokens < 3
                ? 'rgba(255, 0, 0, 0.3)'
                : 'rgba(0, 237, 100, 0.3)',
              bgcolor: isDark 
                ? (tokens < 3 ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 237, 100, 0.1)')
                : (tokens < 3 ? 'rgba(255, 0, 0, 0.05)' : 'rgba(0, 237, 100, 0.05)'),
              textAlign: 'center',
            }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: '0.65rem' }}>
                HOP
              </Typography>
              <Typography 
                variant="h6" 
                color={tokens < 3 ? 'error.main' : 'primary.main'}
                sx={{ fontWeight: 900, lineHeight: 1 }}
              >
                3
              </Typography>
            </Box>

            {/* Hint Cost */}
            <Box sx={{
              p: 1.5,
              borderRadius: 2,
              border: '1px solid',
              borderColor: tokens < 5
                ? 'rgba(255, 0, 0, 0.3)'
                : 'rgba(0, 237, 100, 0.3)',
              bgcolor: isDark 
                ? (tokens < 5 ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 237, 100, 0.1)')
                : (tokens < 5 ? 'rgba(255, 0, 0, 0.05)' : 'rgba(0, 237, 100, 0.05)'),
              textAlign: 'center',
            }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontSize: '0.65rem' }}>
                HINT
              </Typography>
              <Typography 
                variant="h6" 
                color={tokens < 5 ? 'error.main' : 'primary.main'}
                sx={{ fontWeight: 900, lineHeight: 1 }}
              >
                5
              </Typography>
            </Box>
          </Box>

          {/* Progress Indicator - Integrated */}
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Best Similarity: {Math.round(bestSimilarity * 100)}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={bestSimilarity * 100}
              sx={{
                height: 6,
                borderRadius: 1,
                backgroundColor: 'rgba(0, 237, 100, 0.1)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: '#00ED64',
                },
              }}
            />
          </Box>
        </Box>
      </Paper>

      {/* Riddle/Definition - Hidden by default, shown on game screen instead */}
      {showRiddle && (
        <Paper elevation={3} sx={{
          p: 2,
          mb: 1.5,
          border: '1px solid',
          borderColor: 'rgba(0, 237, 100, 0.2)',
          borderRadius: 3,
          background: paperGradient,
          boxShadow: '0 8px 32px rgba(0, 237, 100, 0.15)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <BrandShapeDecoration position="bottom-left" size={120} opacity={brandShapeOpacity.low} shapeNumber={12} />
          <Typography variant="h6" gutterBottom color="primary" sx={{ position: 'relative', zIndex: 1 }}>
            Riddle
          </Typography>
          <Typography variant="body1" sx={{ minHeight: 100 }}>
            {definition || (practiceMode ? 'Loading riddle...' : 'Waiting for round to start...')}
          </Typography>
          {practiceMode && currentTarget && (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic', display: 'block', mt: 1 }}>
              Practice Mode: Try to find &quot;{currentTarget.label}&quot;
            </Typography>
          )}
        </Paper>
      )}

      {/* Dev cheat: Target word reveal - ALWAYS show when cheat is activated (outside showRiddle conditional) */}
      {cheatRevealed && currentTarget && (
        <Paper elevation={6} sx={{
          p: 2,
          mb: 1.5,
          border: '2px solid',
          borderColor: 'warning.main',
          borderRadius: 2,
          bgcolor: isDark ? 'rgba(255, 192, 16, 0.2)' : 'rgba(255, 192, 16, 0.15)',
          boxShadow: '0 8px 32px rgba(255, 192, 16, 0.4)',
          position: 'relative',
          zIndex: 1000, // High z-index to ensure it's visible
        }}>
          <Typography variant="h6" color="warning.main" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
            🎮 DEV MODE - Target Word Revealed
          </Typography>
          <Typography variant="h4" sx={{ 
            fontFamily: '"Euclid Circular A", monospace', 
            fontWeight: 900, 
            color: 'warning.main',
            textAlign: 'center',
            textShadow: isDark ? '0 0 10px rgba(255, 192, 16, 0.5)' : 'none'
          }}>
            {currentTarget.label}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1, textAlign: 'center' }}>
            Press &apos;T&apos; three times quickly to hide
          </Typography>
        </Paper>
      )}

      {/* Ready Section - Show when waiting for players to be ready */}
      {roundPhase === 'WAITING_FOR_READY' && (
        <Paper elevation={3} sx={{
          p: 2,
          mb: 1.5,
          border: '1px solid',
          borderColor: 'rgba(255, 192, 16, 0.3)',
          borderRadius: 3,
          background: warningGradient,
          boxShadow: '0 8px 32px rgba(255, 192, 16, 0.2)',
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
                border: '1px solid',
                borderColor: 'rgba(0, 237, 100, 0.3)',
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
        p: 2,
        mb: 1.5,
        border: '1px solid',
        borderColor: 'rgba(0, 237, 100, 0.2)',
        borderRadius: 3,
        background: paperGradient,
        boxShadow: '0 8px 32px rgba(0, 237, 100, 0.15)',
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
            disabled={isGuessing || !guess.trim() || !onHop || tokens < 3}
            onClick={handleButtonClick}
            sx={{ position: 'relative' }}
          >
            {isGuessing ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                <Typography>Processing...</Typography>
              </Box>
            ) : tokens < 3 ? (
              `Hop (Need 3 tokens, have ${tokens})`
            ) : (
              'Hop (3 tokens)'
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
                  borderRadius: 2,
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

      {/* Guess History - Compact with max height */}
      {guesses.length > 0 && (
        <Paper elevation={3} sx={{
          p: 2,
          mb: 1.5,
          border: '1px solid',
          borderColor: 'rgba(0, 237, 100, 0.2)',
          borderRadius: 3,
          background: paperGradient,
          boxShadow: '0 8px 32px rgba(0, 237, 100, 0.15)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <BrandShapeDecoration position="bottom-right" size={80} opacity={brandShapeOpacity.low} shapeNumber={36} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" color="primary" sx={{ position: 'relative', zIndex: 1, mb: 0 }}>
              Guesses ({guesses.length})
            </Typography>
            <Button
              size="small"
              onClick={() => setGuessHistoryExpanded(!guessHistoryExpanded)}
              sx={{ minWidth: 'auto', px: 1 }}
            >
              {guessHistoryExpanded ? '−' : '+'}
            </Button>
          </Box>
          <Collapse in={guessHistoryExpanded}>
          <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
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
          </Collapse>
        </Paper>
      )}

      {/* Combined Neighbors & Related Words with Tabs */}
      <Paper elevation={3} sx={{
        p: 0,
        mb: 1.5,
        border: '1px solid',
        borderColor: 'rgba(0, 237, 100, 0.2)',
        borderRadius: 3,
        background: paperGradient,
        boxShadow: '0 8px 32px rgba(0, 237, 100, 0.15)',
        overflow: 'hidden',
      }}>
        <Tabs
          value={wordListTab}
          onChange={(_, newValue) => setWordListTab(newValue)}
          variant="fullWidth"
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 48,
              fontSize: '0.875rem',
              fontWeight: 600,
            },
          }}
        >
          <Tab label={`Nearby (${neighbors.length})`} />
          <Tab label={`Similar (${relatedWords.length})`} />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {wordListTab === 0 && (
            <List dense sx={{ maxHeight: 180, overflow: 'auto' }}>
              {neighbors.length > 0 ? (
                neighbors.map((neighbor, index) => (
                  <ListItem key={index} disablePadding>
                    <ListItemButton
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onHop && typeof onHop === 'function') {
                          try {
                            onHop(neighbor.label);
                          } catch (error) {
                            console.error('🔴 [HUD] Error calling onHop from neighbor:', error);
                          }
                        }
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography 
                              component="span"
                              sx={{
                                fontWeight: neighbor.highlyRelevant ? 700 : 'normal',
                                color: neighbor.highlyRelevant ? '#FFD700' : 'inherit',
                              }}
                            >
                              {neighbor.label}
                            </Typography>
                            {neighbor.reranked && (
                              <Chip
                                label={neighbor.highlyRelevant ? "⭐ Top Pick" : "🔄 Reranked"}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: '0.65rem',
                                  bgcolor: neighbor.highlyRelevant 
                                    ? 'rgba(255, 215, 0, 0.3)' 
                                    : 'rgba(147, 51, 234, 0.2)',
                                  border: `1px solid ${neighbor.highlyRelevant ? 'rgba(255, 215, 0, 0.8)' : 'rgba(147, 51, 234, 0.5)'}`,
                                  color: neighbor.highlyRelevant ? '#FFD700' : '#9333EA',
                                  fontWeight: 700,
                                  boxShadow: neighbor.highlyRelevant ? '0 2px 8px rgba(255, 215, 0, 0.3)' : 'none',
                                }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          neighbor.reranked && neighbor.targetSimilarity !== undefined
                            ? `🎯 ${Math.round(neighbor.targetSimilarity * 100)}% to target (reranked)`
                            : `${Math.round(neighbor.similarity * 100)}% similar`
                        }
                        sx={{
                          '& .MuiListItemText-primary': {
                            fontWeight: neighbor.highlyRelevant ? 700 : 'normal',
                          },
                          '& .MuiListItemText-secondary': {
                            color: neighbor.reranked && neighbor.highlyRelevant ? 'rgba(255, 215, 0, 0.9)' : 'inherit',
                            fontWeight: neighbor.highlyRelevant ? 600 : 'normal',
                          }
                        }}
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
          )}

          {wordListTab === 1 && (
            <List dense sx={{ maxHeight: 180, overflow: 'auto' }}>
              {relatedWords.length > 0 ? (
                relatedWords.map((word, index) => (
                  <ListItem key={index} disablePadding>
                    <ListItemButton
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onHop && typeof onHop === 'function') {
                          try {
                            onHop(word.label);
                          } catch (error) {
                            console.error('🔴 [HUD] Error calling onHop from related word:', error);
                          }
                        }
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography 
                              component="span"
                              sx={{
                                fontWeight: word.highlyRelevant ? 700 : 'normal',
                                color: word.highlyRelevant ? '#FFD700' : 'inherit',
                              }}
                            >
                              {word.label}
                            </Typography>
                            {word.reranked && (
                              <Chip
                                label={word.highlyRelevant ? "⭐ Top Pick" : "🔄 Reranked"}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: '0.65rem',
                                  bgcolor: word.highlyRelevant 
                                    ? 'rgba(255, 215, 0, 0.3)' 
                                    : 'rgba(147, 51, 234, 0.2)',
                                  border: `1px solid ${word.highlyRelevant ? 'rgba(255, 215, 0, 0.8)' : 'rgba(147, 51, 234, 0.5)'}`,
                                  color: word.highlyRelevant ? '#FFD700' : '#9333EA',
                                  fontWeight: 700,
                                  boxShadow: word.highlyRelevant ? '0 2px 8px rgba(255, 215, 0, 0.3)' : 'none',
                                }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          word.reranked && word.targetSimilarity !== undefined
                            ? `🎯 ${Math.round(word.targetSimilarity * 100)}% to target (reranked)`
                            : `${Math.round(word.similarity * 100)}% similar to target`
                        }
                        sx={{
                          '& .MuiListItemText-primary': {
                            fontWeight: word.highlyRelevant ? 700 : 'normal',
                          },
                          '& .MuiListItemText-secondary': {
                            color: word.reranked && word.highlyRelevant ? 'rgba(255, 215, 0, 0.9)' : 'inherit',
                            fontWeight: word.highlyRelevant ? 600 : 'normal',
                          }
                        }}
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
          )}
        </Box>
      </Paper>

      {/* Hint Section */}
      <Paper elevation={3} sx={{
        p: 2,
        mb: 1.5,
        border: '1px solid',
        borderColor: hintUsed
          ? 'rgba(255, 192, 16, 0.3)'
          : 'rgba(0, 237, 100, 0.2)',
        borderRadius: 3,
        background: hintUsed
          ? hintGradient
          : hintGradient,
        boxShadow: hintUsed
          ? '0 8px 32px rgba(255, 192, 16, 0.2)'
          : '0 8px 32px rgba(0, 237, 100, 0.15)',
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
              disabled={isGuessing || tokens < 5}
            >
              {tokens < 5 ? `Get Hint (Need 5, have ${tokens})` : 'Get Hint (5 tokens, -3 pts)'}
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

      {/* Reranker Section */}
      <Paper elevation={3} sx={{
        p: 2,
        mb: 1.5,
        border: '1px solid',
        borderColor: rerankerUsed
          ? 'rgba(147, 51, 234, 0.3)'
          : 'rgba(0, 237, 100, 0.2)',
        borderRadius: 3,
        background: rerankerUsed
          ? 'linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)'
          : 'linear-gradient(135deg, rgba(0, 237, 100, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
        boxShadow: rerankerUsed
          ? '0 8px 32px rgba(147, 51, 234, 0.2)'
          : '0 8px 32px rgba(0, 237, 100, 0.15)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <BrandShapeDecoration
          position="bottom-right"
          size={80}
          opacity={brandShapeOpacity.medium}
          shapeNumber={8}
          color={rerankerUsed ? 'secondary' : 'primary'}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
            {rerankerUsed ? 'Reranker Applied' : '🔄 Reranker'}
          </Typography>
          {!rerankerUsed && onUseReranker && (
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onUseReranker && typeof onUseReranker === 'function') {
                  try {
                    onUseReranker();
                  } catch (error) {
                    console.error('🔴 [HUD] Error calling onUseReranker:', error);
                  }
                }
              }}
              disabled={isGuessing || tokens < 4}
            >
              {tokens < 4 ? `Use (Need 4, have ${tokens})` : 'Use Reranker (4 tokens)'}
            </Button>
          )}
          {rerankerUsed && (
            <Chip label="Used" color="secondary" size="small" />
          )}
        </Box>
        {rerankerUsed ? (
          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: 'secondary.main' }}>
              ✅ Reranker Applied Successfully!
            </Typography>
            <Typography variant="body2" color="text.secondary" component="div">
              <Box component="ul" sx={{ m: 0, pl: 2, fontSize: '0.875rem' }}>
                <li>Word lists have been re-ordered by relevance to target</li>
                <li>⭐ <strong>Top Pick</strong> badges mark the 3 best words</li>
                <li>🎯 Similarity scores now show % to target</li>
                <li>Look for words with higher target similarity!</li>
              </Box>
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Use the reranker to apply a more sophisticated ranking algorithm that highlights the most relevant words for finding the target. Words are re-ordered and top picks are marked with ⭐ badges.
          </Typography>
        )}
      </Paper>

      {/* Bottom spacing to prevent content from being cut off */}
      <Box sx={{ height: 24, flexShrink: 0 }} />
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
            borderRight: '1px solid',
            borderColor: 'rgba(0, 237, 100, 0.2)',
            boxShadow: isDark
              ? '-8px 0 32px rgba(0, 237, 100, 0.2)'
              : '-8px 0 32px rgba(0, 0, 0, 0.1)',
            overflowX: 'hidden',
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
        overflowX: 'hidden',
        zIndex: 1000,
        borderRight: '1px solid',
        borderColor: 'rgba(0, 237, 100, 0.2)',
        boxShadow: isDark
          ? '8px 0 32px rgba(0, 237, 100, 0.15)'
          : '8px 0 32px rgba(0, 0, 0, 0.1)',
        display: { xs: 'none', md: 'block' },
      }}
    >
      {hudContent}
    </Box>
  );
}


'use client';

import { useState } from 'react';
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
} from '@mui/material';
import { getSimilarityFeedback } from '@/lib/utils';

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
}) {
  const [guess, setGuess] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (guess.trim() && !isGuessing) {
      onHop(guess.trim());
      setGuess('');
    }
  };

  const feedbackInfo = feedback ? getSimilarityFeedback(feedback.similarity) : null;

  return (
    <Box
      sx={{
        position: 'absolute',
        left: 0,
        top: 64, // Account for header
        width: 400,
        height: 'calc(100vh - 64px)',
        bgcolor: 'rgba(2, 52, 48, 0.95)', // Evergreen with transparency
        backdropFilter: 'blur(10px)',
        overflowY: 'auto',
        zIndex: 1000,
        p: 3,
        borderRight: '3px solid',
        borderColor: 'primary.main',
        boxShadow: '4px 0 24px rgba(0, 237, 100, 0.15)',
      }}
    >
      {/* Game Info */}
      <Paper elevation={3} sx={{
        p: 2.5,
        mb: 2.5,
        border: '2px solid',
        borderColor: 'primary.main',
        borderRadius: 3,
        background: 'linear-gradient(135deg, rgba(0, 104, 74, 0.3) 0%, rgba(2, 52, 48, 0.8) 100%)',
      }}>
        <Typography variant="h6" gutterBottom color="primary">
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
        background: 'linear-gradient(135deg, rgba(0, 104, 74, 0.3) 0%, rgba(2, 52, 48, 0.8) 100%)',
      }}>
        <Typography variant="h6" gutterBottom color="primary">
          Riddle
        </Typography>
        <Typography variant="body1" sx={{ minHeight: 100 }}>
          {definition || 'Waiting for round to start...'}
        </Typography>
      </Paper>

      {/* Hop Input */}
      <Paper elevation={3} sx={{
        p: 2.5,
        mb: 2.5,
        borderRadius: 3,
        background: 'linear-gradient(135deg, rgba(0, 104, 74, 0.3) 0%, rgba(2, 52, 48, 0.8) 100%)',
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
            disabled={isGuessing || !guess.trim()}
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

      {/* Guess History */}
      {guesses.length > 0 && (
        <Paper elevation={3} sx={{
          p: 2.5,
          mb: 2.5,
          border: '2px solid',
          borderColor: 'primary.main',
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(0, 104, 74, 0.3) 0%, rgba(2, 52, 48, 0.8) 100%)',
        }}>
          <Typography variant="h6" gutterBottom color="primary">
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
        background: 'linear-gradient(135deg, rgba(0, 104, 74, 0.3) 0%, rgba(2, 52, 48, 0.8) 100%)',
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
        background: 'linear-gradient(135deg, rgba(0, 104, 74, 0.3) 0%, rgba(2, 52, 48, 0.8) 100%)',
      }}>
        <Typography variant="h6" gutterBottom>
          Nearby Words
        </Typography>
        <List dense>
          {neighbors.length > 0 ? (
            neighbors.map((neighbor, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton onClick={() => onHop(neighbor.label)}>
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
          ? 'linear-gradient(135deg, rgba(255, 192, 16, 0.15) 0%, rgba(2, 52, 48, 0.8) 100%)'
          : 'linear-gradient(135deg, rgba(0, 104, 74, 0.3) 0%, rgba(2, 52, 48, 0.8) 100%)',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
            {hintUsed ? 'Additional Clue' : 'Get a Hint'}
          </Typography>
          {!hintUsed && onGetHint && (
            <Button
              variant="outlined"
              color="warning"
              size="small"
              onClick={onGetHint}
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
        background: 'linear-gradient(135deg, rgba(0, 104, 74, 0.3) 0%, rgba(2, 52, 48, 0.8) 100%)',
      }}>
        <Typography variant="h6" gutterBottom>
          Words Similar to Target
        </Typography>
        <List dense>
          {relatedWords.length > 0 ? (
            relatedWords.map((word, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton onClick={() => onHop(word.label)}>
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
}


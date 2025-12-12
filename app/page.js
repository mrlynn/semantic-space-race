'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ThemeProvider, CssBaseline, Box, AppBar, Toolbar, Snackbar, Alert, Typography, IconButton, Fab, Button, useMediaQuery, useTheme } from '@mui/material';
import { getPusherClient } from '@/lib/pusherClient';
import { createMongoDBTheme } from '@/lib/mongodbTheme';
import ThemeToggle from '@/components/ThemeToggle';
import Lobby from '@/components/Lobby';
import SemanticHopHUD from '@/components/SemanticHopHUD';
import Leaderboard from '@/components/Leaderboard';
import WordGraph3D from '@/components/WordGraph3D';
import WordGraphForceDirected from '@/components/WordGraphForceDirected';
import WordGraphHNSW from '@/components/WordGraphHNSW';
import MongoDBLogo from '@/components/MongoDBLogo';
import BrandShapes from '@/components/BrandShapes';
import InviteFriends from '@/components/InviteFriends';
import NavigationControls from '@/components/NavigationControls';
import CountdownOverlay from '@/components/CountdownOverlay';
import { celebrateCorrectGuess } from '@/lib/celebration';
import { preloadAvatars } from '@/components/PlayerAvatar';
import GameStatsScreen from '@/components/GameStatsScreen';
import GameOverOverlay from '@/components/GameOverOverlay';
import GameHelpDialog from '@/components/GameHelpDialog';
import { cosineSimilarity } from '@/lib/utils';

export default function Home() {
  // Global error handler for production debugging
  useEffect(() => {
    const handleError = (event) => {
      // Suppress 404 errors for missing avatar GLB files - these are expected
      const errorMessage = event.error?.message || '';
      const isAvatar404Error = errorMessage.includes('avatar') && 
                               (errorMessage.includes('404') || 
                                errorMessage.includes('Not Found') ||
                                errorMessage.includes('fetch'));
      
      if (isAvatar404Error) {
        // Silently ignore - avatar files may not exist yet, fallback to spheres
        event.preventDefault(); // Prevent default error logging
        return;
      }
      
      // Log other errors normally
      console.error('🔴 [GLOBAL] Unhandled error:', event.error);
      console.error('🔴 [GLOBAL] Error details:', {
        message: event.error?.message,
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    };
    
    const handleUnhandledRejection = (event) => {
      // Suppress 404 rejections for missing avatar GLB files
      const reason = event.reason?.message || event.reason?.toString() || '';
      const isAvatar404Error = reason.includes('avatar') && 
                               (reason.includes('404') || 
                                reason.includes('Not Found') ||
                                reason.includes('fetch'));
      
      if (isAvatar404Error) {
        // Silently ignore - avatar files may not exist yet
        event.preventDefault(); // Prevent default rejection logging
        return;
      }
      
      // Log other rejections normally
      console.error('🔴 [GLOBAL] Unhandled promise rejection:', event.reason);
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Theme state with localStorage persistence
  const [themeMode, setThemeMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('themeMode');
      return saved === 'light' ? 'light' : 'dark';
    }
    return 'dark';
  });

  const theme = createMongoDBTheme(themeMode);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleThemeToggle = () => {
    const newMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('themeMode', newMode);
    }
  };

  const [gameCode, setGameCode] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState([]);
  const [otherPlayersPositions, setOtherPlayersPositions] = useState(new Map()); // Track other players' positions
  const [gameActive, setGameActive] = useState(false);
  const [words, setWords] = useState([]);
  const [currentNodeId, setCurrentNodeId] = useState(null);
  const [roundNumber, setRoundNumber] = useState(0);
  const [maxRounds, setMaxRounds] = useState(5);
  const [definition, setDefinition] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [bestSimilarity, setBestSimilarity] = useState(0);
  const [neighbors, setNeighbors] = useState([]);
  const [relatedWords, setRelatedWords] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [currentTarget, setCurrentTarget] = useState(null);
  const [roundPhase, setRoundPhase] = useState('TUTORIAL');
  const [guesses, setGuesses] = useState([]);
  const [isGuessing, setIsGuessing] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [hintText, setHintText] = useState('');
  const [rerankerUsed, setRerankerUsed] = useState(false);
  const [visualizationMode, setVisualizationMode] = useState('hnsw');
  const [gameTopic, setGameTopic] = useState('general-database'); // 'spheres', 'graph', or 'hnsw'
  const [tokens, setTokens] = useState(15);
  const [isOut, setIsOut] = useState(false);
  const [vectorGems, setVectorGems] = useState([]);
  const [badAsteroids, setBadAsteroids] = useState([]);
  const [neighborIndex, setNeighborIndex] = useState(0); // Track current neighbor index for arrow key navigation
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const handleHopRef = useRef(null); // Store latest handleHop for keyboard navigation
  const [practiceMode, setPracticeMode] = useState(false); // Free play / practice mode

  // Mobile drawer state
  const [mobileHudOpen, setMobileHudOpen] = useState(false);
  const [mobileLeaderboardOpen, setMobileLeaderboardOpen] = useState(false);
  
  // Game end state
  const [gameEnded, setGameEnded] = useState(false);
  const [finalScores, setFinalScores] = useState([]);
  
  // Refs for timeout cleanup
  const timeoutRefs = useRef({ phaseTransition: null, roundAdvance: null });

  // Camera controls state
  const [cameraControls, setCameraControls] = useState(null);

  // Toast notification state
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  const showToast = useCallback((message, severity = 'info') => {
    setToast({ open: true, message, severity });
  }, []);

  const handleCloseToast = (_event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setToast({ ...toast, open: false });
  };

  // Initialize Pusher
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    // Subscribe to game channel when gameCode is available
    if (gameCode) {
      const channel = pusher.subscribe(`game-${gameCode}`);

      channel.bind('round:start', (data) => {
        console.log('🔵 [CLIENT] round:start received:', { phase: data.phase, phaseEndsAt: data.phaseEndsAt, roundDuration: data.roundDuration, roundNumber: data.roundNumber });
        
        // CRITICAL: Set gameActive to true so all players transition from lobby to game
        setGameActive(true);
        
        // Clear any pending fallback timeouts since server handled it
        if (timeoutRefs.current.roundAdvance) {
          clearTimeout(timeoutRefs.current.roundAdvance);
          timeoutRefs.current.roundAdvance = null;
        }
        setRoundNumber(data.roundNumber);
        setMaxRounds(data.maxRounds);
        setDefinition(data.definition);
        setCurrentTarget(data.target);
        setRoundPhase(data.phase);
        setTimeRemaining(data.roundDuration);
        setBestSimilarity(0);
        setFeedback(null);
        setCurrentNodeId(null);
        setGuesses([]); // Reset guesses for new round
        setNeighbors([]); // Reset neighbors
        setRelatedWords([]); // Reset related words
        setHintUsed(false); // Reset hint usage
        setHintText(''); // Reset hint text
        setRerankerUsed(false); // Reset reranker usage
        // Reset tokens for new round
        setTokens(15);
        setIsOut(false);
        // Clear vector gems and bad asteroids for new round
        setVectorGems([]);
        setBadAsteroids([]);
        // Update players with scores and tokens
        if (data.players) {
          setPlayers(data.players);
          // Find current player and update their tokens
          const currentPlayer = data.players.find(p => p.id === playerId);
          if (currentPlayer) {
            setTokens(currentPlayer.tokens !== undefined ? currentPlayer.tokens : 15);
            setIsOut(currentPlayer.tokensOut || false);
          }
        }
        
        // Client-side fallback: Auto-transition from TARGET_REVEAL to SEARCH
        // This handles cases where serverless function terminates before setTimeout fires
        if (data.phase === 'TARGET_REVEAL') {
          const targetRevealDuration = data.phaseEndsAt ? Math.max(0, data.phaseEndsAt - Date.now()) : 3000; // Default 3 seconds
          console.log('🔵 [CLIENT] Scheduling client-side phase transition in', targetRevealDuration, 'ms');
          // Clear any existing timeout
          if (timeoutRefs.current.phaseTransition) {
            clearTimeout(timeoutRefs.current.phaseTransition);
          }
          timeoutRefs.current.phaseTransition = setTimeout(() => {
            console.log('🔵 [CLIENT] Client-side phase transition: TARGET_REVEAL -> SEARCH');
            setRoundPhase('SEARCH');
            // Set time remaining to round duration
            if (data.roundDuration) {
              setTimeRemaining(data.roundDuration);
            }
            timeoutRefs.current.phaseTransition = null;
          }, targetRevealDuration);
        }
        
        // Load related words after a short delay to ensure target is set
        setTimeout(() => {
          if (data.target && data.target.id) {
            console.log('🟢 Round started, loading related words for target:', data.target.id, data.target.label);
          } else {
          }
        }, 100);
      });

      channel.bind('round:phase-change', (data) => {
        console.log('🔵 [CLIENT] round:phase-change received:', { phase: data.phase, roundDuration: data.roundDuration });
        setRoundPhase(data.phase);
        setTimeRemaining(data.roundDuration);
        // Reset for new search phase
        if (data.phase === 'SEARCH') {
          setBestSimilarity(0);
          setFeedback(null);
          setCurrentNodeId(null);
          setGuesses([]); // Reset guesses
        }
      });

      channel.bind('round:end', (data) => {
        console.log('🔵 [CLIENT] round:end received:', { roundNumber: data.roundNumber, winnerNickname: data.winnerNickname, maxRounds: maxRounds });
        setRoundPhase('END');
        setTimeRemaining(5000);
        // Update players with latest scores
        if (data.players) {
          setPlayers(data.players);
        }
        // Show winner announcement
        if (data.winnerNickname) {
          showToast(`${data.winnerNickname} won round ${data.roundNumber}! The word was: ${data.targetLabel}`, 'success');
        }
        
        // Check if this is the final round - if so, prepare for game end
        const currentRound = data.roundNumber || roundNumber;
        const isFinalRound = currentRound >= maxRounds;
        
        if (isFinalRound) {
          // This is the final round - game will end, stats screen will appear via game:end event
          console.log('🏁 Final round completed! Game will end and stats screen will appear.');
          // The game:end event should trigger shortly to show the stats screen
        }
        
        // Client-side fallback: If server doesn't start next round, trigger it client-side
        // This handles cases where serverless function terminates before setTimeout fires
        const roundEndDuration = 6000; // 6 seconds (slightly longer than server's 5s to give it a chance)
        const shouldContinue = currentRound < maxRounds;
        
        if (shouldContinue) {
          console.log('🔵 [CLIENT] Scheduling client-side next round fallback in', roundEndDuration, 'ms');
          // Clear any existing timeout
          if (timeoutRefs.current.roundAdvance) {
            clearTimeout(timeoutRefs.current.roundAdvance);
          }
          timeoutRefs.current.roundAdvance = setTimeout(async () => {
            // Check if we're still in END phase (server didn't start next round)
            console.log('🔵 [CLIENT] Client-side fallback: Checking if next round started...');
            
            // Call API to trigger next round
            try {
              const response = await fetch('/api/game/advance-round', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameCode, playerId }),
              });
              const result = await response.json();
              if (result.success) {
                console.log('🟢 [CLIENT] Client-side fallback: Successfully triggered next round');
                if (result.gameEnded) {
                  showToast('Game complete!', 'success');
                } else {
                  showToast('Starting next round...', 'info');
                }
              } else {
                console.warn('🟡 [CLIENT] Client-side fallback: Could not trigger next round:', result.error);
                showToast(`Could not start next round: ${result.error}`, 'warning');
              }
            } catch (error) {
              console.error('🔴 [CLIENT] Client-side fallback: Error triggering next round:', error);
              showToast('Error starting next round. Please refresh.', 'error');
            }
            timeoutRefs.current.roundAdvance = null;
          }, roundEndDuration);
        } else {
          console.log('🔵 [CLIENT] Game complete - all rounds finished');
        }
      });

      channel.bind('round:timeout', (data) => {
        setRoundPhase('WAITING_FOR_READY');
        setTimeRemaining(null);
        // Update players with reset ready status
        if (data.players) {
          setPlayers(data.players);
        }
      });

      channel.bind('player:ready', (data) => {
        // Update players with ready status
        if (data.players) {
          setPlayers(data.players);
        }
        // Show notification if all ready
        if (data.allReady) {
          showToast('All players ready! Starting next round...', 'success');
        } else {
          const readyCount = data.players.filter(p => p.ready).length;
          const totalCount = data.players.length;
          showToast(`${data.nickname} is ready (${readyCount}/${totalCount})`, 'info');
        }
      });

      channel.bind('player:correct-guess', (data) => {
        // Celebrate! Someone got the correct answer
        celebrateCorrectGuess();

        // Update leaderboard with new scores
        if (data.players) {
          setPlayers(data.players);
        }
        // Update round phase to show round is ending
        setRoundPhase('END');
      });

      channel.bind('game:end', async (data) => {
        setGameActive(false);
        setGameEnded(true);
        
        // Set final scores for stats screen
        if (data.finalScores && Array.isArray(data.finalScores)) {
          setFinalScores(data.finalScores);
        } else {
          // Fallback: use current players if finalScores not provided
          setFinalScores(players.map(p => ({
            id: p.id,
            nickname: p.nickname,
            score: p.score || 0,
          })).sort((a, b) => (b.score || 0) - (a.score || 0)));
        }
        
        const winner = data.finalScores && data.finalScores.length > 0
          ? data.finalScores[0].nickname
          : 'Unknown';
        showToast(`Game Over! Winner: ${winner}`, 'info');
        
        // Client-side fallback: Ensure stats are saved
        // This handles cases where server-side update might have failed
        try {
          const response = await fetch('/api/game/update-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameCode }),
          });
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              console.log('✅ Client-side stats update successful');
            }
          }
        } catch (error) {
          console.error('⚠️ Client-side stats update failed (non-critical):', error);
        }
      });

      channel.bind('game:start', (data) => {
        console.log('🟢 [DEBUG] Received game:start event:', { 
          gameActive: data.gameActive,
          playerCount: data.players?.length || 0, 
          players: data.players,
        });
        // Transition all players from lobby to game
        setGameActive(data.gameActive || true);
        setPlayers(data.players || []);
        // round:start will be received next to set up the round
      });

      channel.bind('lobby:state', (data) => {
        console.log('🟢 [DEBUG] Received lobby:state event:', { 
          playerCount: data.players?.length || 0, 
          players: data.players,
          gameActive: data.gameActive 
        });
        setPlayers(data.players || []);
        setGameActive(data.gameActive || false);
        setRoundNumber(data.roundNumber || 0);
        if (data.topic) {
          setGameTopic(data.topic);
        }
      });

      // Handle player joining active game - sync them with current round state
      channel.bind('player:joined-active-game', (data) => {
        console.log('🟢 [DEBUG] Player joined active game:', data.nickname);
        // Update players list
        if (data.players) {
          setPlayers(data.players);
        }
        // This event is mainly for other players to see the new player
        // The joining player gets state from the API response
      });

      // Listen for player position updates
      channel.bind('player:position-update', (data) => {
        console.log('🟢 [DEBUG] Player position update:', data);
        // Update other players' positions (skip current player)
        if (data.playerId !== playerId) {
          setOtherPlayersPositions(prev => {
            const newMap = new Map(prev);
            newMap.set(data.playerId, {
              currentNodeId: data.currentNodeId,
              position: data.position,
              wordLabel: data.wordLabel,
            });
            return newMap;
          });
          
          // Also update the players array with currentNodeId
          setPlayers(prev => prev.map(p => 
            p.id === data.playerId 
              ? { ...p, currentNodeId: data.currentNodeId, position: data.position }
              : p
          ));
        }
      });

      // Listen for token updates
      channel.bind('player:tokens-updated', (data) => {
        console.log('🔵 [CLIENT] player:tokens-updated received:', data, 'current local tokens:', tokens);
        if (data.playerId === playerId) {
          const newTokens = data.tokens !== undefined && data.tokens !== null ? data.tokens : 15;
          console.log(`🔵 [CLIENT] Updating tokens from Pusher event: ${tokens} -> ${newTokens}`);
          setTokens(newTokens);
          setIsOut(data.tokensOut || false);
        }
        // Also update players array
        setPlayers(prev => prev.map(p => 
          p.id === data.playerId 
            ? { ...p, tokens: data.tokens, tokensOut: data.tokensOut }
            : p
        ));
      });

      // Listen for player out event
      channel.bind('player:out', (data) => {
        console.log('🔵 [CLIENT] player:out received:', data);
        if (data.playerId === playerId) {
          setIsOut(true);
        }
        // Update players array
        setPlayers(prev => prev.map(p => 
          p.id === data.playerId 
            ? { ...p, tokensOut: true }
            : p
        ));
      });

      // Listen for vector gem spawned event
      channel.bind('vector-gem:spawned', (data) => {
        console.log('💎 [CLIENT] vector-gem:spawned received:', data);
        setVectorGems(prev => {
          // Check if gem already exists
          if (prev.find(g => g.id === data.gem.id)) {
            console.log('💎 [CLIENT] Gem already exists, skipping:', data.gem.id);
            return prev;
          }
          console.log('💎 [CLIENT] Adding new gem to state:', data.gem.id, 'Total gems:', prev.length + 1);
          return [...prev, data.gem];
        });
      });

      // Listen for vector gem hit event
      channel.bind('vector-gem:hit', (data) => {
        console.log('💎 [CLIENT] vector-gem:hit received:', data);
        setVectorGems(prev => prev.filter(g => g.id !== data.gemId));
        
        // If another player hit it, show notification
        if (data.playerId !== playerId) {
          showToast(`${data.nickname} collected a Vector Gem! +${data.reward} tokens`, 'info');
        }
      });

      // Listen for vector gem despawned event
      channel.bind('vector-gem:despawned', (data) => {
        console.log('💎 [CLIENT] vector-gem:despawned received:', data);
        setVectorGems(prev => prev.filter(g => g.id !== data.gemId));
      });

      // Listen for player left event
      channel.bind('player:left', (data) => {
        console.log('👋 [CLIENT] player:left received:', data);
        // If current player left, reset state
        if (data.playerId === playerId) {
          setGameCode(null);
          setPlayerId(null);
          setGameActive(false);
          showToast('You left the game', 'info');
        } else {
          // Remove player from list
          setPlayers(prev => prev.filter(p => p.id !== data.playerId));
          showToast(`${data.nickname} left the game`, 'info');
        }
      });

      // Listen for bad asteroid spawned event
      channel.bind('bad-asteroid:spawned', (data) => {
        console.log('☄️ [CLIENT] bad-asteroid:spawned received:', data);
        setBadAsteroids(prev => {
          // Check if asteroid already exists
          if (prev.find(a => a.id === data.asteroid.id)) {
            console.log('☄️ [CLIENT] Asteroid already exists, skipping:', data.asteroid.id);
            return prev;
          }
          console.log('☄️ [CLIENT] Adding new asteroid to state:', data.asteroid.id, 'Total asteroids:', prev.length + 1);
          return [...prev, data.asteroid];
        });
      });

      // Listen for bad asteroid hit event
      channel.bind('bad-asteroid:hit', (data) => {
        console.log('☄️ [CLIENT] bad-asteroid:hit received:', data);
        setBadAsteroids(prev => prev.filter(a => a.id !== data.asteroidId));
        
        // If another player hit it, show notification
        if (data.playerId !== playerId) {
          showToast(`${data.nickname} hit a Bad Asteroid! -${data.cost} tokens`, 'warning');
        }
      });

      // Poll for gems and asteroids periodically (since serverless setTimeout may not work)
      const pollForGems = async () => {
        if (!gameCode || !gameActive || roundPhase !== 'SEARCH') return;
        
        try {
          const response = await fetch(`/api/game/gems?gameCode=${gameCode}`);
          const data = await response.json();
          
          if (data.success) {
            // Update gems state - merge with existing, avoiding duplicates
            if (data.gems) {
              setVectorGems(prev => {
                const existingIds = new Set(prev.map(g => g.id));
                const newGems = data.gems.filter(g => !existingIds.has(g.id));
                if (newGems.length > 0) {
                  console.log('💎 [CLIENT] Polled and found new gems:', newGems.length, 'IDs:', newGems.map(g => g.id));
                }
                // Also remove gems that are no longer in the server response (hit or expired)
                const serverGemIds = new Set(data.gems.map(g => g.id));
                const filtered = prev.filter(g => serverGemIds.has(g.id));
                const merged = [...filtered, ...newGems];
                return merged;
              });
            }
            
            // Update asteroids state - merge with existing, avoiding duplicates
            if (data.asteroids) {
              setBadAsteroids(prev => {
                const existingIds = new Set(prev.map(a => a.id));
                const newAsteroids = data.asteroids.filter(a => !existingIds.has(a.id));
                if (newAsteroids.length > 0) {
                  console.log('☄️ [CLIENT] Polled and found new asteroids:', newAsteroids.length, 'IDs:', newAsteroids.map(a => a.id));
                }
                // Also remove asteroids that are no longer in the server response (hit or expired)
                const serverAsteroidIds = new Set(data.asteroids.map(a => a.id));
                const filtered = prev.filter(a => serverAsteroidIds.has(a.id));
                const merged = [...filtered, ...newAsteroids];
                return merged;
              });
            }
          }
        } catch (error) {
          console.error('Error polling for gems and asteroids:', error);
        }
      };

      // Poll every 5 seconds during SEARCH phase
      let gemPollInterval = null;
      if (gameActive && roundPhase === 'SEARCH') {
        gemPollInterval = setInterval(pollForGems, 5000);
        // Also poll immediately
        pollForGems();
      }

      return () => {
        pusher.unsubscribe(`game-${gameCode}`);
        if (gemPollInterval) {
          clearInterval(gemPollInterval);
        }
      };
    }
  }, [gameCode, playerId, gameActive, roundPhase]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev <= 1000 ? 0 : prev - 1000;
        
        // Detect when timer reaches 0 during SEARCH phase
        if (newTime === 0 && prev > 0 && roundPhase === 'SEARCH') {
          // Show toast notification
          showToast('Time\'s up! Waiting for all players to be ready...', 'warning');
          // Change phase to waiting for ready
          setRoundPhase('WAITING_FOR_READY');
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, roundPhase]);

  const loadWords = useCallback(async () => {
    try {
      // Use gameTopic if available, otherwise default
      const topic = gameTopic || 'general-database';
      const response = await fetch(`/api/words?topic=${encodeURIComponent(topic)}`);
      const data = await response.json();
      if (data.success) {
        console.log(`Loaded ${data.words.length} words from API`);
        
        // Log sample words to verify structure
        if (data.words.length > 0) {
          console.log('Sample word structure:', {
            id: data.words[0].id,
            label: data.words[0].label,
            position: data.words[0].position,
            positionType: typeof data.words[0].position,
            isArray: Array.isArray(data.words[0].position)
          });
        }
        
        const wordsWithValidPositions = data.words.filter(w => {
          const pos = w.position;
          return Array.isArray(pos) && 
                 pos.length === 3 && 
                 pos.some(p => p !== 0); // At least one coordinate is not zero
        });
        console.log(`Words with non-zero positions: ${wordsWithValidPositions.length}/${data.words.length}`);
        
        if (wordsWithValidPositions.length > 0) {
          console.log('Sample valid position:', wordsWithValidPositions[0].label, wordsWithValidPositions[0].position);
        }
        
        setWords(data.words);
        console.log('Words state updated, count:', data.words.length);
      } else {
        console.error('Failed to load words:', data.error);
      }
    } catch (error) {
      console.error('Error loading words:', error);
    }
  }, [gameTopic]);

  // Load words when game starts or practice mode is enabled
  useEffect(() => {
    if ((gameActive || practiceMode) && words.length === 0) {
      loadWords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameActive, practiceMode, words.length]); // loadWords is stable, don't include in deps

  // Preload avatar models when game becomes active
  useEffect(() => {
    if (gameActive) {
      preloadAvatars();
    }
  }, [gameActive]);


  const handleCreateGame = async (nickname, topic = 'general-database') => {
    try {
      const response = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, topic }),
      });
      const data = await response.json();
      if (data.success) {
        setGameCode(data.gameCode);
        setPlayerId(data.playerId);
        setIsHost(true);
        setGameTopic(data.topic || topic);
        setPlayers([{ id: data.playerId, nickname, ready: false, score: 0 }]);
      }
    } catch (error) {
      console.error('Error creating game:', error);
    }
  };

  const handleJoinGame = async (code, nickname) => {
    try {
      const response = await fetch('/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode: code, nickname }),
      });
      const data = await response.json();
      if (data.success) {
        setGameCode(data.gameCode);
        setPlayerId(data.playerId);
        setIsHost(false);
        setGameTopic(data.topic || 'general-database');
        // Set initial players from API response (Pusher events will update in real-time)
        if (data.players && Array.isArray(data.players)) {
          setPlayers(data.players);
        }
        
        // If joining an active game, sync with current game state
        if (data.gameActive) {
          console.log('🟢 [DEBUG] Joining active game, syncing state:', {
            roundNumber: data.roundNumber,
            roundPhase: data.roundPhase,
            hasTarget: !!data.target,
            hasDefinition: !!data.definition,
          });
          
          setGameActive(true);
          setRoundNumber(data.roundNumber || 0);
          setMaxRounds(data.maxRounds || 5);
          setRoundPhase(data.roundPhase || 'SEARCH');
          
          if (data.definition) {
            setDefinition(data.definition);
          }
          
          if (data.target) {
            setCurrentTarget(data.target);
          }
          
          if (data.timeRemaining !== undefined) {
            setTimeRemaining(data.timeRemaining);
          }
          
          // Load words if game is active
          if (data.gameActive) {
            loadWords();
          }
        }
      } else {
        showToast('Failed to join game: ' + data.error, 'error');
      }
    } catch (error) {
      console.error('Error joining game:', error);
      showToast('Failed to join game', 'error');
    }
  };

  const handleStartGame = async () => {
    try {
      const response = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode, playerId }),
      });
      const data = await response.json();
      if (data.success) {
        setGameActive(true);
        // Reload words when game starts
        await loadWords();
      } else {
        showToast('Failed to start game: ' + data.error, 'error');
      }
    } catch (error) {
      console.error('Error starting game:', error);
      showToast('Failed to start game', 'error');
    }
  };

  const handleHop = async (wordLabel, actionType = 'guess') => {
    console.log('🔵 [CLIENT] ========== handleHop CALLED ==========');
    console.log('🔵 [CLIENT] handleHop params:', { wordLabel, gameActive, practiceMode, roundPhase, isGuessing, gameCode, playerId, hasGameCode: !!gameCode, hasPlayerId: !!playerId, tokens, isOut });
    
    // Practice mode: just navigate without API calls
    // Note: handlePracticeHop is defined later, after loadNeighbors
    if (practiceMode) {
      console.log('🎮 [PRACTICE] handleHop called with:', wordLabel, 'Type:', typeof wordLabel);
      console.log('🎮 [PRACTICE] Words array length:', words.length);
      console.log('🎮 [PRACTICE] Neighbors:', neighbors.map(n => ({ label: n.label, wordId: n.wordId })));
      
      // Normalize the input - convert to string and trim for comparison
      const searchValue = typeof wordLabel === 'string' 
        ? wordLabel.trim() 
        : (wordLabel?.toString() || '').trim();
      const searchValueLower = searchValue?.toLowerCase();
      
      // Helper to normalize IDs for comparison
      const normalizeId = (id) => {
        if (!id) return '';
        const str = typeof id === 'string' ? id : id?.toString() || '';
        return str.trim();
      };
      
      // Try to find the word by label first
      let word = words.find(w => {
        const label = w.label?.toLowerCase()?.trim();
        return label === searchValueLower;
      });
      
      if (word) {
        console.log('🎮 [PRACTICE] Found word by label:', word.label, word.id);
      } else {
        // If not found by label, try to find by ID (wordLabel might be an ID)
        console.log('🎮 [PRACTICE] Not found by label, trying ID lookup...', searchValue);
        const normalizedSearch = normalizeId(searchValue);
        word = words.find(w => {
          const wordIdStr = normalizeId(w.id);
          const match = wordIdStr === normalizedSearch;
          if (match) {
            console.log('🎮 [PRACTICE] ID match found:', { search: normalizedSearch, wordId: wordIdStr, wordLabel: w.label });
          }
          return match;
        });
        
        if (word) {
          console.log('🎮 [PRACTICE] Found word by ID:', word.label, word.id);
        } else {
          // If still not found, check neighbors - maybe the wordLabel is a neighbor's wordId
          console.log('🎮 [PRACTICE] Not found by ID, checking neighbors...');
          const matchingNeighbor = neighbors.find(n => {
            const neighborIdStr = normalizeId(n.wordId);
            const neighborLabel = n.label?.toLowerCase()?.trim();
            return neighborIdStr === normalizedSearch || neighborLabel === searchValueLower;
          });
          
          if (matchingNeighbor && matchingNeighbor.wordId) {
            console.log('🎮 [PRACTICE] Found matching neighbor:', matchingNeighbor.label, matchingNeighbor.wordId);
            // Find the word by neighbor's wordId
            const neighborIdStr = normalizeId(matchingNeighbor.wordId);
            
            word = words.find(w => {
              const wordIdStr = normalizeId(w.id);
              const match = wordIdStr === neighborIdStr;
              if (match) {
                console.log('🎮 [PRACTICE] Found word via neighbor ID:', w.label, w.id);
              }
              return match;
            });
          }
        }
      }
      
      if (!word) {
        // Last resort: check if we can find the word by loading it from the API
        // This handles cases where a neighbor word isn't in the loaded words array
        console.log('🎮 [PRACTICE] Word not in loaded array, checking if we can fetch it...');
        
        // If searchValue looks like an ID (hex string), try to fetch the word
        const looksLikeId = /^[0-9a-f]{24}$/i.test(searchValue);
        if (looksLikeId) {
          try {
            // Try to find it in neighbors first (cheaper)
            const neighborMatch = neighbors.find(n => {
              const neighborIdStr = normalizeId(n.wordId);
              return neighborIdStr === normalizeId(searchValue);
            });
            
            if (neighborMatch) {
              // We have the neighbor data, but the word isn't in our words array
              // For practice mode, we can still navigate using the neighbor's wordId
              console.log('🎮 [PRACTICE] Found neighbor but word not in array, using neighbor data');
              console.log('🎮 [PRACTICE] This neighbor word may not be fully loaded. Attempting to navigate anyway...');
              
              // Set the current node to the neighbor's wordId
              setCurrentNodeId(neighborMatch.wordId);
              await loadNeighbors(neighborMatch.wordId);
              showToast(`Navigated to: ${neighborMatch.label}`, 'success');
              return;
            }
          } catch (error) {
            console.error('🎮 [PRACTICE] Error trying to navigate with neighbor data:', error);
          }
        }
        
        console.error('🎮 [PRACTICE] Word not found!', {
          searchValue,
          wordsCount: words.length,
          sampleWordIds: words.slice(0, 3).map(w => ({ label: w.label, id: w.id, idType: typeof w.id })),
          neighbors: neighbors.map(n => ({ label: n.label, wordId: n.wordId, wordIdType: typeof n.wordId }))
        });
        showToast(`Word "${wordLabel}" not found in loaded words`, 'warning');
        return;
      }
      
      // Update current node
      console.log('🎮 [PRACTICE] Navigating to:', word.label, word.id);
      setCurrentNodeId(word.id);
      
      // Load neighbors for this word
      await loadNeighbors(word.id);
      
      showToast(`Navigated to: ${word.label}`, 'success');
      return;
    }
    
    if (!gameActive || roundPhase !== 'SEARCH' || isGuessing || isOut) {
      const reason = !gameActive ? 'game not active' : roundPhase !== 'SEARCH' ? `wrong phase: ${roundPhase}` : isOut ? 'you are out of tokens' : 'already guessing';
      console.warn('🔴 [CLIENT] handleHop BLOCKED:', { reason, gameActive, roundPhase, isGuessing, isOut, expectedPhase: 'SEARCH' });
      showToast(`Cannot guess: ${reason}`, 'warning');
      return;
    }

    // Check tokens based on action type
    const requiredTokens = actionType === 'shoot' ? 2 : 3;
    if (tokens < requiredTokens) {
      showToast(`Insufficient tokens. You need ${requiredTokens} tokens but only have ${tokens}.`, 'warning');
      return;
    }

    setIsGuessing(true);
    try {
      const response = await fetch('/api/game/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode, playerId, guess: wordLabel, actionType }),
      }).catch((fetchError) => {
        console.error('🔴 [CLIENT] Fetch error (network/CORS):', fetchError);
        throw fetchError;
      });
      console.log('🔵 [CLIENT] Guess API response status:', response.status, response.statusText, 'ok:', response.ok);
      
      // Check if response is ok before parsing
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔴 [CLIENT] Guess API error response:', response.status, errorText);
        try {
          const errorData = JSON.parse(errorText);
          showToast(errorData.error || `Server error: ${response.status}`, 'error');
        } catch {
          showToast(`Server error: ${response.status} ${response.statusText}`, 'error');
        }
        return;
      }
      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('🔴 [CLIENT] Failed to parse JSON response:', parseError);
        showToast('Invalid response from server', 'error');
        return;
      }
      
      console.log('🔵 [CLIENT] Guess API response data:', { success: data.success, similarity: data.similarity, wordId: data.wordId, inGraph: data.inGraph, error: data.error });
      if (data.success) {
        // Update tokens from response
        if (data.tokens !== undefined) {
          setTokens(data.tokens);
        }
        if (data.tokensOut !== undefined) {
          setIsOut(data.tokensOut);
        }
        
        // Celebrate correct guess with confetti and sound!
        if (data.correct) {
          celebrateCorrectGuess();
        }

        // Add guess to history
        const newGuess = {
          word: data.label || wordLabel,
          similarity: data.similarity,
          inGraph: data.inGraph !== false, // Default to true if not specified
          timestamp: Date.now(),
        };
        setGuesses(prev => [...prev, newGuess]);
        
        // Try to find the word in our loaded words array and hop to it
        // This works even if the word wasn't in game.wordNodes
        console.log('🔵 [CLIENT] Processing word lookup:', { wordId: data.wordId, label: data.label, inGraph: data.inGraph, wordsArrayLength: words.length, hasPosition: !!data.position });
        if (data.wordId) {
          // Word exists in database - try to find it in our words array
          const foundWord = words.find(w => w.id === data.wordId);
          console.log('🔵 [CLIENT] Searched by wordId:', { foundWord: !!foundWord, hasPosition: foundWord?.position ? true : false, wordId: data.wordId });
          if (foundWord && foundWord.position) {
            console.log('🟢 [CLIENT] Found guessed word in words array, hopping to:', foundWord.label, foundWord.position);
            console.log('🔵 [CLIENT] Setting currentNodeId to:', data.wordId);
            setCurrentNodeId(data.wordId);
            // Update current player's position in players array
            setPlayers(prev => prev.map(p => 
              p.id === playerId 
                ? { ...p, currentNodeId: data.wordId, position: foundWord.position }
                : p
            ));
            console.log('🔵 [CLIENT] Calling loadNeighbors with:', data.wordId);
            loadNeighbors(data.wordId);
          } else {
            // Word not in our loaded words - try to find by label
            const foundByLabel = words.find(w => w.label.toLowerCase() === (data.label || wordLabel).toLowerCase());
            console.log('🔵 [CLIENT] Searched by label:', { foundByLabel: !!foundByLabel, hasPosition: foundByLabel?.position ? true : false, searchLabel: data.label || wordLabel });
            if (foundByLabel && foundByLabel.position) {
              console.log('🟢 [CLIENT] Found guessed word by label, hopping to:', foundByLabel.label, foundByLabel.position);
              console.log('🔵 [CLIENT] Setting currentNodeId to:', foundByLabel.id);
              setCurrentNodeId(foundByLabel.id);
              // Update current player's position in players array
              setPlayers(prev => prev.map(p => 
                p.id === playerId 
                  ? { ...p, currentNodeId: foundByLabel.id, position: foundByLabel.position }
                  : p
              ));
              console.log('🔵 [CLIENT] Calling loadNeighbors with:', foundByLabel.id);
              loadNeighbors(foundByLabel.id);
            } else if (data.position && Array.isArray(data.position) && data.position.length === 3) {
              // Fallback: Use position from API response even if word not in words array
              console.log('🟡 [CLIENT] Word not in words array, but API provided position. Adding word and hopping:', data.label, data.position);
              // Add the word to the words array temporarily so visualization can use it
              const newWord = {
                id: data.wordId,
                label: data.label || wordLabel,
                position: data.position,
                embedding: null, // May not have embedding, but position is enough for visualization
              };
              setWords(prev => {
                // Check if word already exists to avoid duplicates
                const exists = prev.find(w => w.id === data.wordId);
                if (exists) return prev;
                return [...prev, newWord];
              });
              console.log('🔵 [CLIENT] Setting currentNodeId to:', data.wordId);
              setCurrentNodeId(data.wordId);
              // Update current player's position in players array
              if (data.position) {
                setPlayers(prev => prev.map(p => 
                  p.id === playerId 
                    ? { ...p, currentNodeId: data.wordId, position: data.position }
                    : p
                ));
              }
              console.log('🔵 [CLIENT] Calling loadNeighbors with:', data.wordId);
              loadNeighbors(data.wordId);
            } else {
              console.warn('🔴 [CLIENT] Guessed word not found in words array and no position from API:', data.label || wordLabel, 'wordId:', data.wordId);
              console.warn('🔴 [CLIENT] Words array sample (first 5):', words.slice(0, 5).map(w => ({ id: w.id, label: w.label })));
            }
          }
        } else if (data.inGraph === false) {
          // Word not in graph - don't try to hop
          console.log('🟡 [CLIENT] Word not in graph, skipping hop');
        } else {
          console.warn('🟡 [CLIENT] No wordId and inGraph is not false - unexpected state:', { wordId: data.wordId, inGraph: data.inGraph });
        }
        
        setFeedback({ 
          similarity: data.similarity, 
          word: data.label || wordLabel,
          inGraph: data.inGraph !== false,
          message: data.message,
        });
        
        if (data.similarity > bestSimilarity) {
          setBestSimilarity(data.similarity);
        }
      } else {
        showToast(data.error || 'Failed to process guess', 'error');
      }
    } catch (error) {
      console.error('🔴 [CLIENT] Error hopping:', error);
      console.error('🔴 [CLIENT] Error details:', { 
        message: error.message, 
        stack: error.stack,
        name: error.name,
        cause: error.cause 
      });
      const errorMessage = error.message || 'Unknown error occurred';
      showToast(`Error: ${errorMessage}. Check console for details.`, 'error');
    } finally {
      setIsGuessing(false);
    }
  };

  // Keep handleHop ref updated
  useEffect(() => {
    handleHopRef.current = handleHop;
  }, [handleHop]);

  // Wrapper for onHop prop to add logging and validation
  const onHopWrapper = useCallback((wordLabel) => {
    console.log('🔵 [PAGE] onHopWrapper called with:', wordLabel, 'handleHop type:', typeof handleHop);
    if (handleHop && typeof handleHop === 'function') {
      handleHop(wordLabel);
    } else {
      console.error('🔴 [PAGE] handleHop is not a function:', handleHop);
    }
  }, [handleHop]);

  const loadNeighbors = async (wordId) => {
    if (!wordId) {
      console.warn('loadNeighbors: wordId is missing');
      return;
    }
    try {
      console.log('Loading neighbors for wordId:', wordId);
      const response = await fetch('/api/similarity-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId, limit: 5 }),
      });
      const data = await response.json();
      console.log('Neighbors response:', data);
      if (data.success && data.results) {
        // Client-side safeguard: Filter out the current word from neighbors
        // This prevents the word from appearing in its own neighbors list
        const currentWordIdStr = typeof wordId === 'string' ? wordId : wordId?.toString();
        const seenIds = new Set();
        
        const filteredNeighbors = data.results.filter(neighbor => {
          if (!neighbor || !neighbor.wordId) return false;
          
          const neighborIdStr = typeof neighbor.wordId === 'string' ? neighbor.wordId : neighbor.wordId?.toString();
          
          // Filter out the current word
          if (neighborIdStr === currentWordIdStr) {
            console.warn(`🟡 [CLIENT] Filtered out current word from neighbors: ${neighbor.label} (ID: ${neighborIdStr})`);
            return false;
          }
          
          // Filter out duplicates
          if (seenIds.has(neighborIdStr)) {
            console.warn(`🟡 [CLIENT] Filtered out duplicate neighbor: ${neighbor.label} (ID: ${neighborIdStr})`);
            return false;
          }
          
          seenIds.add(neighborIdStr);
          return true;
        });
        
        console.log(`🟢 [CLIENT] Loaded ${filteredNeighbors.length} neighbors (filtered from ${data.results.length} results)`);
        setNeighbors(filteredNeighbors);
      } else {
        console.warn('Failed to load neighbors:', data.error);
        setNeighbors([]);
      }
    } catch (error) {
      console.error('Error loading neighbors:', error);
      setNeighbors([]);
    }
  };

  // Practice mode navigation - just navigate without API calls
  const handlePracticeHop = useCallback(async (wordLabel) => {
    console.log('🎮 [PRACTICE] Navigating to:', wordLabel);
    
    // Find the word in the words array
    const word = words.find(w => 
      w.label?.toLowerCase() === wordLabel.toLowerCase()
    );
    
    if (!word) {
      showToast(`Word "${wordLabel}" not found in loaded words`, 'warning');
      return;
    }
    
    // Update current node
    setCurrentNodeId(word.id);
    
    // Load neighbors for this word
    await loadNeighbors(word.id);
    
    showToast(`Navigated to: ${word.label}`, 'success');
  }, [words, loadNeighbors, showToast]);

  const loadRelatedWords = useCallback(async () => {
    if (!currentTarget || !currentTarget.id) {
      console.warn('loadRelatedWords: currentTarget or currentTarget.id is missing', currentTarget);
      return;
    }
    try {
      console.log('🟢 Loading related words for target:', currentTarget.id, currentTarget.label, 'Type:', typeof currentTarget.id);
      const response = await fetch('/api/similarity-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId: currentTarget.id, limit: 5 }),
      });
      const data = await response.json();
      console.log('🟢 Related words response:', data);
      if (data.success && data.results && data.results.length > 0) {
        console.log(`🟢 Successfully loaded ${data.results.length} related words`);
        setRelatedWords(data.results);
      } else {
        console.warn('🔴 Failed to load related words:', data.error || 'No results returned');
        setRelatedWords([]);
      }
    } catch (error) {
      console.error('🔴 Error loading related words:', error);
      setRelatedWords([]);
    }
  }, [currentTarget]);

  useEffect(() => {
    // Only try to load related words if we have a currentTarget and we're in an active game (not practice mode)
    if (currentTarget && currentTarget.id && gameActive && !practiceMode) {
      console.log('🟢 useEffect triggered: currentTarget changed, loading related words', currentTarget);
      loadRelatedWords();
    }
    // Silently ignore if no target - this is normal on initial load or in practice mode
  }, [currentTarget, loadRelatedWords, gameActive, practiceMode]);

  const handleMarkReady = async () => {
    if (!gameCode || !playerId) return;
    
    try {
      const response = await fetch('/api/game/ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode, playerId }),
      });
      const data = await response.json();
      if (data.success) {
        // Player ready status will be updated via Pusher event
        if (data.allReady) {
          showToast('All players ready! Starting next round...', 'success');
        }
      } else {
        showToast('Failed to mark ready. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error marking ready:', error);
      showToast('Error marking ready. Please try again.', 'error');
    }
  };

  const handleGetHint = async () => {
    if (hintUsed || !gameActive || roundPhase !== 'SEARCH' || isOut) {
      return;
    }

    // Check tokens
    if (tokens < 5) {
      showToast(`Insufficient tokens. You need 5 tokens but only have ${tokens}.`, 'warning');
      return;
    }

    try {
      const response = await fetch('/api/game/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode, playerId }),
      });
      const data = await response.json();
      if (data.success) {
        setHintUsed(true);
        setHintText(data.hint || '');
        // Update tokens from response
        if (data.tokens !== undefined) {
          setTokens(data.tokens);
        }
        if (data.tokensOut !== undefined) {
          setIsOut(data.tokensOut);
        }
        showToast(`Hint revealed! -${data.penalty} points. Your score: ${data.newScore}`, 'info');
        // Update player score in local state
        setPlayers(prev => prev.map(p => 
          p.id === playerId ? { ...p, score: data.newScore } : p
        ));
      } else {
        showToast(data.error || 'Failed to get hint', 'error');
      }
    } catch (error) {
      console.error('Error getting hint:', error);
      showToast('Error getting hint. Please try again.', 'error');
    }
  };

  const handleUseReranker = async () => {
    if (rerankerUsed || !gameActive || roundPhase !== 'SEARCH' || isOut) {
      return;
    }

    // Check tokens
    if (tokens < 4) {
      showToast(`Insufficient tokens. You need 4 tokens but only have ${tokens}.`, 'warning');
      return;
    }

    // Need current word and target
    if (!currentNodeId || !currentTarget || !currentTarget.id) {
      showToast('Cannot rerank: need to be on a word node with a target set.', 'warning');
      return;
    }

    // Need some words to rerank
    if (neighbors.length === 0 && relatedWords.length === 0) {
      showToast('No words to rerank. Explore some words first!', 'info');
      return;
    }

    try {
      const response = await fetch('/api/game/rerank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameCode,
          playerId,
          neighbors,
          relatedWords,
          currentWordId: currentNodeId,
          targetWordId: currentTarget.id,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setRerankerUsed(true);
        
        // Count top picks for better feedback
        const topPickCount = [
          ...(data.rerankedNeighbors || []).filter(w => w.highlyRelevant),
          ...(data.rerankedRelatedWords || []).filter(w => w.highlyRelevant),
        ].length;
        
        // Update word lists with reranked results
        if (data.rerankedNeighbors && data.rerankedNeighbors.length > 0) {
          setNeighbors(data.rerankedNeighbors);
        }
        if (data.rerankedRelatedWords && data.rerankedRelatedWords.length > 0) {
          setRelatedWords(data.rerankedRelatedWords);
        }
        
        // Update tokens from response
        if (data.tokens !== undefined) {
          setTokens(data.tokens);
        }
        if (data.tokensOut !== undefined) {
          setIsOut(data.tokensOut);
        }
        
        // More informative toast message
        const neighborCount = data.rerankedNeighbors?.length || 0;
        const relatedCount = data.rerankedRelatedWords?.length || 0;
        showToast(
          `🔄 Reranker applied! ${neighborCount + relatedCount} words re-ranked. Look for ⭐ Top Pick badges on the best words!`,
          'success'
        );
      } else {
        showToast(data.error || 'Failed to use reranker', 'error');
      }
    } catch (error) {
      console.error('Error using reranker:', error);
      showToast('Error using reranker. Please try again.', 'error');
    }
  };

  const handleWordClick = (word) => {
    handleHop(word.label, 'shoot');
  };

  const handleBadAsteroidHit = async (asteroid) => {
    // Handle both asteroid object and asteroidId string for flexibility
    console.log('☄️ [CLIENT] ========== handleBadAsteroidHit CALLED ==========');
    console.log('☄️ [CLIENT] handleBadAsteroidHit called with:', asteroid, 'type:', typeof asteroid);
    console.log('☄️ [CLIENT] Full asteroid object:', JSON.stringify(asteroid, null, 2));
    console.log('☄️ [CLIENT] Current game state:', { gameActive, practiceMode, roundPhase, gameCode: !!gameCode, playerId: !!playerId });
    console.log('☄️ [CLIENT] Available badAsteroids in state:', badAsteroids.map(a => ({ id: a.id, position: a.position, velocity: a.velocity })));
    
    let asteroidId;
    if (typeof asteroid === 'string') {
      asteroidId = asteroid;
    } else if (asteroid && typeof asteroid === 'object') {
      asteroidId = asteroid.id;
      console.log('☄️ [CLIENT] Extracted asteroidId from object:', asteroidId, 'Full asteroid object:', JSON.stringify(asteroid));
    } else {
      console.error('☄️ [CLIENT] handleBadAsteroidHit: Invalid asteroid parameter', asteroid);
      showToast('Invalid asteroid data', 'error');
      return;
    }
    
    if (!gameCode || !playerId || !asteroidId) {
      console.error('☄️ [CLIENT] handleBadAsteroidHit: Missing params', { gameCode, playerId, asteroidId, asteroidType: typeof asteroid, asteroid, practiceMode });
      if (practiceMode) {
        showToast('Asteroids are only available in active games, not practice mode', 'info');
      } else {
        showToast('Missing game information', 'error');
      }
      return;
    }
    
    console.log('☄️ [CLIENT] Processing asteroid hit:', { asteroidId, asteroidIdType: typeof asteroidId, gameCode, playerId });
    
    // Verify asteroid exists in local state before sending request
    const asteroidInState = badAsteroids.find(a => {
      const aId = typeof a.id === 'string' ? a.id : String(a.id);
      const searchId = typeof asteroidId === 'string' ? asteroidId : String(asteroidId);
      return aId === searchId;
    });
    
    if (!asteroidInState) {
      console.warn('☄️ [CLIENT] Asteroid not found in local state:', { 
        asteroidId, 
        asteroidIdType: typeof asteroidId,
        availableAsteroids: badAsteroids.map(a => ({ id: a.id, idType: typeof a.id }))
      });
      showToast('Asteroid not found in local state - it may have expired or been hit', 'warning');
      return;
    }
    
    if (asteroidInState.hitBy) {
      console.warn('☄️ [CLIENT] Asteroid already hit:', asteroidId);
      showToast('This asteroid has already been hit', 'info');
      return;
    }
    
    // Check if asteroid expired
    const now = Date.now();
    const asteroidAge = now - asteroidInState.spawnTime;
    if (asteroidAge >= 30000) {
      console.warn('☄️ [CLIENT] Asteroid expired:', { asteroidId, age: asteroidAge });
      showToast('This asteroid has expired', 'info');
      return;
    }
    
    if (!gameActive || roundPhase !== 'SEARCH') {
      console.warn('☄️ [CLIENT] handleBadAsteroidHit: Game not active or wrong phase', { gameActive, roundPhase, practiceMode });
      showToast(`Cannot hit asteroids: ${!gameActive ? 'Game not active' : `Wrong phase (${roundPhase})`}`, 'warning');
      return;
    }
    if (isOut) {
      console.warn('☄️ [CLIENT] handleBadAsteroidHit: Player is out');
      showToast('You are out of tokens and cannot shoot', 'warning');
      return;
    }

    console.log('☄️ [CLIENT] Sending asteroid hit request:', { asteroidId, asteroidIdType: typeof asteroidId, asteroid: asteroidInState, currentTokens: tokens });

    try {
      const response = await fetch('/api/game/hit-asteroid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode, playerId, asteroidId: String(asteroidId) }), // Ensure asteroidId is a string
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('☄️ [CLIENT] hit-asteroid API error:', response.status, errorText);
        try {
          const errorData = JSON.parse(errorText);
          showToast(errorData.error || 'Failed to hit Bad Asteroid', 'error');
        } catch {
          showToast(`Failed to hit Bad Asteroid: ${response.status}`, 'error');
        }
        return;
      }

      const data = await response.json();
      console.log('☄️ [CLIENT] hit-asteroid API response:', data);
      
      if (data.success) {
        // Update tokens from response
        if (data.tokens !== undefined) {
          setTokens(data.tokens);
        }
        if (data.tokensOut !== undefined) {
          setIsOut(data.tokensOut);
        }
        
        // Remove asteroid from local state
        setBadAsteroids(prev => prev.filter(a => a.id !== asteroidId));
        
        // Show warning toast
        showToast(`Bad Asteroid hit! -${data.cost} tokens (${data.tokensBefore} → ${data.tokens})`, 'warning');
        
        if (data.tokensOut) {
          showToast('You are out of tokens!', 'error');
        }
      } else {
        showToast(data.error || 'Failed to hit Bad Asteroid', 'error');
      }
    } catch (error) {
      console.error('Error hitting bad asteroid:', error);
      showToast('Error hitting bad asteroid. Please try again.', 'error');
    }
  };

  const handleGemHit = async (gem) => {
    // Handle both gem object and gemId string for flexibility
    console.log('💎 [CLIENT] ========== handleGemHit CALLED ==========');
    console.log('💎 [CLIENT] handleGemHit called with:', gem, 'type:', typeof gem);
    console.log('💎 [CLIENT] Current game state:', { gameActive, practiceMode, roundPhase, gameCode: !!gameCode, playerId: !!playerId });
    
    let gemId;
    if (typeof gem === 'string') {
      gemId = gem;
    } else if (gem && typeof gem === 'object') {
      gemId = gem.id;
      console.log('💎 [CLIENT] Extracted gemId from object:', gemId, 'Full gem object:', JSON.stringify(gem));
    } else {
      console.error('💎 [CLIENT] handleGemHit: Invalid gem parameter', gem);
      showToast('Invalid gem data', 'error');
      return;
    }
    
    if (!gameCode || !playerId || !gemId) {
      console.error('💎 [CLIENT] handleGemHit: Missing params', { gameCode, playerId, gemId, gemType: typeof gem, gem, practiceMode });
      if (practiceMode) {
        showToast('Gems are only available in active games, not practice mode', 'info');
      } else {
        showToast('Missing game information', 'error');
      }
      return;
    }
    
    console.log('💎 [CLIENT] Processing gem hit:', { gemId, gemIdType: typeof gemId, gameCode, playerId });
    
    // Verify gem exists in local state before sending request
    const gemInState = vectorGems.find(g => {
      const gId = typeof g.id === 'string' ? g.id : String(g.id);
      const searchId = typeof gemId === 'string' ? gemId : String(gemId);
      return gId === searchId;
    });
    
    if (!gemInState) {
      console.warn('💎 [CLIENT] Gem not found in local state:', { 
        gemId, 
        gemIdType: typeof gemId,
        availableGems: vectorGems.map(g => ({ id: g.id, idType: typeof g.id }))
      });
      showToast('Gem not found in local state - it may have expired or been collected', 'warning');
      return;
    }
    
    if (gemInState.hitBy) {
      console.warn('💎 [CLIENT] Gem already hit:', gemId);
      showToast('This gem has already been collected', 'info');
      return;
    }
    
    // Check if gem expired
    const now = Date.now();
    const gemAge = now - gemInState.spawnTime;
    if (gemAge >= 30000) {
      console.warn('💎 [CLIENT] Gem expired:', { gemId, age: gemAge });
      showToast('This gem has expired', 'info');
      return;
    }
    
    if (!gameActive || roundPhase !== 'SEARCH') {
      console.warn('💎 [CLIENT] handleGemHit: Game not active or wrong phase', { gameActive, roundPhase, practiceMode });
      showToast(`Cannot collect gems: ${!gameActive ? 'Game not active' : `Wrong phase (${roundPhase})`}`, 'warning');
      return;
    }
    // NOTE: Removed isOut check - gems REWARD tokens, so they should be collectable
    // even when out of tokens! This allows players to recover by collecting gems.
    // The API route already validates game state properly.

    console.log('💎 [CLIENT] Sending gem hit request:', { gemId, gemIdType: typeof gemId, gem: gemInState, currentTokens: tokens });

    try {
      const response = await fetch('/api/game/hit-gem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode, playerId, gemId: String(gemId) }), // Ensure gemId is a string
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('💎 [CLIENT] hit-gem API error:', response.status, errorText);
        try {
          const errorData = JSON.parse(errorText);
          showToast(errorData.error || 'Failed to hit Vector Gem', 'error');
        } catch {
          showToast(`Failed to hit Vector Gem: ${response.status}`, 'error');
        }
        return;
      }

      const data = await response.json();
      console.log('💎 [CLIENT] hit-gem API response:', data);
      
      if (data.success) {
        // Update tokens from response - do this immediately before Pusher event might override
        const tokensBefore = tokens;
        if (data.tokens !== undefined && data.tokens !== null) {
          console.log(`💎 [CLIENT] Updating tokens from API response: ${tokensBefore} -> ${data.tokens} (+${data.reward})`);
          
          // Store the API token value to compare with Pusher events
          const apiTokenValue = data.tokens;
          
          // Update state immediately
          setTokens(apiTokenValue);
          
          // Also update in players array for consistency
          setPlayers(prev => prev.map(p => 
            p.id === playerId 
              ? { ...p, tokens: apiTokenValue, tokensOut: data.tokensOut || false }
              : p
          ));
          
          // Verify the update was applied
          setTimeout(() => {
            console.log(`💎 [CLIENT] Token verification after ${apiTokenValue}ms: Expected ${apiTokenValue}`);
          }, 50);
        }
        if (data.tokensOut !== undefined) {
          setIsOut(data.tokensOut);
        }
        
        // Show success notification with current token count
        showToast(`💎 Vector Gem collected! +${data.reward} tokens! (Total: ${data.tokens})`, 'success');
        
        // Remove gem from local state
        setVectorGems(prev => {
          const filtered = prev.filter(g => g.id !== gemId);
          console.log(`💎 [CLIENT] Removed gem ${gemId} from state. Remaining gems: ${filtered.length}`);
          return filtered;
        });
      } else {
        console.error('💎 [CLIENT] hit-gem failed:', data.error);
        showToast(data.error || 'Failed to hit Vector Gem', 'error');
      }
    } catch (error) {
      console.error('💎 [CLIENT] Error hitting vector gem:', error);
      showToast('Failed to hit Vector Gem', 'error');
    }
  };

  const handleReturnToLobby = () => {
    setGameEnded(false);
    setGameActive(false);
    setFinalScores([]);
    // Reset game state
    setRoundNumber(0);
    setRoundPhase('TUTORIAL');
    setWords([]);
    setCurrentNodeId(null);
    setDefinition('');
    setTimeRemaining(null);
    setBestSimilarity(0);
    setNeighbors([]);
    setRelatedWords([]);
    setFeedback(null);
    setCurrentTarget(null);
    setGuesses([]);
    setRerankerUsed(false);
    setHintUsed(false);
    setHintText('');
    setRerankerUsed(false);
    setNeighborIndex(0);
  };

  // Reset neighbor index when current node changes
  useEffect(() => {
    setNeighborIndex(0);
  }, [currentNodeId]);

  // Keyboard navigation handler
  useEffect(() => {
    const handleKeyboardNavigation = (event) => {
      // Don't handle if user is typing in an input field
      const activeElement = document.activeElement;
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
      );
      
      if (isTyping) return;
      
      // Handle in practice mode or during SEARCH phase when game is active
      if (practiceMode) {
        // Practice mode: allow navigation
      } else if (!gameActive || roundPhase !== 'SEARCH' || isGuessing || isOut) {
        // Don't prevent default if game isn't active - let browser handle arrow keys
        return;
      }
      
      // Handle Left/Right Arrow - navigate between neighbors
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        
        // First try: Use neighbors if available
        if (neighbors.length > 0 && currentNodeId) {
          if (event.key === 'ArrowLeft') {
            // Move to previous neighbor (wrap around)
            const newIndex = neighborIndex > 0 ? neighborIndex - 1 : neighbors.length - 1;
            setNeighborIndex(newIndex);
            const neighbor = neighbors[newIndex];
            if (neighbor && handleHopRef.current) {
              // In practice mode, prefer using wordId if available, otherwise use label
              const targetWord = neighbor.wordId || neighbor.label;
              console.log(`🔵 [KEYBOARD] Left arrow: Navigating to neighbor ${newIndex}/${neighbors.length}: ${neighbor.label} (ID: ${neighbor.wordId})`);
              handleHopRef.current(targetWord, 'shoot');
            } else {
              console.warn(`🔵 [KEYBOARD] Left arrow: Invalid neighbor at index ${newIndex}`, neighbor);
            }
          } else {
            // Move to next neighbor (wrap around)
            const newIndex = (neighborIndex + 1) % neighbors.length;
            setNeighborIndex(newIndex);
            const neighbor = neighbors[newIndex];
            if (neighbor && handleHopRef.current) {
              // In practice mode, prefer using wordId if available, otherwise use label
              const targetWord = neighbor.wordId || neighbor.label;
              console.log(`🔵 [KEYBOARD] Right arrow: Navigating to neighbor ${newIndex}/${neighbors.length}: ${neighbor.label} (ID: ${neighbor.wordId})`);
              handleHopRef.current(targetWord, 'shoot');
            } else {
              console.warn(`🔵 [KEYBOARD] Right arrow: Invalid neighbor at index ${newIndex}`, neighbor);
            }
          }
          return;
        }
        
        // Fallback: Spatial navigation - find nearest nodes in 3D space
        if (!currentNodeId || !words.length) {
          console.log(`🔵 [KEYBOARD] Arrow key pressed but no currentNodeId or words. currentNodeId: ${currentNodeId}, words: ${words.length}`);
          showToast('No current position. Try typing a word first.', 'info');
          return;
        }
        
        // Find current word position
        const currentWord = words.find(w => {
          const wordIdStr = typeof w.id === 'string' ? w.id : w.id?.toString();
          const nodeIdStr = typeof currentNodeId === 'string' ? currentNodeId : currentNodeId?.toString();
          return wordIdStr === nodeIdStr;
        });
        
        if (!currentWord || !currentWord.position || !Array.isArray(currentWord.position)) {
          console.log(`🔵 [KEYBOARD] Current word not found or has no position`);
          showToast('Current word position not available', 'info');
          return;
        }
        
        const currentPos = currentWord.position;
        
        // Find nearest words in the direction of the arrow
        // For Left/Right: find words to the left/right relative to camera view
        const nearbyWords = words
          .filter(w => {
            if (!w.position || !Array.isArray(w.position) || w.position.length !== 3) return false;
            if (w.id === currentNodeId) return false; // Exclude current word
            
            // Calculate distance from current position
            const dx = w.position[0] - currentPos[0];
            const dy = w.position[1] - currentPos[1];
            const dz = w.position[2] - currentPos[2];
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            // Only consider words within reasonable distance (500 units)
            return distance > 0.1 && distance < 500;
          })
          .map(w => {
            const dx = w.position[0] - currentPos[0];
            const dy = w.position[1] - currentPos[1];
            const dz = w.position[2] - currentPos[2];
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            // For Left/Right arrows, prioritize horizontal movement
            // Left = negative X direction, Right = positive X direction
            const horizontalDirection = event.key === 'ArrowLeft' ? -1 : 1;
            const horizontalScore = dx * horizontalDirection;
            
            return {
              word: w,
              distance,
              horizontalScore,
              dx,
              dy,
              dz,
            };
          })
          .sort((a, b) => {
            // Sort by horizontal direction first, then by distance
            if (Math.abs(a.horizontalScore - b.horizontalScore) > 10) {
              return b.horizontalScore - a.horizontalScore; // Prefer correct direction
            }
            return a.distance - b.distance; // Then by distance
          })
          .slice(0, 1); // Get the best match
        
        if (nearbyWords.length > 0 && handleHopRef.current) {
          const targetWord = nearbyWords[0].word;
          console.log(`🔵 [KEYBOARD] ${event.key} arrow: Spatial navigation to nearest word: ${targetWord.label}`);
          handleHopRef.current(targetWord.label, 'shoot');
        } else {
          console.log(`🔵 [KEYBOARD] ${event.key} arrow: No nearby words found for spatial navigation`);
          showToast('No nearby words found in that direction', 'info');
        }
      }
      
      // Handle H key - hop to nearest neighbor closer to target (only in game mode, not practice)
      if ((event.key === 'h' || event.key === 'H') && !practiceMode) {
        event.preventDefault();
        
        if (!currentTarget || !currentTarget.id) {
          showToast('No target word available', 'warning');
          return;
        }
        
        // Use relatedWords array (words similar to target) to find best neighbor
        // This avoids needing embeddings which may not be available for guessed words
        if (!relatedWords || relatedWords.length === 0) {
          showToast('Related words not loaded yet', 'info');
          return;
        }
        
        // Get current word's similarity to target from relatedWords (if it exists there)
        const currentWordInRelated = relatedWords.find(rw => {
          const wordIdStr = typeof rw.wordId === 'string' ? rw.wordId : rw.wordId?.toString();
          const nodeIdStr = typeof currentNodeId === 'string' ? currentNodeId : currentNodeId?.toString();
          return wordIdStr === nodeIdStr;
        });
        const currentTargetSimilarity = currentWordInRelated?.similarity || 0;
        
        // Find neighbors that are also in relatedWords (similar to target)
        const neighborsWithTargetSimilarity = neighbors.map(neighbor => {
          const neighborInRelated = relatedWords.find(rw => {
            const wordIdStr = typeof rw.wordId === 'string' ? rw.wordId : rw.wordId?.toString();
            const neighborIdStr = typeof neighbor.wordId === 'string' ? neighbor.wordId : neighbor.wordId?.toString();
            return wordIdStr === neighborIdStr;
          });
          
          if (neighborInRelated) {
            return {
              ...neighbor,
              targetSimilarity: neighborInRelated.similarity,
              isCloser: neighborInRelated.similarity > currentTargetSimilarity,
            };
          }
          
          // If neighbor not in relatedWords, check if we can calculate similarity using embeddings
          const neighborWord = words.find(w => {
            const wordIdStr = typeof w.id === 'string' ? w.id : w.id?.toString();
            const neighborIdStr = typeof neighbor.wordId === 'string' ? neighbor.wordId : neighbor.wordId?.toString();
            return wordIdStr === neighborIdStr;
          });
          
          // Try to use embedding-based calculation as fallback
          if (neighborWord && neighborWord.embedding) {
            const targetWord = words.find(w => {
              const wordIdStr = typeof w.id === 'string' ? w.id : w.id?.toString();
              const targetIdStr = typeof currentTarget.id === 'string' ? currentTarget.id : currentTarget.id?.toString();
              return wordIdStr === targetIdStr;
            });
            
            if (targetWord && targetWord.embedding) {
              const targetSimilarity = cosineSimilarity(neighborWord.embedding, targetWord.embedding);
              return {
                ...neighbor,
                targetSimilarity,
                isCloser: targetSimilarity > currentTargetSimilarity,
              };
            }
          }
          
          return {
            ...neighbor,
            targetSimilarity: 0,
            isCloser: false,
          };
        });
        
        // Filter to neighbors closer to target and sort by target similarity
        const closerNeighbors = neighborsWithTargetSimilarity
          .filter(n => n.isCloser)
          .sort((a, b) => b.targetSimilarity - a.targetSimilarity);
        
        if (closerNeighbors.length === 0) {
          showToast('No neighbors closer to target found', 'info');
          return;
        }
        
        // Hop to the neighbor with highest similarity to target
        const bestNeighbor = closerNeighbors[0];
        console.log(`🔵 [KEYBOARD] H key: Hopping to closest neighbor to target: ${bestNeighbor.label} (${Math.round(bestNeighbor.targetSimilarity * 100)}% similar to target)`);
        if (handleHopRef.current) {
          handleHopRef.current(bestNeighbor.label, 'shoot');
        }
        
        // Update neighbor index to match the selected neighbor
        const newIndex = neighbors.findIndex(n => n.wordId === bestNeighbor.wordId);
        if (newIndex >= 0) {
          setNeighborIndex(newIndex);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyboardNavigation);
    
    return () => {
      window.removeEventListener('keydown', handleKeyboardNavigation);
    };
  }, [gameActive, practiceMode, roundPhase, isGuessing, isOut, neighbors, currentNodeId, currentTarget, words, neighborIndex, relatedWords, showToast, handleHopRef]);

  // Enter practice mode handler - MUST be before any conditional returns
  const handleEnterPracticeMode = useCallback(async (topic = 'general-database') => {
    console.log('🎮 [PRACTICE] Entering practice mode with topic:', topic);
    // Clear any existing state first
    setCurrentNodeId(null);
    setNeighbors([]);
    setRelatedWords([]);
    setWords([]);
    
    // Set practice mode and topic
    setPracticeMode(true);
    setGameTopic(topic);
    
    // Load words for practice mode
    console.log('🎮 [PRACTICE] Loading words...');
    await loadWords();
    showToast('Practice mode enabled - loading words...', 'info');
  }, [loadWords, showToast]);

  // Initialize practice mode when words are loaded
  useEffect(() => {
    if (practiceMode && words.length > 0) {
      // Only initialize if we don't have a current node yet
      if (!currentNodeId) {
        console.log('🎮 [PRACTICE] Initializing practice mode with', words.length, 'words');
        
        // Select a random target word for the riddle
        const randomTargetWord = words[Math.floor(Math.random() * words.length)];
        console.log('🎮 [PRACTICE] Selected target word:', randomTargetWord.label, randomTargetWord.id);
        setCurrentTarget({
          id: randomTargetWord.id,
          label: randomTargetWord.label,
          position: randomTargetWord.position,
        });
        
        // Generate definition/riddle for the target word
        const generatePracticeRiddle = async () => {
          try {
            const response = await fetch('/api/generate-definition', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ wordLabel: randomTargetWord.label }),
            });
            const data = await response.json();
            if (data.success && data.definition) {
              setDefinition(data.definition);
              console.log('🎮 [PRACTICE] Generated riddle:', data.definition);
            } else {
              console.warn('🎮 [PRACTICE] Failed to generate riddle, using placeholder');
              setDefinition(`Find the word that matches this concept: ${randomTargetWord.label}`);
            }
          } catch (error) {
            console.error('🎮 [PRACTICE] Error generating riddle:', error);
            setDefinition(`Find the word that matches this concept: ${randomTargetWord.label}`);
          }
        };
        generatePracticeRiddle();
        
        // Start at a different random word (not the target)
        let randomWord = words[Math.floor(Math.random() * words.length)];
        // Make sure we don't start at the target word
        while (randomWord.id === randomTargetWord.id && words.length > 1) {
          randomWord = words[Math.floor(Math.random() * words.length)];
        }
        console.log('🎮 [PRACTICE] Starting at word:', randomWord.label, randomWord.id);
        setCurrentNodeId(randomWord.id);
        loadNeighbors(randomWord.id);
        showToast('Practice mode ready - find the target word!', 'success');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceMode, words.length, currentNodeId, loadNeighbors, showToast]);

  // Exit practice mode handler
  const handleExitPracticeMode = useCallback(() => {
    setPracticeMode(false);
    setCurrentNodeId(null);
    setNeighbors([]);
    setRelatedWords([]);
    setWords([]);
    showToast('Exited practice mode', 'info');
  }, [showToast]);

  // Leave game handler - MUST be before any conditional returns
  const handleLeaveGame = useCallback(async () => {
    if (!gameCode || !playerId) {
      showToast('No active game to leave', 'info');
      return;
    }

    // Confirm before leaving
    if (!confirm('Are you sure you want to leave this game? You will lose your current progress.')) {
      return;
    }

    try {
      const response = await fetch('/api/game/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode, playerId }),
      });

      const data = await response.json();
      if (data.success) {
        // Reset all game state
        setGameCode(null);
        setPlayerId(null);
        setGameActive(false);
        setCurrentNodeId(null);
        setNeighbors([]);
        setRelatedWords([]);
        setWords([]);
        setVectorGems([]);
        setBadAsteroids([]);
        setPlayers([]);
        setTokens(15);
        setIsOut(false);
        showToast('Left game successfully', 'info');
      } else {
        showToast(data.error || 'Failed to leave game', 'error');
      }
    } catch (error) {
      console.error('Error leaving game:', error);
      showToast('Error leaving game. Please try again.', 'error');
    }
  }, [gameCode, playerId, showToast]);

  // Show lobby if no game code AND (game not active AND not in practice mode)
  // In practice mode, we don't need a gameCode
  if ((!gameCode && !practiceMode) || (!gameActive && !practiceMode)) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrandShapes count={12} opacity={0.12} />
        <Box sx={{ position: 'relative', minHeight: '100vh' }}>
          <Lobby
            gameCode={gameCode}
            players={players}
            isHost={isHost}
            onStartGame={handleStartGame}
            onJoinGame={handleJoinGame}
            onCreateGame={handleCreateGame}
            currentTopic={gameTopic}
            themeMode={themeMode}
            onThemeToggle={handleThemeToggle}
            onEnterPracticeMode={handleEnterPracticeMode}
          />
          {/* Historical Leaderboard on Landing Page */}
          <Box
            sx={{
              position: 'absolute',
              right: { xs: 16, md: 16 },
              top: { xs: 'auto', md: 80 },
              bottom: { xs: 16, md: 'auto' },
              zIndex: 1000,
            }}
          >
            <Leaderboard
              players={[]}
              currentPlayerId={null}
              isMobile={isMobile}
              mobileOpen={mobileLeaderboardOpen}
              onMobileClose={() => setMobileLeaderboardOpen(false)}
              defaultTab={1}
            />
          </Box>
          {/* Mobile FAB for Leaderboard */}
          {isMobile && (
            <Fab
              color="primary"
              aria-label="leaderboard"
              onClick={() => setMobileLeaderboardOpen(true)}
              sx={{
                position: 'fixed',
                bottom: 16,
                right: 16,
                zIndex: 1200,
                boxShadow: '0 4px 20px rgba(0, 237, 100, 0.4)',
              }}
            >
              <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z" />
              </svg>
            </Fab>
          )}
        </Box>
        <Snackbar
          open={toast.open}
          autoHideDuration={6000}
          onClose={handleCloseToast}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseToast} severity={toast.severity} sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        </Snackbar>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrandShapes count={10} opacity={0.08} />
      <Box sx={{ width: '100vw', height: '100vh', position: 'relative', zIndex: 1 }}>
        {/* MongoDB Header */}
        <AppBar
          position="absolute"
          sx={{
            background: themeMode === 'dark' 
              ? 'linear-gradient(90deg, rgba(2, 52, 48, 0.95) 0%, rgba(0, 104, 74, 0.85) 100%)'
              : 'linear-gradient(90deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 245, 245, 0.95) 100%)',
            backdropFilter: 'blur(10px)',
            boxShadow: themeMode === 'dark'
              ? '0 4px 16px rgba(0, 237, 100, 0.15)'
              : '0 4px 16px rgba(0, 0, 0, 0.1)',
            borderBottom: '1px solid',
            borderColor: 'rgba(0, 237, 100, 0.2)',
            zIndex: 1100,
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 1, sm: 2 }, minHeight: { xs: 56, sm: 64 } }}>
            <MongoDBLogo width={isMobile ? 100 : 140} height={isMobile ? 25 : 35} showText={true} />
            <InviteFriends gameCode={gameCode} onCopy={showToast} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
              <Box sx={{
                color: 'primary.main',
                fontWeight: 700,
                fontSize: { xs: '1rem', sm: '1.25rem' },
                textShadow: themeMode === 'dark' ? '0 2px 8px rgba(0, 237, 100, 0.3)' : 'none',
                display: { xs: 'none', sm: 'block' },
              }}>
                Semantic Hop
              </Box>
              {practiceMode && (
                <Box sx={{ 
                  px: 2, 
                  py: 0.5, 
                  borderRadius: 1, 
                  bgcolor: 'warning.main', 
                  color: 'warning.contrastText',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  mr: 2
                }}>
                  PRACTICE MODE
                </Box>
              )}
              {practiceMode && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleExitPracticeMode}
                  sx={{ mr: 2 }}
                >
                  Exit Practice
                </Button>
              )}
              {gameActive && !practiceMode && (
                <>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setHelpDialogOpen(true)}
                    sx={{ mr: 1 }}
                    startIcon={<span>?</span>}
                  >
                    Help
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={handleLeaveGame}
                    sx={{ mr: 2 }}
                  >
                    Leave Game
                  </Button>
                </>
              )}
              <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: visualizationMode === 'spheres' ? 'primary.main' : 'text.secondary',
                    fontSize: '0.75rem',
                    minWidth: '50px',
                    textAlign: 'center'
                  }}
                >
                  Spheres
                </Typography>
                <Box
                  component="button"
                  onClick={() => {
                    setVisualizationMode(prev => {
                      if (prev === 'spheres') return 'graph';
                      if (prev === 'graph') return 'hnsw';
                      return 'spheres';
                    });
                  }}
                  sx={{
                    width: 72,
                    height: 24,
                    borderRadius: 12,
                    border: '2px solid',
                    borderColor: 'primary.main',
                    backgroundColor: visualizationMode === 'graph' ? 'primary.main' : visualizationMode === 'hnsw' ? 'primary.dark' : 'transparent',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    '&:hover': {
                      opacity: 0.8,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      backgroundColor: visualizationMode === 'spheres' ? 'primary.main' : '#001E2B',
                      position: 'absolute',
                      top: '50%',
                      left: visualizationMode === 'spheres' 
                        ? '2px' 
                        : visualizationMode === 'graph'
                        ? 'calc(50% - 9px)'
                        : 'calc(100% - 20px)',
                      transform: 'translateY(-50%)',
                      transition: 'all 0.3s',
                    }}
                  />
                </Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: visualizationMode === 'graph' ? 'primary.main' : 'text.secondary',
                    fontSize: '0.75rem',
                    minWidth: '50px',
                    textAlign: 'center'
                  }}
                >
                  Graph
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: visualizationMode === 'hnsw' ? 'primary.main' : 'text.secondary',
                    fontSize: '0.75rem',
                    minWidth: '50px',
                    textAlign: 'center'
                  }}
                >
                  HNSW
                </Typography>
              </Box>
              <ThemeToggle mode={themeMode} onToggle={handleThemeToggle} />
            </Box>
          </Toolbar>
        </AppBar>

        <SemanticHopHUD
          gameCode={gameCode}
          roundNumber={roundNumber}
          maxRounds={maxRounds}
          timeRemaining={timeRemaining}
          definition={definition}
          onHop={onHopWrapper}
          bestSimilarity={bestSimilarity}
          neighbors={neighbors}
          relatedWords={relatedWords}
          feedback={feedback}
          guesses={guesses}
          isGuessing={isGuessing}
          hintUsed={hintUsed}
          hintText={hintText}
          onGetHint={handleGetHint}
          rerankerUsed={rerankerUsed}
          onUseReranker={handleUseReranker}
          isMobile={isMobile}
          mobileOpen={mobileHudOpen}
          onMobileClose={() => setMobileHudOpen(false)}
          roundPhase={roundPhase}
          playerId={playerId}
          players={players}
          onMarkReady={handleMarkReady}
          currentTarget={currentTarget}
          tokens={tokens}
          practiceMode={practiceMode}
        />
        <Leaderboard
          players={players}
          currentPlayerId={playerId}
          isMobile={isMobile}
          mobileOpen={mobileLeaderboardOpen}
          onMobileClose={() => setMobileLeaderboardOpen(false)}
        />
        {/* Mobile FABs */}
        {isMobile && (
          <>
            <Fab
              color="primary"
              aria-label="menu"
              onClick={() => setMobileHudOpen(true)}
              sx={{
                position: 'fixed',
                bottom: 16,
                left: 16,
                zIndex: 1200,
                boxShadow: '0 4px 20px rgba(0, 237, 100, 0.4)',
              }}
            >
              <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
              </svg>
            </Fab>
            <Fab
              color="primary"
              aria-label="leaderboard"
              onClick={() => setMobileLeaderboardOpen(true)}
              sx={{
                position: 'fixed',
                bottom: 16,
                right: 16,
                zIndex: 1200,
                boxShadow: '0 4px 20px rgba(0, 237, 100, 0.4)',
              }}
            >
              <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z" />
              </svg>
            </Fab>
          </>
        )}

        <Box
          sx={{
            position: 'absolute',
            left: { xs: 0, md: 400 },
            right: 0,
            top: { xs: 56, sm: 64 }, // Account for header (mobile: 56px, desktop: 64px)
            bottom: { xs: 80, md: 0 }, // Account for FABs on mobile
          }}
        >
          {gameActive && <GameOverOverlay isOut={isOut} />}
          {words.length > 0 ? (
            visualizationMode === 'spheres' ? (
              <WordGraph3D
                words={words}
                currentNodeId={currentNodeId}
                relatedWordIds={relatedWords.map((w) => w.wordId)}
                onWordClick={handleWordClick}
                vectorGems={vectorGems}
                onGemHit={handleGemHit}
                badAsteroids={badAsteroids}
                onBadAsteroidHit={handleBadAsteroidHit}
                themeMode={themeMode}
                onCameraControlsReady={setCameraControls}
              />
            ) : visualizationMode === 'graph' ? (
              <WordGraphForceDirected
                words={words}
                currentNodeId={currentNodeId}
                relatedWordIds={relatedWords.map((w) => w.wordId)}
                onWordClick={handleWordClick}
                vectorGems={vectorGems}
                onGemHit={handleGemHit}
                badAsteroids={badAsteroids}
                onBadAsteroidHit={handleBadAsteroidHit}
                themeMode={themeMode}
                onCameraControlsReady={setCameraControls}
              />
            ) : (
              <WordGraphHNSW
                words={words}
                currentNodeId={currentNodeId}
                relatedWordIds={relatedWords.map((w) => w.wordId)}
                onWordClick={handleWordClick}
                vectorGems={vectorGems}
                onGemHit={handleGemHit}
                badAsteroids={badAsteroids}
                onBadAsteroidHit={handleBadAsteroidHit}
                themeMode={themeMode}
                onCameraControlsReady={setCameraControls}
                players={players}
                currentPlayerId={playerId}
              />
            )
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'primary.main' }}>
              <Typography>Loading words...</Typography>
            </Box>
          )}
        </Box>

        {/* Navigation Controls */}
        {cameraControls && (
          <NavigationControls
            onZoomIn={cameraControls.zoomIn}
            onZoomOut={cameraControls.zoomOut}
            onMoveUp={cameraControls.moveUp}
            onMoveDown={cameraControls.moveDown}
            onMoveLeft={cameraControls.moveLeft}
            onMoveRight={cameraControls.moveRight}
            onMoveForward={cameraControls.moveForward}
            onMoveBackward={cameraControls.moveBackward}
            onReset={cameraControls.reset}
            position="bottom-right"
          />
        )}

        {/* Help Dialog */}
        <GameHelpDialog
          open={helpDialogOpen}
          onClose={() => setHelpDialogOpen(false)}
        />

        {/* Countdown Overlay - Shows when round is about to expire */}
        {gameCode && gameActive && roundPhase === 'SEARCH' && timeRemaining !== null && (
          <CountdownOverlay
            timeRemaining={timeRemaining}
            threshold={10000}
          />
        )}

        <Snackbar
          open={toast.open}
          autoHideDuration={6000}
          onClose={handleCloseToast}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseToast} severity={toast.severity} sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}


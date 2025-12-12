'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ThemeProvider, CssBaseline, Box, AppBar, Toolbar, Snackbar, Alert, Typography, IconButton, Fab, useMediaQuery, useTheme } from '@mui/material';
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
  const [visualizationMode, setVisualizationMode] = useState('hnsw');
  const [gameTopic, setGameTopic] = useState('general-database'); // 'spheres', 'graph', or 'hnsw'
  const [tokens, setTokens] = useState(15);
  const [isOut, setIsOut] = useState(false);
  const [vectorGems, setVectorGems] = useState([]);

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

  const showToast = (message, severity = 'info') => {
    setToast({ open: true, message, severity });
  };

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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:62',message:'round:start event received',data:{roundNumber:data.roundNumber,targetId:data.target?.id,targetLabel:data.target?.label,hasTarget:!!data.target,phase:data.phase},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
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
        // Reset tokens for new round
        setTokens(15);
        setIsOut(false);
        // Clear vector gems for new round
        setVectorGems([]);
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
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:83',message:'setTimeout: target has id',data:{targetId:data.target.id,targetLabel:data.target.label,idType:typeof data.target.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
          } else {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:85',message:'setTimeout: target missing or no id',data:{hasTarget:!!data.target,hasId:!!data.target?.id,target:data.target},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
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

      // Poll for gems periodically (since serverless setTimeout may not work)
      const pollForGems = async () => {
        if (!gameCode || !gameActive || roundPhase !== 'SEARCH') return;
        
        try {
          const response = await fetch(`/api/game/gems?gameCode=${gameCode}`);
          const data = await response.json();
          
          if (data.success && data.gems) {
            // Update gems state - merge with existing, avoiding duplicates
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
              console.log('💎 [CLIENT] Polled gems - Server:', data.gems.map(g => g.id), 'Merged:', merged.map(g => g.id));
              return merged;
            });
          }
        } catch (error) {
          console.error('Error polling for gems:', error);
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

  // Load words when game starts
  useEffect(() => {
    if (gameActive && words.length === 0) {
      loadWords();
    }
  }, [gameActive, words.length, loadWords]);

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
    console.log('🔵 [CLIENT] handleHop params:', { wordLabel, gameActive, roundPhase, isGuessing, gameCode, playerId, hasGameCode: !!gameCode, hasPlayerId: !!playerId, tokens, isOut });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:395',message:'handleHop called',data:{wordLabel,gameActive,roundPhase,isGuessing,gameCode,playerId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (!gameActive || roundPhase !== 'SEARCH' || isGuessing || isOut) {
      const reason = !gameActive ? 'game not active' : roundPhase !== 'SEARCH' ? `wrong phase: ${roundPhase}` : isOut ? 'you are out of tokens' : 'already guessing';
      console.warn('🔴 [CLIENT] handleHop BLOCKED:', { reason, gameActive, roundPhase, isGuessing, isOut, expectedPhase: 'SEARCH' });
      showToast(`Cannot guess: ${reason}`, 'warning');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:397',message:'handleHop: early return',data:{gameActive,roundPhase,isGuessing,isOut},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:400',message:'handleHop: making API call',data:{url:'/api/game/guess',gameCode,playerId,guess:wordLabel},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const response = await fetch('/api/game/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode, playerId, guess: wordLabel, actionType }),
      }).catch((fetchError) => {
        console.error('🔴 [CLIENT] Fetch error (network/CORS):', fetchError);
        throw fetchError;
      });
      console.log('🔵 [CLIENT] Guess API response status:', response.status, response.statusText, 'ok:', response.ok);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:407',message:'handleHop: received response',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Check if response is ok before parsing
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔴 [CLIENT] Guess API error response:', response.status, errorText);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:412',message:'handleHop: response not ok',data:{status:response.status,errorText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:421',message:'handleHop: JSON parse error',data:{error:parseError.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        showToast('Invalid response from server', 'error');
        return;
      }
      
      console.log('🔵 [CLIENT] Guess API response data:', { success: data.success, similarity: data.similarity, wordId: data.wordId, inGraph: data.inGraph, error: data.error });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:425',message:'handleHop: parsed response data',data:{success:data.success,correct:data.correct,similarity:data.similarity,wordId:data.wordId,label:data.label,inGraph:data.inGraph,error:data.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:417',message:'handleHop: processing word lookup',data:{wordId:data.wordId,label:data.label,inGraph:data.inGraph,wordsArrayLength:words.length,hasPosition:!!data.position},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        if (data.wordId) {
          // Word exists in database - try to find it in our words array
          const foundWord = words.find(w => w.id === data.wordId);
          console.log('🔵 [CLIENT] Searched by wordId:', { foundWord: !!foundWord, hasPosition: foundWord?.position ? true : false, wordId: data.wordId });
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:420',message:'handleHop: searched by wordId',data:{foundWord:!!foundWord,hasPosition:foundWord?.position?true:false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          if (foundWord && foundWord.position) {
            console.log('🟢 [CLIENT] Found guessed word in words array, hopping to:', foundWord.label, foundWord.position);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:423',message:'handleHop: setting currentNodeId and loading neighbors',data:{wordId:data.wordId,label:foundWord.label},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
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
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:427',message:'handleHop: searched by label',data:{foundByLabel:!!foundByLabel,hasPosition:foundByLabel?.position?true:false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            if (foundByLabel && foundByLabel.position) {
              console.log('🟢 [CLIENT] Found guessed word by label, hopping to:', foundByLabel.label, foundByLabel.position);
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:430',message:'handleHop: setting currentNodeId by label',data:{wordId:foundByLabel.id,label:foundByLabel.label},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
              // #endregion
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
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:434',message:'handleHop: word not found in words array',data:{label:data.label||wordLabel,wordId:data.wordId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
              // #endregion
            }
          }
        } else if (data.inGraph === false) {
          // Word not in graph - don't try to hop
          console.log('🟡 [CLIENT] Word not in graph, skipping hop');
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:438',message:'handleHop: word not in graph, skipping hop',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:451',message:'handleHop: API returned success=false',data:{error:data.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:455',message:'handleHop: exception caught',data:{errorMessage:error.message,errorStack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const errorMessage = error.message || 'Unknown error occurred';
      showToast(`Error: ${errorMessage}. Check console for details.`, 'error');
    } finally {
      setIsGuessing(false);
    }
  };

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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:338',message:'loadNeighbors called',data:{wordId,wordIdType:typeof wordId,hasWordId:!!wordId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    if (!wordId) {
      console.warn('loadNeighbors: wordId is missing');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:340',message:'loadNeighbors: wordId missing, returning early',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return;
    }
    try {
      console.log('Loading neighbors for wordId:', wordId);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:345',message:'loadNeighbors: making API call',data:{wordId,limit:5},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      const response = await fetch('/api/similarity-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId, limit: 5 }),
      });
      const data = await response.json();
      console.log('Neighbors response:', data);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:351',message:'loadNeighbors: API response received',data:{success:data.success,resultsCount:data.results?.length || 0,error:data.error,hasResults:!!data.results},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      if (data.success && data.results) {
        setNeighbors(data.results);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:353',message:'loadNeighbors: setting neighbors',data:{neighborsCount:data.results.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
      } else {
        console.warn('Failed to load neighbors:', data.error);
        setNeighbors([]);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:355',message:'loadNeighbors: failed, setting empty array',data:{error:data.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
      }
    } catch (error) {
      console.error('Error loading neighbors:', error);
      setNeighbors([]);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:359',message:'loadNeighbors: exception caught',data:{error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    }
  };

  const loadRelatedWords = useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:364',message:'loadRelatedWords called',data:{hasCurrentTarget:!!currentTarget,hasId:!!currentTarget?.id,targetId:currentTarget?.id,targetIdType:typeof currentTarget?.id,targetLabel:currentTarget?.label},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    if (!currentTarget || !currentTarget.id) {
      console.warn('loadRelatedWords: currentTarget or currentTarget.id is missing', currentTarget);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:366',message:'loadRelatedWords: missing target or id, returning early',data:{currentTarget},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return;
    }
    try {
      console.log('🟢 Loading related words for target:', currentTarget.id, currentTarget.label, 'Type:', typeof currentTarget.id);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:370',message:'loadRelatedWords: making API call',data:{wordId:currentTarget.id,limit:5},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      const response = await fetch('/api/similarity-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId: currentTarget.id, limit: 5 }),
      });
      const data = await response.json();
      console.log('🟢 Related words response:', data);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:377',message:'loadRelatedWords: API response received',data:{success:data.success,resultsCount:data.results?.length || 0,error:data.error,hasResults:!!data.results},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      if (data.success && data.results && data.results.length > 0) {
        console.log(`🟢 Successfully loaded ${data.results.length} related words`);
        setRelatedWords(data.results);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:380',message:'loadRelatedWords: setting related words',data:{relatedWordsCount:data.results.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
      } else {
        console.warn('🔴 Failed to load related words:', data.error || 'No results returned');
        setRelatedWords([]);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:383',message:'loadRelatedWords: failed, setting empty array',data:{error:data.error,resultsCount:data.results?.length || 0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
      }
    } catch (error) {
      console.error('🔴 Error loading related words:', error);
      setRelatedWords([]);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:387',message:'loadRelatedWords: exception caught',data:{error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
    }
  }, [currentTarget]);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:392',message:'useEffect: currentTarget changed',data:{hasCurrentTarget:!!currentTarget,hasId:!!currentTarget?.id,targetId:currentTarget?.id,targetLabel:currentTarget?.label},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    if (currentTarget && currentTarget.id) {
      console.log('🟢 useEffect triggered: currentTarget changed, loading related words', currentTarget);
      loadRelatedWords();
    } else {
      console.warn('🔴 useEffect: currentTarget missing or has no id', currentTarget);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:396',message:'useEffect: target missing or no id, not calling loadRelatedWords',data:{currentTarget},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
    }
  }, [currentTarget, loadRelatedWords]);

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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:400',message:'handleGetHint called',data:{hintUsed,gameActive,roundPhase,gameCode,playerId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    if (hintUsed || !gameActive || roundPhase !== 'SEARCH' || isOut) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:402',message:'handleGetHint: early return',data:{hintUsed,gameActive,roundPhase,isOut},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      return;
    }

    // Check tokens
    if (tokens < 5) {
      showToast(`Insufficient tokens. You need 5 tokens but only have ${tokens}.`, 'warning');
      return;
    }

    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:404',message:'handleGetHint: making API call',data:{gameCode,playerId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      const response = await fetch('/api/game/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode, playerId }),
      });
      const data = await response.json();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:410',message:'handleGetHint: API response received',data:{success:data.success,hintsCount:data.hints?.length || 0,error:data.error,hasHints:!!data.hints},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:412',message:'handleGetHint: setting hint text',data:{hintTextLength:data.hint?.length || 0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        showToast(`Hint revealed! -${data.penalty} points. Your score: ${data.newScore}`, 'info');
        // Update player score in local state
        setPlayers(prev => prev.map(p => 
          p.id === playerId ? { ...p, score: data.newScore } : p
        ));
      } else {
        showToast(data.error || 'Failed to get hint', 'error');
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:419',message:'handleGetHint: failed',data:{error:data.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
      }
    } catch (error) {
      console.error('Error getting hint:', error);
      showToast('Error getting hint. Please try again.', 'error');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:422',message:'handleGetHint: exception caught',data:{error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
    }
  };

  const handleWordClick = (word) => {
    handleHop(word.label, 'shoot');
  };

  const handleGemHit = async (gem) => {
    // Handle both gem object and gemId string for flexibility
    console.log('💎 [CLIENT] handleGemHit called with:', gem, 'type:', typeof gem);
    
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
      console.error('💎 [CLIENT] handleGemHit: Missing params', { gameCode, playerId, gemId, gemType: typeof gem, gem });
      showToast('Missing game information', 'error');
      return;
    }
    
    console.log('💎 [CLIENT] Processing gem hit:', { gemId, gameCode, playerId });
    if (!gameActive || roundPhase !== 'SEARCH') {
      console.warn('💎 [CLIENT] handleGemHit: Game not active or wrong phase', { gameActive, roundPhase });
      return;
    }
    if (isOut) {
      console.warn('💎 [CLIENT] handleGemHit: Player is out');
      showToast('You are out of tokens and cannot shoot', 'warning');
      return;
    }

    console.log('💎 [CLIENT] handleGemHit called:', { gemId, gem, currentTokens: tokens });

    try {
      const response = await fetch('/api/game/hit-gem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode, playerId, gemId }),
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
    setHintUsed(false);
    setHintText('');
  };

  // Show stats screen when game has ended
  if (gameEnded && finalScores.length > 0) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrandShapes count={12} opacity={0.12} />
        <Box sx={{ position: 'relative', minHeight: '100vh' }}>
          <GameStatsScreen
            finalScores={finalScores}
            gameCode={gameCode}
            onReturnToLobby={handleReturnToLobby}
            themeMode={themeMode}
          />
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

  if (!gameCode || !gameActive) {
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
            borderBottom: '2px solid',
            borderColor: 'primary.main',
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
          isMobile={isMobile}
          mobileOpen={mobileHudOpen}
          onMobileClose={() => setMobileHudOpen(false)}
          roundPhase={roundPhase}
          playerId={playerId}
          players={players}
          onMarkReady={handleMarkReady}
          currentTarget={currentTarget}
          tokens={tokens}
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


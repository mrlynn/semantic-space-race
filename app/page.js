'use client';

import { useState, useEffect, useCallback } from 'react';
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

export default function Home() {
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

  // Mobile drawer state
  const [mobileHudOpen, setMobileHudOpen] = useState(false);
  const [mobileLeaderboardOpen, setMobileLeaderboardOpen] = useState(false);

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
        fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:62',message:'round:start event received',data:{roundNumber:data.roundNumber,targetId:data.target?.id,targetLabel:data.target?.label,hasTarget:!!data.target},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
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
        // Update players with scores
        if (data.players) {
          setPlayers(data.players);
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
        // Update leaderboard with new scores
        if (data.players) {
          setPlayers(data.players);
        }
        // Update round phase to show round is ending
        setRoundPhase('END');
      });

      channel.bind('game:end', (data) => {
        setGameActive(false);
        const winner = data.finalScores && data.finalScores.length > 0
          ? data.finalScores[0].nickname
          : 'Unknown';
        showToast(`Game Over! Winner: ${winner}`, 'info');
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

      return () => {
        pusher.unsubscribe(`game-${gameCode}`);
      };
    }
  }, [gameCode]);

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

  const handleHop = async (wordLabel) => {
    if (!gameActive || roundPhase !== 'SEARCH' || isGuessing) return;

    setIsGuessing(true);
    try {
      const response = await fetch('/api/game/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameCode, playerId, guess: wordLabel }),
      });
      const data = await response.json();
      if (data.success) {
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
        if (data.wordId) {
          // Word exists in database - try to find it in our words array
          const foundWord = words.find(w => w.id === data.wordId);
          if (foundWord && foundWord.position) {
            console.log('🟢 Found guessed word in words array, hopping to:', foundWord.label, foundWord.position);
            setCurrentNodeId(data.wordId);
            loadNeighbors(data.wordId);
          } else {
            // Word not in our loaded words - try to find by label
            const foundByLabel = words.find(w => w.label.toLowerCase() === (data.label || wordLabel).toLowerCase());
            if (foundByLabel && foundByLabel.position) {
              console.log('🟢 Found guessed word by label, hopping to:', foundByLabel.label, foundByLabel.position);
              setCurrentNodeId(foundByLabel.id);
              loadNeighbors(foundByLabel.id);
            } else {
              console.warn('🔴 Guessed word not found in words array:', data.label || wordLabel, 'wordId:', data.wordId);
            }
          }
        } else if (data.inGraph === false) {
          // Word not in graph - don't try to hop
          console.log('🟡 Word not in graph, skipping hop');
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
      console.error('Error hopping:', error);
      showToast('Error processing guess. Please try again.', 'error');
    } finally {
      setIsGuessing(false);
    }
  };

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
    if (hintUsed || !gameActive || roundPhase !== 'SEARCH') {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/1996d2c0-4a06-4b2b-90dc-7ea5058eb960',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.js:402',message:'handleGetHint: early return',data:{hintUsed,gameActive,roundPhase},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
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
    handleHop(word.label);
  };

  if (!gameCode || !gameActive) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrandShapes count={12} opacity={0.12} />
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
          onHop={handleHop}
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
          {words.length > 0 ? (
            visualizationMode === 'spheres' ? (
              <WordGraph3D
                words={words}
                currentNodeId={currentNodeId}
                relatedWordIds={relatedWords.map((w) => w.wordId)}
                onWordClick={handleWordClick}
                themeMode={themeMode}
              />
            ) : visualizationMode === 'graph' ? (
              <WordGraphForceDirected
                words={words}
                currentNodeId={currentNodeId}
                relatedWordIds={relatedWords.map((w) => w.wordId)}
                onWordClick={handleWordClick}
                themeMode={themeMode}
              />
            ) : (
              <WordGraphHNSW
                words={words}
                currentNodeId={currentNodeId}
                relatedWordIds={relatedWords.map((w) => w.wordId)}
                onWordClick={handleWordClick}
                themeMode={themeMode}
              />
            )
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'primary.main' }}>
              <Typography>Loading words...</Typography>
            </Box>
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
      </Box>
    </ThemeProvider>
  );
}


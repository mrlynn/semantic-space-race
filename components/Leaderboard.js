'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Drawer,
  IconButton,
  useTheme,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import BrandShapeDecoration from './BrandShapeDecoration';

export default function Leaderboard({
  players = [],
  currentPlayerId,
  isMobile = false,
  mobileOpen = false,
  onMobileClose = () => {},
  defaultTab = 0,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [tabValue, setTabValue] = useState(defaultTab);
  const [historicalLeaderboard, setHistoricalLeaderboard] = useState([]);
  const [loadingHistorical, setLoadingHistorical] = useState(false);
  const [sortBy, setSortBy] = useState('totalScore');
  
  // Sort players by score (descending) for game leaderboard
  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
  
  const fetchHistoricalLeaderboard = useCallback(async () => {
    setLoadingHistorical(true);
    try {
      const response = await fetch(`/api/leaderboard?sortBy=${sortBy}&limit=50`);
      const data = await response.json();
      if (data.success) {
        setHistoricalLeaderboard(data.leaderboard);
      }
    } catch (error) {
      console.error('Error fetching historical leaderboard:', error);
    } finally {
      setLoadingHistorical(false);
    }
  }, [sortBy]);
  
  // Fetch historical leaderboard when tab changes to "All-Time"
  useEffect(() => {
    if (tabValue === 1) {
      fetchHistoricalLeaderboard();
    }
  }, [tabValue, fetchHistoricalLeaderboard]);
  
  const handleTabChange = (_event, newValue) => {
    setTabValue(newValue);
  };
  
  // Theme-aware gradient
  const paperGradient = isDark
    ? 'linear-gradient(135deg, rgba(0, 104, 74, 0.3) 0%, rgba(2, 52, 48, 0.95) 100%)'
    : 'linear-gradient(135deg, rgba(0, 237, 100, 0.1) 0%, rgba(255, 255, 255, 0.95) 100%)';

  // Theme-aware brand shape opacities - higher opacity in light mode for visibility
  const brandShapeOpacity = {
    low: isDark ? 0.1 : 0.3,
    medium: isDark ? 0.15 : 0.35,
  };

  const renderGameLeaderboard = () => (
    <List dense>
      {sortedPlayers.length === 0 ? (
        <ListItem>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
            No players yet
          </Typography>
        </ListItem>
      ) : (
        sortedPlayers.map((player, index) => (
          <ListItem
            key={player.id}
            sx={{
              bgcolor: player.id === currentPlayerId
                ? 'rgba(0, 237, 100, 0.2)'
                : 'transparent',
              borderRadius: 2,
              mb: 0.5,
              border: player.id === currentPlayerId ? '1px solid' : 'none',
              borderColor: 'primary.main',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'rgba(0, 237, 100, 0.1)',
              },
            }}
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      bgcolor: index === 0
                        ? 'primary.main'
                        : index === 1
                        ? 'warning.light'
                        : index === 2
                        ? 'warning.dark'
                        : 'rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: index < 3 ? 'black' : 'white',
                    }}
                  >
                    {index + 1}
                  </Box>
                  <Typography variant="body2" fontWeight={player.id === currentPlayerId ? 700 : 400}>
                    {player.nickname}
                  </Typography>
                </Box>
              }
              secondary={
                <Typography variant="caption" sx={{ color: 'primary.light', fontWeight: 600 }}>
                  {player.score || 0} points
                </Typography>
              }
            />
          </ListItem>
        ))
      )}
    </List>
  );
  
  const renderHistoricalLeaderboard = () => {
    if (loadingHistorical) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress size={24} sx={{ color: 'primary.main' }} />
        </Box>
      );
    }
    
    if (historicalLeaderboard.length === 0) {
      return (
        <ListItem>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
            No historical data yet
          </Typography>
        </ListItem>
      );
    }
    
    return (
      <List dense>
        {historicalLeaderboard.map((player, index) => {
          const isCurrentPlayer = player.nickname === sortedPlayers.find(p => p.id === currentPlayerId)?.nickname;
          return (
            <ListItem
              key={player.nickname}
              sx={{
                bgcolor: isCurrentPlayer
                  ? 'rgba(0, 237, 100, 0.2)'
                  : 'transparent',
                borderRadius: 2,
                mb: 0.5,
                border: isCurrentPlayer ? '1px solid' : 'none',
                borderColor: 'primary.main',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: 'rgba(0, 237, 100, 0.1)',
                },
              }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: index === 0
                          ? 'primary.main'
                          : index === 1
                          ? 'warning.light'
                          : index === 2
                          ? 'warning.dark'
                          : 'rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: index < 3 ? 'black' : 'white',
                      }}
                    >
                      {player.rank}
                    </Box>
                    <Typography variant="body2" fontWeight={isCurrentPlayer ? 700 : 400}>
                      {player.nickname}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="caption" sx={{ color: 'primary.light', fontWeight: 600, display: 'block' }}>
                      {sortBy === 'totalScore' && `${player.totalScore} total points`}
                      {sortBy === 'averageScore' && `${player.averageScore} avg points`}
                      {sortBy === 'gamesWon' && `${player.gamesWon} wins`}
                      {sortBy === 'bestScore' && `${player.bestScore} best game`}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                      {player.totalGames} games
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          );
        })}
      </List>
    );
  };

  const leaderboardContent = (
    <Box sx={{ width: isMobile ? '85vw' : 280, maxWidth: 320, p: isMobile ? 3 : 0 }}>
      {/* Mobile Header with Close Button */}
      {isMobile && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" color="primary" fontWeight={700}>
            Leaderboard
          </Typography>
          <IconButton onClick={onMobileClose} sx={{ color: 'primary.main' }}>
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </IconButton>
        </Box>
      )}

      <Paper
        elevation={6}
        sx={{
          p: 2.5,
          border: '2px solid',
          borderColor: 'primary.main',
          borderRadius: 3,
          background: paperGradient,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 24px rgba(0, 237, 100, 0.2)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <BrandShapeDecoration position="top-left" size={80} opacity={brandShapeOpacity.medium} shapeNumber={7} />
        <BrandShapeDecoration position="bottom-right" size={60} opacity={brandShapeOpacity.low} shapeNumber={18} color="chartreuse" />
        {!isMobile && (
          <Typography variant="h6" gutterBottom color="primary" sx={{ position: 'relative', zIndex: 1 }}>
            Leaderboard
          </Typography>
        )}
        
        {/* Tabs */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{
              mb: 2,
              '& .MuiTab-root': {
                minWidth: 'auto',
                px: 1.5,
                fontSize: '0.75rem',
                fontWeight: 600,
                color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                '&.Mui-selected': {
                  color: 'primary.main',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: 'primary.main',
              },
            }}
          >
            <Tab label="Game" />
            <Tab label="All-Time" />
          </Tabs>
          
          {/* Sort selector for All-Time leaderboard */}
          {tabValue === 1 && (
            <Box sx={{ mb: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {['totalScore', 'averageScore', 'gamesWon', 'bestScore'].map((sort) => (
                <Box
                  key={sort}
                  onClick={() => setSortBy(sort)}
                  sx={{
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.65rem',
                    cursor: 'pointer',
                    bgcolor: sortBy === sort
                      ? 'primary.main'
                      : isDark
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(0, 0, 0, 0.05)',
                    color: sortBy === sort ? 'black' : 'text.secondary',
                    fontWeight: sortBy === sort ? 700 : 400,
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: sortBy === sort
                        ? 'primary.light'
                        : isDark
                        ? 'rgba(255, 255, 255, 0.15)'
                        : 'rgba(0, 0, 0, 0.1)',
                    },
                  }}
                >
                  {sort === 'totalScore' ? 'Total' :
                   sort === 'averageScore' ? 'Avg' :
                   sort === 'gamesWon' ? 'Wins' :
                   'Best'}
                </Box>
              ))}
            </Box>
          )}
        </Box>
        
        {/* Leaderboard Content */}
        {tabValue === 0 ? renderGameLeaderboard() : renderHistoricalLeaderboard()}
      </Paper>
    </Box>
  );

  // Mobile: Drawer, Desktop: Fixed position
  if (isMobile) {
    return (
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={onMobileClose}
        sx={{
          '& .MuiDrawer-paper': {
            bgcolor: isDark ? 'rgba(2, 52, 48, 0.98)' : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(10px)',
            borderLeft: '3px solid',
            borderColor: 'primary.main',
            boxShadow: '-4px 0 24px rgba(0, 237, 100, 0.3)',
          },
        }}
      >
        {leaderboardContent}
      </Drawer>
    );
  }

  // Desktop: Fixed position
  return (
    <Box
      sx={{
        position: 'absolute',
        right: 16,
        top: 80,
        zIndex: 1000,
        display: { xs: 'none', md: 'block' },
      }}
    >
      {leaderboardContent}
    </Box>
  );
}


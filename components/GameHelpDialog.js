'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

export default function GameHelpDialog({ open, onClose }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, rgba(2, 52, 48, 0.98) 0%, rgba(0, 104, 74, 0.98) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 237, 100, 0.3)',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HelpOutlineIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
            How to Play
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Objective */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
              Objective
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.primary', lineHeight: 1.8 }}>
              Find the target word by navigating through the semantic word graph. Words are positioned in 3D space based on their semantic similarity - similar words are closer together.
            </Typography>
          </Box>

          <Divider sx={{ borderColor: 'rgba(0, 237, 100, 0.2)' }} />

          {/* Navigation */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
              Navigation
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Mouse/Trackpad"
                  secondary="Click and drag to rotate the camera. Scroll to zoom. Click on word nodes to navigate to them."
                  primaryTypographyProps={{ sx: { fontWeight: 600, color: 'text.primary' } }}
                  secondaryTypographyProps={{ sx: { color: 'text.secondary' } }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Arrow Keys (← →)"
                  secondary="Navigate between neighboring words (similar words connected to your current position)."
                  primaryTypographyProps={{ sx: { fontWeight: 600, color: 'text.primary' } }}
                  secondaryTypographyProps={{ sx: { color: 'text.secondary' } }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="H Key"
                  secondary="Hop to the neighbor word that's most similar to the target word."
                  primaryTypographyProps={{ sx: { fontWeight: 600, color: 'text.primary' } }}
                  secondaryTypographyProps={{ sx: { color: 'text.secondary' } }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Type a Word"
                  secondary="Type any word in the input field and press Enter to navigate directly to it (if it exists in the graph)."
                  primaryTypographyProps={{ sx: { fontWeight: 600, color: 'text.primary' } }}
                  secondaryTypographyProps={{ sx: { color: 'text.secondary' } }}
                />
              </ListItem>
            </List>
          </Box>

          <Divider sx={{ borderColor: 'rgba(0, 237, 100, 0.2)' }} />

          {/* Shooting */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
              Shooting
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Click to Shoot"
                  secondary="Click on the 3D canvas to fire a laser at word nodes. Costs 2 tokens per shot."
                  primaryTypographyProps={{ sx: { fontWeight: 600, color: 'text.primary' } }}
                  secondaryTypographyProps={{ sx: { color: 'text.secondary' } }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Spacebar"
                  secondary="Press Spacebar to shoot in the direction the camera is facing."
                  primaryTypographyProps={{ sx: { fontWeight: 600, color: 'text.primary' } }}
                  secondaryTypographyProps={{ sx: { color: 'text.secondary' } }}
                />
              </ListItem>
            </List>
          </Box>

          <Divider sx={{ borderColor: 'rgba(0, 237, 100, 0.2)' }} />

          {/* Collectibles */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
              Collectibles
            </Typography>
            <List dense>
              <ListItem>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Chip label="💎" size="small" sx={{ bgcolor: '#DC143C', color: 'white', fontWeight: 700 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    Vector Gems
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', ml: 5, mt: 0.5 }}>
                  Red gems floating in space. Shoot them to earn bonus tokens (1-10 tokens). They expire after 30 seconds.
                </Typography>
              </ListItem>
              <ListItem>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Chip label="☄️" size="small" sx={{ bgcolor: '#2C2C2C', color: 'white', fontWeight: 700 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    Bad Asteroids
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', ml: 5, mt: 0.5 }}>
                  Dark gray/black asteroids. Avoid shooting them! They cost you tokens (1-5 tokens) instead of giving them.
                </Typography>
              </ListItem>
            </List>
          </Box>

          <Divider sx={{ borderColor: 'rgba(0, 237, 100, 0.2)' }} />

          {/* Gameplay */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
              Gameplay
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Tokens"
                  secondary="You start with 15 tokens. Each shot costs 2 tokens, each guess costs 3 tokens. Run out of tokens and you're out for the round."
                  primaryTypographyProps={{ sx: { fontWeight: 600, color: 'text.primary' } }}
                  secondaryTypographyProps={{ sx: { color: 'text.secondary' } }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Guessing"
                  secondary="Type a word in the input field and press Enter to make a guess. Correct guesses win the round and award points based on similarity percentage."
                  primaryTypographyProps={{ sx: { fontWeight: 600, color: 'text.primary' } }}
                  secondaryTypographyProps={{ sx: { color: 'text.secondary' } }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Hints"
                  secondary="Use the hint button to reveal a clue about the target word. Costs points but can help you find the answer faster."
                  primaryTypographyProps={{ sx: { fontWeight: 600, color: 'text.primary' } }}
                  secondaryTypographyProps={{ sx: { color: 'text.secondary' } }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Similarity"
                  secondary="The similarity percentage shows how close your current word is to the target. Higher percentage = closer to the answer."
                  primaryTypographyProps={{ sx: { fontWeight: 600, color: 'text.primary' } }}
                  secondaryTypographyProps={{ sx: { color: 'text.secondary' } }}
                />
              </ListItem>
            </List>
          </Box>

          <Divider sx={{ borderColor: 'rgba(0, 237, 100, 0.2)' }} />

          {/* Visualization Modes */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
              Visualization Modes
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
              Click the visualization toggle in the header to switch between:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Spheres"
                  secondary="Simple 3D spheres representing words."
                  primaryTypographyProps={{ sx: { fontWeight: 600, color: 'text.primary' } }}
                  secondaryTypographyProps={{ sx: { color: 'text.secondary' } }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Force-Directed Graph"
                  secondary="Words connected by lines showing relationships."
                  primaryTypographyProps={{ sx: { fontWeight: 600, color: 'text.primary' } }}
                  secondaryTypographyProps={{ sx: { color: 'text.secondary' } }}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="HNSW Graph"
                  secondary="Hierarchical graph showing semantic connections (recommended)."
                  primaryTypographyProps={{ sx: { fontWeight: 600, color: 'text.primary' } }}
                  secondaryTypographyProps={{ sx: { color: 'text.secondary' } }}
                />
              </ListItem>
            </List>
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(0, 237, 100, 0.2)' }}>
        <Button onClick={onClose} variant="contained" sx={{ bgcolor: 'primary.main' }}>
          Got it!
        </Button>
      </DialogActions>
    </Dialog>
  );
}


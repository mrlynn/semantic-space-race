import { createTheme } from '@mui/material/styles';

// MongoDB Brand Colors
export const mongodbColors = {
  springGreen: '#00ED64',    // Primary brand color
  forestGreen: '#00684A',    // Secondary green
  evergreen: '#023430',      // Dark green
  slateBlue: '#001E2B',      // Darkest blue (background)
  white: '#FFFFFF',
  black: '#000000',
};

// Create MongoDB-branded theme
export const mongodbTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: mongodbColors.springGreen,
      light: mongodbColors.springGreen,
      dark: mongodbColors.forestGreen,
      contrastText: mongodbColors.slateBlue,
    },
    secondary: {
      main: mongodbColors.forestGreen,
      light: mongodbColors.springGreen,
      dark: mongodbColors.evergreen,
      contrastText: mongodbColors.white,
    },
    background: {
      default: mongodbColors.slateBlue,
      paper: mongodbColors.evergreen,
    },
    text: {
      primary: mongodbColors.white,
      secondary: mongodbColors.springGreen,
    },
    success: {
      main: mongodbColors.springGreen,
      contrastText: mongodbColors.slateBlue,
    },
    warning: {
      main: '#FFB800', // Yellow for warm feedback
      contrastText: mongodbColors.slateBlue,
    },
    error: {
      main: '#FF6B6B', // Red for hot feedback
      contrastText: mongodbColors.white,
    },
    info: {
      main: mongodbColors.forestGreen,
      contrastText: mongodbColors.white,
    },
  },
  typography: {
    fontFamily: '"Euclid Circular A", "Helvetica Neue", Helvetica, Arial, sans-serif',
    h1: {
      fontWeight: 700,
      color: mongodbColors.springGreen,
    },
    h2: {
      fontWeight: 700,
      color: mongodbColors.springGreen,
    },
    h3: {
      fontWeight: 600,
      color: mongodbColors.springGreen,
    },
    h4: {
      fontWeight: 600,
      color: mongodbColors.springGreen,
    },
    h5: {
      fontWeight: 600,
      color: mongodbColors.springGreen,
    },
    h6: {
      fontWeight: 600,
      color: mongodbColors.springGreen,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        contained: {
          backgroundColor: mongodbColors.springGreen,
          color: mongodbColors.slateBlue,
          '&:hover': {
            backgroundColor: mongodbColors.forestGreen,
          },
        },
        outlined: {
          borderColor: mongodbColors.springGreen,
          color: mongodbColors.springGreen,
          '&:hover': {
            borderColor: mongodbColors.forestGreen,
            backgroundColor: mongodbColors.evergreen,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: mongodbColors.evergreen,
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: mongodbColors.forestGreen,
            },
            '&:hover fieldset': {
              borderColor: mongodbColors.springGreen,
            },
            '&.Mui-focused fieldset': {
              borderColor: mongodbColors.springGreen,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
  },
});


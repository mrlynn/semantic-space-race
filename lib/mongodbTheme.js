import { createTheme } from '@mui/material/styles';

// MongoDB Official Brand Colors - Per Brand Book
export const mongodbColors = {
  // Primary Palette
  black: '#000000',          // Black - PMS Black C
  evergreen: '#023430',      // Evergreen - PMS 553 C
  forestGreen: '#00684A',    // Forest Green - PMS 7733 C
  chartreuse: '#B1FF05',     // Chartreuse - PMS 2297 C
  lime: '#E9FF99',           // Lime - PMS 937 C
  white: '#FFFFFF',

  // Secondary Colors - Purples
  violet: '#5400F8',         // Violet - PMS 2736 C
  purple: '#7C25FF',         // Purple - PMS 2089 C
  mauve: '#B45AF2',          // Mauve - PMS 528 C
  lilac: '#F2C5EE',          // Lilac - PMS 256 C

  // Secondary Colors - Blues
  darkBlue: '#0D427C',       // Dark Blue - PMS 7686 C
  clearBlue: '#006EFF',      // Clear Blue - PMS 285 C
  sky: '#00D2FF',            // Sky - PMS 2197 C
  azure: '#A6FFEC',          // Azure - PMS 317 C

  // Secondary Colors - Yellows
  chromeYellow: '#FF9F10',   // Chrome Yellow - PMS 1375 C
  brightYellow: '#FFC010',   // Bright Yellow - PMS 1225 C
  sun: '#FFE212',            // Sun - PMS 100 C
  glow: '#FFEEA9',           // Glow - PMS 2001 C

  // Legacy colors (keeping for backward compatibility)
  springGreen: '#00ED64',    // Note: This appears to be close to chartreuse
  slateBlue: '#001E2B',      // Dark background
};

// Create MongoDB-branded theme with light/dark mode support
export const createMongoDBTheme = (mode = 'dark') => createTheme({
  palette: {
    mode,
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
      default: mode === 'dark' ? mongodbColors.slateBlue : mongodbColors.white,
      paper: mode === 'dark' ? mongodbColors.evergreen : '#F5F5F5',
    },
    text: {
      primary: mode === 'dark' ? mongodbColors.white : mongodbColors.slateBlue,
      secondary: mode === 'dark' ? mongodbColors.springGreen : mongodbColors.forestGreen,
    },
    success: {
      main: mongodbColors.springGreen,
      contrastText: mongodbColors.slateBlue,
    },
    warning: {
      main: mongodbColors.brightYellow,
      light: mongodbColors.glow,
      dark: mongodbColors.chromeYellow,
      contrastText: mongodbColors.black,
    },
    error: {
      main: mongodbColors.mauve,
      light: mongodbColors.lilac,
      dark: mongodbColors.purple,
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
      color: mode === 'dark' ? mongodbColors.springGreen : mongodbColors.forestGreen,
    },
    h2: {
      fontWeight: 700,
      color: mode === 'dark' ? mongodbColors.springGreen : mongodbColors.forestGreen,
    },
    h3: {
      fontWeight: 600,
      color: mode === 'dark' ? mongodbColors.springGreen : mongodbColors.forestGreen,
    },
    h4: {
      fontWeight: 600,
      color: mode === 'dark' ? mongodbColors.springGreen : mongodbColors.forestGreen,
    },
    h5: {
      fontWeight: 600,
      color: mode === 'dark' ? mongodbColors.springGreen : mongodbColors.forestGreen,
    },
    h6: {
      fontWeight: 600,
      color: mode === 'dark' ? mongodbColors.springGreen : mongodbColors.forestGreen,
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
          backgroundColor: mode === 'dark' ? mongodbColors.evergreen : '#FFFFFF',
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

// Export default dark theme for backward compatibility
export const mongodbTheme = createMongoDBTheme('dark');


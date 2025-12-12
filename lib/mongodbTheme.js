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
  
  // Colors extracted from title-graphic.png
  titleCream: '#E9EACB',     // Cream/beige from title graphic
  titleDarkBlue: '#002347',  // Dark blue from title graphic
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
      default: mode === 'dark' ? mongodbColors.titleDarkBlue : mongodbColors.white,
      paper: mode === 'dark' ? mongodbColors.evergreen : '#F5F5F5',
    },
    text: {
      primary: mode === 'dark' ? mongodbColors.titleCream : mongodbColors.slateBlue,
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
    // MongoDB brand font: Euclid Circular A
    fontFamily: '"Euclid Circular A", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontWeight: 700,
      color: mode === 'dark' ? mongodbColors.titleCream : mongodbColors.forestGreen,
      fontSize: '2.5rem',
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
    },
    h2: {
      fontWeight: 700,
      color: mode === 'dark' ? mongodbColors.titleCream : mongodbColors.forestGreen,
      fontSize: '2rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 600,
      color: mode === 'dark' ? mongodbColors.titleCream : mongodbColors.forestGreen,
      fontSize: '1.75rem',
      lineHeight: 1.3,
      letterSpacing: '-0.005em',
    },
    h4: {
      fontWeight: 600,
      color: mode === 'dark' ? mongodbColors.titleCream : mongodbColors.forestGreen,
      fontSize: '1.5rem',
      lineHeight: 1.4,
      letterSpacing: '0em',
    },
    h5: {
      fontWeight: 600,
      color: mode === 'dark' ? mongodbColors.titleCream : mongodbColors.forestGreen,
      fontSize: '1.25rem',
      lineHeight: 1.4,
      letterSpacing: '0em',
    },
    h6: {
      fontWeight: 600,
      color: mode === 'dark' ? mongodbColors.titleCream : mongodbColors.forestGreen,
      fontSize: '1rem',
      lineHeight: 1.5,
      letterSpacing: '0em',
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
      fontSize: '0.875rem',
      letterSpacing: '0.02em',
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      letterSpacing: '0.01em',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
      letterSpacing: '0.01em',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          fontSize: '0.875rem',
          fontWeight: 600,
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
        contained: {
          backgroundColor: mongodbColors.springGreen,
          color: mongodbColors.slateBlue,
          '&:hover': {
            backgroundColor: mongodbColors.forestGreen,
            boxShadow: '0 4px 12px rgba(0, 237, 100, 0.3)',
          },
        },
        outlined: {
          borderColor: mongodbColors.springGreen,
          color: mongodbColors.springGreen,
          '&:hover': {
            borderColor: mongodbColors.forestGreen,
            backgroundColor: 'rgba(0, 237, 100, 0.05)',
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
              borderColor: mode === 'dark' ? 'rgba(0, 237, 100, 0.3)' : mongodbColors.forestGreen,
            },
            '&:hover fieldset': {
              borderColor: mongodbColors.springGreen,
            },
            '&.Mui-focused fieldset': {
              borderColor: mongodbColors.springGreen,
              boxShadow: '0 0 0 2px rgba(0, 237, 100, 0.2)',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.75rem',
          borderRadius: 16,
        },
      },
    },
  },
});

// Export default dark theme for backward compatibility
export const mongodbTheme = createMongoDBTheme('dark');


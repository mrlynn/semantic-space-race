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
    // Use readable font as default, pixelated font for headings/buttons only
    fontFamily: '"Euclid Circular A", "Helvetica Neue", Helvetica, Arial, sans-serif',
    h1: {
      fontWeight: 700,
      color: mode === 'dark' ? mongodbColors.titleCream : mongodbColors.forestGreen,
      fontFamily: '"PressStart2PRegular", monospace',
      fontSize: '1.5rem', // Larger for readability
      lineHeight: 2, // More spacing for pixelated font
      letterSpacing: '0.05em',
    },
    h2: {
      fontWeight: 700,
      color: mode === 'dark' ? mongodbColors.titleCream : mongodbColors.forestGreen,
      fontFamily: '"PressStart2PRegular", monospace',
      fontSize: '1.25rem',
      lineHeight: 2,
      letterSpacing: '0.05em',
    },
    h3: {
      fontWeight: 600,
      color: mode === 'dark' ? mongodbColors.titleCream : mongodbColors.forestGreen,
      fontFamily: '"PressStart2PRegular", monospace',
      fontSize: '1rem',
      lineHeight: 2,
      letterSpacing: '0.03em',
    },
    h4: {
      fontWeight: 600,
      color: mode === 'dark' ? mongodbColors.titleCream : mongodbColors.forestGreen,
      fontFamily: '"PressStart2PRegular", monospace',
      fontSize: '0.875rem',
      lineHeight: 2,
      letterSpacing: '0.02em',
    },
    h5: {
      fontWeight: 600,
      color: mode === 'dark' ? mongodbColors.titleCream : mongodbColors.forestGreen,
      fontFamily: '"PressStart2PRegular", monospace',
      fontSize: '0.75rem',
      lineHeight: 2,
    },
    h6: {
      fontWeight: 600,
      color: mode === 'dark' ? mongodbColors.titleCream : mongodbColors.forestGreen,
      fontFamily: '"PressStart2PRegular", monospace',
      fontSize: '0.6875rem',
      lineHeight: 2,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
      fontFamily: '"PressStart2PRegular", monospace',
      fontSize: '0.6875rem', // Slightly larger
      letterSpacing: '0.03em',
      lineHeight: 1.8,
    },
    body1: {
      // Use readable font for body text
      fontFamily: '"Euclid Circular A", "Helvetica Neue", Helvetica, Arial, sans-serif',
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    body2: {
      // Use readable font for body text
      fontFamily: '"Euclid Circular A", "Helvetica Neue", Helvetica, Arial, sans-serif',
      fontSize: '0.75rem',
      lineHeight: 1.6,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          // 8-bit pixelated border effect
          border: '3px solid',
          borderImageSlice: 1,
          imageRendering: 'pixelated',
          imageRendering: '-moz-crisp-edges',
          imageRendering: 'crisp-edges',
          boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.1s ease',
          '&:active': {
            transform: 'translate(2px, 2px)',
            boxShadow: '2px 2px 0px rgba(0, 0, 0, 0.3)',
          },
        },
        contained: {
          backgroundColor: mongodbColors.springGreen,
          color: mongodbColors.slateBlue,
          borderColor: mongodbColors.forestGreen,
          '&:hover': {
            backgroundColor: mongodbColors.forestGreen,
            borderColor: mongodbColors.springGreen,
            transform: 'translate(-1px, -1px)',
            boxShadow: '5px 5px 0px rgba(0, 0, 0, 0.3)',
          },
        },
        outlined: {
          borderColor: mongodbColors.springGreen,
          color: mongodbColors.springGreen,
          borderWidth: '3px',
          '&:hover': {
            borderColor: mongodbColors.forestGreen,
            backgroundColor: mongodbColors.evergreen,
            borderWidth: '3px',
            transform: 'translate(-1px, -1px)',
            boxShadow: '5px 5px 0px rgba(0, 237, 100, 0.3)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'dark' ? mongodbColors.evergreen : '#FFFFFF',
          backgroundImage: 'none',
          // 8-bit pixelated border
          border: '3px solid',
          borderColor: mode === 'dark' ? mongodbColors.springGreen : mongodbColors.forestGreen,
          imageRendering: 'pixelated',
          imageRendering: '-moz-crisp-edges',
          imageRendering: 'crisp-edges',
          boxShadow: '6px 6px 0px rgba(0, 0, 0, 0.2)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            // 8-bit pixelated input
            imageRendering: 'pixelated',
            imageRendering: '-moz-crisp-edges',
            imageRendering: 'crisp-edges',
            '& fieldset': {
              borderColor: mongodbColors.forestGreen,
              borderWidth: '3px',
            },
            '&:hover fieldset': {
              borderColor: mongodbColors.springGreen,
              borderWidth: '3px',
            },
            '&.Mui-focused fieldset': {
              borderColor: mongodbColors.springGreen,
              borderWidth: '3px',
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
          fontFamily: '"PressStart2PRegular", monospace',
          fontSize: '0.625rem',
          lineHeight: 1.8,
          // 8-bit pixelated chip
          border: '2px solid',
          borderColor: mongodbColors.springGreen,
          imageRendering: 'pixelated',
          imageRendering: '-moz-crisp-edges',
          imageRendering: 'crisp-edges',
          boxShadow: '2px 2px 0px rgba(0, 0, 0, 0.2)',
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          imageRendering: 'pixelated',
          imageRendering: '-moz-crisp-edges',
          imageRendering: 'crisp-edges',
        },
      },
    },
  },
});

// Export default dark theme for backward compatibility
export const mongodbTheme = createMongoDBTheme('dark');


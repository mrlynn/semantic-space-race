'use client';

import { Box } from '@mui/material';

/**
 * Brand Shape Decoration Component
 * Adds a single MongoDB brand shape as a decorative element
 * Can be positioned in corners or used as background elements
 * Note: Brand shapes should NOT be rotated per MongoDB brand guidelines
 */
export default function BrandShapeDecoration({
  shapeNumber = null,
  position = 'top-right', // 'top-right', 'top-left', 'bottom-right', 'bottom-left', 'center'
  size = 120,
  opacity = 0.08,
  color = 'primary', // 'primary' (green), 'secondary', 'warning', etc.
}) {
  // Random shape if not specified
  const shape = shapeNumber || Math.floor(Math.random() * 46) + 1;

  // Position mapping - center position maintains shape orientation
  const positionStyles = {
    'top-right': { top: -20, right: -20 },
    'top-left': { top: -20, left: -20 },
    'bottom-right': { bottom: -20, right: -20 },
    'bottom-left': { bottom: -20, left: -20 },
    'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
  };

  // Color filter mapping to MongoDB brand colors
  const colorFilters = {
    primary: 'hue-rotate(0deg) saturate(1.5) brightness(1.2)', // Green
    chartreuse: 'hue-rotate(60deg) saturate(2) brightness(1.5)', // Bright chartreuse
    purple: 'hue-rotate(270deg) saturate(1.5)', // Purple
    blue: 'hue-rotate(200deg) saturate(1.3)', // Blue
    yellow: 'hue-rotate(50deg) saturate(2) brightness(1.8)', // Yellow
    warning: 'hue-rotate(45deg) saturate(2) brightness(1.6)', // Orange/Yellow
  };

  return (
    <Box
      component="img"
      src={`/assets/brandshape_${shape}.png`}
      alt=""
      sx={{
        position: 'absolute',
        ...positionStyles[position],
        width: size,
        height: size,
        opacity: opacity,
        pointerEvents: 'none',
        zIndex: 0,
        filter: `${colorFilters[color] || colorFilters.primary} blur(0.5px)`,
        mixBlendMode: 'screen',
      }}
    />
  );
}

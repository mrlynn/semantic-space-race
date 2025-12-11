'use client';

import { Box } from '@mui/material';
import { useMemo } from 'react';

/**
 * MongoDB Brand Shapes Background Component
 * Adds decorative brand shapes to the background following MongoDB brand guidelines
 */
export default function BrandShapes({ count = 8, opacity = 0.15 }) {
  // Generate random positions and shapes
  const shapes = useMemo(() => {
    const shapeCount = 46; // Total available brand shapes (brandshape_1.png to brandshape_46.png)
    const generatedShapes = [];

    for (let i = 0; i < count; i++) {
      const shapeNumber = Math.floor(Math.random() * shapeCount) + 1;
      const size = Math.random() * 200 + 100; // 100-300px
      const top = Math.random() * 100; // 0-100%
      const left = Math.random() * 100; // 0-100%
      const rotation = Math.random() * 360; // 0-360deg
      const animationDelay = Math.random() * 5; // 0-5s
      const animationDuration = Math.random() * 20 + 20; // 20-40s

      generatedShapes.push({
        id: i,
        shapeNumber,
        size,
        top,
        left,
        rotation,
        animationDelay,
        animationDuration,
      });
    }

    return generatedShapes;
  }, [count]);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      {shapes.map((shape) => (
        <Box
          key={shape.id}
          component="img"
          src={`/assets/brandshape_${shape.shapeNumber}.png`}
          alt=""
          sx={{
            position: 'absolute',
            top: `${shape.top}%`,
            left: `${shape.left}%`,
            width: `${shape.size}px`,
            height: `${shape.size}px`,
            opacity: opacity,
            transform: `rotate(${shape.rotation}deg)`,
            filter: 'brightness(1.5)', // Make them blend better with dark background
            mixBlendMode: 'screen',
            animation: `float ${shape.animationDuration}s ease-in-out infinite`,
            animationDelay: `${shape.animationDelay}s`,
            '@keyframes float': {
              '0%, 100%': {
                transform: `translate(0, 0) rotate(${shape.rotation}deg)`,
              },
              '50%': {
                transform: `translate(20px, 20px) rotate(${shape.rotation + 10}deg)`,
              },
            },
          }}
        />
      ))}
    </Box>
  );
}

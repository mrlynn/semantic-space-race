'use client';

import { Box, Typography } from '@mui/material';
import Image from 'next/image';

export default function MongoDBLogo({ width = 120, height = 30, showText = true, ...props }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        ...props.sx,
      }}
      {...props}
    >
      {/* MongoDB Leaf Icon */}
      <Image
        src="/leaf.png"
        alt="MongoDB Leaf"
        width={height}
        height={height}
        style={{ objectFit: 'contain' }}
      />
      {showText && (
        <Typography
          variant="h5"
          sx={{
            color: '#00ED64',
            fontWeight: 600,
            fontFamily: "'Euclid Circular A', 'Helvetica Neue', Helvetica, Arial, sans-serif",
            letterSpacing: '-0.5px',
          }}
        >
          MongoDB
        </Typography>
      )}
    </Box>
  );
}


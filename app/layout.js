import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'MongoDB Semantic Hop',
  description: 'A multiplayer semantic guessing game by MongoDB',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fontlibrary.org//face/press-start-2p" type="text/css" />
      </head>
      <body className={inter.className} style={{ margin: 0, padding: 0, backgroundColor: '#001E2B' }}>
        {children}
      </body>
    </html>
  );
}


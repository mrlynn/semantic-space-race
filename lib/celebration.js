import confetti from 'canvas-confetti';

/**
 * Play a success sound using Web Audio API
 * Creates a pleasant ascending chord
 */
export function playSuccessSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;

    // Create success chord (C-E-G major chord)
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5

    frequencies.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      // Fade in and out
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      oscillator.start(now + (index * 0.1));
      oscillator.stop(now + 0.6);
    });
  } catch (error) {
    console.warn('Could not play success sound:', error);
  }
}

/**
 * Trigger confetti explosion
 * Uses MongoDB brand colors
 */
export function triggerConfetti() {
  const colors = [
    '#00ED64', // MongoDB Spring Green
    '#00684A', // Forest Green
    '#B1FF05', // Chartreuse
    '#E9FF99', // Lime
    '#FFFFFF', // White
  ];

  // Fire confetti from multiple angles
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = {
    startVelocity: 30,
    spread: 360,
    ticks: 60,
    zIndex: 9999,
    colors: colors,
  };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    // Fire from left side
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
    });

    // Fire from right side
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
    });
  }, 250);
}

/**
 * Trigger a smaller confetti burst (for hints or milestones)
 */
export function triggerSmallConfetti() {
  const colors = ['#00ED64', '#B1FF05', '#FFFFFF'];

  confetti({
    particleCount: 30,
    spread: 60,
    origin: { y: 0.6 },
    colors: colors,
    zIndex: 9999,
  });
}

/**
 * Celebrate a correct guess with confetti and sound
 */
export function celebrateCorrectGuess() {
  triggerConfetti();
  playSuccessSound();
}

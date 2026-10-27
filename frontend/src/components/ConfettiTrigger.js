import confetti from 'canvas-confetti';

export const fireVoteConfetti = () => {
  // Vibrant neo-brutalist palette
  const colors = ['#FFE500', '#FF5C8D', '#22E5A1', '#38BDF8', '#C084FC'];

  // Left cannon
  confetti({
    particleCount: 40,
    angle: 60,
    spread: 55,
    origin: { x: 0 },
    colors: colors,
  });

  // Right cannon
  confetti({
    particleCount: 40,
    angle: 120,
    spread: 55,
    origin: { x: 1 },
    colors: colors,
  });
};

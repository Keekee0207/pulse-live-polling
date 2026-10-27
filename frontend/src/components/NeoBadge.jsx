import React from 'react';

const NeoBadge = ({
  children,
  variant = 'yellow', // yellow, pink, mint, cyan, purple, dark, gray
  size = 'sm',
  className = '',
  pulse = false,
}) => {
  const variants = {
    yellow: 'bg-neoYellow text-black',
    pink: 'bg-neoPink text-white',
    mint: 'bg-neoMint text-black',
    cyan: 'bg-neoCyan text-black',
    purple: 'bg-neoPurple text-black',
    dark: 'bg-neoDark text-white',
    gray: 'bg-neutral-200 text-black',
  };

  const sizes = {
    xs: 'text-[10px] px-2 py-0.5 border',
    sm: 'text-xs px-2.5 py-1 border-2',
    md: 'text-sm px-3.5 py-1.5 border-2',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider border-black shadow-neo-sm ${
        variants[variant] || variants.yellow
      } ${sizes[size] || sizes.sm} ${className}`}
    >
      {pulse && (
        <span className="w-2 h-2 rounded-full bg-current animate-pulse-dot flex-shrink-0" />
      )}
      {children}
    </span>
  );
};

export default NeoBadge;

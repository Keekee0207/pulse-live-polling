import React from 'react';

const NeoButton = ({
  children,
  onClick,
  type = 'button',
  variant = 'yellow', // yellow, pink, mint, cyan, white, dark
  size = 'md', // sm, md, lg
  className = '',
  disabled = false,
  fullWidth = false,
  icon: Icon,
}) => {
  const variantStyles = {
    yellow: 'bg-neoYellow text-black hover:bg-[#ffe100]',
    pink: 'bg-neoPink text-white hover:bg-[#ff477e]',
    mint: 'bg-neoMint text-black hover:bg-[#1cd896]',
    cyan: 'bg-neoCyan text-black hover:bg-[#0ea5e9]',
    purple: 'bg-neoPurple text-black hover:bg-[#b06cf7]',
    white: 'bg-white text-black hover:bg-neutral-100',
    dark: 'bg-neoDark text-white hover:bg-black',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs border-2 shadow-neo-sm',
    md: 'px-5 py-2.5 text-sm font-bold border-[3px] shadow-neo',
    lg: 'px-7 py-3.5 text-base font-extrabold border-[3px] shadow-neo-lg',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        border-black font-sans uppercase tracking-wider
        inline-flex items-center justify-center gap-2
        transition-all duration-150 cursor-pointer
        select-none active:translate-x-1 active:translate-y-1 active:shadow-none
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
        ${variantStyles[variant] || variantStyles.yellow}
        ${sizeStyles[size] || sizeStyles.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
      {children}
    </button>
  );
};

export default NeoButton;

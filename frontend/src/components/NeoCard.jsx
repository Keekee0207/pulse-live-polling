import React from 'react';

const NeoCard = ({
  children,
  className = '',
  bg = 'bg-white',
  shadow = 'shadow-neo', // shadow-neo, shadow-neo-lg, shadow-neo-xl
  sticker,
  stickerBg = 'bg-neoPink text-white',
}) => {
  return (
    <div
      className={`relative border-[3px] border-black p-6 ${bg} ${shadow} ${className}`}
    >
      {sticker && (
        <div
          className={`absolute -top-3.5 right-4 border-2 border-black px-3 py-0.5 text-xs font-black uppercase tracking-wider rotate-2 shadow-neo-sm ${stickerBg}`}
        >
          {sticker}
        </div>
      )}
      {children}
    </div>
  );
};

export default NeoCard;

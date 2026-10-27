import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, ExternalLink } from 'lucide-react';
import NeoButton from './NeoButton';
import { useToast } from '../context/ToastContext';

const QRCodeModal = ({ isOpen, onClose, pollId, pollTitle }) => {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const voteUrl = `${window.location.origin}/poll/${pollId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(voteUrl);
    setCopied(true);
    toast('Link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white border-4 border-black p-6 shadow-neo-xl">
        {/* Header sticker */}
        <div className="flex items-start justify-between mb-4 border-b-2 border-black pb-3">
          <div>
            <div className="text-xs font-black uppercase tracking-wider bg-neoYellow border border-black inline-block px-2 py-0.5 mb-1 shadow-neo-sm">
              Scan & Vote
            </div>
            <h3 className="text-xl font-black truncate max-w-[280px]">
              {pollTitle || 'Live Audience Poll'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 border-2 border-black bg-neoPink text-white hover:bg-black transition-colors shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-6 bg-neoBg border-2 border-black mb-4">
          <div className="p-3 bg-white border-3 border-black shadow-neo">
            <QRCodeSVG
              value={voteUrl}
              size={220}
              level="H"
              includeMargin={true}
            />
          </div>
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-neutral-600 text-center">
            Point smartphone camera to vote instantly
          </p>
        </div>

        {/* Shareable Link Input */}
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            readOnly
            value={voteUrl}
            className="w-full bg-neutral-100 border-2 border-black px-3 py-2 text-xs font-mono select-all focus:outline-none"
          />
          <NeoButton
            size="sm"
            variant={copied ? 'mint' : 'yellow'}
            onClick={handleCopy}
            icon={copied ? Check : Copy}
          >
            {copied ? 'Copied' : 'Copy'}
          </NeoButton>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2">
          <NeoButton
            size="md"
            variant="cyan"
            fullWidth
            onClick={() => window.open(voteUrl, '_blank')}
            icon={ExternalLink}
          >
            Open Vote Page
          </NeoButton>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;

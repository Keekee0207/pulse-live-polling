import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { createPollWebSocket } from '../services/ws';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import NeoCard from '../components/NeoCard';
import NeoButton from '../components/NeoButton';
import NeoBadge from '../components/NeoBadge';
import QRCodeModal from '../components/QRCodeModal';
import { QRCodeSVG } from 'qrcode.react';
import {
  Radio,
  Users,
  QrCode,
  Share2,
  Maximize2,
  Minimize2,
  Lock,
  Unlock,
  Download,
  Trophy,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';

const LiveResultsPage = () => {
  const { id } = useParams();
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewers, setViewers] = useState(1);
  const [wsStatus, setWsStatus] = useState('connecting');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  const fetchPoll = async () => {
    try {
      const res = await api.get(`/polls/${id}`);
      setPoll(res.data.poll);
      if (res.data.viewers) setViewers(res.data.viewers);
    } catch (err) {
      toast('Failed to load poll results', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoll();
  }, [id]);

  // WebSocket Live Subscription
  useEffect(() => {
    if (!id) return;

    const ws = createPollWebSocket(
      id,
      (data) => {
        if (data.type === 'VOTE_UPDATE' || data.type === 'INITIAL_STATE' || data.type === 'VIEWER_UPDATE') {
          if (data.counts) {
            setPoll((prev) => {
              if (!prev) return prev;
              const updatedOptions = prev.options.map((opt) => ({
                ...opt,
                votes: data.counts[opt.id] ?? opt.votes ?? 0,
              }));
              return {
                ...prev,
                options: updatedOptions,
                total_votes: data.total_votes ?? prev.total_votes,
              };
            });
          }
          if (data.viewers !== undefined) {
            setViewers(data.viewers);
          }
          if (data.is_closed !== undefined) {
            setPoll((prev) => prev ? { ...prev, settings: { ...prev.settings, is_closed: data.is_closed } } : prev);
          }
        } else if (data.type === 'POLL_STATUS') {
          setPoll((prev) => prev ? { ...prev, settings: { ...prev.settings, is_closed: data.is_closed } } : prev);
        }
      },
      (status) => setWsStatus(status)
    );

    return () => ws.close();
  }, [id]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  const handleToggleStatus = async () => {
    if (!poll) return;
    try {
      await api.patch(`/polls/${id}/status`);
      toast(`Poll ${poll.settings?.is_closed ? 're-opened' : 'closed'} successfully`, 'success');
      fetchPoll();
    } catch (err) {
      toast('Failed to change poll status', 'error');
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get(`/polls/${id}/export`);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `poll_${id}_live_export.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast('Exported results to JSON!', 'success');
    } catch (err) {
      toast('Export failed', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="p-8 border-[3px] border-black bg-white shadow-neo text-center">
          <div className="text-3xl animate-spin mb-2">⚡</div>
          <div className="text-sm font-black uppercase">Loading Live Results Screen...</div>
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <NeoCard bg="bg-white" className="max-w-md text-center py-8">
          <h2 className="text-2xl font-black uppercase mb-2">Poll Not Found</h2>
          <Link to="/">
            <NeoButton size="md" variant="yellow">Return Home</NeoButton>
          </Link>
        </NeoCard>
      </div>
    );
  }

  const isClosed = poll.settings?.is_closed;
  const totalVotes = poll.total_votes || 0;
  const isCreator = user && poll.creator_id === user.id;
  const voteUrl = `${window.location.origin}/poll/${id}`;

  // Find leading option
  let maxVotes = -1;
  let leaderId = null;
  if (totalVotes > 0) {
    poll.options.forEach((opt) => {
      if ((opt.votes || 0) > maxVotes) {
        maxVotes = opt.votes || 0;
        leaderId = opt.id;
      }
    });
  }

  return (
    <div className={`min-h-screen p-4 sm:p-8 flex flex-col justify-between ${isFullscreen ? 'bg-neoBg' : ''}`}>
      {/* Top Header Bar */}
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/dashboard">
            <NeoButton size="sm" variant="white" icon={ArrowLeft}>
              Dashboard
            </NeoButton>
          </Link>

          {isClosed ? (
            <NeoBadge variant="dark">VOTING CLOSED</NeoBadge>
          ) : (
            <NeoBadge variant="mint" pulse>
              REALTIME LIVE
            </NeoBadge>
          )}

          <div className="flex items-center gap-1.5 bg-white border-2 border-black px-2.5 py-1 text-xs font-black shadow-neo-sm">
            <Users className="w-3.5 h-3.5 text-neutral-600" />
            <span>{viewers} Active Spectator{viewers === 1 ? '' : 's'}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 bg-neoYellow border-2 border-black px-2.5 py-1 text-xs font-black shadow-neo-sm">
            <span>{totalVotes} Total Votes</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/poll/${id}`}>
            <NeoButton size="sm" variant="white" icon={ExternalLink}>
              Audience Vote View
            </NeoButton>
          </Link>

          <NeoButton size="sm" variant="white" onClick={() => setShowQrModal(true)} icon={QrCode}>
            QR Code
          </NeoButton>

          {isCreator && (
            <NeoButton
              size="sm"
              variant={isClosed ? 'cyan' : 'dark'}
              onClick={handleToggleStatus}
              icon={isClosed ? Unlock : Lock}
            >
              {isClosed ? 'Reopen Poll' : 'Close Poll'}
            </NeoButton>
          )}

          <NeoButton size="sm" variant="white" onClick={handleExport} icon={Download}>
            Export
          </NeoButton>

          <NeoButton
            size="sm"
            variant="yellow"
            onClick={toggleFullscreen}
            icon={isFullscreen ? Minimize2 : Maximize2}
            title="Toggle Projector Fullscreen"
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Projector Mode'}
          </NeoButton>
        </div>
      </div>

      {/* Main Results Board */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto">
        {/* Results Graph Column */}
        <div className="lg:col-span-8">
          <NeoCard bg="bg-white" shadow="shadow-neo-xl" className="p-6 sm:p-10 border-4">
            <div className="mb-8 border-b-[3px] border-black pb-6">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-500">
                LIVE QUESTION
              </span>
              <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mt-1 leading-tight">
                {poll.question}
              </h1>
              {poll.description && (
                <p className="text-sm sm:text-base font-semibold text-neutral-600 mt-2">
                  {poll.description}
                </p>
              )}
            </div>

            {/* Live Animated Options Bars */}
            <div className="space-y-6">
              {poll.options.map((option, idx) => {
                const votes = option.votes || 0;
                const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                const isLeading = totalVotes > 0 && option.id === leaderId;

                return (
                  <div key={option.id} className="relative">
                    <div className="flex items-center justify-between text-base sm:text-xl font-black mb-2">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 border-2 border-black flex items-center justify-center text-xs font-black bg-neoBg shadow-neo-sm">
                          {idx + 1}
                        </span>
                        <span className="truncate max-w-sm sm:max-w-lg">{option.text}</span>
                        {isLeading && (
                          <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider bg-neoYellow border-2 border-black px-2 py-0.5 shadow-neo-sm animate-bounce-short">
                            <Trophy className="w-3.5 h-3.5" /> LEADING
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-sm sm:text-base text-neutral-600">
                          {votes} {votes === 1 ? 'vote' : 'votes'}
                        </span>
                        <span className="bg-black text-white px-2.5 py-1 text-sm sm:text-base font-bold shadow-neo-sm">
                          {percentage}%
                        </span>
                      </div>
                    </div>

                    {/* High-Contrast Progress Bar */}
                    <div className="h-10 sm:h-12 w-full bg-neoBg border-[3px] border-black overflow-hidden relative shadow-neo">
                      <div
                        className="h-full transition-all duration-700 ease-out border-r-[3px] border-black relative"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: option.color || '#FFE500',
                        }}
                      >
                        <div className="absolute inset-0 bg-stripes" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </NeoCard>
        </div>

        {/* Audience Scan Side Card (Presenter QR Banner) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <NeoCard bg="bg-white" shadow="shadow-neo-lg" sticker="SCAN TO VOTE" stickerBg="bg-neoYellow text-black">
            <div className="flex flex-col items-center text-center p-2">
              <div className="p-3 bg-white border-[3px] border-black shadow-neo mb-3">
                <QRCodeSVG
                  value={voteUrl}
                  size={180}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="text-sm font-black uppercase tracking-wider">
                Audience Quick Vote
              </div>
              <p className="text-xs font-bold text-neutral-600 mt-1 mb-3">
                Scan with any phone camera to cast your vote live!
              </p>

              <div className="w-full p-2 bg-neoBg border-2 border-black text-xs font-mono font-bold truncate select-all">
                {voteUrl}
              </div>
            </div>
          </NeoCard>

          {/* Redis Live Stream Status Card */}
          <NeoCard bg="bg-neoBg" shadow="shadow-neo-sm">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-neoMint border-2 border-black animate-pulse" />
              <div>
                <div className="text-xs font-black uppercase">Redis Pub/Sub Connected</div>
                <div className="text-[11px] font-semibold text-neutral-600">
                  Updates broadcast instantly to all spectator screens.
                </div>
              </div>
            </div>
          </NeoCard>
        </div>
      </div>

      {/* Footer Info */}
      <div className="max-w-7xl mx-auto w-full text-center mt-6 text-xs font-bold uppercase tracking-wider text-neutral-500">
        PULSE LIVE POLLING • GO + REDIS ENGINE • REAL-TIME ZERO-REFRESH
      </div>

      {/* Fullscreen QR Modal */}
      <QRCodeModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        pollId={poll.id}
        pollTitle={poll.question}
      />
    </div>
  );
};

export default LiveResultsPage;

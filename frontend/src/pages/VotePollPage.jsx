import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { getVoterId } from '../services/api';
import { createPollWebSocket } from '../services/ws';
import { useToast } from '../context/ToastContext';
import { fireVoteConfetti } from '../components/ConfettiTrigger';
import NeoCard from '../components/NeoCard';
import NeoButton from '../components/NeoButton';
import NeoBadge from '../components/NeoBadge';
import QRCodeModal from '../components/QRCodeModal';
import {
  Check,
  CheckCircle2,
  Lock,
  Radio,
  Share2,
  Users,
  BarChart2,
  Sparkles,
  AlertCircle
} from 'lucide-react';

const VotePollPage = () => {
  const { id } = useParams();
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [viewers, setViewers] = useState(1);
  const [wsStatus, setWsStatus] = useState('connecting');
  const [showQr, setShowQr] = useState(false);

  const { toast } = useToast();
  const voterId = getVoterId();

  // Fetch initial poll state
  useEffect(() => {
    const fetchPoll = async () => {
      try {
        const res = await api.get(`/polls/${id}?voter_id=${voterId}`);
        setPoll(res.data.poll);
        setHasVoted(res.data.has_voted || localStorage.getItem(`voted_${id}`) === 'true');
        if (res.data.viewers) setViewers(res.data.viewers);
      } catch (err) {
        toast('Poll not found or inactive', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchPoll();
  }, [id, voterId]);

  // Connect WebSocket for live updates
  useEffect(() => {
    if (!id) return;

    const ws = createPollWebSocket(
      id,
      (data) => {
        if (data.type === 'VOTE_UPDATE' || data.type === 'INITIAL_STATE' || data.type === 'VIEWER_UPDATE') {
          if (data.counts && poll) {
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
  }, [id, poll?.id]);

  const toggleSelectOption = (optId) => {
    if (hasVoted || poll?.settings?.is_closed) return;

    if (poll?.settings?.is_multi_choice) {
      if (selectedOptions.includes(optId)) {
        setSelectedOptions(selectedOptions.filter((o) => o !== optId));
      } else {
        setSelectedOptions([...selectedOptions, optId]);
      }
    } else {
      setSelectedOptions([optId]);
    }
  };

  const handleVoteSubmit = async () => {
    if (selectedOptions.length === 0) {
      toast('Please select an option first!', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/polls/${id}/vote`, {
        option_ids: selectedOptions,
        voter_id: voterId,
      });

      localStorage.setItem(`voted_${id}`, 'true');
      setHasVoted(true);
      fireVoteConfetti();
      toast('Vote successfully recorded! Live results updated.', 'success');

      if (res.data.counts) {
        setPoll((prev) => {
          if (!prev) return prev;
          const updatedOptions = prev.options.map((opt) => ({
            ...opt,
            votes: res.data.counts[opt.id] ?? opt.votes ?? 0,
          }));
          return {
            ...prev,
            options: updatedOptions,
            total_votes: res.data.total_votes ?? prev.total_votes,
          };
        });
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to submit vote';
      toast(msg, 'error');
      if (err.response?.status === 409) {
        localStorage.setItem(`voted_${id}`, 'true');
        setHasVoted(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-65px)] flex items-center justify-center p-4">
        <div className="p-8 border-[3px] border-black bg-white shadow-neo text-center">
          <div className="text-3xl animate-bounce mb-2">⚡</div>
          <div className="text-sm font-black uppercase">Connecting to Live Poll...</div>
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="min-h-[calc(100vh-65px)] flex items-center justify-center p-4">
        <NeoCard bg="bg-white" className="max-w-md text-center py-8">
          <AlertCircle className="w-12 h-12 mx-auto text-neoPink mb-3" />
          <h2 className="text-2xl font-black uppercase mb-2">Poll Not Found</h2>
          <p className="text-sm font-bold text-neutral-600 mb-6">
            The poll ID may be incorrect or the creator has removed it.
          </p>
          <Link to="/">
            <NeoButton size="md" variant="yellow">Back to Home</NeoButton>
          </Link>
        </NeoCard>
      </div>
    );
  }

  const isClosed = poll.settings?.is_closed;
  const totalVotes = poll.total_votes || 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {isClosed ? (
            <NeoBadge variant="dark">POLL CLOSED</NeoBadge>
          ) : (
            <NeoBadge variant="mint" pulse>
              LIVE VOTING OPEN
            </NeoBadge>
          )}

          <div className="flex items-center gap-1.5 bg-white border-2 border-black px-2.5 py-1 text-xs font-black shadow-neo-sm">
            <Users className="w-3.5 h-3.5 text-neutral-600" />
            <span>{viewers} {viewers === 1 ? 'Spectator' : 'Spectators'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NeoButton size="sm" variant="white" onClick={() => setShowQr(true)} icon={Share2}>
            Share
          </NeoButton>
          <Link to={`/poll/${id}/results`}>
            <NeoButton size="sm" variant="yellow" icon={BarChart2}>
              Live Screen
            </NeoButton>
          </Link>
        </div>
      </div>

      {/* Main Card */}
      <NeoCard
        bg="bg-white"
        shadow="shadow-neo-xl"
        sticker={hasVoted ? 'VOTE RECORDED' : (isClosed ? 'CLOSED' : 'AUDIENCE VOTE')}
        stickerBg={hasVoted ? 'bg-neoMint text-black' : (isClosed ? 'bg-neoDark text-white' : 'bg-neoYellow text-black')}
      >
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500">
              POLL ID: {poll.id}
            </span>
            {poll.settings?.is_multi_choice && (
              <span className="text-[10px] font-black uppercase tracking-wider bg-neoCyan px-2 py-0.5 border border-black">
                Select all that apply
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight leading-tight">
            {poll.question}
          </h1>

          {poll.description && (
            <p className="text-sm font-semibold text-neutral-600 mt-2">
              {poll.description}
            </p>
          )}
        </div>

        {/* Voting State vs Live Results State */}
        {!hasVoted && !isClosed ? (
          /* Audience Voting Options */
          <div className="space-y-3 mb-8">
            {poll.options.map((option, idx) => {
              const isSelected = selectedOptions.includes(option.id);
              return (
                <div
                  key={option.id}
                  onClick={() => toggleSelectOption(option.id)}
                  className={`
                    p-4 border-[3px] border-black cursor-pointer select-none
                    transition-all duration-150 flex items-center justify-between
                    ${isSelected
                      ? 'bg-neoYellow shadow-neo -translate-x-1 -translate-y-1'
                      : 'bg-neoBg hover:bg-neutral-100 shadow-neo-sm'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                        w-6 h-6 border-2 border-black flex items-center justify-center font-black text-xs
                        ${poll.settings?.is_multi_choice ? 'rounded-none' : 'rounded-full'}
                        ${isSelected ? 'bg-black text-white' : 'bg-white text-black'}
                      `}
                    >
                      {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                    </div>

                    <span className="text-base sm:text-lg font-bold">
                      {option.text}
                    </span>
                  </div>

                  <span
                    className="w-4 h-4 border-2 border-black"
                    style={{ backgroundColor: option.color || '#FFE500' }}
                  />
                </div>
              );
            })}

            <div className="pt-4">
              <NeoButton
                variant="yellow"
                size="lg"
                fullWidth
                disabled={submitting || selectedOptions.length === 0}
                onClick={handleVoteSubmit}
                icon={Sparkles}
              >
                {submitting ? 'Broadcasting Vote...' : 'Submit My Vote'}
              </NeoButton>
            </div>
          </div>
        ) : (
          /* Live Results View */
          <div className="space-y-4 mb-6">
            <div className="p-3 bg-neoMint border-2 border-black font-bold text-xs flex items-center justify-between shadow-neo-sm mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {hasVoted ? 'You have voted on this poll. Watching live updates...' : 'Voting is closed for this poll.'}
                </span>
              </div>
              <span className="font-mono">{totalVotes} Total Votes</span>
            </div>

            {poll.options.map((option) => {
              const votes = option.votes || 0;
              const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
              const isUserChoice = selectedOptions.includes(option.id);

              return (
                <div key={option.id} className="relative">
                  <div className="flex items-center justify-between text-sm font-black mb-1">
                    <div className="flex items-center gap-2">
                      <span>{option.text}</span>
                      {isUserChoice && (
                        <span className="text-[10px] font-bold uppercase bg-black text-white px-1.5 py-0.2">
                          Your Vote
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span>{votes} {votes === 1 ? 'vote' : 'votes'}</span>
                      <span className="bg-neutral-100 border border-black px-1.5 py-0.5 text-xs font-bold">
                        {percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar Container */}
                  <div className="h-8 w-full bg-neoBg border-2 border-black overflow-hidden relative shadow-neo-sm">
                    <div
                      className="h-full transition-all duration-500 ease-out border-r-2 border-black relative"
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
        )}

        {/* Real-time Indicator Footer */}
        <div className="pt-4 border-t-2 border-black flex flex-col sm:flex-row items-center justify-between text-xs font-bold text-neutral-600 gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full border border-black ${
                wsStatus === 'connected' ? 'bg-neoMint animate-pulse' : 'bg-neoPink'
              }`}
            />
            <span>
              {wsStatus === 'connected'
                ? 'Connected to Redis Realtime Channel'
                : 'Reconnecting WebSocket stream...'}
            </span>
          </div>

          <Link to={`/poll/${id}/results`} className="underline font-black text-black hover:text-neoPink">
            Open Fullscreen Live Screen &rarr;
          </Link>
        </div>
      </NeoCard>

      {/* Share QR Code Modal */}
      <QRCodeModal
        isOpen={showQr}
        onClose={() => setShowQr(false)}
        pollId={poll.id}
        pollTitle={poll.question}
      />
    </div>
  );
};

export default VotePollPage;

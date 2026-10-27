import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import NeoCard from '../components/NeoCard';
import NeoButton from '../components/NeoButton';
import NeoBadge from '../components/NeoBadge';
import QRCodeModal from '../components/QRCodeModal';
import {
  PlusCircle,
  Radio,
  ExternalLink,
  QrCode,
  Copy,
  Trash2,
  Lock,
  Unlock,
  Download,
  BarChart3,
  Users,
  Clock,
  Sparkles
} from 'lucide-react';

const DashboardPage = () => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeQrPoll, setActiveQrPoll] = useState(null);
  const { toast } = useToast();

  const fetchPolls = async () => {
    try {
      const res = await api.get('/polls/my');
      setPolls(res.data.polls || []);
    } catch (err) {
      toast('Failed to load your polls', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, []);

  const handleCopyLink = (pollId) => {
    const url = `${window.location.origin}/poll/${pollId}`;
    navigator.clipboard.writeText(url);
    toast('Poll link copied to clipboard!', 'success');
  };

  const handleToggleStatus = async (pollId, currentStatus) => {
    try {
      await api.patch(`/polls/${pollId}/status`);
      toast(`Poll ${currentStatus ? 're-opened' : 'closed'} successfully`, 'success');
      fetchPolls();
    } catch (err) {
      toast('Failed to update poll status', 'error');
    }
  };

  const handleDelete = async (pollId) => {
    if (!window.confirm('Are you sure you want to delete this poll and all its votes?')) {
      return;
    }
    try {
      await api.delete(`/polls/${pollId}`);
      toast('Poll deleted successfully', 'success');
      setPolls((prev) => prev.filter((p) => p.id !== pollId));
    } catch (err) {
      toast('Failed to delete poll', 'error');
    }
  };

  const handleExport = async (pollId, question) => {
    try {
      const res = await api.get(`/polls/${pollId}/export`);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `poll_${pollId}_results.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast('Results exported to JSON file!', 'success');
    } catch (err) {
      toast('Export failed', 'error');
    }
  };

  const totalVotesAcrossAll = polls.reduce((sum, p) => sum + (p.total_votes || 0), 0);
  const activePollsCount = polls.filter((p) => !p.settings?.is_closed).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <NeoBadge variant="yellow" className="mb-2">HOST CONSOLE</NeoBadge>
          <h1 className="text-4xl font-black uppercase tracking-tight">
            Creator Dashboard
          </h1>
          <p className="text-sm font-bold text-neutral-600 mt-1">
            Manage your live polls, view real-time audience engagement, and export data.
          </p>
        </div>
        <Link to="/create">
          <NeoButton size="lg" variant="yellow" icon={PlusCircle}>
            Create New Poll
          </NeoButton>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <NeoCard bg="bg-white" sticker="TOTALS" stickerBg="bg-neoYellow text-black">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-neoYellow border-2 border-black flex items-center justify-center shadow-neo-sm">
              <BarChart3 className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="text-3xl font-black">{polls.length}</div>
              <div className="text-xs font-bold uppercase text-neutral-600">Created Polls</div>
            </div>
          </div>
        </NeoCard>

        <NeoCard bg="bg-white" sticker="ENGAGEMENT" stickerBg="bg-neoMint text-black">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-neoMint border-2 border-black flex items-center justify-center shadow-neo-sm">
              <Users className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="text-3xl font-black">{totalVotesAcrossAll}</div>
              <div className="text-xs font-bold uppercase text-neutral-600">Total Votes Cast</div>
            </div>
          </div>
        </NeoCard>

        <NeoCard bg="bg-white" sticker="LIVE NOW" stickerBg="bg-neoPink text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-neoPink border-2 border-black flex items-center justify-center shadow-neo-sm">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-3xl font-black">{activePollsCount}</div>
              <div className="text-xs font-bold uppercase text-neutral-600">Active Polls</div>
            </div>
          </div>
        </NeoCard>
      </div>

      {/* Polls Listing */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black uppercase tracking-tight">Your Polls</h2>
        <span className="text-xs font-bold font-mono text-neutral-600">
          {polls.length} Poll{polls.length === 1 ? '' : 's'}
        </span>
      </div>

      {loading ? (
        <div className="p-12 text-center border-[3px] border-black bg-white shadow-neo">
          <div className="inline-block animate-spin mb-2">⚡</div>
          <div className="text-sm font-bold uppercase">Loading your polls...</div>
        </div>
      ) : polls.length === 0 ? (
        <NeoCard bg="bg-white" className="text-center py-12">
          <Sparkles className="w-12 h-12 mx-auto text-neoYellow fill-neoYellow mb-4" />
          <h3 className="text-2xl font-black uppercase mb-2">No Polls Created Yet</h3>
          <p className="text-sm font-bold text-neutral-600 max-w-md mx-auto mb-6">
            You haven't launched any live polls yet. Create your first poll in under 30 seconds!
          </p>
          <Link to="/create">
            <NeoButton size="md" variant="yellow" icon={PlusCircle}>
              Create My First Poll
            </NeoButton>
          </Link>
        </NeoCard>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {polls.map((poll) => {
            const isClosed = poll.settings?.is_closed;
            return (
              <NeoCard
                key={poll.id}
                bg="bg-white"
                className="transition-transform hover:-translate-y-0.5"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Left Column: Details */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {isClosed ? (
                        <NeoBadge variant="dark">CLOSED</NeoBadge>
                      ) : (
                        <NeoBadge variant="mint" pulse>LIVE & ACTIVE</NeoBadge>
                      )}

                      {poll.settings?.is_multi_choice ? (
                        <NeoBadge variant="cyan">MULTI-CHOICE</NeoBadge>
                      ) : (
                        <NeoBadge variant="yellow">SINGLE CHOICE</NeoBadge>
                      )}

                      {poll.settings?.expires_at && (
                        <NeoBadge variant="gray">
                          <Clock className="w-3 h-3" />
                          {new Date(poll.settings.expires_at) > new Date() ? 'EXPIRES SOON' : 'EXPIRED'}
                        </NeoBadge>
                      )}
                    </div>

                    <h3 className="text-2xl font-black tracking-tight mb-2">
                      {poll.question}
                    </h3>

                    {poll.description && (
                      <p className="text-xs font-semibold text-neutral-600 mb-4 max-w-2xl">
                        {poll.description}
                      </p>
                    )}

                    {/* Options Preview Pills */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {poll.options?.map((opt) => (
                        <div
                          key={opt.id}
                          className="flex items-center gap-2 bg-neoBg border-2 border-black px-2.5 py-1 text-xs font-bold shadow-neo-sm"
                        >
                          <span
                            className="w-2.5 h-2.5 border border-black rounded-full"
                            style={{ backgroundColor: opt.color || '#FFE500' }}
                          />
                          <span>{opt.text}</span>
                          <span className="bg-black text-white px-1.5 py-0.2 rounded text-[10px]">
                            {opt.votes || 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 border-t-2 lg:border-t-0 lg:border-l-2 border-black pt-4 lg:pt-0 lg:pl-6 justify-center">
                    <div className="flex gap-2">
                      <Link to={`/poll/${poll.id}/results`} className="flex-1">
                        <NeoButton size="sm" variant="yellow" fullWidth icon={Radio}>
                          Live Screen
                        </NeoButton>
                      </Link>

                      <Link to={`/poll/${poll.id}`} className="flex-1">
                        <NeoButton size="sm" variant="mint" fullWidth icon={ExternalLink}>
                          Vote Page
                        </NeoButton>
                      </Link>
                    </div>

                    <div className="flex gap-2">
                      <NeoButton
                        size="sm"
                        variant="white"
                        className="flex-1"
                        icon={QrCode}
                        onClick={() => setActiveQrPoll(poll)}
                      >
                        QR Code
                      </NeoButton>

                      <NeoButton
                        size="sm"
                        variant="white"
                        className="flex-1"
                        icon={Copy}
                        onClick={() => handleCopyLink(poll.id)}
                      >
                        Copy Link
                      </NeoButton>
                    </div>

                    <div className="flex gap-2">
                      <NeoButton
                        size="sm"
                        variant={isClosed ? 'cyan' : 'dark'}
                        className="flex-1"
                        icon={isClosed ? Unlock : Lock}
                        onClick={() => handleToggleStatus(poll.id, isClosed)}
                      >
                        {isClosed ? 'Reopen' : 'Close'}
                      </NeoButton>

                      <NeoButton
                        size="sm"
                        variant="white"
                        icon={Download}
                        onClick={() => handleExport(poll.id, poll.question)}
                        title="Export JSON"
                      />

                      <NeoButton
                        size="sm"
                        variant="pink"
                        icon={Trash2}
                        onClick={() => handleDelete(poll.id)}
                        title="Delete Poll"
                      />
                    </div>
                  </div>
                </div>
              </NeoCard>
            );
          })}
        </div>
      )}

      {/* QR Code Modal */}
      {activeQrPoll && (
        <QRCodeModal
          isOpen={!!activeQrPoll}
          onClose={() => setActiveQrPoll(null)}
          pollId={activeQrPoll.id}
          pollTitle={activeQrPoll.question}
        />
      )}
    </div>
  );
};

export default DashboardPage;

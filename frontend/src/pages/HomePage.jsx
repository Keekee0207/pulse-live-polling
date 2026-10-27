import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NeoButton from '../components/NeoButton';
import NeoCard from '../components/NeoCard';
import NeoBadge from '../components/NeoBadge';
import { Zap, Radio, BarChart3, Users, Share2, Sparkles, ArrowRight, ShieldCheck, Database, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
  const [pollCode, setPollCode] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleJoin = (e) => {
    e.preventDefault();
    const clean = pollCode.trim().replace(/^.*\/poll\//, '');
    if (clean) {
      navigate(`/poll/${clean}`);
    }
  };

  return (
    <div className="min-h-[calc(100vh-65px)] pb-16">
      {/* Hero Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-16 text-center">
        {/* Tech Stack Banner */}
        <div className="inline-flex flex-wrap items-center justify-center gap-2 mb-6">
          <NeoBadge variant="pink">NO REFRESH NEEDED</NeoBadge>
          <NeoBadge variant="yellow" pulse>REDIS PUB/SUB DRIVEN</NeoBadge>
          <NeoBadge variant="mint">GO GIN BACKEND</NeoBadge>
          <NeoBadge variant="cyan">MONGODB PERSISTENCE</NeoBadge>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black uppercase tracking-tight leading-[0.95] mb-6">
          LIVE POLLING <br />
          <span className="bg-neoYellow px-4 border-[3px] border-black shadow-neo inline-block rotate-[-1deg]">
            WITHOUT DELAY.
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg sm:text-xl font-bold text-neutral-700 mb-8">
          Ask questions, project live results, and let your audience vote with zero friction.
          Every vote is broadcast instantaneously over Redis WebSockets.
        </p>

        {/* CTA and Join Form */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-xl mx-auto mb-16">
          <Link to={isAuthenticated ? "/create" : "/register"} className="w-full sm:w-auto">
            <NeoButton size="lg" variant="yellow" fullWidth icon={Zap}>
              Create A Live Poll
            </NeoButton>
          </Link>

          {/* Join Poll Input */}
          <form onSubmit={handleJoin} className="flex w-full sm:w-auto">
            <input
              type="text"
              placeholder="Paste Poll ID or Link..."
              value={pollCode}
              onChange={(e) => setPollCode(e.target.value)}
              className="bg-white border-[3px] border-black px-4 py-3 text-sm font-bold uppercase tracking-wider placeholder:normal-case placeholder:font-normal focus:outline-none w-full sm:w-56 shadow-neo-sm"
            />
            <button
              type="submit"
              className="bg-neoMint border-[3px] border-l-0 border-black px-4 py-3 font-black uppercase shadow-neo-sm hover:bg-[#1cd896] active:translate-x-0.5 active:translate-y-0.5"
            >
              Join
            </button>
          </form>
        </div>

        {/* Interactive Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto text-left">
          {/* Card 1 */}
          <NeoCard bg="bg-white" sticker="STEP 01" stickerBg="bg-neoYellow text-black">
            <div className="w-12 h-12 bg-neoYellow border-2 border-black flex items-center justify-center mb-4 shadow-neo-sm">
              <Zap className="w-6 h-6 text-black" />
            </div>
            <h3 className="text-xl font-black uppercase mb-2">1. Create & Customize</h3>
            <p className="text-sm font-semibold text-neutral-700">
              Set single or multi-choice options, custom neo-palette colors, and optional expiration timers with backend schema validation.
            </p>
          </NeoCard>

          {/* Card 2 */}
          <NeoCard bg="bg-white" sticker="STEP 02" stickerBg="bg-neoCyan text-black">
            <div className="w-12 h-12 bg-neoCyan border-2 border-black flex items-center justify-center mb-4 shadow-neo-sm">
              <Share2 className="w-6 h-6 text-black" />
            </div>
            <h3 className="text-xl font-black uppercase mb-2">2. Share Fast</h3>
            <p className="text-sm font-semibold text-neutral-700">
              Audience scans a generated high-contrast QR code or opens a short link on their smartphone. Zero login required to vote.
            </p>
          </NeoCard>

          {/* Card 3 */}
          <NeoCard bg="bg-white" sticker="STEP 03" stickerBg="bg-neoPink text-white">
            <div className="w-12 h-12 bg-neoPink border-2 border-black flex items-center justify-center mb-4 shadow-neo-sm">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-black uppercase mb-2">3. Zero-Refresh Results</h3>
            <p className="text-sm font-semibold text-neutral-700">
              Go Gin backend routes votes into Redis atomic counters (`HINCRBY`) and broadcasts updates over WebSockets across all spectator screens.
            </p>
          </NeoCard>
        </div>
      </section>

      {/* Tech Architecture Highlight */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 mt-8">
        <NeoCard bg="bg-neoBg" shadow="shadow-neo-lg" className="border-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <NeoBadge variant="dark" className="mb-2">UNDER THE HOOD</NeoBadge>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
                Architected For Scale & Real-Time Integrity
              </h2>
              <p className="text-sm font-bold text-neutral-700 mt-2 max-w-xl">
                Every layer of the stack is doing serious heavy lifting: Redis acts as the real-time cache, atomic counter, and pub/sub broker; MongoDB stores persistent records and audit logs; Go Gin handles high-throughput routing.
              </p>
            </div>
            <Link to={isAuthenticated ? "/dashboard" : "/login"}>
              <NeoButton size="lg" variant="mint" icon={ArrowRight}>
                Try Live Demo
              </NeoButton>
            </Link>
          </div>
        </NeoCard>
      </section>
    </div>
  );
};

export default HomePage;

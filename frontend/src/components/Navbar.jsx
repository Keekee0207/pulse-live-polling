import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NeoButton from './NeoButton';
import { Zap, PlusCircle, LayoutDashboard, LogOut, LogIn } from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b-[3px] border-black shadow-neo-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-neoYellow border-[3px] border-black flex items-center justify-center shadow-neo-sm group-hover:rotate-6 transition-transform">
            <Zap className="w-6 h-6 text-black fill-black" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tight uppercase leading-none">
              PULSE<span className="text-neoPink">.</span>
            </span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-600">
              Live Polling
            </span>
          </div>
        </Link>

        {/* Navigation Items */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard">
                <NeoButton size="sm" variant="white" icon={LayoutDashboard} className="hidden sm:inline-flex">
                  Dashboard
                </NeoButton>
              </Link>

              <Link to="/create">
                <NeoButton size="sm" variant="yellow" icon={PlusCircle}>
                  New Poll
                </NeoButton>
              </Link>

              <div className="h-6 w-0.5 bg-black mx-1 hidden sm:block" />

              <div className="hidden md:flex items-center gap-2 bg-neoBg border-2 border-black px-2.5 py-1 text-xs font-bold shadow-neo-sm">
                <span className="w-2 h-2 rounded-full bg-neoMint border border-black" />
                <span className="truncate max-w-[120px]">{user?.name || user?.email}</span>
              </div>

              <NeoButton size="sm" variant="pink" onClick={handleLogout} icon={LogOut}>
                <span className="hidden sm:inline">Logout</span>
              </NeoButton>
            </>
          ) : (
            <>
              <Link to="/login">
                <NeoButton size="sm" variant="white" icon={LogIn}>
                  Login
                </NeoButton>
              </Link>
              <Link to="/register">
                <NeoButton size="sm" variant="yellow">
                  Sign Up
                </NeoButton>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;

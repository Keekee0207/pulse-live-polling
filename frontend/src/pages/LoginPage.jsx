import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import NeoButton from '../components/NeoButton';
import NeoCard from '../components/NeoCard';
import NeoBadge from '../components/NeoBadge';
import { LogIn, Sparkles, AlertCircle } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      toast('Welcome back! Logged in successfully.', 'success');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to login. Please check credentials.';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('host@livepoll.io');
    setPassword('polling2026');
    setError('');
    setLoading(true);
    try {
      await login('host@livepoll.io', 'polling2026');
      toast('Logged in with Demo Account!', 'success');
      navigate('/dashboard');
    } catch (err) {
      // If demo account not registered yet, we will auto-register
      try {
        const { register } = useAuth();
        await register('Demo Host', 'host@livepoll.io', 'polling2026');
        toast('Demo account created and logged in!', 'success');
        navigate('/dashboard');
      } catch (regErr) {
        setError('Demo login error: ' + (regErr.response?.data?.error || regErr.message));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <NeoCard bg="bg-white" shadow="shadow-neo-xl" sticker="CREATOR ACCESS">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-black uppercase tracking-tight">
              Sign In to Pulse
            </h1>
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-600 mt-1">
              Create and manage live real-time polls
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-neoPink text-white border-2 border-black font-bold text-xs flex items-center gap-2 shadow-neo-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full bg-neoBg border-[3px] border-black px-4 py-2.5 font-bold text-sm focus:outline-none focus:bg-white shadow-neo-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-neoBg border-[3px] border-black px-4 py-2.5 font-bold text-sm focus:outline-none focus:bg-white shadow-neo-sm"
              />
            </div>

            <NeoButton
              type="submit"
              variant="yellow"
              size="lg"
              fullWidth
              disabled={loading}
              icon={LogIn}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </NeoButton>
          </form>

          {/* Quick Demo Login Option */}
          <div className="mt-6 pt-4 border-t-2 border-black">
            <NeoButton
              variant="mint"
              size="sm"
              fullWidth
              onClick={handleDemoLogin}
              icon={Sparkles}
            >
              1-Click Demo Host Login
            </NeoButton>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs font-bold text-neutral-700">
              Don't have an account?{' '}
              <Link to="/register" className="underline font-black text-black hover:text-neoPink">
                Sign up free
              </Link>
            </p>
          </div>
        </NeoCard>
      </div>
    </div>
  );
};

export default LoginPage;

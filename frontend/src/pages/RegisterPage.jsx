import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import NeoButton from '../components/NeoButton';
import NeoCard from '../components/NeoCard';
import { UserPlus, AlertCircle } from 'lucide-react';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      await register(name, email, password);
      toast('Account created! Welcome to Pulse.', 'success');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed. Please try again.';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <NeoCard bg="bg-white" shadow="shadow-neo-xl" sticker="START HOSTING">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-black uppercase tracking-tight">
              Create Creator Account
            </h1>
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-600 mt-1">
              Host live polls and track real-time analytics
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
                Your Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Morgan"
                className="w-full bg-neoBg border-[3px] border-black px-4 py-2.5 font-bold text-sm focus:outline-none focus:bg-white shadow-neo-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@domain.com"
                className="w-full bg-neoBg border-[3px] border-black px-4 py-2.5 font-bold text-sm focus:outline-none focus:bg-white shadow-neo-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1">
                Password (min. 6 characters)
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
              variant="cyan"
              size="lg"
              fullWidth
              disabled={loading}
              icon={UserPlus}
            >
              {loading ? 'Creating Account...' : 'Register'}
            </NeoButton>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs font-bold text-neutral-700">
              Already registered?{' '}
              <Link to="/login" className="underline font-black text-black hover:text-neoPink">
                Sign in here
              </Link>
            </p>
          </div>
        </NeoCard>
      </div>
    </div>
  );
};

export default RegisterPage;

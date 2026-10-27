import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import NeoCard from '../components/NeoCard';
import NeoButton from '../components/NeoButton';
import NeoBadge from '../components/NeoBadge';
import { Plus, Trash2, Zap, Clock, CheckSquare, Eye } from 'lucide-react';

const neoColorPalette = [
  '#FFE500', // Yellow
  '#FF5C8D', // Pink
  '#22E5A1', // Mint
  '#38BDF8', // Cyan
  '#C084FC', // Purple
  '#FB923C', // Orange
  '#F43F5E', // Rose
  '#A3E635', // Lime
];

const CreatePollPage = () => {
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState([
    'Option 1',
    'Option 2',
    'Option 3',
  ]);
  const [isMultiChoice, setIsMultiChoice] = useState(false);
  const [expiresInMins, setExpiresInMins] = useState(0); // 0 = no expiration
  const [submitting, setSubmitting] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  const handleAddOption = () => {
    if (options.length >= 8) {
      toast('Maximum 8 options permitted per poll', 'warning');
      return;
    }
    setOptions([...options, `Option ${options.length + 1}`]);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) {
      toast('A poll must have at least 2 options', 'error');
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (question.trim().length < 5) {
      toast('Question must be at least 5 characters long', 'error');
      return;
    }

    const cleanOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (cleanOptions.length < 2) {
      toast('Please provide at least 2 non-empty options', 'error');
      return;
    }

    // Check duplicates
    const uniqueOptions = new Set(cleanOptions.map((o) => o.toLowerCase()));
    if (uniqueOptions.size !== cleanOptions.length) {
      toast('All options must be distinct', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        question: question.trim(),
        description: description.trim(),
        options: cleanOptions,
        is_multi_choice: isMultiChoice,
      };

      if (expiresInMins > 0) {
        payload.expires_in_mins = Number(expiresInMins);
      }

      const res = await api.post('/polls', payload);
      const createdPoll = res.data.poll;
      toast('Live Poll launched successfully!', 'success');
      navigate(`/poll/${createdPoll.id}/results`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to create poll';
      toast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <NeoBadge variant="yellow" className="mb-2">POLL CREATOR STUDIO</NeoBadge>
        <h1 className="text-4xl font-black uppercase tracking-tight">
          Create A Live Poll
        </h1>
        <p className="text-sm font-bold text-neutral-600 mt-1">
          Configure questions, audience choice rules, and watch live votes stream in.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Column */}
        <div className="lg:col-span-7">
          <NeoCard bg="bg-white" shadow="shadow-neo-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Question */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-black uppercase tracking-wider">
                    Question / Title <span className="text-neoPink">*</span>
                  </label>
                  <span className="text-[10px] font-mono text-neutral-500">
                    {question.length}/255
                  </span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={255}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g., Which backend architecture will scale best for our 2026 launch?"
                  className="w-full bg-neoBg border-[3px] border-black px-4 py-3 font-bold text-base focus:outline-none focus:bg-white shadow-neo-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider mb-1">
                  Context / Description <span className="text-neutral-500 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add any extra instructions or context for the voting audience..."
                  className="w-full bg-neoBg border-[3px] border-black px-4 py-2 font-bold text-sm focus:outline-none focus:bg-white shadow-neo-sm resize-none"
                />
              </div>

              {/* Options */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase tracking-wider">
                    Voting Options <span className="text-neutral-500">({options.length}/8)</span>
                  </label>
                  <span className="text-[10px] font-bold text-neutral-600 uppercase">
                    Min 2 • Max 8
                  </span>
                </div>

                <div className="space-y-2.5">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span
                        className="w-7 h-7 flex-shrink-0 border-2 border-black flex items-center justify-center font-black text-xs shadow-neo-sm"
                        style={{ backgroundColor: neoColorPalette[idx % neoColorPalette.length] }}
                      >
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        required
                        maxLength={120}
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                        className="flex-1 bg-neoBg border-2 border-black px-3 py-2 font-bold text-sm focus:outline-none focus:bg-white shadow-neo-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        disabled={options.length <= 2}
                        className="p-2 border-2 border-black bg-white hover:bg-neoPink hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-neo-sm"
                        title="Remove Option"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  <NeoButton
                    type="button"
                    size="sm"
                    variant="white"
                    onClick={handleAddOption}
                    disabled={options.length >= 8}
                    icon={Plus}
                  >
                    Add Another Option
                  </NeoButton>
                </div>
              </div>

              {/* Settings Box */}
              <div className="p-4 bg-neoBg border-[3px] border-black space-y-4">
                <div className="text-xs font-black uppercase tracking-wider mb-2">
                  Poll Rules & Controls
                </div>

                {/* Multi-choice Toggle */}
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isMultiChoice}
                    onChange={(e) => setIsMultiChoice(e.target.checked)}
                    className="w-5 h-5 border-2 border-black accent-black rounded-none cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-black uppercase">Allow Multiple Selections</span>
                    <p className="text-xs font-semibold text-neutral-600">
                      Audience can vote for more than one choice
                    </p>
                  </div>
                </label>

                {/* Expiration Timer */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider mb-1">
                    Auto-Close Expiration Timer
                  </label>
                  <select
                    value={expiresInMins}
                    onChange={(e) => setExpiresInMins(Number(e.target.value))}
                    className="w-full bg-white border-2 border-black px-3 py-2 text-xs font-bold uppercase focus:outline-none shadow-neo-sm cursor-pointer"
                  >
                    <option value={0}>Never (Manual Close Only)</option>
                    <option value={5}>5 Minutes</option>
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={60}>1 Hour</option>
                    <option value={1440}>24 Hours</option>
                  </select>
                </div>
              </div>

              {/* Submit CTA */}
              <NeoButton
                type="submit"
                variant="yellow"
                size="lg"
                fullWidth
                disabled={submitting}
                icon={Zap}
              >
                {submitting ? 'Launching Live Poll...' : 'Launch Live Poll Now'}
              </NeoButton>
            </form>
          </NeoCard>
        </div>

        {/* Live Audience Preview Column */}
        <div className="lg:col-span-5 sticky top-20">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-black" />
            <span className="text-xs font-black uppercase tracking-wider">
              Audience Screen Preview
            </span>
          </div>

          <NeoCard bg="bg-white" shadow="shadow-neo-lg" sticker="LIVE PREVIEW" stickerBg="bg-neoCyan text-black">
            <div className="flex items-center gap-2 mb-3">
              <NeoBadge variant="mint" pulse>LIVE</NeoBadge>
              {isMultiChoice ? (
                <NeoBadge variant="cyan">MULTI-CHOICE</NeoBadge>
              ) : (
                <NeoBadge variant="yellow">SINGLE CHOICE</NeoBadge>
              )}
            </div>

            <h3 className="text-xl font-black mb-1">
              {question || 'Your poll question will appear here...'}
            </h3>

            {description && (
              <p className="text-xs font-semibold text-neutral-600 mb-4">
                {description}
              </p>
            )}

            <div className="space-y-2 mt-4">
              {options.map((opt, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 border-2 border-black bg-neoBg shadow-neo-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 border border-black rounded-none"
                      style={{ backgroundColor: neoColorPalette[i % neoColorPalette.length] }}
                    />
                    <span className="text-sm font-bold">
                      {opt || `Option ${i + 1}`}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-neutral-400">0%</span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t-2 border-black flex justify-between items-center text-[10px] font-bold uppercase text-neutral-500">
              <span>Audience View</span>
              <span>Protected by Redis Counter</span>
            </div>
          </NeoCard>
        </div>
      </div>
    </div>
  );
};

export default CreatePollPage;

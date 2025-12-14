import React, { useState } from 'react';
import { 
  Github, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Zap, 
  BookOpen, 
  Layout, 
  Code2, 
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { EvaluationResult } from './types';

// In a real deployed environment, this would be an environment variable
// For this demo, we assume the backend is running on localhost:3001 if local, or a relative path if proxied
const BACKEND_URL = 'http://localhost:3001/evaluate'; 

const App: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EvaluationResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to evaluate repository');
      }

      setResult(data as EvaluationResult);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22c55e'; // green-500
    if (score >= 50) return '#eab308'; // yellow-500
    return '#ef4444'; // red-500
  };

  const renderBreakdownChart = (result: EvaluationResult) => {
    const data = [
      { name: 'Docs', value: result.breakdown.documentation },
      { name: 'Structure', value: result.breakdown.structure },
      { name: 'Quality', value: result.breakdown.code_quality },
      { name: 'Practices', value: result.breakdown.best_practices },
    ];

    return (
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={['#60a5fa', '#a78bfa', '#34d399', '#f472b6'][index]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
              itemStyle={{ color: '#fff' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-full mb-4">
            <Github className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            RepoRater AI
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto">
            Senior-level technical evaluation for your GitHub repositories. 
            Powered by Gemini 2.5.
          </p>
        </header>

        {/* Input Form */}
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
            <div className="relative flex items-center bg-slate-800 rounded-lg p-2 border border-slate-700 focus-within:border-indigo-500 transition-colors">
              <Search className="w-5 h-5 text-slate-400 ml-3" />
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/username/repository"
                className="w-full bg-transparent border-none focus:ring-0 text-slate-100 placeholder-slate-500 p-3"
              />
              <button
                type="submit"
                disabled={loading || !repoUrl}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-md font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Evaluate
              </button>
            </div>
          </form>
          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Results Area */}
        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-6">
            
            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Main Score Card */}
              <div className="md:col-span-1 bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <ShieldCheck className="w-24 h-24" />
                </div>
                <h3 className="text-slate-400 font-medium mb-2 uppercase tracking-wider text-sm">Overall Score</h3>
                <div className="relative flex items-center justify-center">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-slate-700"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke={getScoreColor(result.score)}
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={351.86}
                      strokeDashoffset={351.86 - (351.86 * result.score) / 100}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <span className="absolute text-4xl font-bold text-white">{result.score}</span>
                </div>
                <div className="mt-4 px-3 py-1 rounded-full bg-slate-700 text-xs font-semibold uppercase tracking-wide">
                  {result.context} Context
                </div>
              </div>

              {/* Breakdown Chart */}
              <div className="md:col-span-1 bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center">
                 <h3 className="text-slate-400 font-medium mb-4 uppercase tracking-wider text-sm">Category Breakdown</h3>
                 {renderBreakdownChart(result)}
                 <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs mt-2">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-400"></div>Docs</div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-violet-400"></div>Structure</div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400"></div>Code</div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-pink-400"></div>Best Practice</div>
                 </div>
              </div>

              {/* Summary Card */}
              <div className="md:col-span-1 bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-slate-400 font-medium mb-4 uppercase tracking-wider text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Executive Summary
                </h3>
                <p className="text-slate-300 leading-relaxed text-sm">
                  {result.summary}
                </p>
              </div>
            </div>

            {/* Detailed Lists Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Suggestions */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-indigo-400 font-bold mb-4 flex items-center gap-2 text-lg">
                  <Code2 className="w-5 h-5" />
                  Improvements
                </h3>
                <ul className="space-y-3">
                  {result.suggestions.map((item, idx) => (
                    <li key={idx} className="flex gap-3 text-slate-300 text-sm">
                      <div className="mt-1 min-w-[1.25rem] h-5 flex items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold">
                        {idx + 1}
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Production Gaps */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-pink-400 font-bold mb-4 flex items-center gap-2 text-lg">
                  <AlertCircle className="w-5 h-5" />
                  Production Gaps
                </h3>
                <ul className="space-y-3">
                  {result.production_gaps.map((item, idx) => (
                    <li key={idx} className="flex gap-3 text-slate-300 text-sm">
                      <div className="mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-2"></div>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;

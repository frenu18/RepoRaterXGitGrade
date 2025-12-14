import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? '' : 'http://localhost:3001');

function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!repoUrl.trim()) {
      setError('Please enter a GitHub repository URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post(`${BACKEND_URL}/evaluate`, {
        repoUrl: repoUrl.trim(),
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to evaluate repository');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            RepoRater AI
          </h1>
          <p className="text-slate-400 text-lg">
            Evaluate your GitHub repositories with AI-powered analysis
          </p>
        </header>

        <div className="bg-slate-800 rounded-xl p-8 shadow-2xl mb-8">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="Enter GitHub repository URL (e.g., https://github.com/owner/repo)"
              className="flex-1 px-6 py-4 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {loading ? 'Evaluating...' : 'Evaluate'}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500 rounded-lg p-6 mb-8">
            <p className="text-red-300 font-semibold">Error</p>
            <p className="text-red-200 mt-2">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold">Evaluation Results</h2>
                <div className="text-right">
                  <div className="text-sm text-slate-400 mb-1">Overall Score</div>
                  <div className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    {result.score}/100
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <span className="inline-block px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg font-semibold">
                  {result.context}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-1">Documentation</div>
                  <div className="text-2xl font-bold">{result.breakdown.documentation}/25</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-1">Structure</div>
                  <div className="text-2xl font-bold">{result.breakdown.structure}/25</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-1">Code Quality</div>
                  <div className="text-2xl font-bold">{result.breakdown.code_quality}/25</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-1">Best Practices</div>
                  <div className="text-2xl font-bold">{result.breakdown.best_practices}/25</div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-3">Summary</h3>
                <p className="text-slate-300 leading-relaxed">{result.summary}</p>
              </div>

              {result.suggestions && result.suggestions.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-3">Suggestions</h3>
                  <ul className="space-y-2">
                    {result.suggestions.map((suggestion, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-slate-300">
                        <span className="text-blue-400 mt-1">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.production_gaps && result.production_gaps.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-yellow-400">Production Gaps</h3>
                  <ul className="space-y-2">
                    {result.production_gaps.map((gap, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-slate-300">
                        <span className="text-yellow-400 mt-1">⚠</span>
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

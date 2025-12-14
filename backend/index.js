import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { Buffer } from 'node:buffer';
import { GoogleGenAI, Type } from '@google/genai';

// Load env vars
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

/* ---------------- HELPERS ---------------- */

// Extract owner & repo from GitHub URL
const extractRepoDetails = (url) => {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) throw new Error('Invalid GitHub URL');
  return {
    owner: match[1],
    repo: match[2].replace('.git', ''),
  };
};

// Fetch GitHub repo data
const fetchGithubData = async (owner, repo) => {
  const headers = process.env.GITHUB_TOKEN
    ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
    : {};

  const baseUrl = `https://api.github.com/repos/${owner}/${repo}`;

  try {
    const [metaRes, langRes, treeRes, readmeRes] = await Promise.allSettled([
      axios.get(baseUrl, { headers }),
      axios.get(`${baseUrl}/languages`, { headers }),
      axios
        .get(`${baseUrl}/git/trees/main?recursive=1`, { headers })
        .catch(() =>
          axios.get(`${baseUrl}/git/trees/master?recursive=1`, { headers })
        ),
      axios.get(`${baseUrl}/readme`, { headers }),
    ]);

    if (metaRes.status === 'rejected') {
      throw new Error('Repository not found or private');
    }

    const meta = metaRes.value.data;
    const languages = langRes.status === 'fulfilled' ? langRes.value.data : {};

    // File structure (limit depth + count)
    let file_structure = [];
    if (treeRes.status === 'fulfilled') {
      file_structure = treeRes.value.data.tree
        .filter((n) => n.type === 'blob' || n.type === 'tree')
        .map((n) => n.path)
        .filter((p) => p.split('/').length <= 3)
        .slice(0, 100);
    }

    // README
    let readme = '';
    if (readmeRes.status === 'fulfilled') {
      readme = Buffer.from(
        readmeRes.value.data.content,
        'base64'
      ).toString('utf-8').slice(0, 8000);
    }

    return {
      owner,
      repo,
      description: meta.description || '',
      stars: meta.stargazers_count,
      forks: meta.forks_count,
      open_issues: meta.open_issues_count,
      readme,
      file_structure,
      languages,
    };
  } catch (err) {
    console.error('GitHub API Error:', err.message);
    throw new Error('Failed to fetch repository data');
  }
};

// Simple repo context detection
const detectContext = (data) => {
  const dsaKeywords = [
    'leetcode',
    'hackerrank',
    'dsa',
    'algorithm',
    'solutions',
    'cp',
    'competitive',
  ];

  const isDSA = dsaKeywords.some(
    (k) =>
      data.repo.toLowerCase().includes(k) ||
      data.description.toLowerCase().includes(k)
  );

  if (isDSA) return 'DSA';

  const hasBackendConfig = data.file_structure.some((f) =>
    ['package.json', 'requirements.txt', 'go.mod', 'Cargo.toml'].some((c) =>
      f.includes(c)
    )
  );

  if (!hasBackendConfig && data.file_structure.length < 10) return 'DSA';

  return 'Backend';
};

/* ---------------- ROUTE ---------------- */

app.post('/evaluate', async (req, res) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) {
      return res.status(400).json({ error: 'Repo URL is required' });
    }

    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key missing' });
    }

    // Fetch repo data
    const { owner, repo } = extractRepoDetails(repoUrl);
    const repoData = await fetchGithubData(owner, repo);
    const context = detectContext(repoData);

    // Gemini 2.5 Flash (NEW SDK)
    const ai = new GoogleGenAI({ apiKey });

    // Try different model names
    const modelNames = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    let response;
    let lastError;

    for (const modelName of modelNames) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `
You are a Senior Staff Software Engineer.

CONTEXT: ${context}

Evaluate the GitHub repository and return ONLY valid JSON in this format:
{
  "context": "DSA | Backend",
  "score": number,
  "breakdown": {
    "documentation": number,
    "structure": number,
    "code_quality": number,
    "best_practices": number
  },
  "summary": string,
  "suggestions": string[],
  "production_gaps": string[]
}

Repository Data:
Owner: ${repoData.owner}
Repo: ${repoData.repo}
Description: ${repoData.description}
Languages: ${JSON.stringify(repoData.languages)}
File Structure: ${JSON.stringify(repoData.file_structure)}
README: ${repoData.readme}
`
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            context: { type: Type.STRING },
            score: { type: Type.INTEGER },
            breakdown: {
              type: Type.OBJECT,
              properties: {
                documentation: { type: Type.INTEGER },
                structure: { type: Type.INTEGER },
                code_quality: { type: Type.INTEGER },
                best_practices: { type: Type.INTEGER },
              },
            },
            summary: { type: Type.STRING },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            production_gaps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            'context',
            'score',
            'breakdown',
            'summary',
            'suggestions',
            'production_gaps',
          ],
        },
      },
        });
        console.log(`Successfully using model: ${modelName}`);
        break; // Success, exit loop
      } catch (err) {
        lastError = err;
        console.log(`Model ${modelName} failed: ${err.message}`);
        // Continue to next model
      }
    }

    if (!response) {
      return res.status(500).json({ 
        error: 'Failed to connect to any Gemini model',
        details: lastError?.message || 'Unknown error'
      });
    }

    const text = response.text;
    if (!text) {
      return res.status(500).json({ error: 'AI failed to respond' });
    }

    res.json(JSON.parse(text));
  } catch (err) {
    console.error('Handler Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- START SERVER ---------------- */

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

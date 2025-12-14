import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { Buffer } from 'node:buffer';
import { GoogleGenAI, Type } from '@google/genai';

// Initialize environment
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Type Definitions
interface RepoData {
  owner: string;
  repo: string;
  description: string;
  stars: number;
  forks: number;
  open_issues: number;
  readme: string;
  file_structure: string[];
  languages: Record<string, number>;
  has_package_json: boolean;
}

// Helper: Extract owner and repo from URL
const extractRepoDetails = (url: string) => {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) throw new Error('Invalid GitHub URL');
  return { owner: match[1], repo: match[2].replace('.git', '') };
};

// Helper: Fetch Repo Data from GitHub
const fetchGithubData = async (owner: string, repo: string): Promise<RepoData> => {
  const headers = process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {};
  const baseUrl = `https://api.github.com/repos/${owner}/${repo}`;

  try {
    const [metaRes, langRes, treeRes, readmeRes] = await Promise.allSettled([
      axios.get(baseUrl, { headers }),
      axios.get(`${baseUrl}/languages`, { headers }),
      // Get file tree (recursive 2 levels deep approx, using recursive=1 usually gives full tree but we limit in prompt)
      axios.get(`${baseUrl}/git/trees/main?recursive=1`, { headers }).catch(() => 
        axios.get(`${baseUrl}/git/trees/master?recursive=1`, { headers })
      ),
      axios.get(`${baseUrl}/readme`, { headers })
    ]);

    if (metaRes.status === 'rejected') throw new Error('Repository not found or private');
    
    const meta = metaRes.value.data;
    const languages = langRes.status === 'fulfilled' ? langRes.value.data : {};
    
    // Process File Tree
    let file_structure: string[] = [];
    if (treeRes.status === 'fulfilled') {
      file_structure = treeRes.value.data.tree
        .filter((node: any) => node.type === 'blob' || node.type === 'tree')
        .map((node: any) => node.path)
        .filter((path: string) => path.split('/').length <= 3) // Limit depth to reduce token usage
        .slice(0, 100); // Limit total files
    }

    // Process Readme
    let readme = '';
    if (readmeRes.status === 'fulfilled') {
      readme = Buffer.from(readmeRes.value.data.content, 'base64').toString('utf-8').slice(0, 8000); // Truncate
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
      has_package_json: file_structure.includes('package.json')
    };
  } catch (error: any) {
    console.error("GitHub API Error:", error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch repository data');
  }
};

// Helper: Simple Heuristic for Context
const detectContext = (data: RepoData): string => {
  const dsaKeywords = ['leetcode', 'hackerrank', 'dsa', 'algorithm', 'solutions', 'cp', 'competitive'];
  const isDsaName = dsaKeywords.some(k => data.repo.toLowerCase().includes(k) || data.description?.toLowerCase().includes(k));
  
  if (isDsaName) return 'DSA';
  
  // If mostly simple script files and no config
  const hasBackendConfig = data.file_structure.some(f => 
    f.includes('package.json') || f.includes('requirements.txt') || f.includes('go.mod') || f.includes('Cargo.toml')
  );
  
  if (!hasBackendConfig && data.file_structure.length < 10) return 'DSA';
  
  return 'Backend'; // Default to Project/Backend for evaluation depth
};

// Route
app.post('/evaluate', async (req, res) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) {
      res.status(400).json({ error: 'Repo URL is required' });
      return;
    }

    // 1. Fetch Data
    const { owner, repo } = extractRepoDetails(repoUrl);
    const repoData = await fetchGithubData(owner, repo);
    const context = detectContext(repoData);

    // 2. Prepare Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const systemPrompt = `
      You are a world-class Senior Staff Software Engineer and Technical Interviewer.
      Your job is to strictly evaluate a GitHub repository based on the provided metadata, file structure, and README.
      
      CONTEXT: This repository is identified as: ${context}.
      
      SCORING RUBRIC:
      - If DSA: Focus on algorithm efficiency, clean code, naming conventions, and solution variety.
      - If Backend/Project: Focus on architecture, separation of concerns, error handling, documentation, and scalability.
      
      OUTPUT REQUIREMENTS:
      - Be critical but constructive.
      - "Score" is 0-100. 90+ is FAANG production ready. 50 is average student project.
      - "Production Gaps" must be specific missing features (e.g., "Missing unit tests", "No CI/CD pipeline", "Secrets committed").
      - Return ONLY valid JSON.
    `;

    const userPrompt = `
      Evaluate this repository:
      Owner: ${repoData.owner}
      Repo: ${repoData.repo}
      Description: ${repoData.description}
      Languages: ${JSON.stringify(repoData.languages)}
      File Structure (partial): ${JSON.stringify(repoData.file_structure)}
      README Preview: ${repoData.readme}
    `;

    // 3. Call Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + "\n" + userPrompt }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            context: { type: Type.STRING, enum: ["DSA", "Backend", "Frontend", "Project"] },
            score: { type: Type.INTEGER },
            breakdown: {
              type: Type.OBJECT,
              properties: {
                documentation: { type: Type.INTEGER },
                structure: { type: Type.INTEGER },
                code_quality: { type: Type.INTEGER },
                best_practices: { type: Type.INTEGER }
              },
              required: ["documentation", "structure", "code_quality", "best_practices"]
            },
            summary: { type: Type.STRING },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            production_gaps: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["context", "score", "breakdown", "summary", "suggestions", "production_gaps"]
        }
      }
    });

    // 4. Send Response
    // The SDK guarantees valid JSON string in response.text if schema is used
    if (response.text) {
      const jsonResponse = JSON.parse(response.text);
      res.json(jsonResponse);
    } else {
      res.status(500).json({ error: 'Failed to generate content' });
    }

  } catch (error: any) {
    console.error('Handler Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
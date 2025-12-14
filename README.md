# RepoRater AI

A minimal, full-stack GitHub repository evaluator using React, Node.js, and Google Gemini.

## Prerequisites

1.  **Google Gemini API Key**: Get one from AI Studio.
2.  **GitHub Token** (Optional but recommended): Personal Access Token to avoid rate limits.
3.  **Node.js 18+**

## Local Setup

### 1. Backend

1.  Navigate to `backend/`:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in `backend/`:
    ```
    API_KEY=your_gemini_api_key
    GEMINI_API_KEY=your_gemini_api_key
    GITHUB_TOKEN=your_github_token
    PORT=3001
    ```
4.  Run the server:
    ```bash
    npm start
    ```
    The server will run on `http://localhost:3001`

### 2. Frontend

1.  In the project root:
    ```bash
    npm install
    ```
2.  Run the frontend:
    ```bash
    npm run dev
    ```
    The frontend will run on `http://localhost:3000` and automatically proxy API requests to the backend.

### 3. Running Both

Open two terminal windows:
- Terminal 1: `cd backend && npm start`
- Terminal 2: `npm run dev`

Then open `http://localhost:3000` in your browser.

## Deployment Guide (Quick)

### Backend (Railway)
1.  Push code to GitHub.
2.  Connect Railway to the repo.
3.  Set Root Directory to `backend/`.
4.  Add variables: `API_KEY`, `GITHUB_TOKEN`.
5.  Start command: `npx ts-node index.ts`.

### Frontend (Vercel)
1.  Connect Vercel to the repo.
2.  Set Root Directory to `/` (default).
3.  **Crucial**: Update `BACKEND_URL` in `App.tsx` to your deployed Railway URL before pushing, or use an Environment Variable `VITE_BACKEND_URL`.

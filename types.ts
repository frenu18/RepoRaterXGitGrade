export interface EvaluationBreakdown {
  documentation: number;
  structure: number;
  code_quality: number;
  best_practices: number;
}

export interface EvaluationResult {
  context: 'DSA' | 'Backend' | 'Frontend' | 'Project';
  score: number;
  breakdown: EvaluationBreakdown;
  summary: string;
  suggestions: string[];
  production_gaps: string[];
}

export interface APIError {
  error: string;
  details?: string;
}

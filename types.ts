export interface UserProfile {
  name: string;
  role: string;
  level: number;
  xp: number;
  streak: number;
  dailyGoal: boolean;
  hasOnboarded?: boolean;
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export enum AnalysisStatus {
  IDLE,
  RECORDING,
  ANALYZING,
  COMPLETE,
  ERROR
}

export interface ListeningScenario {
  id: string;
  title: string;
  description: string;
  transcript: string;
  audioDuration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  questions: {
    id: number;
    question: string;
    options: string[];
    correctAnswer: number;
  }[];
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  xp: number;
  isUser: boolean;
}
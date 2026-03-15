export type ResearchType = 'usability' | 'discovery' | 'concept' | 'expert' | 'jtbd' | 'longitudinal';
export type InputMethod = 'audio' | 'audio-video' | 'video-screenshare';
export type StudyStatus = 'draft' | 'active' | 'completed' | 'paused';

export interface Question {
  id: string;
  text: string;
  mediaUrls?: string[];
  type?: 'open' | 'multiple-choice' | 'binary-choice';
  options?: string[];
}

export interface MainQuestion {
  id: string;
  text: string;
  followUps: string[];
  mediaUrls?: string[];
  type?: 'open' | 'multiple-choice' | 'binary-choice';
  options?: string[];
}

export interface ResearchGuide {
  preScreen: Question[];
  mainQuestions: MainQuestion[];
  exitQuestions: Question[];
}

export interface TranscriptEntry {
  role: 'agent' | 'participant';
  text: string;
  translatedText?: string;
  timestamp: string;
  videoTimestamp?: number;
  questionIndex?: number;
  isFollowUp?: boolean;
}

export interface ParticipantResponse {
  id: string;
  participantName: string;
  completedAt: string;
  transcript: TranscriptEntry[];
  videoPath?: string;
  videoDuration?: number;
  screenedOut: boolean;
  sentiment?: 'Positive' | 'Neutral' | 'Negative';
  sentimentScore?: number;
}

export interface Study {
  id: string;
  name: string;
  type: ResearchType;
  goals: string;
  audience: string;
  inputMethod: InputMethod;
  experienceMode: 'turn-taking' | 'live';
  maxQuestions: number;
  maxFollowUps: number;
  smartSkipping: boolean;
  guide: ResearchGuide;
  responses: ParticipantResponse[];
  createdAt: string;
  status: StudyStatus;
  analysis?: {
    insights: AnalysisInsight[];
    topTakeaways: string[];
    updatedAt: string;
  };
}

export interface AnalysisInsight {
  id: string;
  theme: string;
  summary: string;
  confidence: number;
  quotes: AnalysisQuote[];
}

export interface AnalysisQuote {
  participantId: string;
  participantName: string;
  text: string;
  videoTimestamp?: number;
  videoPath?: string;
}

export interface StudyAnalysis {
  responseRate: number;
  totalParticipants: number;
  completedInterviews: number;
  avgDuration: number;
  insights: AnalysisInsight[];
  updatedAt: string;
}

export const RESEARCH_TYPES: Record<ResearchType, { label: string; description: string; icon: string }> = {
  usability: { label: 'Usability Testing', description: 'Evaluating existing interfaces', icon: 'MonitorSmartphone' },
  discovery: { label: 'Discovery Research', description: 'Early-stage problem definition', icon: 'Compass' },
  concept: { label: 'Concept Validation', description: 'Validating direction before building', icon: 'Lightbulb' },
  expert: { label: 'Expert Interview', description: 'Domain understanding and benchmarking', icon: 'GraduationCap' },
  jtbd: { label: 'Jobs to Be Done', description: 'Positioning and product strategy', icon: 'Target' },
  longitudinal: { label: 'Longitudinal Study', description: 'Measuring adoption and change', icon: 'TrendingUp' },
};

export interface SupportedLanguage {
  code: string;
  label: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en-US', label: 'English' },
  { code: 'es-ES', label: 'Español (Spanish)' },
  { code: 'fr-FR', label: 'Français (French)' },
  { code: 'de-DE', label: 'Deutsch (German)' },
  { code: 'it-IT', label: 'Italiano (Italian)' },
  { code: 'ja-JP', label: '日本語 (Japanese)' },
  { code: 'ko-KR', label: '한국어 (Korean)' },
  { code: 'pt-BR', label: 'Português (Portuguese)' },
  { code: 'zh-CN', label: '中文 (Mandarin)' },
  { code: 'hi-IN', label: 'हिन्दी (Hindi)' },
  { code: 'ru-RU', label: 'Русский (Russian)' },
];

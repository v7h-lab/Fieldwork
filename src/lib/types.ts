export type ResearchType = 'usability' | 'discovery' | 'concept' | 'expert' | 'jtbd' | 'longitudinal';
export type InputMethod = 'audio' | 'audio-video' | 'video-screenshare';
export type StudyStatus = 'draft' | 'active' | 'completed';

export interface Question {
  id: string;
  text: string;
}

export interface MainQuestion {
  id: string;
  text: string;
  followUps: string[];
}

export interface ResearchGuide {
  preScreen: Question[];
  mainQuestions: MainQuestion[];
  exitQuestions: Question[];
}

export interface TranscriptEntry {
  role: 'agent' | 'participant';
  text: string;
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
}

export interface Study {
  id: string;
  name: string;
  type: ResearchType;
  goals: string;
  audience: string;
  inputMethod: InputMethod;
  mediaUrls?: string[];
  maxQuestions: number;
  maxFollowUps: number;
  guide: ResearchGuide;
  responses: ParticipantResponse[];
  createdAt: string;
  status: StudyStatus;
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

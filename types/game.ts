export interface TranscriptMessage {
  sender: 'dispatcher' | 'caller' | 'system' | 'warning';
  text: string;
  timestamp: string;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
}

export interface FeedbackInfo {
  status: 'SUCCESS' | 'MINOR_ERROR' | 'CRITICAL_FAILURE';
  message: string;
  dispatchType: string;
  dialogueScore: number;
  dispatchScore: number;
  totalCallScore: number;
}

import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export interface Drill {
  name: string;
  description: string;
}

export interface MechanicAnalysis {
  component: string;
  rating: number;
  critique: string;
  keyTakeaway: string;
  annotatedImage?: string; // base64 encoded image string
}

export interface AnalysisReportData {
  overallSummary: string;
  mechanics: MechanicAnalysis[];
  drills: Drill[];
}

// Defines the structure for programmatically identified key moments in the serve.
export interface KeyMoments {
    [eventName:string]: number | null;
}

export interface LandmarkFrame {
  time: number;
  landmarks: NormalizedLandmark[];
}

export type PoseData = LandmarkFrame[];

export interface ServeHistoryItem {
  id?: number; // Auto-incremented by IndexedDB
  videoBlob: Blob;
  analysisReport: AnalysisReportData;
  poseData: PoseData;
  date: Date;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
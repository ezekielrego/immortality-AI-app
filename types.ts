export interface PersonaProfile {
  id: string;
  name: string;
  relationship: string;
  avatarUrl: string | null; // Base64 string for local storage
  personalityTraits: string[];
  keyMemories: string[];
  voiceStyle: string;
  systemInstruction: string;
  createdAt: number;
}

export interface MemoryFile {
  id: string;
  name: string;
  type: 'chat_export' | 'video' | 'audio' | 'text';
  status: 'pending' | 'analyzing' | 'processed' | 'error';
  content?: string; // For text
  summary?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export enum AppView {
  HOME = 'HOME',
  CREATE_PROFILE = 'CREATE_PROFILE',
  PROFILE_DASHBOARD = 'PROFILE_DASHBOARD',
  PROFILE_CHAT = 'PROFILE_CHAT',
  PROFILE_CALL = 'PROFILE_CALL',
  ABOUT = 'ABOUT',
  SETTINGS = 'SETTINGS',
}

export interface PersonaTemplate {
  id: string;
  label: string;
  icon: string;
  traits: string[];
  desc: string;
  defaultVoice: string;
}

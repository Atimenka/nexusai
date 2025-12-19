
export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  imageUrl?: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export interface AppSettings {
  systemRule: string;
  globalKnowledge: string;
  temperature: number; // 0 to 1
  creativeLevel: 'Stable' | 'Balanced' | 'Chaos';
}

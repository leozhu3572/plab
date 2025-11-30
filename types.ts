export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Material {
  id: string;
  name: string;
  type: string; // mime type
  data: string; // base64
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  attachments?: Material[];
}

export interface Thread {
  id: string;
  title: string; // The main argument topic
  messages: Message[];
  tokenUsage?: number; // Estimated
}

export interface Case {
  id: string;
  title: string;
  background: string;
  materials: Material[];
  threads: Thread[];
  createdAt: number;
  lastUpdated: number;
}

export type ViewState = 'HOME' | 'CREATE_CASE' | 'CASE_DETAIL' | 'EDIT_CASE';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
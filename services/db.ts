
import { User, ChatSession, AppSettings, Message } from '../types';
import { STORAGE_KEYS, DEFAULT_SYSTEM_RULE } from '../constants';

const safeSave = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving to storage [${key}]:`, e);
  }
};

export const db = {
  getUsers: (): User[] => {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  },

  saveUser: (user: User) => {
    const users = db.getUsers();
    users.push(user);
    safeSave(STORAGE_KEYS.USERS, users);
  },

  getChats: (userId: string): ChatSession[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHATS);
      if (!data) return [];
      const allChats: ChatSession[] = JSON.parse(data);
      return allChats
        .filter(chat => chat.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {
      console.error("Failed to parse chats:", e);
      return [];
    }
  },

  saveChat: (chat: ChatSession) => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHATS);
      let allChats: ChatSession[] = data ? JSON.parse(data) : [];
      const index = allChats.findIndex(c => c.id === chat.id);
      
      if (index >= 0) {
        allChats[index] = { ...chat };
      } else {
        allChats.push({ ...chat });
      }
      
      safeSave(STORAGE_KEYS.CHATS, allChats);
    } catch (e) {
      console.error("Save chat failed:", e);
    }
  },

  deleteChat: (chatId: string) => {
    const data = localStorage.getItem(STORAGE_KEYS.CHATS);
    const allChats: ChatSession[] = data ? JSON.parse(data) : [];
    const filtered = allChats.filter(c => c.id !== chatId);
    safeSave(STORAGE_KEYS.CHATS, filtered);
  },

  getSettings: (): AppSettings => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) return { 
        systemRule: DEFAULT_SYSTEM_RULE, 
        globalKnowledge: "", 
        temperature: 0.7, 
        creativeLevel: 'Balanced' 
      };
      return JSON.parse(data);
    } catch (e) {
      return { 
        systemRule: DEFAULT_SYSTEM_RULE, 
        globalKnowledge: "", 
        temperature: 0.7, 
        creativeLevel: 'Balanced' 
      };
    }
  },

  updateSettings: (settings: AppSettings) => {
    safeSave(STORAGE_KEYS.SETTINGS, settings);
  },

  exportAllData: (userId: string) => {
    const chats = db.getChats(userId);
    const settings = db.getSettings();
    const exportObj = { version: "5.2.1", userId, chats, settings };
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `nexus_backup_${userId}.json`; a.click();
    URL.revokeObjectURL(url);
  }
};

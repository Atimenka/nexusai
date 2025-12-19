
import React, { useState, useEffect } from 'react';
import { User } from './types';
import Auth from './components/Auth';
import Chat from './components/Chat';
import { STORAGE_KEYS } from './constants';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (saved) {
      setCurrentUser(JSON.parse(saved));
    }
    setLoading(false);
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#0d1117]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {!currentUser ? (
        <Auth onLogin={handleLogin} />
      ) : (
        <Chat user={currentUser} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default App;

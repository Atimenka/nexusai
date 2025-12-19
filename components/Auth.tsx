
import React, { useState } from 'react';
import { User } from '../types';
import { db } from '../services/db';
import { ADMIN_USERNAME, ADMIN_PASSWORD } from '../constants';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    // Special Developer Account Check
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const devUser: User = { id: 'admin-001', username: ADMIN_USERNAME, isAdmin: true };
      onLogin(devUser);
      return;
    }

    if (isLogin) {
      const users = db.getUsers();
      const user = users.find(u => u.username === username);
      if (user) {
        // In a real app we'd verify password, here we just login for demo simplicity
        onLogin(user);
      } else {
        setError('User not found or incorrect credentials');
      }
    } else {
      const users = db.getUsers();
      if (users.some(u => u.username === username)) {
        setError('Username already exists');
        return;
      }
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        username,
        isAdmin: false
      };
      db.saveUser(newUser);
      onLogin(newUser);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-[#0d1117] px-4">
      <div className="max-w-md w-full bg-[#161b22] border border-[#30363d] rounded-xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
            <i className="fas fa-microchip text-3xl text-white"></i>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">NexusAI</h1>
          <p className="text-gray-400 mt-2 text-center">Your gateway to the next generation of AI</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm flex items-center">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Username</label>
            <input
              type="text"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Password</label>
            <input
              type="password"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
          >
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#30363d] text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Secure Access • Powered by Nexus Core</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;

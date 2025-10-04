import React from 'react';
import { TennisBallIcon } from './icons/TennisBallIcon';
import { HistoryIcon } from './icons/HistoryIcon';

interface HeaderProps {
  onShowHistory: () => void;
}

const Header: React.FC<HeaderProps> = ({ onShowHistory }) => {
  return (
    <header className="w-full max-w-4xl text-center relative">
      <div className="flex items-center justify-center gap-4 mb-2">
        <TennisBallIcon className="w-12 h-12 text-green-400" />
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
          AI Tennis Serve Coach
        </h1>
      </div>
      <p className="text-lg text-gray-300">
        Upload your serve and get instant, world-class analysis.
      </p>
      <button 
        onClick={onShowHistory}
        className="absolute top-0 right-0 mt-2 mr-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
        title="View Serve History"
      >
        <HistoryIcon className="w-5 h-5" />
        <span className="hidden sm:inline">Serve History</span>
      </button>
    </header>
  );
};

export default Header;
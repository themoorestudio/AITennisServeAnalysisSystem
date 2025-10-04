import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/dbService';
import type { ServeHistoryItem } from '../types';
import { XIcon } from './icons/XIcon';
import { TennisBallIcon } from './icons/TennisBallIcon';
import { TrashIcon } from './icons/TrashIcon';

interface ServeHistoryProps {
  onClose: () => void;
  onLoadServe: (serve: ServeHistoryItem) => void;
}

const ServeHistory: React.FC<ServeHistoryProps> = ({ onClose, onLoadServe }) => {
  const serves = useLiveQuery(() => db.serves.orderBy('date').reverse().toArray());

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this saved serve?')) {
        try {
            await db.serves.delete(id);
        } catch (error) {
            console.error('Failed to delete serve:', error);
            alert('Could not delete the serve.');
        }
    }
  }

  const getAverageRating = (serve: ServeHistoryItem): string => {
      if (!serve.analysisReport?.mechanics || serve.analysisReport.mechanics.length === 0) {
          return "N/A";
      }
      const total = serve.analysisReport.mechanics.reduce((acc, mech) => acc + mech.rating, 0);
      return (total / serve.analysisReport.mechanics.length).toFixed(1);
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-gray-900 border border-gray-700 rounded-xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-2xl font-bold text-white">Serve History</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors z-10"
            aria-label="Close history view"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </header>
        
        <main className="p-6 overflow-y-auto">
          {(!serves || serves.length === 0) && (
            <div className="text-center py-12">
              <TennisBallIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-300">No Saved Serves</h3>
              <p className="text-gray-500 mt-1">Your saved analyses will appear here.</p>
            </div>
          )}
          <div className="space-y-4">
            {serves?.map(serve => (
              <div key={serve.id} className="bg-gray-800/70 p-4 rounded-lg flex items-center justify-between gap-4 hover:bg-gray-700/70 transition-colors">
                <div className="flex items-center gap-4 flex-grow">
                  <div className="text-center flex-shrink-0 w-16">
                      <div className="text-2xl font-bold text-green-400">{getAverageRating(serve)}</div>
                      <div className="text-xs text-gray-400">Avg. Score</div>
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      Serve from {serve.date.toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-400">
                      {serve.date.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button 
                    onClick={() => onLoadServe(serve)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm"
                  >
                    View
                  </button>
                  <button 
                    onClick={() => handleDelete(serve.id!)}
                    className="p-2 bg-red-800/50 hover:bg-red-700/50 text-red-300 hover:text-white rounded-lg transition-colors"
                    title="Delete Serve"
                  >
                    <TrashIcon className="w-5 h-5"/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
      <style>{`
        @keyframes fade-in-fast {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .animate-fade-in-fast {
            animation: fade-in-fast 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ServeHistory;
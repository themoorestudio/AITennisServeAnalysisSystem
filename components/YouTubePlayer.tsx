import React from 'react';

interface YouTubePlayerProps {
  videoId: string;
  onConfirmAnalysis: () => void;
  onCancel: () => void;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ videoId, onConfirmAnalysis, onCancel }) => {
  return (
    <div className="w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 sm:p-8 shadow-2xl text-center">
      <h3 className="text-xl font-semibold text-white mb-4">Confirm Your Video</h3>
      <div className="aspect-video rounded-lg overflow-hidden border-2 border-gray-600 mb-6 bg-black">
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <button
          onClick={onCancel}
          className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-all duration-200 ease-in-out"
        >
          Cancel
        </button>
        <button
          onClick={onConfirmAnalysis}
          className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-all duration-200 ease-in-out shadow-lg transform hover:scale-105"
        >
          Confirm & Analyze Video
        </button>
      </div>
    </div>
  );
};

export default YouTubePlayer;
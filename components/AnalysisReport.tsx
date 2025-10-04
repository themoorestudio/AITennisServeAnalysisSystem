import React, { useState, useRef, useEffect } from 'react';
import type { AnalysisReportData, ChatMessage, PoseData } from '../types';
import { drawSinglePose } from '../services/poseService';
import DrillCard from './DrillCard';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { SaveIcon } from './icons/SaveIcon';
import { SendIcon } from './icons/SendIcon';
import { TennisBallIcon } from './icons/TennisBallIcon';

interface AnalysisReportProps {
  report: AnalysisReportData;
  onReset: () => void;
  videoPreviewUrl: string | null;
  poseData: PoseData | null;
  onSave: () => void;
  chatHistory: ChatMessage[];
  isChatLoading: boolean;
  onSendChatMessage: (message: string) => void;
}

const AnalysisReport: React.FC<AnalysisReportProps> = ({ 
  report, 
  onReset, 
  videoPreviewUrl, 
  poseData, 
  onSave,
  chatHistory,
  isChatLoading,
  onSendChatMessage
}) => {
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isSaved, setIsSaved] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chatInput, setChatInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isChatLoading]);


  const clearCanvas = () => {
      if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
  }

  const handleTimestampClick = async (time: number) => {
    if (videoRef.current && canvasRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.pause();

      if (poseData && poseData.length > 0) {
        const closestFrame = poseData.reduce((prev, curr) => 
            Math.abs(curr.time - time) < Math.abs(prev.time - time) ? curr : prev
        );
        if (closestFrame) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            await drawSinglePose(closestFrame.landmarks, canvasRef.current);
        }
      }
    }
  };
  
  const handleSaveClick = () => {
      onSave();
      setIsSaved(true);
  }

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() && !isChatLoading) {
      onSendChatMessage(chatInput.trim());
      setChatInput('');
    }
  };

  const parseCritique = (critique: string) => {
    const regex = /\[t=([\d.]+)s\]/g;
    const parts = critique.split(regex);

    return parts.map((part, index) => {
      if (index % 2 === 1) {
        const time = parseFloat(part);
        if (isNaN(time)) return part;
        return (
          <button
            key={index}
            onClick={() => handleTimestampClick(time)}
            className="inline-block mx-1 text-green-400 font-bold bg-green-900/50 px-2 py-0.5 rounded-md hover:bg-green-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
            title={`Jump to ${time.toFixed(2)}s`}
          >
            ▶ {time.toFixed(2)}s
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 sm:p-8 shadow-2xl animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white">Your Serve Analysis</h2>
          <p className="text-gray-400 mt-1">Here's Coach AI's breakdown of your serve.</p>
        </div>
        <div className="flex items-center gap-2">
            {videoPreviewUrl && (
                 <button onClick={handleSaveClick} disabled={isSaved} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800/50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors">
                    <SaveIcon className="w-5 h-5"/> {isSaved ? 'Saved!' : 'Save Serve'}
                 </button>
            )}
            <button onClick={onReset} className="flex-shrink-0 px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors">
                Analyze Another
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {videoPreviewUrl && (
            <div className="sticky top-8">
              <h3 className="text-xl font-bold text-white mb-3">Your Video</h3>
              <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-gray-600 bg-black">
                <video ref={videoRef} src={videoPreviewUrl} controls className="w-full h-full object-contain" onPlay={clearCanvas}></video>
                <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"></canvas>
              </div>
              <div className="mt-2 flex justify-center gap-2">
                  {[0.25, 0.5, 0.75, 1].map(rate => (
                      <button key={rate} onClick={() => setPlaybackRate(rate)} className={`px-4 py-1 text-sm font-semibold rounded-md transition-colors ${playbackRate === rate ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                          {rate === 1 ? 'Normal' : `${rate}x`}
                      </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 space-y-8">
          <div>
            <h3 className="text-xl font-bold text-white mb-3">Overall Summary</h3>
            <div className="bg-gray-900/60 p-5 rounded-lg border border-gray-700">
              <p className="text-gray-300 whitespace-pre-line">{report.overallSummary}</p>
            </div>
          </div>
        
          <div>
            <h3 className="text-xl font-bold text-white mb-3">Mechanics Breakdown</h3>
            <div className="space-y-6">
              {report.mechanics.map((mechanic, index) => (
                <div key={index} className="bg-gray-900/60 p-5 rounded-lg border border-gray-700">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-lg font-bold text-green-300">{mechanic.component}</h4>
                      <div className="flex items-center gap-2 text-white font-bold text-lg flex-shrink-0 ml-4">
                        <span>{mechanic.rating}</span>
                        <span className="text-gray-500">/ 10</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
                      <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${mechanic.rating * 10}%` }}></div>
                    </div>
                    
                    <p className="text-gray-300 mb-4 whitespace-pre-line">{parseCritique(mechanic.critique)}</p>

                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="flex items-start gap-3">
                        <CheckCircleIcon className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h5 className="font-semibold text-yellow-400">Key Takeaway</h5>
                          <p className="text-gray-300">{mechanic.keyTakeaway}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white mb-3">Recommended Drills</h3>
            <div className="space-y-4">
              {report.drills.map((drill, index) => (
                <DrillCard key={index} drill={drill} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white mb-3">Ask Coach AI</h3>
            <div className="bg-gray-900/60 rounded-lg border border-gray-700 flex flex-col h-[500px]">
              <div ref={chatContainerRef} className="flex-grow p-4 space-y-4 overflow-y-auto">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-800 flex items-center justify-center">
                    <TennisBallIcon className="w-5 h-5 text-green-300" />
                  </div>
                  <div className="bg-gray-700/80 p-3 rounded-lg max-w-md">
                    <p className="text-sm text-gray-200">
                      Got questions about this analysis? Ask me anything! For example: "How can I improve my toss stability?"
                    </p>
                  </div>
                </div>

                {chatHistory.map((msg, index) => (
                  <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role === 'model' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-800 flex items-center justify-center">
                        <TennisBallIcon className="w-5 h-5 text-green-300" />
                      </div>
                    )}
                    <div className={`p-3 rounded-lg max-w-md ${msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-700/80'}`}>
                       <p className="text-sm text-white whitespace-pre-line">{msg.text}</p>
                    </div>
                  </div>
                ))}
                
                {isChatLoading && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-800 flex items-center justify-center">
                      <TennisBallIcon className="w-5 h-5 text-green-300" />
                    </div>
                    <div className="bg-gray-700/80 p-3 rounded-lg">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-700">
                <form onSubmit={handleChatSubmit} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a follow-up question..."
                    disabled={isChatLoading}
                    className="w-full px-4 py-2 bg-gray-800 border-2 border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isChatLoading || !chatInput.trim()}
                    className="flex-shrink-0 w-12 h-12 bg-green-500 hover:bg-green-600 disabled:bg-green-800/50 disabled:cursor-not-allowed text-white font-bold rounded-full transition-all flex items-center justify-center"
                    aria-label="Send message"
                  >
                    <SendIcon className="w-6 h-6"/>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fade-in 0.5s ease-out forwards;
        }
        .delay-75 { animation-delay: 75ms; }
        .delay-150 { animation-delay: 150ms; }
      `}</style>
    </div>
  );
};

export default AnalysisReport;
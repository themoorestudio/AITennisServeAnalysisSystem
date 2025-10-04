import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import AnalysisReport from './components/AnalysisReport';
import Loader from './components/Loader';
import { analyzeServe, analyzeServeFromUrl, askFollowUpQuestion } from './services/geminiService';
import type { AnalysisReportData, KeyMoments, ServeHistoryItem, ChatMessage, PoseData } from './types';
import YouTubePlayer from './components/YouTubePlayer';
import LiveRecorder from './components/LiveRecorder';
import ServeHistory from './components/ServeHistory';
import { db } from './services/dbService';

const getYouTubeId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const App: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisReportData | null>(null);
  const [poseData, setPoseData] = useState<PoseData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setVideoPreviewUrl(null);
  }, [videoFile]);

  const handleFileSelect = (file: File | null) => {
    setVideoFile(file);
    if (file) setYoutubeUrl(''); // Clear other input
    setAnalysisResult(null);
    setError(null);
    setPoseData(null);
  };

  const handleUrlChange = (url: string) => {
    setYoutubeUrl(url);
    if (url) setVideoFile(null); // Clear other input
    setAnalysisResult(null);
    setError(null);
    setPoseData(null);
  }

  const handleAnalyze = useCallback(async (inputType: 'file' | 'url', newPoseData?: PoseData, keyMoments?: KeyMoments) => {
    setError(null);
    setAnalysisResult(null);
    setChatHistory([]);

    if (inputType === 'file') {
      if (!videoFile) {
        setError('Please select a video file first.');
        return;
      }
      setPoseData(newPoseData ?? null); // Persist pose data
      setIsLoading(true);
      try {
        const result = await analyzeServe(videoFile, newPoseData ?? null, keyMoments ?? null);
        setAnalysisResult(result);
        setChatHistory([]);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred during analysis.');
      } finally {
        setIsLoading(false);
        // Do not reset video file here, so it can be shown with the report
      }
    } else if (inputType === 'url') {
      if (!youtubeUrl) {
        setError('Please enter a YouTube URL first.');
        return;
      }
      const videoId = getYouTubeId(youtubeUrl);
      if (videoId) {
        setVideoFile(null); // Clear file input
        setYoutubeVideoId(videoId);
      } else {
        setError('Please enter a valid YouTube URL.');
      }
    }
  }, [videoFile, youtubeUrl]);

  const handleConfirmUrlAnalysis = async () => {
    if (!youtubeUrl) return;

    setYoutubeVideoId(null);
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setChatHistory([]);

    try {
      const result = await analyzeServeFromUrl(youtubeUrl);
      setAnalysisResult(result);
      setChatHistory([]);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during analysis.');
    } finally {
      setIsLoading(false);
      setYoutubeUrl(''); // Reset after analysis
    }
  };

  const handleStartRecording = () => {
    setIsRecording(true);
  };

  const handleCancelRecording = () => {
    setIsRecording(false);
  };

  const handleRecordingComplete = (file: File) => {
    setIsRecording(false);
    handleFileSelect(file);
  };

  const handleSaveServe = async () => {
    if (!videoFile || !analysisResult || !poseData) {
      alert("Cannot save. Missing video, analysis, or pose data.");
      return;
    }
    try {
      await db.serves.add({
        videoBlob: videoFile,
        analysisReport: analysisResult,
        poseData: poseData,
        date: new Date(),
      });
      alert("Serve saved successfully!");
    } catch (err) {
      console.error("Failed to save serve:", err);
      alert("Could not save the serve. The local database might be full or unsupported.");
    }
  };
  
  const handleLoadServe = (serve: ServeHistoryItem) => {
    const file = new File([serve.videoBlob], `saved-serve-${serve.id}.webm`, { type: serve.videoBlob.type });
    setVideoFile(file);
    setAnalysisResult(serve.analysisReport);
    setPoseData(serve.poseData);
    setChatHistory([]);
    setIsHistoryOpen(false);
    setError(null);
    setIsLoading(false);
    setYoutubeUrl('');
    setYoutubeVideoId(null);
  };
  
  const handleReset = () => {
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setYoutubeUrl('');
    setYoutubeVideoId(null);
    setAnalysisResult(null);
    setChatHistory([]);
    setError(null);
    setIsLoading(false);
    setPoseData(null);
  };

  const handleSendChatMessage = async (message: string) => {
    if (!analysisResult) return;

    const newUserMessage: ChatMessage = { role: 'user', text: message };
    const updatedHistory = [...chatHistory, newUserMessage];
    setChatHistory(updatedHistory);
    setIsChatLoading(true);

    try {
      const responseText = await askFollowUpQuestion(analysisResult, updatedHistory, message);
      const newAiMessage: ChatMessage = { role: 'model', text: responseText };
      setChatHistory(prev => [...prev, newAiMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = { role: 'model', text: err instanceof Error ? err.message : 'Sorry, something went wrong.' };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const renderContent = () => {
    if (isRecording) {
      return (
        <LiveRecorder 
          onRecordingComplete={handleRecordingComplete} 
          onCancel={handleCancelRecording} 
        />
      );
    }
    if (isLoading) {
      return <Loader />;
    }
    if (error) {
      return (
        <div className="text-center p-8 bg-red-900/20 border border-red-500 rounded-lg">
          <h3 className="text-xl font-bold text-red-400 mb-2">Analysis Failed</h3>
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }
    if (analysisResult) {
      return <AnalysisReport 
                report={analysisResult} 
                onReset={handleReset} 
                videoPreviewUrl={videoPreviewUrl} 
                poseData={poseData} 
                onSave={handleSaveServe}
                chatHistory={chatHistory}
                isChatLoading={isChatLoading}
                onSendChatMessage={handleSendChatMessage}
              />;
    }
    if (youtubeVideoId) {
      return (
        <YouTubePlayer
          videoId={youtubeVideoId}
          onConfirmAnalysis={handleConfirmUrlAnalysis}
          onCancel={handleReset}
        />
      );
    }
    return (
      <FileUpload
        onFileSelect={handleFileSelect}
        onAnalyze={handleAnalyze}
        videoPreviewUrl={videoPreviewUrl}
        isAnalyzing={isLoading}
        youtubeUrl={youtubeUrl}
        onUrlChange={handleUrlChange}
        file={videoFile}
        onStartRecording={handleStartRecording}
      />
    );
  };

  return (
    <div className="bg-gray-900 min-h-screen text-gray-100 font-sans">
      <div 
        className="absolute top-0 left-0 w-full h-full bg-cover bg-center opacity-10"
        style={{backgroundImage: "url('https://images.unsplash.com/photo-1515523110820-9d116ad3f243?q=80&w=2070&auto=format&fit=crop')"}}>
      </div>
      <div className="relative z-10 flex flex-col items-center min-h-screen p-4 sm:p-6 md:p-8">
        <Header onShowHistory={() => setIsHistoryOpen(true)} />
        <main className="w-full max-w-4xl mt-8">
          {renderContent()}
        </main>
        {isHistoryOpen && (
          <ServeHistory
            onClose={() => setIsHistoryOpen(false)}
            onLoadServe={handleLoadServe}
          />
        )}
        <footer className="w-full text-center text-gray-500 py-4 mt-auto">
            <p>&copy; {new Date().getFullYear()} AI Tennis Serve Coach. Perfect your game with AI.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
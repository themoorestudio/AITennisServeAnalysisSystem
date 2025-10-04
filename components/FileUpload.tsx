import React, { useState, useCallback, useRef } from 'react';
import { YouTubeIcon } from './icons/YouTubeIcon';
import { CameraIcon } from './icons/CameraIcon';
import { processVideoForPose, analyzeKinematics } from '../services/poseService';
import type { PoseData, KeyMoments } from '../types';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  onAnalyze: (inputType: 'file' | 'url', poseData?: PoseData, keyMoments?: KeyMoments) => void;
  videoPreviewUrl: string | null;
  isAnalyzing: boolean;
  youtubeUrl: string;
  onUrlChange: (url: string) => void;
  file: File | null;
  onStartRecording: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onAnalyze,
  videoPreviewUrl,
  isAnalyzing,
  youtubeUrl,
  onUrlChange,
  file,
  onStartRecording,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingPose, setIsProcessingPose] = useState(false);
  const [poseProgress, setPoseProgress] = useState(0);
  const [poseData, setPoseData] = useState<PoseData | null>(null);
  const [keyMoments, setKeyMoments] = useState<KeyMoments | null>(null);
  const [scanStatus, setScanStatus] = useState<string>('');


  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isUrlInputDisabled = isAnalyzing || !!file;
  const isFileInputDisabled = isAnalyzing || !!youtubeUrl;
  const isRecordDisabled = isAnalyzing || !!file || !!youtubeUrl;

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFileInputDisabled) return;
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, [isFileInputDisabled]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFileInputDisabled) return;
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('video/')) {
        setPoseData(null);
        setKeyMoments(null);
        onFileSelect(droppedFile);
      } else {
        alert('Please drop a valid video file.');
      }
    }
  }, [onFileSelect, isFileInputDisabled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isFileInputDisabled) return;
    if (e.target.files && e.target.files[0]) {
      setPoseData(null);
      setKeyMoments(null);
      onFileSelect(e.target.files[0]);
    }
  };

  const handleSelectClick = () => {
    if (isFileInputDisabled) return;
    fileInputRef.current?.click();
  };
  
  const handleRemoveVideo = () => {
      onFileSelect(null);
      setPoseData(null);
      setKeyMoments(null);
  }

  const handleProcessPose = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsProcessingPose(true);
    setScanStatus('Analyzing kinematics...');
    setPoseProgress(0);
    setKeyMoments(null);
    try {
      const data = await processVideoForPose(videoRef.current, canvasRef.current, setPoseProgress);
      setPoseData(data);
      
      setScanStatus('Identifying key serve moments...');
      const moments = analyzeKinematics(data, videoRef.current.duration);
      setKeyMoments(moments);
      setScanStatus('Motion analysis complete!');

    } catch (error) {
      console.error("Error processing pose:", error);
      setScanStatus('Motion analysis failed.');
      alert("Failed to analyze pose data from the video. Please try a different video file.");
    } finally {
      setIsProcessingPose(false);
    }
  }, []);

  const handleAnalyzeClick = () => {
      if (poseData && keyMoments) {
          onAnalyze('file', poseData, keyMoments);
      } else {
          // Fallback if pose processing failed or wasn't run
          alert("Please scan the video's motion first.");
      }
  }

  return (
    <div className="w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 sm:p-8 shadow-2xl">
      {videoPreviewUrl ? (
        <div className="text-center">
          <h3 className="text-xl font-semibold text-white mb-4">Your Serve Video</h3>
          <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-gray-600 mb-4 bg-black">
              <video ref={videoRef} src={videoPreviewUrl} controls className="w-full h-full object-contain"></video>
              <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"></canvas>
          </div>
          {isProcessingPose && (
            <div className='my-4'>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${poseProgress}%` }}></div>
                </div>
                <p className="text-center text-sm text-gray-300 mt-2">{scanStatus} {isProcessingPose && poseProgress < 100 ? `${Math.round(poseProgress)}%` : ''}</p>
            </div>
          )}
          {!isProcessingPose && keyMoments && (
              <div className="my-4 p-3 bg-green-900/30 rounded-lg text-sm text-green-300">
                  <p><strong>Motion Scan Complete:</strong> Key moments identified!</p>
              </div>
          )}
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
                onClick={handleRemoveVideo}
                disabled={isAnalyzing || isProcessingPose}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-all duration-200 ease-in-out disabled:opacity-50"
            >
                Choose a Different Video
            </button>
            {!isProcessingPose && (
              <button
                onClick={handleProcessPose}
                disabled={isAnalyzing || isProcessingPose}
                className="px-8 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all duration-200 ease-in-out shadow-lg transform hover:scale-105"
              >
                {poseData ? "Re-scan Motion" : "1. Scan Motion"}
              </button>
            )}
            <button
              onClick={handleAnalyzeClick}
              disabled={isAnalyzing || isProcessingPose || !keyMoments}
              className="px-8 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all duration-200 ease-in-out shadow-lg transform hover:scale-105"
            >
              2. Get AI Analysis
            </button>
          </div>
        </div>
      ) : (
        <>
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={handleSelectClick}
          role="button"
          aria-disabled={isFileInputDisabled}
          className={`flex flex-col items-center justify-center p-10 border-4 border-dashed rounded-lg transition-all duration-300 ${isFileInputDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isDragging ? 'border-green-400 bg-gray-700/50' : 'border-gray-600 hover:border-green-500 hover:bg-gray-700/30'}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleChange}
            className="hidden"
            disabled={isFileInputDisabled}
          />
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-xl font-semibold text-white">Drag & drop your serve video here</p>
          <p className="text-gray-400 mt-1">or click to select a file</p>
          <p className="text-xs text-gray-500 mt-4">MP4, MOV, WebM supported. Max 100MB.</p>
        </div>
        
        <div className="my-6 flex items-center" aria-hidden="true">
            <div className="flex-grow border-t border-gray-600"></div>
            <span className="flex-shrink mx-4 text-gray-400 font-semibold">OR</span>
            <div className="flex-grow border-t border-gray-600"></div>
        </div>

        <div>
            <label htmlFor="youtube-url" className="sr-only">YouTube URL</label>
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <YouTubeIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <input 
                        type="url"
                        id="youtube-url"
                        placeholder="Paste a YouTube link here"
                        value={youtubeUrl}
                        onChange={(e) => onUrlChange(e.target.value)}
                        disabled={isUrlInputDisabled}
                        className="w-full pl-11 pr-4 py-3 bg-gray-900/50 border-2 border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>
                <button
                    onClick={onStartRecording}
                    disabled={isRecordDisabled}
                    className="px-5 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all duration-200 ease-in-out shadow-lg transform hover:scale-105 flex items-center justify-center gap-2"
                >
                    <CameraIcon className="h-6 w-6" />
                    Record Live Serve
                </button>
                <button
                    onClick={() => onAnalyze('url')}
                    disabled={isAnalyzing || !youtubeUrl || isUrlInputDisabled}
                    className="px-8 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all duration-200 ease-in-out shadow-lg transform hover:scale-105 flex items-center justify-center gap-2"
                >
                    Analyze from Link
                </button>
            </div>
        </div>
        </>
      )}
    </div>
  );
};

export default FileUpload;
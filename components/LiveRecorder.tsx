import React, { useState, useRef, useEffect, useCallback } from 'react';
import { XCircleIcon } from './icons/XCircleIcon';
import { detectSignalInStream, cancelSignalDetection, SignalState } from '../services/poseService';

interface LiveRecorderProps {
  onRecordingComplete: (file: File) => void;
  onCancel: () => void;
}

type RecordingStatus = 'initializing' | 'waiting_for_start_signal' | 'recording' | 'error';

const LiveRecorder: React.FC<LiveRecorderProps> = ({ onRecordingComplete, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null); // Ref to hold the stream for stable cleanup
  const [status, setStatus] = useState<RecordingStatus>('initializing');
  const [stream, setStream] = useState<MediaStream | null>(null); // State to trigger effects that depend on the stream
  const [error, setError] = useState<string | null>(null);
  const [signalState, setSignalState] = useState<SignalState>('idle');
  const recordedChunks = useRef<Blob[]>([]);

  // Stable cleanup function that reads the stream from a ref
  const cleanup = useCallback(() => {
    cancelSignalDetection();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);
  
  // Effect for initializing camera stream. Runs only once.
  useEffect(() => {
    const setupStream = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = mediaStream; // Store in ref for cleanup
        setStream(mediaStream); // Set state to trigger dependent effects
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            setStatus('waiting_for_start_signal');
          };
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        let message = 'An unknown error occurred while accessing the camera.';
        if (err instanceof Error) {
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            message = 'Camera access was denied. Please allow camera access in your browser settings.';
          } else {
            message = 'Could not access the camera. Please ensure it is not in use by another application.';
          }
        }
        setError(message);
        setStatus('error');
      }
    };
    setupStream();

    return cleanup;
  }, [cleanup]);

  // Effect for handling gesture detection and state machine
  useEffect(() => {
    if (!videoRef.current || !stream || (status !== 'waiting_for_start_signal' && status !== 'recording')) {
      return;
    }

    const handleStateChange = (newState: SignalState) => {
      setSignalState(newState);
      if (newState === 'locked') {
        if (status === 'waiting_for_start_signal') {
          // --- Start Recording Logic ---
          recordedChunks.current = [];
          try {
            const options = { mimeType: 'video/webm' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
              setError(`Video format ${options.mimeType} is not supported on your browser.`);
              setStatus('error');
              return;
            }
            const recorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = recorder;
            recorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                recordedChunks.current.push(event.data);
              }
            };
            recorder.onstop = () => {
              cleanup();
              const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
              const file = new File([blob], 'serve-recording.webm', { type: 'video/webm' });
              onRecordingComplete(file);
            };
            recorder.start();
            setStatus('recording');
          } catch (e) {
            console.error('MediaRecorder error:', e);
            setError('Could not start recording. Your browser might not support this feature.');
            setStatus('error');
          }
        } else if (status === 'recording') {
          // --- Stop Recording Logic ---
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }
      }
    };

    detectSignalInStream(videoRef.current, handleStateChange);

    return () => {
      cancelSignalDetection();
    };
  }, [status, stream, cleanup, onRecordingComplete]);

  // Effect for handling the 15-second timeout
  useEffect(() => {
    if (status === 'recording') {
      const timeoutId = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 15000);
      return () => clearTimeout(timeoutId);
    }
  }, [status]);


  const getStatusMessage = () => {
    switch (status) {
      case 'initializing':
        return 'Initializing Camera...';
      case 'waiting_for_start_signal':
        if (signalState === 'detecting') return 'Hand detected. HOLD STILL to start...';
        return 'Raise your hand and HOLD to start recording.';
      case 'recording':
        if (signalState === 'detecting') return 'Hand detected. HOLD STILL to stop...';
        return 'Recording... Raise your hand and HOLD to stop.';
      case 'error':
        return `Error: ${error}`;
    }
  };

  const getBorderColor = () => {
    if (signalState === 'locked') return 'border-green-500';
    if (signalState === 'detecting') return 'border-yellow-500';
    return 'border-gray-600';
  }

  return (
    <div className="w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 sm:p-8 shadow-2xl">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-2">Live Recording</h3>
        <p className="text-gray-400 mb-4 h-6 transition-all">{getStatusMessage()}</p>
        <div className={`relative aspect-video rounded-lg overflow-hidden border-4 mb-4 bg-black transition-all duration-300 ${getBorderColor()}`}>
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
          {status === 'recording' && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                  <span className="w-2 h-2 bg-white rounded-full"></span>
                  REC
              </div>
          )}
          {signalState === 'detecting' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-24 h-24 border-4 border-yellow-400 rounded-full animate-pulse opacity-75"></div>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-all duration-200 ease-in-out flex items-center justify-center gap-2"
          >
            <XCircleIcon className="w-6 h-6" />
            Cancel Recording
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveRecorder;
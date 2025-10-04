import type {
  PoseLandmarker as PoseLandmarkerType,
  DrawingUtils as DrawingUtilsType,
  FilesetResolver as FilesetResolverType,
  NormalizedLandmark
} from "@mediapipe/tasks-vision";
import type { KeyMoments, LandmarkFrame, PoseData } from '../types';

// Module-level variables to hold the lazily loaded MediaPipe components
let PoseLandmarker: typeof PoseLandmarkerType;
let FilesetResolver: typeof FilesetResolverType;
let DrawingUtils: typeof DrawingUtilsType;

let poseLandmarker: PoseLandmarkerType | null = null;
let drawingUtils: DrawingUtilsType | null = null;
let detectionFrameId: number;

// Ensures MediaPipe modules are loaded via dynamic import, but only once.
const loadMediaPipe = (() => {
  let promise: Promise<void> | null = null;
  return () => {
    if (!promise) {
      promise = (async () => {
        const vision = await import("@mediapipe/tasks-vision");
        PoseLandmarker = vision.PoseLandmarker;
        FilesetResolver = vision.FilesetResolver;
        DrawingUtils = vision.DrawingUtils;
      })();
    }
    return promise;
  };
})();


// Initialize the PoseLandmarker
const initializePoseLandmarker = async () => {
  if (poseLandmarker) return;

  await loadMediaPipe();

  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numPoses: 1,
    });
  } catch (error) {
    console.error("Failed to initialize PoseLandmarker:", error);
    throw new Error("Could not initialize AI pose detection model. Please check your internet connection and try again.");
  }
};

export const processVideoForPose = async (
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  setProgress: (progress: number) => void
): Promise<PoseData> => {
  await initializePoseLandmarker();
  if (!poseLandmarker) {
    throw new Error("PoseLandmarker not initialized");
  }

  const canvasCtx = canvas.getContext("2d");
  if (!canvasCtx) {
    throw new Error("Could not get canvas context");
  }
  drawingUtils = new DrawingUtils(canvasCtx);

  const poseData: PoseData = [];
  const duration = video.duration;
  let lastTime = -1;
  let animationFrameId: number;

  return new Promise((resolve, reject) => {
    const startProcessing = () => {
      video.muted = true;
      video.play().then(() => {
        const processFrame = () => {
          if (video.paused || video.ended) {
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            setProgress(100);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            if (!video.paused) video.pause();
            resolve(poseData);
            return;
          }

          const currentTime = video.currentTime;
          if (currentTime > lastTime) {
            lastTime = currentTime;
            const results = poseLandmarker!.detectForVideo(video, performance.now());
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

            if (results.landmarks && results.landmarks.length > 0) {
              const landmarks = results.landmarks[0];
              poseData.push({ time: currentTime, landmarks });
              drawingUtils!.drawLandmarks(landmarks, {
                radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1),
              });
              drawingUtils!.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS);
            }
            const progress = (currentTime / duration) * 100;
            setProgress(progress);
          }
          animationFrameId = requestAnimationFrame(processFrame);
        };
        processFrame();
      }).catch(err => {
        console.error("Video play failed:", err);
        reject(new Error("Could not play the video to start analysis. The video file might be corrupted."));
      });
    };

    video.currentTime = 0;

    if (video.readyState >= 4) {
      startProcessing();
    } else {
      const canPlayHandler = () => {
        video.removeEventListener('canplaythrough', canPlayHandler);
        startProcessing();
      };
      video.addEventListener('canplaythrough', canPlayHandler);
      video.onerror = () => reject(new Error("Failed to load video data."));
    }
  });
};

export const drawSinglePose = async (
    landmarks: NormalizedLandmark[],
    canvas: HTMLCanvasElement
) => {
    await loadMediaPipe();
    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) return;
    if (!drawingUtils) {
        drawingUtils = new DrawingUtils(canvasCtx);
    }
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    drawingUtils.drawLandmarks(landmarks, {
        radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 8, 2),
        color: '#4ade80',
        fillColor: '#4ade80'
    });
    drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {color: '#ffffff', lineWidth: 4});
}


export const cancelSignalDetection = () => {
    if (detectionFrameId) {
        cancelAnimationFrame(detectionFrameId);
    }
}

export type SignalState = 'idle' | 'detecting' | 'locked';

export const detectSignalInStream = async (
    video: HTMLVideoElement,
    onStateChange: (state: SignalState) => void
) => {
    await initializePoseLandmarker();
    if (!poseLandmarker) {
        console.error("PoseLandmarker not ready for signal detection");
        return;
    }

    const WRIST_L = 15;
    const WRIST_R = 16;
    const SHOULDER_L = 11;
    const SHOULDER_R = 12;
    const STILLNESS_THRESHOLD = 0.02; 
    const STILL_FRAMES_REQUIRED = 120; 

    let lastWristPos: { x: number; y: number } | null = null;
    let stillFrameCount = 0;
    let lastReportedState: SignalState = 'idle';

    const reportState = (newState: SignalState) => {
        if (newState !== lastReportedState) {
            lastReportedState = newState;
            onStateChange(newState);
        }
    };

    const detectLoop = () => {
        const results = poseLandmarker!.detectForVideo(video, performance.now());

        let handRaised = false;
        let raisedWrist: NormalizedLandmark | null = null;

        if (results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            const wristL = landmarks[WRIST_L];
            const shoulderL = landmarks[SHOULDER_L];
            const wristR = landmarks[WRIST_R];
            const shoulderR = landmarks[SHOULDER_R];

            if (wristL && shoulderL && wristL.y < shoulderL.y) {
                raisedWrist = wristL;
                handRaised = true;
            } else if (wristR && shoulderR && wristR.y < shoulderR.y) {
                raisedWrist = wristR;
                handRaised = true;
            }
        }

        if (handRaised && raisedWrist) {
            reportState('detecting');
            if (lastWristPos) {
                const distance = Math.sqrt(
                    Math.pow(raisedWrist.x - lastWristPos.x, 2) +
                    Math.pow(raisedWrist.y - lastWristPos.y, 2)
                );
                if (distance < STILLNESS_THRESHOLD) {
                    stillFrameCount++;
                } else {
                    // Reset if hand moves too much
                    stillFrameCount = 1;
                    lastWristPos = { x: raisedWrist.x, y: raisedWrist.y };
                }
            } else {
                // First frame hand is raised
                stillFrameCount = 1;
                lastWristPos = { x: raisedWrist.x, y: raisedWrist.y };
            }
        } else {
            // Hand is not raised
            reportState('idle');
            stillFrameCount = 0;
            lastWristPos = null;
        }

        if (stillFrameCount >= STILL_FRAMES_REQUIRED) {
            reportState('locked');
            return; // Stop the loop
        }

        detectionFrameId = requestAnimationFrame(detectLoop);
    };

    detectLoop();
};

export const analyzeKinematics = (poseData: PoseData, duration: number): KeyMoments => {
    if (poseData.length < 10) return {
        'Serve Start': poseData.length > 0 ? poseData[0].time : 0,
        'Toss Peak': null,
        'Trophy Pose': null,
        'Contact Point': null,
    };

    const LEFT_WRIST = 15;
    const RIGHT_WRIST = 16;
    const RIGHT_SHOULDER = 12;
    const RIGHT_ELBOW = 14;

    let tossPeakFrame: LandmarkFrame | null = null;
    let serveStartFrame: LandmarkFrame = poseData[0];

    for (const frame of poseData) {
        const leftWrist = frame.landmarks[LEFT_WRIST];
        if (leftWrist && leftWrist.y < (tossPeakFrame?.landmarks[LEFT_WRIST].y ?? Infinity)) {
            tossPeakFrame = frame;
        }
    }

    const tossPeakTime = tossPeakFrame ? tossPeakFrame.time : null;
    const tossPeakIndex = tossPeakFrame ? poseData.indexOf(tossPeakFrame) : -1;

    let trophyPoseFrame: LandmarkFrame | null = null;
    if (tossPeakIndex !== -1) {
        for (let i = tossPeakIndex; i < poseData.length; i++) {
            const frame = poseData[i];
            const rShoulder = frame.landmarks[RIGHT_SHOULDER];
            const rElbow = frame.landmarks[RIGHT_ELBOW];
            const rWrist = frame.landmarks[RIGHT_WRIST];

            if (rShoulder && rElbow && rWrist) {
                 const angleVec1 = { x: rWrist.x - rElbow.x, y: rWrist.y - rElbow.y };
                 const angleVec2 = { x: rShoulder.x - rElbow.x, y: rShoulder.y - rElbow.y };
                 const dotProduct = angleVec1.x * angleVec2.x + angleVec1.y * angleVec2.y;
                 const mag1 = Math.sqrt(angleVec1.x**2 + angleVec1.y**2);
                 const mag2 = Math.sqrt(angleVec2.x**2 + angleVec2.y**2);
                 if (mag1 === 0 || mag2 === 0) continue;
                 const angleRad = Math.acos(dotProduct / (mag1 * mag2));
                 const angleDeg = angleRad * 180 / Math.PI;

                 if (angleDeg > 80 && angleDeg < 130 && rWrist.y < rElbow.y) {
                    trophyPoseFrame = frame;
                    break;
                 }
            }
        }
    }
    const trophyPoseTime = trophyPoseFrame ? trophyPoseFrame.time : null;
    const trophyPoseIndex = trophyPoseFrame ? poseData.indexOf(trophyPoseFrame) : -1;

    let contactPointFrame: LandmarkFrame | null = null;
    if (trophyPoseIndex !== -1) {
        for (let i = trophyPoseIndex; i < poseData.length; i++) {
            const frame = poseData[i];
            const rightWrist = frame.landmarks[RIGHT_WRIST];
            if (rightWrist && rightWrist.y < (contactPointFrame?.landmarks[RIGHT_WRIST].y ?? Infinity)) {
                contactPointFrame = frame;
            }
        }
    }
    const contactPointTime = contactPointFrame ? contactPointFrame.time : null;

    return {
        'Serve Start': serveStartFrame.time,
        'Toss Peak': tossPeakTime,
        'Trophy Pose': trophyPoseTime,
        'Contact Point': contactPointTime,
    };
};
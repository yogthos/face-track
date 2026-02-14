import { useState, useRef, useEffect } from 'react';
import { FaceTracker as FaceTrackLib, calculateFaceOrientation, drawResults } from 'face-track';

const FaceTrackerComponent = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [faceCount, setFaceCount] = useState(0);
  const [faceOrientation, setFaceOrientation] = useState(null);
  const [landmarks, setLandmarks] = useState([]);

  const detector = useRef(new FaceTrackLib());
  const animationFrameId = useRef(null);
  const isTrackingRef = useRef(false);

  useEffect(() => {
    initializeFaceDetection();
    return () => {
      isTrackingRef.current = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      stopVideoStream();
    };
  }, []);

  const initializeFaceDetection = async () => {
    try {
      console.log('Loading face detection models...');
      await detector.current.loadModels('/models/');
      setIsModelLoaded(true);
      console.log('Face detection models initialized');
    } catch (error) {
      console.error('Failed to initialize face detection models:', error);
    }
  };

  const startVideoStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        isTrackingRef.current = true;
        setIsTracking(true);
        startFaceTracking();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please ensure camera permissions are granted.');
    }
  };

  const stopVideoStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    isTrackingRef.current = false;
    setIsTracking(false);
    setFaceCount(0);
    setFaceOrientation(null);
    setLandmarks([]);

    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const startFaceTracking = () => {
    const trackFaces = async () => {
      if (!videoRef.current || videoRef.current.readyState !== 4) {
        if (isTrackingRef.current) {
          animationFrameId.current = requestAnimationFrame(trackFaces);
        }
        return;
      }

      try {
        const results = await detector.current.detectFacesWithLandmarks(videoRef.current);
        setFaceCount(results.length);

        if (results.length > 0) {
          const firstResult = results[0];
          setLandmarks(firstResult.landmarks);

          const orientation = calculateFaceOrientation(firstResult.landmarks);
          setFaceOrientation(orientation);
        } else {
          setLandmarks([]);
          setFaceOrientation(null);
        }

        // Draw on canvas
        if (canvasRef.current && videoRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          const ctx = canvasRef.current.getContext('2d');
          drawResults(ctx, results, canvasRef.current.width, canvasRef.current.height);
        }
      } catch (error) {
        console.error('Error tracking faces:', error);
      }

      if (isTrackingRef.current) {
        animationFrameId.current = requestAnimationFrame(trackFaces);
      }
    };

    animationFrameId.current = requestAnimationFrame(trackFaces);
  };

  const toggleTracking = () => {
    if (isTracking) {
      stopVideoStream();
    } else {
      startVideoStream();
    }
  };

  return (
    <div className="face-tracker">
      <div className="tracker-controls">
        <button
          onClick={toggleTracking}
          disabled={!isModelLoaded}
          className={`track-button ${isTracking ? 'tracking' : ''}`}
        >
          {isTracking ? 'Stop Tracking' : 'Start Face Tracking'}
        </button>

        <div className="status-info">
          <div className="status-item">
            <span className="status-label">Model:</span>
            <span className={`status-value ${isModelLoaded ? 'loaded' : 'loading'}`}>
              {isModelLoaded ? 'Loaded' : 'Loading...'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Faces Detected:</span>
            <span className="status-value">{faceCount}</span>
          </div>
        </div>
      </div>

      <div className="video-container">
        <video
          ref={videoRef}
          className="video-element"
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="landmark-canvas"
        />
      </div>

      {faceOrientation && (
        <div className="orientation-info">
          <h3>Face Orientation</h3>
          <div className="orientation-values">
            <div className="orientation-item">
              <span>Yaw:</span>
              <span>{faceOrientation.yaw.toFixed(1)}&deg;</span>
            </div>
            <div className="orientation-item">
              <span>Pitch:</span>
              <span>{faceOrientation.pitch.toFixed(1)}&deg;</span>
            </div>
            <div className="orientation-item">
              <span>Roll:</span>
              <span>{faceOrientation.roll.toFixed(1)}&deg;</span>
            </div>
          </div>
        </div>
      )}

      {landmarks.length > 0 && (
        <div className="landmark-info">
          <h3>Landmark Data</h3>
          <p>{landmarks.length} landmarks detected</p>
          <div className="landmark-preview">
            {landmarks.slice(0, 5).map((point, index) => (
              <div key={index} className="landmark-point">
                Point {index}: ({point.x.toFixed(1)}, {point.y.toFixed(1)})
              </div>
            ))}
            {landmarks.length > 5 && (
              <div className="landmark-more">... and {landmarks.length - 5} more</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FaceTrackerComponent;

import React, { useState, useRef, useEffect } from 'react';
import { Camera, StopCircle, PlayCircle, RotateCcw, Activity } from 'lucide-react';
import { toast } from 'react-toastify';

const PostureCam = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isTracking, setIsTracking] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [stats, setStats] = useState({
        reps: 0,
        calories: 0,
        angle: null,
        message: 'Position yourself in frame',
        fps: 0,
        detectedLabel: ''
    });
    const [workout, setWorkout] = useState('Push Up');
    const [mode, setMode] = useState('manual');
    const [targetReps, setTargetReps] = useState(10);
    const [stream, setStream] = useState(null);
    const [error, setError] = useState('');
    const intervalRef = useRef(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    // console.log("API_URL:", process.env.NEXT_PUBLIC_API_URL);


    const workouts = [
        'Push Up', 'Pull Up', 'Squat', 'Lunge', 'Biceps Curl',
        'Shoulder Press', 'Plank', 'Jumping Jack'
    ];

    // Initialize camera
    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                setStream(mediaStream);
                setError('');
            }
        } catch (err) {
            setError('Failed to access camera. Please grant camera permissions.');
            console.error('Camera error:', err);
        }
    };

    // Stop camera
    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    // Create session
    const createSession = async () => {
        try {
            const formData = new FormData();
            formData.append('workout_name', workout);
            formData.append('mode', mode);
            formData.append('target_reps', targetReps.toString());

            const response = await fetch(`${API_URL}/create_session`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Failed to create session');

            const data = await response.json();
            setSessionId(data.session_id);
            return data.session_id;
        } catch (err) {
            setError('Failed to create session: ' + err.message);
            console.error('Session creation error:', err);
            return null;
        }
    };

    // Capture and send frame
    const captureAndAnalyze = async (sid) => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob
        canvas.toBlob(async (blob) => {
            if (!blob) return;

            try {
                const formData = new FormData();
                formData.append('file', blob, 'frame.jpg');
                formData.append('session_id', sid);
                formData.append('workout_name', workout);
                formData.append('mode', mode);
                formData.append('target_reps', targetReps.toString());

                const response = await fetch(`${API_URL}/analyze`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) throw new Error('Analysis failed');

                const data = await response.json();

                setStats({
                    reps: data.reps || 0,
                    calories: data.calories || 0,
                    angle: data.angle,
                    message: data.message || 'Keep going!',
                    fps: data.fps || 0,
                    detectedLabel: data.detected_label || ''
                });

                if (data.done_by_target) {
                    handleStop();
                    // toast.success('Target reps completed! Great job!');
                }
            } catch (err) {
                console.error('Analysis error:', err);
            }
        }, 'image/jpeg', 0.8);
    };

    // Start tracking
    const handleStart = async () => {
        if (!stream) {
            await startCamera();
        }

        const sid = await createSession();
        if (!sid) return;

        setIsTracking(true);
        setError('');

        // Send frames every 200ms (5 FPS)
        intervalRef.current = setInterval(() => {
            captureAndAnalyze(sid);
        }, 200);
    };

    // Stop tracking
    const handleStop = () => {
        setIsTracking(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            stopCamera()
        }
    };

    // Reset session
    const handleReset = async () => {
        if (sessionId) {
            try {
                const formData = new FormData();
                formData.append('session_id', sessionId);

                await fetch(`${API_URL}/reset_session`, {
                    method: 'POST',
                    body: formData
                });

                setStats({
                    reps: 0,
                    calories: 0,
                    angle: null,
                    message: 'Position yourself in frame',
                    fps: 0,
                    detectedLabel: ''
                });
            } catch (err) {
                console.error('Reset error:', err);
            }
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            handleStop();
            stopCamera();
        };
    }, []);

    return (
        <div className="w-full max-w-6xl mx-auto p-6">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-linear-to-r from-cyan-500 to-blue-600 p-6">
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Activity className="w-8 h-8" />
                        PostureAI Tracker
                    </h2>
                    <p className="text-cyan-50 mt-2">Real-time workout form analysis</p>
                </div>

                {/* Controls */}
                <div className="p-6 bg-gray-50 border-b">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Workout Type
                            </label>
                            <select
                                value={workout}
                                onChange={(e) => setWorkout(e.target.value)}
                                disabled={isTracking}
                                className="w-full px-4 py-2 border text-gray-400 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-100"
                            >
                                {workouts.map((w) => (
                                    <option key={w} value={w}>{w}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Detection Mode
                            </label>
                            <select
                                value={mode}
                                onChange={(e) => setMode(e.target.value)}
                                disabled={isTracking}
                                className="w-full px-4 py-2 border text-gray-400 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-100"
                            >
                                <option value="manual">Manual</option>
                                <option value="auto">Auto-Detect (ML)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Target Reps
                            </label>
                            <input
                                type="number"
                                value={targetReps}
                                onChange={(e) => setTargetReps(parseInt(e.target.value) || 0)}
                                disabled={isTracking}
                                min="0"
                                className="w-full px-4 py-2 text-gray-400 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-100"
                            />
                        </div>
                    </div>
                </div>

                {/* Video Feed */}
                <div className="relative bg-gray-900 aspect-video">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {!stream && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                                <Camera className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                <p className="text-gray-400">Click Start to begin tracking</p>
                            </div>
                        </div>
                    )}

                    {/* Stats Overlay */}
                    {isTracking && (
                        <div className="absolute top-4 left-4 right-4">
                            <div className="bg-black bg-opacity-70 rounded-lg p-4 text-white">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                                    <div>
                                        <div className="text-xs text-gray-300">Reps</div>
                                        <div className="text-2xl font-bold">{stats.reps}</div>
                                        {targetReps > 0 && (
                                            <div className="text-xs text-gray-400">/ {targetReps}</div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-300">Calories</div>
                                        <div className="text-2xl font-bold">{stats.calories}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-300">Angle</div>
                                        <div className="text-2xl font-bold">
                                            {stats.angle ? Math.round(stats.angle) + '°' : '--'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-300">FPS</div>
                                        <div className="text-2xl font-bold">{Math.round(stats.fps)}</div>
                                    </div>
                                </div>
                                {mode === 'auto' && stats.detectedLabel && (
                                    <div className="text-xs text-cyan-300 mb-2">
                                        Detected: {stats.detectedLabel}
                                    </div>
                                )}
                                <div className="text-sm text-yellow-300">{stats.message}</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Error Display */}
                {error && (
                    <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="p-6 flex gap-4">
                    {!isTracking ? (
                        <button
                            onClick={handleStart}
                            className="flex-1 py-3 bg-linear-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium hover:from-cyan-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
                        >
                            <PlayCircle className="w-5 h-5" />
                            Start Tracking
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={handleStop}
                                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                            >
                                <StopCircle className="w-5 h-5" />
                                Stop Tracking
                            </button>
                            <button
                                onClick={handleReset}
                                className="py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                            >
                                <RotateCcw className="w-5 h-5" />
                                Reset
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PostureCam;
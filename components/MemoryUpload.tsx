import React, { useState, useRef } from 'react';
import { MemoryFile, PersonaProfile } from '../types';
import { analyzeTextContent, analyzeVideoFrames } from '../services/geminiService';

interface Props {
  onProfileUpdate: (p: PersonaProfile) => void;
  profile: PersonaProfile;
}

const MemoryUpload: React.FC<Props> = ({ onProfileUpdate, profile }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [logs, setLogs] = useState<string>('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'text/plain') {
      const text = await file.text();
      setLogs(prev => prev + '\n' + text);
    } else {
      alert("Please upload .txt chat exports.");
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
        setVideoFile(file);
    }
  };

  const extractFrames = async (file: File): Promise<string[]> => {
    return new Promise((resolve) => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return resolve([]);

        const url = URL.createObjectURL(file);
        video.src = url;
        
        const frames: string[] = [];
        
        video.onloadedmetadata = async () => {
            const duration = video.duration;
            const ctx = canvas.getContext('2d');
            canvas.width = video.videoWidth / 4; // Downscale for API
            canvas.height = video.videoHeight / 4;
            
            // Extract 3 frames: 20%, 50%, 80%
            const timePoints = [duration * 0.2, duration * 0.5, duration * 0.8];
            
            for (const time of timePoints) {
                video.currentTime = time;
                await new Promise(r => { video.onseeked = r; });
                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    frames.push(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
                }
            }
            URL.revokeObjectURL(url);
            resolve(frames);
        };
    });
  };

  const processMemories = async () => {
    if (!logs && !videoFile) return;
    setIsAnalyzing(true);
    try {
      const newTraits: string[] = [];
      const newMemories: string[] = [];
      let newVoice = profile.voiceStyle;

      // 1. Process Text
      if (logs) {
        const update = await analyzeTextContent(logs, profile);
        if (update.personalityTraits) newTraits.push(...update.personalityTraits);
        if (update.keyMemories) newMemories.push(...update.keyMemories);
        if (update.voiceStyle) newVoice = update.voiceStyle;
        setLogs('');
      }

      // 2. Process Video
      if (videoFile) {
        const frames = await extractFrames(videoFile);
        if (frames.length > 0) {
            const update = await analyzeVideoFrames(frames, profile);
            if (update.personalityTraits) newTraits.push(...update.personalityTraits);
            if (update.keyMemories) newMemories.push(...update.keyMemories);
        }
        setVideoFile(null);
      }

      onProfileUpdate({
        ...profile,
        personalityTraits: [...profile.personalityTraits, ...newTraits],
        keyMemories: [...profile.keyMemories, ...newMemories],
        voiceStyle: newVoice,
      });

    } catch (err) {
      console.error(err);
      alert("Failed to analyze content.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl max-w-2xl mx-auto mt-8">
      <h3 className="text-xl font-serif text-cyan-400 mb-4">Ingest Memories</h3>
      <p className="text-slate-400 mb-6 text-sm">
        Upload chat exports (.txt) or short video clips. The AI will analyze text for voice and videos for visual context/mannerisms.
      </p>

      {/* Hidden helper elements for video processing */}
      <video ref={videoRef} className="hidden" muted playsInline crossOrigin="anonymous"></video>
      <canvas ref={canvasRef} className="hidden"></canvas>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            {/* Text Upload */}
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-cyan-500 transition-colors bg-slate-900/50">
            <input 
                type="file" 
                accept=".txt" 
                onChange={handleFileUpload} 
                className="hidden" 
                id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                <svg className="w-6 h-6 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span className="text-slate-300 font-medium text-xs">Add Chat (.txt)</span>
            </label>
            </div>

            {/* Video Upload */}
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-purple-500 transition-colors bg-slate-900/50">
            <input 
                type="file" 
                accept="video/*" 
                onChange={handleVideoUpload} 
                className="hidden" 
                id="video-upload"
            />
            <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center">
                <svg className="w-6 h-6 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                <span className="text-slate-300 font-medium text-xs">Add Video</span>
            </label>
            </div>
        </div>

        {(logs.length > 0 || videoFile) && (
          <div className="bg-slate-900 p-4 rounded text-xs text-slate-400 font-mono">
            {logs.length > 0 && <div className="mb-2">📄 Text: {logs.substring(0, 100).replace(/\n/g, ' ')}...</div>}
            {videoFile && <div>🎥 Video: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)}MB)</div>}
          </div>
        )}

        <button
          onClick={processMemories}
          disabled={(!logs && !videoFile) || isAnalyzing}
          className={`w-full py-3 rounded-lg font-semibold transition-all ${
            (!logs && !videoFile) || isAnalyzing 
              ? 'bg-slate-700 text-slate-500' 
              : 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white hover:shadow-lg hover:shadow-purple-500/20'
          }`}
        >
          {isAnalyzing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/>
              Extracting Personality...
            </span>
          ) : (
            'Absorb Memories'
          )}
        </button>
      </div>
    </div>
  );
};

export default MemoryUpload;
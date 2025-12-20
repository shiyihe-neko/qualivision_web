
import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { Upload, FileVideo, Gauge, Plus } from 'lucide-react';

interface VideoPlayerProps {
  src: string | null;
  projectVideoName?: string;
  onTimeUpdate: (currentTime: number) => void;
  onLoadedMetadata: (duration: number) => void;
  onEnded: () => void;
  onRelinkVideo: (file: File) => void;
  onUploadNew: (file: File) => void; // New prop for fresh upload
}

export interface VideoPlayerHandle {
  seekTo: (time: number) => void;
  play: () => void;
  pause: () => void;
  getCurrentTime: () => number;
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(({ 
  src, 
  projectVideoName,
  onTimeUpdate, 
  onLoadedMetadata, 
  onEnded,
  onRelinkVideo,
  onUploadNew
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
    },
    play: () => videoRef.current?.play(),
    pause: () => videoRef.current?.pause(),
    getCurrentTime: () => videoRef.current?.currentTime || 0,
  }));

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      onLoadedMetadata(videoRef.current.duration);
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2.0];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    
    setPlaybackRate(nextRate);
    if (videoRef.current) {
        videoRef.current.playbackRate = nextRate;
    }
  };

  return (
    <div className="w-full h-full bg-black flex items-center justify-center rounded-lg overflow-hidden shadow-xl border border-slate-800 relative group">
      {src ? (
        <>
          <video
            ref={videoRef}
            src={src}
            className="w-full h-full object-contain"
            controls
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={onEnded}
          />
          
          {/* Speed Control Overlay */}
          <button 
             onClick={cyclePlaybackRate}
             className="absolute bottom-16 right-6 bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold transition-all border border-white/10 z-10"
             title="Playback Speed"
          >
             <Gauge className="w-3.5 h-3.5" />
             {playbackRate}x
          </button>
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
          {projectVideoName ? (
            <div className="animate-fade-in max-w-md bg-slate-900/50 p-8 rounded-xl border border-slate-700">
               <FileVideo className="w-16 h-16 mb-4 text-amber-500 mx-auto" />
               <h3 className="text-lg font-semibold text-slate-200 mb-2">Project Loaded</h3>
               <p className="mb-6 text-slate-400 text-sm">
                 This analysis belongs to <br/><span className="text-white font-mono bg-slate-800 px-2 py-0.5 rounded mt-1 inline-block">{projectVideoName}</span>
                 <br/><br/>Please select the original video file to continue.
               </p>
               <label className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium cursor-pointer transition-colors shadow-lg shadow-blue-900/20 w-full justify-center">
                 <Upload className="w-5 h-5" />
                 <span>Select Video File</span>
                 <input 
                   type="file" 
                   accept="video/*" 
                   className="hidden" 
                   onChange={(e) => e.target.files?.[0] && onRelinkVideo(e.target.files[0])}
                 />
               </label>
            </div>
          ) : (
            <label className="group/drop cursor-pointer flex flex-col items-center justify-center w-full max-w-lg h-64 border-2 border-dashed border-slate-700 hover:border-emerald-500/50 hover:bg-slate-900/30 rounded-2xl transition-all duration-300">
              <div className="w-20 h-20 mb-4 rounded-full bg-slate-900 group-hover/drop:bg-slate-800 flex items-center justify-center border border-slate-700 group-hover/drop:border-emerald-500/30 transition-all shadow-lg">
                <Plus className="w-8 h-8 text-slate-500 group-hover/drop:text-emerald-400 transition-colors" />
              </div>
              <p className="text-xl font-medium text-slate-300 group-hover/drop:text-emerald-400 transition-colors">Start New Analysis</p>
              <p className="text-sm mt-2 text-slate-500 group-hover/drop:text-slate-400">Click to upload a video</p>
              <input 
                 type="file" 
                 accept="video/*" 
                 className="hidden" 
                 onChange={(e) => e.target.files?.[0] && onUploadNew(e.target.files[0])} 
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
});

export default VideoPlayer;

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { Card } from '../Card';
import { X, Camera } from 'lucide-react';

interface PunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  punchType: 'IN' | 'OUT';
  activeStaff: any;
  punchIn: (photoUrl: string, lat: number, lng: number, status: string) => Promise<void>;
  punchOut: (status: string) => Promise<void>;
}

export const PunchModal: React.FC<PunchModalProps> = ({
  isOpen,
  onClose,
  punchType,
  activeStaff,
  punchIn,
  punchOut
}) => {
  const OFFICE_COORDS = { lat: 10.9345771, lng: 76.0016118 };
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPunching, setIsPunching] = useState(false);

  // Haversine formula
  const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; 
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  };

  // Location Watching
  useEffect(() => {
    if (!isOpen) return;

    let watchId: number;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        (error) => {
          console.error("Location tracking error:", error);
        },
        { enableHighAccuracy: true }
      );

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        (error) => {
          console.error("Location tracking error:", error);
        },
        { enableHighAccuracy: true }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isOpen]);

  // Camera setup
  useEffect(() => {
    if (!isOpen) return;

    const startCamera = async () => {
      setCameraError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: 640, height: 480 } 
        });
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.error("Camera error:", err);
        setCameraError("Camera access denied or unavailable.");
      }
    };

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const handlePunch = async () => {
    setIsPunching(true);
    try {
      // 1. Capture snapshot directly from video stream
      let selfieBase64 = '';
      if (canvasRef.current && videoRef.current) {
        const context = canvasRef.current.getContext('2d');
        if (context) {
          // Crop center to 1:1 aspect ratio (480x480 out of 640x480)
          context.drawImage(videoRef.current, 80, 0, 480, 480, 0, 0, 480, 480);
          selfieBase64 = canvasRef.current.toDataURL('image/jpeg', 0.85);
        }
      }
      
      if (!selfieBase64) {
        throw new Error("Could not capture webcam snapshot. Please ensure camera access is allowed.");
      }

      // 2. Upload selfie to Supabase Storage
      const base64Response = await fetch(selfieBase64);
      const blob = await base64Response.blob();
      const fileName = `${activeStaff.id}/${Date.now()}.jpg`;
      
      const { error: uploadErr } = await supabase.storage
        .from('attendance')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('attendance')
        .getPublicUrl(fileName);

      // 3. Perform Time Calculations
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeVal = currentHour * 60 + currentMinute; // minutes since midnight

      if (punchType === 'IN') {
        let status: 'PRESENT' | 'LATE' | 'HALF_DAY' = 'PRESENT';
        
        // Resolve dynamic shift start time
        let shiftStartMin = 570; // fallback to 9:30 AM (9 * 60 + 30)
        if (activeStaff?.shift_start_time) {
          const parts = activeStaff.shift_start_time.split(':');
          if (parts.length >= 2) {
            shiftStartMin = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
          }
        }
        
        // Allowed late buffer (2 hours). e.g., 9:30 to 11:30 is LATE. After 11:30 is HALF DAY.
        const lateThresholdMin = shiftStartMin + 120; 

        if (currentTimeVal > lateThresholdMin) {
          status = 'HALF_DAY';
        } else if (currentTimeVal > shiftStartMin + 5) {
          status = 'LATE'; // +5 mins grace period
        }

        await punchIn(publicUrl, userCoords?.lat || OFFICE_COORDS.lat, userCoords?.lng || OFFICE_COORDS.lng, status);
        alert(`Successfully punched in! Status: ${status}`);
      } else {
        // Punch Out
        let status: 'PRESENT' | 'LATE' | 'HALF_DAY' = 'PRESENT';
        await punchOut(status);
        alert(`Successfully punched out! Status: ${status}`);
      }

      handleClose();
    } catch (err: any) {
      alert("Punch action failed: " + err.message);
    } finally {
      setIsPunching(false);
    }
  };

  if (!isOpen) return null;

  const distance = userCoords 
    ? getHaversineDistance(userCoords.lat, userCoords.lng, OFFICE_COORDS.lat, OFFICE_COORDS.lng) 
    : null;
  const isOutOfRange = distance === null || distance > 20000; // 20km for testing? Should normally be smaller

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-[400px] p-6 relative space-y-6 text-center max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        {/* Close Button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title / Header */}
        <div>
          <h3 className="font-bold text-slate-800 dark:text-white text-base tracking-wide flex items-center justify-center gap-2">
            <Camera className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span>Punch {punchType} Selfie</span>
          </h3>
        </div>

        {/* Warning/Status Banner */}
        {distance === null ? (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider animate-pulse flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
            Acquiring GPS location...
          </div>
        ) : distance > 20000 ? (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-black uppercase tracking-widest animate-bounce">
            🛑 TOO FAR! ({distance.toFixed(0)}m)
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest">
            ✅ WITHIN RANGE ({distance.toFixed(0)}m)
          </div>
        )}

        {/* Webcam Live Feed */}
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-950 shadow-inner">
          {cameraError ? (
            <div className="absolute inset-0 flex items-center justify-center text-center p-4 text-rose-400 text-xs font-semibold">
              {cameraError}
            </div>
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover scale-x-[-1]"
            />
          )}
        </div>

        {/* Hidden canvas for snapshot */}
        <canvas ref={canvasRef} className="hidden" width={480} height={480} />

        {/* Confirmation action */}
        <div className="pt-2">
          <button 
            disabled={isOutOfRange || isPunching}
            onClick={handlePunch}
            className={`w-full font-extrabold py-4 text-xs tracking-wider uppercase rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg border cursor-pointer ${
              isOutOfRange 
                ? 'bg-slate-800 text-slate-500 border-slate-700 opacity-50 cursor-not-allowed' 
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5 border-emerald-400/25 active:scale-95'
            }`}
          >
            {isPunching ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verifying...
              </>
            ) : (
              'CONFIRM SELFIE PUNCH'
            )}
          </button>
        </div>
      </Card>
    </div>
  );
};

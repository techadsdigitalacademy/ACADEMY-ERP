import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { compressSelfieFromVideo, extensionForBlob } from '../../utils/imageUtils';
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
  // Office geofence. A punch is only accepted from inside this radius.
  // Overridable per-deployment so moving office does not need a code change.
  const OFFICE_COORDS = {
    lat: Number(import.meta.env.VITE_OFFICE_LAT ?? 10.934485),
    lng: Number(import.meta.env.VITE_OFFICE_LNG ?? 76.001633)
  };
  const GEOFENCE_RADIUS_M = Number(import.meta.env.VITE_GEOFENCE_RADIUS_M ?? 50);

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
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
          setUserCoords({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy });
        },
        (error) => {
          console.error("Location tracking error:", error);
        },
        { enableHighAccuracy: true }
      );

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserCoords({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy });
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
      // 1. Capture & compress snapshot directly from video stream (lightweight WebP ~15-25KB)
      let blob: Blob | null = null;
      if (videoRef.current) {
        blob = await compressSelfieFromVideo(videoRef.current, 360, 0.72);
      }

      if (!blob) {
        throw new Error("Could not capture webcam snapshot. Please ensure camera access is allowed.");
      }

      // 2. Upload selfie to Supabase Storage
      const fileName = `${activeStaff.id}/${Date.now()}.${extensionForBlob(blob)}`;

      let selfiePublicUrl = '';
      try {
        const { error: uploadErr } = await supabase.storage
          .from('attendance')
          .upload(fileName, blob, {
            contentType: blob.type,
            cacheControl: '31536000',
            upsert: true
          });

        if (uploadErr) throw uploadErr;

        const { data: { publicUrl } } = supabase.storage
          .from('attendance')
          .getPublicUrl(fileName);
        selfiePublicUrl = publicUrl;
      } catch (storageErr) {
        console.warn('Direct selfie upload error, attempting proxy upload fallback:', storageErr);
        const proxyRes = await fetch(`/supabase-admin/storage/v1/object/attendance/${fileName}`, {
          method: 'POST',
          headers: {
            'Content-Type': blob.type,
            'x-upsert': 'true'
          },
          body: blob
        });

        if (!proxyRes.ok) {
          throw storageErr;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('attendance')
          .getPublicUrl(fileName);
        selfiePublicUrl = publicUrl;
      }

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

        if (!userCoords) throw new Error('Location unavailable — cannot record punch.');
        await punchIn(selfiePublicUrl, userCoords.lat, userCoords.lng, status);
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

  // A reading less precise than the radius itself cannot prove the user is
  // inside it, so treat it as unusable rather than letting it pass or fail
  // at random.
  const isFixUnreliable = userCoords !== null && userCoords.accuracy > GEOFENCE_RADIUS_M;
  const isOutOfRange = distance === null || isFixUnreliable || distance > GEOFENCE_RADIUS_M;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
      <Card className="w-full max-w-[400px] p-6 relative space-y-6 text-center max-h-[90vh] overflow-y-auto bg-card dark:bg-card border border-border dark:border-border shadow-2xl">
        {/* Close Button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-muted dark:bg-muted hover:bg-muted dark:hover:bg-muted text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title / Header */}
        <div>
          <h3 className="font-bold text-foreground dark:text-white text-base tracking-wide flex items-center justify-center gap-2">
            <Camera className="w-5 h-5 text-primary dark:text-primary" />
            <span>Punch {punchType} Selfie</span>
          </h3>
        </div>

        {/* Warning/Status Banner */}
        {distance === null ? (
          <div className="p-3.5 rounded-md bg-warning-soft border border-warning/20 text-warning text-xs font-bold uppercase tracking-wider animate-pulse flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-warning animate-ping"></span>
            Acquiring GPS location...
          </div>
        ) : isFixUnreliable ? (
          <div className="p-3.5 rounded-md bg-warning-soft border border-warning/20 text-warning text-xs font-bold uppercase tracking-wider">
            GPS too imprecise (±{userCoords?.accuracy.toFixed(0)}m) — move near a window and wait
          </div>
        ) : distance > GEOFENCE_RADIUS_M ? (
          <div className="p-3.5 rounded-md bg-danger-soft border border-danger/20 text-danger text-xs font-black uppercase tracking-widest">
            Too far from office ({distance.toFixed(0)}m of {GEOFENCE_RADIUS_M}m)
          </div>
        ) : (
          <div className="p-3.5 rounded-md bg-success-soft border border-success/20 text-success text-xs font-black uppercase tracking-widest">
            At office ({distance.toFixed(0)}m)
          </div>
        )}

        {/* Webcam Live Feed */}
        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-card shadow-inner">
          {cameraError ? (
            <div className="absolute inset-0 flex items-center justify-center text-center p-4 text-danger text-xs font-semibold">
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


        {/* Confirmation action */}
        <div className="pt-2">
          <button 
            disabled={isOutOfRange || isPunching}
            onClick={handlePunch}
            className={`w-full font-extrabold py-4 text-xs tracking-wider uppercase rounded-md transition-all duration-300 flex items-center justify-center gap-2 shadow-lg border cursor-pointer ${
 isOutOfRange 
 ? 'bg-muted text-muted-foreground border-border opacity-50 cursor-not-allowed' 
 : 'bg-success text-white hover:brightness-110 border-success active:scale-95'
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

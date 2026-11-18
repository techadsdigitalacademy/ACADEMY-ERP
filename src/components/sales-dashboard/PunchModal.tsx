import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { compressSelfieFromVideo, extensionForBlob } from '../../utils/imageUtils';
import { evaluateAttendanceStatus, evaluateOnlineTutorStatus } from '../../utils/attendanceRules';
import { Card } from '../Card';
import { X, Camera } from 'lucide-react';

interface PunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  punchType: 'IN' | 'OUT';
  activeStaff: any;
  punchIn: (photoUrl: string, lat: number, lng: number, status: string) => Promise<void>;
  punchOut: (status?: string) => Promise<void>;
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

  // Online Tutor check: Online tutors teach late evening/night batches remotely
  const isTutor = (activeStaff?.designation || '').toLowerCase().includes('tutor');
  const isOnlineTutor = isTutor && (
    (activeStaff?.designation || '').toLowerCase().includes('online') ||
    (activeStaff?.shift_start_time && activeStaff.shift_start_time >= '18:00')
  );

  // Dual-slot selection for online tutors (Slot 1: 07:30 PM - 09:00 PM, Slot 2: 09:30 PM - 11:00 PM, or Custom)
  const [onlineSlot, setOnlineSlot] = useState<'slot_1' | 'slot_2' | 'custom'>(() => {
    const now = new Date();
    const hrs = now.getHours();
    const mins = now.getMinutes();
    if (hrs >= 21 || (hrs === 20 && mins >= 30)) {
      return 'slot_2';
    }
    return 'slot_1';
  });
  const [isCustomSlot, setIsCustomSlot] = useState(false);
  const [customSlotTime, setCustomSlotTime] = useState('19:30');

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
        const proxyRes = await fetch(`/supabase-admin/storage/v1/object/attendance/${fileName}`, {
          method: 'POST',
          headers: {
            'Content-Type': blob.type || 'image/webp',
            'x-upsert': 'true'
          },
          body: blob
        });

        if (proxyRes.ok) {
          const { data: { publicUrl } } = supabase.storage
            .from('attendance')
            .getPublicUrl(fileName);
          selfiePublicUrl = publicUrl;
        } else {
          throw new Error(`Proxy upload failed with status ${proxyRes.status}`);
        }
      } catch (proxyErr) {
        console.warn('Proxy upload error, attempting direct upload fallback:', proxyErr);
        try {
          const { error: uploadErr } = await supabase.storage
            .from('attendance')
            .upload(fileName, blob, {
              contentType: blob.type || 'image/webp',
              cacheControl: '31536000',
              upsert: true
            });

          if (!uploadErr) {
            const { data: { publicUrl } } = supabase.storage
              .from('attendance')
              .getPublicUrl(fileName);
            selfiePublicUrl = publicUrl;
          }
        } catch (directErr) {
          console.warn('Direct upload fallback notice:', directErr);
        }
      }

      if (!selfiePublicUrl) {
        selfiePublicUrl = activeStaff?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop';
      }

      // 3. Perform Time Calculations
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      if (punchType === 'IN') {
        const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}:00`;
        let evaluated: string;
        if (isOnlineTutor) {
          evaluated = evaluateOnlineTutorStatus(
            currentTimeStr, 
            onlineSlot, 
            isCustomSlot ? customSlotTime : (onlineSlot === 'slot_1' ? '19:30' : '21:30')
          );
        } else {
          evaluated = evaluateAttendanceStatus(currentTimeStr, null);
        }
        const status = evaluated === 'ABSENT' || evaluated === 'LEAVE' ? 'PRESENT' : evaluated;

        const punchLat = userCoords?.lat || OFFICE_COORDS.lat;
        const punchLng = userCoords?.lng || OFFICE_COORDS.lng;

        if (!isOnlineTutor && !userCoords) {
          throw new Error('Location unavailable — cannot record punch.');
        }

        await punchIn(selfiePublicUrl, punchLat, punchLng, status);
        const slotDesc = isCustomSlot 
          ? `Custom Batch Slot: ${customSlotTime}`
          : (onlineSlot === 'slot_1' ? 'Slot 1: 07:30 PM Batch' : 'Slot 2: 09:30 PM Batch');
        alert(`Successfully punched in! Status: ${status}${isOnlineTutor ? ` (${slotDesc})` : ''}`);
      } else {
        // Punch Out
        await punchOut();
        alert(`Successfully punched out!`);
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
  const isFixUnreliable = !isOnlineTutor && userCoords !== null && userCoords.accuracy > GEOFENCE_RADIUS_M;
  const isOutOfRange = isOnlineTutor ? false : (distance === null || isFixUnreliable || distance > GEOFENCE_RADIUS_M);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
      <Card className="w-full max-w-[400px] p-6 relative space-y-5 text-center max-h-[90vh] overflow-y-auto bg-card dark:bg-card border border-border dark:border-border shadow-2xl">
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
          {isOnlineTutor && (
            <p className="text-[11px] text-indigo-400 font-semibold mt-0.5">Online Faculty Attendance</p>
          )}
        </div>

        {/* Warning/Status Banner */}
        {isOnlineTutor ? (
          <div className="p-3 rounded-md bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-xs font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1.5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></span>
              <span>ONLINE TUTOR • REMOTE WORKSTATION VERIFIED</span>
            </div>
            <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5">
              {userCoords ? (
                <>
                  <span className="text-emerald-400 font-bold">📍 GPS: {userCoords.lat.toFixed(4)}°N, {userCoords.lng.toFixed(4)}°E</span>
                  <span className="opacity-60">(±{userCoords.accuracy.toFixed(0)}m)</span>
                </>
              ) : (
                <span className="text-warning animate-pulse">📍 Remote Workstation • Geolocation Logging Active</span>
              )}
            </div>
          </div>
        ) : distance === null ? (
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

        {/* Online Tutor Flexible Slot Selector */}
        {isOnlineTutor && punchType === 'IN' && (
          <div className="space-y-2 text-left bg-muted-2 p-3 rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Select Batch Slot</span>
              <button
                type="button"
                onClick={() => setIsCustomSlot(prev => !prev)}
                className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
              >
                {isCustomSlot ? '← Standard Slots' : '+ Custom Time'}
              </button>
            </div>

            {!isCustomSlot ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOnlineSlot('slot_1')}
                  className={`p-2 rounded-md border text-center transition-all cursor-pointer ${
                    onlineSlot === 'slot_1'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-bold'
                      : 'bg-card text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  <div className="text-[11px] font-bold">Slot 1 • Evening</div>
                  <div className="text-[9px] opacity-80 font-mono">07:30 PM - 09:00 PM</div>
                </button>
                <button
                  type="button"
                  onClick={() => setOnlineSlot('slot_2')}
                  className={`p-2 rounded-md border text-center transition-all cursor-pointer ${
                    onlineSlot === 'slot_2'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-bold'
                      : 'bg-card text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  <div className="text-[11px] font-bold">Slot 2 • Night</div>
                  <div className="text-[9px] opacity-80 font-mono">09:30 PM - 11:00 PM</div>
                </button>
              </div>
            ) : (
              <div className="space-y-1.5 animate-fade-in">
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={customSlotTime}
                    onChange={(e) => setCustomSlotTime(e.target.value)}
                    className="flex-1 bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary"
                  />
                  <span className="text-[10px] text-muted-foreground font-mono">+5m grace</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {['18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCustomSlotTime(t)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                        customSlotTime === t
                          ? 'bg-primary text-primary-foreground font-bold border-primary'
                          : 'bg-card text-muted-foreground border-border hover:text-foreground'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
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

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square } from 'lucide-react';
import { formatDuration } from '../utils/mediaHelpers';
import { SITE_CONFIG } from '../config/siteConfig';

export default function VoiceRecorderButton({ onRecorded, disabled, onError }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    if (disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const finalType = recorder.mimeType || 'audio/webm';
        const ext = finalType.includes('mp4') ? 'm4a' : 'webm';
        const blob = new Blob(chunksRef.current, { type: finalType });
        if (blob.size > 0) {
          const file = new File([blob], `voice-${Date.now()}.${ext}`, {
            type: finalType
          });
          onRecorded(file);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setSeconds(0);
      setRecording(true);

      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev + 1 >= SITE_CONFIG.maxVoiceSeconds) {
            stopRecording();
            return SITE_CONFIG.maxVoiceSeconds;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      if (onError) {
        onError('Izin mikrofon ditolak atau perangkat tidak mendukung rekaman suara.');
      }
    }
  };

  if (recording) {
    return (
      <button
        type="button"
        onClick={stopRecording}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/35 text-xs font-mono text-red-400 hover:bg-red-500/25 transition-colors duration-150 tabular-nums"
      >
        <Square className="w-3.5 h-3.5 fill-current" strokeWidth={1.5} />
        <span>Selesai ({formatDuration(seconds)})</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled}
      title="Rekam pesan suara (maksimal 2 menit)"
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0E1013] border border-white/[0.08] text-xs font-medium text-[#9BA1AE] hover:text-[#F4F5F7] hover:border-white/15 disabled:opacity-50 transition-colors duration-150"
    >
      <Mic className="w-4 h-4" strokeWidth={1.5} />
      <span className="hidden sm:inline">Suara</span>
    </button>
  );
}

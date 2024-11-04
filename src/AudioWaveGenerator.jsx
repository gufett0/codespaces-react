import { useState, useRef, useEffect } from 'react';
import './AudioWaveGenerator.css'; 

const AudioWaveGenerator = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainNodeRef = useRef(null);
  const lastMousePositionRef = useRef({ x: 0, y: 0 });
  const lastMoveTimeRef = useRef(Date.now());

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    gainNodeRef.current = audioContextRef.current.createGain();
    gainNodeRef.current.connect(audioContextRef.current.destination);
    gainNodeRef.current.gain.value = 0.1;

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startSound = () => {
    if (!isPlaying && audioContextRef.current) {
      audioContextRef.current.resume().then(() => {
        oscillatorRef.current = audioContextRef.current.createOscillator();
        oscillatorRef.current.type = 'sine';
        oscillatorRef.current.frequency.setValueAtTime(440, audioContextRef.current.currentTime);
        oscillatorRef.current.connect(gainNodeRef.current);
        oscillatorRef.current.start();
        setIsPlaying(true);
      });
    }
  };

  const stopSound = () => {
    if (isPlaying) {
      oscillatorRef.current.stop();
      oscillatorRef.current.disconnect();
      setIsPlaying(false);
    }
  };

  const handleMouseMove = (e) => {
    if (isPlaying) {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastMoveTimeRef.current;
      
      const dx = e.clientX - lastMousePositionRef.current.x;
      const dy = e.clientY - lastMousePositionRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const speed = distance / timeDiff;
      
      const minFreq = 220;
      const maxFreq = 880;
      const frequency = minFreq + (speed * 1000);
      const clampedFreq = Math.min(Math.max(frequency, minFreq), maxFreq);
      
      oscillatorRef.current.frequency.setValueAtTime(
        clampedFreq,
        audioContextRef.current.currentTime
      );

      lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
      lastMoveTimeRef.current = currentTime;
    }
  };

  return (
    <div className="container">
      <div 
        className={`wave-generator ${isPlaying ? 'playing' : ''}`}
        onMouseEnter={startSound}
        onMouseLeave={stopSound}
        onMouseMove={handleMouseMove}
      >
        <p className="instruction-text">
          Move mouse here to generate sound
        </p>
      </div>
    </div>
  );
};

export default AudioWaveGenerator;
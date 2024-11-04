import { useState, useRef, useEffect } from 'react';
import './AudioWaveGenerator.css';

const AudioWaveGenerator = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainNodeRef = useRef(null);
  const noiseSourceRef = useRef(null);
  const lastMousePositionRef = useRef(null);
  const lastMoveTimeRef = useRef(null);
  const lastFrequencyRef = useRef(440);
  
  const [debug, setDebug] = useState({
    distance: 0,
    speed: 0,
    frequency: 440
  });

  const createNoiseBuffer = (frequency) => {
    const buffer = audioContextRef.current.createBuffer(
      1, 
      audioContextRef.current.sampleRate * 0.2,
      audioContextRef.current.sampleRate
    );
    const audioData = buffer.getChannelData(0);
    
    // Normalize frequency to get a reasonable multiplier (220Hz - 880Hz range)
    const freqFactor = (frequency - 220) / (880 - 220); // 0 to 1 range
    
    for(let i = 0; i < audioData.length; i++) {
      const noise = Math.random() * 2 - 1;
      // Use frequency to modulate noise amplitude
      // Higher frequencies will have more prominent high-amplitude noise
      const amplitude = 0.2 + (freqFactor * 0.7); // Range from 0.3 to 1.0
      
      // Add some periodic variation based on frequency
      const periodicFactor = Math.sin(2 * Math.PI * i * (frequency*0.6) / audioContextRef.current.sampleRate);
      
      // Combine noise with frequency-dependent modulation
      audioData[i] = noise * amplitude * (1 + periodicFactor * 1.5);
    }
    return buffer;
  };

  const playNoise = () => {
    if (audioContextRef.current && gainNodeRef.current) {
      // Stop previous noise if any
      if (noiseSourceRef.current) {
        try {
          noiseSourceRef.current.stop();
          noiseSourceRef.current.disconnect();
        } catch (e) {
          console.log('Previous noise already stopped');
        }
      }

      // Create and configure new noise source
      noiseSourceRef.current = audioContextRef.current.createBufferSource();
      noiseSourceRef.current.buffer = createNoiseBuffer(lastFrequencyRef.current);
      noiseSourceRef.current.connect(gainNodeRef.current);
      noiseSourceRef.current.start();
    }
  }

  const handleClick = (e) => {
    if (isInitialized) {
      playNoise();
    }
  };

  const initializeAudioContext = async () => {
    if (!isInitialized) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      await audioContextRef.current.resume();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
      gainNodeRef.current.gain.value = 0.1;
      setIsInitialized(true);
    }
  };


  
  const cleanup = () => {
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
      } catch (e) {
        console.log('Oscillator already stopped');
      }
    }
    if (noiseSourceRef.current) {
      try {
        noiseSourceRef.current.stop();
        noiseSourceRef.current.disconnect();
        noiseSourceRef.current = null;
      } catch (e) {
        console.log('Noise already stopped');
      }
    }
    setIsPlaying(false);
    lastMousePositionRef.current = null;
    lastMoveTimeRef.current = null;
  };

  useEffect(() => {
    return () => {
      cleanup();
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        setIsInitialized(false);
      }
    };
  }, []);

  const startSound = async () => {
    cleanup();

    try {
      if (!isInitialized) {
        await initializeAudioContext();
      }

      if (audioContextRef.current.state !== 'running') {
        await audioContextRef.current.resume();
      }

      oscillatorRef.current = audioContextRef.current.createOscillator();
      oscillatorRef.current.type = 'sine';
      oscillatorRef.current.frequency.setValueAtTime(
        lastFrequencyRef.current,
        audioContextRef.current.currentTime
      );
      oscillatorRef.current.connect(gainNodeRef.current);
      oscillatorRef.current.start();
      setIsPlaying(true);
    } catch (e) {
      console.error('Error starting sound:', e);
      cleanup();
    }
  };

  const calculateNewFrequency = (distance, timeDiff) => {
    // Convert timeDiff to seconds for more intuitive speed calculation
    const timeInSeconds = timeDiff / 1000;
    // Calculate speed in pixels per second
    const speed = timeInSeconds > 0 ? distance / timeInSeconds : 0;
    
    const minFreq = 220;  // A3
    const maxFreq = 880;  // A5
    
    // Adjust these values to tune the response
    const speedMultiplier = 1.5;  // Adjust this to make frequency more or less sensitive to speed
    const frequency = minFreq + (speed * speedMultiplier);
    const clampedFreq = Math.min(Math.max(frequency, minFreq), maxFreq);
    
    return {
      speed,
      frequency: clampedFreq
    };
  };

  const handleMouseEnter = async (e) => {
    try {
      // Initialize position on mouse enter
      lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
      lastMoveTimeRef.current = Date.now();
      await startSound();
    } catch (e) {
      console.error('Error on mouse enter:', e);
      cleanup();
    }
  };

  const handleMouseLeave = () => {
    cleanup();
  };

  const handleMouseMove = (e) => {
    if (isPlaying && oscillatorRef.current && audioContextRef.current?.state === 'running') {
      const currentTime = Date.now();
      
      // Skip first movement as we don't have a previous position
      if (!lastMousePositionRef.current || !lastMoveTimeRef.current) {
        lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
        lastMoveTimeRef.current = currentTime;
        return;
      }

      const dx = e.clientX - lastMousePositionRef.current.x;
      const dy = e.clientY - lastMousePositionRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const timeDiff = currentTime - lastMoveTimeRef.current;

      // Only update if we have meaningful movement and time difference
      if (distance > 0 && timeDiff > 0) {
        const { speed, frequency } = calculateNewFrequency(distance, timeDiff);

        try {
          oscillatorRef.current.frequency.setValueAtTime(
            frequency,
            audioContextRef.current.currentTime
          );
          lastFrequencyRef.current = frequency;
          
          // Update debug info
          setDebug({
            distance: Math.round(distance),
            speed: Math.round(speed),
            frequency: Math.round(frequency)
          });
        } catch (e) {
          console.error('Error updating frequency:', e);
          cleanup();
        }
      }

      lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
      lastMoveTimeRef.current = currentTime;
    }
  };

  return (
    <div className="container">
      <h1 className="text-4xl font-bold mb-12">annoying mosquito</h1>

      <div 
        className={`wave-generator ${isPlaying ? 'playing' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        onClick={handleClick}  
      >
        <p className="instruction-text">
          {isInitialized 
            ? "" 
            : "Click to initialize audio"}
        </p>
      </div>
      {/* Debug display moved outside the wave generator */}
      <div className="debug-info">
        <p>Distance: {debug.distance}px</p>
        <p>Speed: {debug.speed}px/s</p>
        <p>Frequency: {debug.frequency}Hz</p>
      </div>
    </div>
  );
};

export default AudioWaveGenerator;
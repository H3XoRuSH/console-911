import React, { useState, useEffect, useRef } from 'react';

interface TypewriterTextProps {
  text: string;
  speed: number;
  onComplete?: () => void;
  onCharAdded?: () => void;
  soundVolume?: number;
}

let audioCtx: AudioContext | null = null;
function playTypingClick(volumePercent: number = 100) {
  if (typeof window === 'undefined') return;
  if (volumePercent <= 0) return;
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if (audioCtx) {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600 + Math.random() * 150, audioCtx.currentTime);
      const targetGain = 0.015 * (volumePercent / 100);
      gainNode.gain.setValueAtTime(targetGain, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.03);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.03);
    }
  } catch (err) {
    console.error('Error playing typing click sound:', err);
  }
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed,
  onComplete,
  onCharAdded,
  soundVolume = 100
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const textRef = useRef(text);
  const indexRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  const onCharAddedRef = useRef(onCharAdded);
  const speedRef = useRef(speed);
  const soundVolumeRef = useRef(soundVolume);

  useEffect(() => {
    textRef.current = text;
    onCompleteRef.current = onComplete;
    onCharAddedRef.current = onCharAdded;
    speedRef.current = speed;
    soundVolumeRef.current = soundVolume;
  }, [text, onComplete, onCharAdded, speed, soundVolume]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayedText('');
    indexRef.current = 0;

    const interval = setInterval(() => {
      const fullText = textRef.current;
      const index = indexRef.current;

      if (index < fullText.length) {
        const nextChar = fullText[index];
        setDisplayedText((prev) => prev + nextChar);
        indexRef.current = index + 1;

        if (nextChar !== ' ') {
          playTypingClick(soundVolumeRef.current);
        }

        if (onCharAddedRef.current) {
          onCharAddedRef.current();
        }
      } else {
        clearInterval(interval);
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
      }
    }, speedRef.current);

    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayedText}</span>;
};

/**
 * Phoneme Extractor - Handles phoneme extraction for lip sync
 * 
 * This module provides:
 * - Viseme timeline data structures
 * - Phoneme to viseme conversion utilities
 * - Audio playback synchronization
 */

export interface PhonemeEntry {
  time: number;      // Time in seconds
  value: string;     // Phoneme symbol (e.g., 'A', 'B', 'C')
}

export interface PhonemeTimeline {
  entries: PhonemeEntry[];
  duration: number;
}

export interface VisemeEntry {
  time: number;
  viseme: string;
}

export interface VisemeTimeline {
  entries: VisemeEntry[];
  duration: number;
}

/**
 * Generate a simple viseme timeline from text
 * This is a fallback when Rhubarb Lip Sync is not available
 * 
 * @param text - Input text to generate timeline for
 * @param duration - Estimated duration in seconds
 * @returns VisemeTimeline
 */
export function generateVisemeTimeline(text: string, duration: number): VisemeTimeline {
  const entries: VisemeEntry[] = [];
  
  // Simple estimation based on character count
  // Average speaking rate: ~150 words per minute = 2.5 words/second
  const wordCount = text.split(/\s+/).length;
  const avgTimePerWord = duration / Math.max(1, wordCount);
  
  // Generate basic viseme pattern
  const visemes = ['A', 'B', 'A', 'C', 'A', 'B', 'A', 'D', 'A', 'B'];
  let currentTime = 0;
  
  for (let i = 0; i < Math.min(visemes.length, Math.ceil(text.length / 3)); i++) {
    entries.push({
      time: currentTime,
      viseme: visemes[i % visemes.length],
    });
    currentTime += avgTimePerWord * 1.5;
  }
  
  return {
    entries,
    duration: currentTime,
  };
}

/**
 * Convert phoneme timeline to viseme timeline
 * 
 * @param phonemeTimeline - Raw phoneme data
 * @param visemeMap - Mapping from phonemes to visemes
 * @returns VisemeTimeline
 */
export function convertToVisemeTimeline(
  phonemeTimeline: PhonemeTimeline,
  visemeMap: Record<string, string>
): VisemeTimeline {
  const visemeEntries: VisemeEntry[] = [];
  
  for (const entry of phonemeTimeline.entries) {
    const viseme = visemeMap[entry.value] || 'neutral';
    visemeEntries.push({
      time: entry.time,
      viseme,
    });
  }
  
  return {
    entries: visemeEntries,
    duration: phonemeTimeline.duration,
  };
}

/**
 * Get the current viseme based on audio playback time
 * 
 * @param timeline - Viseme timeline
 * @param currentTime - Current audio playback time
 * @returns The active viseme and blend factor to next viseme
 */
export function getCurrentViseme(
  timeline: VisemeTimeline,
  currentTime: number
): { viseme: string; blend: number } {
  if (timeline.entries.length === 0) {
    return { viseme: 'neutral', blend: 0 };
  }
  
  // Find the current and next viseme
  let currentIndex = -1;
  
  for (let i = 0; i < timeline.entries.length; i++) {
    if (timeline.entries[i].time <= currentTime) {
      currentIndex = i;
    } else {
      break;
    }
  }
  
  if (currentIndex < 0) {
    return { viseme: 'neutral', blend: 0 };
  }
  
  if (currentIndex >= timeline.entries.length - 1) {
    return { viseme: timeline.entries[currentIndex].viseme, blend: 0 };
  }
  
  // Calculate blend factor between current and next viseme
  const current = timeline.entries[currentIndex];
  const next = timeline.entries[currentIndex + 1];
  const timeDiff = next.time - current.time;
  const timeInViseme = currentTime - current.time;
  
  const blend = timeDiff > 0 ? timeInViseme / timeDiff : 0;
  
  return {
    viseme: current.viseme,
    blend: Math.min(1, blend),
  };
}

/**
 * Preload audio and prepare for lip sync
 * 
 * @param audioUrl - URL or path to audio file
 * @returns HTMLAudioElement ready for playback
 */
export async function preloadAudio(audioUrl: string): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    
    audio.oncanplaythrough = () => {
      resolve(audio);
    };
    
    audio.onerror = () => {
      reject(new Error(`Failed to load audio: ${audioUrl}`));
    };
    
    audio.src = audioUrl;
    audio.load();
  });
}

/**
 * Create a simple test viseme timeline for demo purposes
 */
export function createDemoVisemeTimeline(): VisemeTimeline {
  return {
    entries: [
      { time: 0.0, viseme: 'A' },
      { time: 0.15, viseme: 'B' },
      { time: 0.30, viseme: 'A' },
      { time: 0.45, viseme: 'C' },
      { time: 0.60, viseme: 'A' },
      { time: 0.75, viseme: 'B' },
      { time: 0.90, viseme: 'A' },
      { time: 1.05, viseme: 'D' },
      { time: 1.20, viseme: 'A' },
      { time: 1.35, viseme: 'B' },
    ],
    duration: 1.5,
  };
}

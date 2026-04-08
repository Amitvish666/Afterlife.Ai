// Emotion Engine - Analyzes text and maps emotions to facial expressions

export type Emotion = 'happy' | 'sad' | 'angry' | 'neutral' | 'surprised' | 'scared';

export interface EmotionData {
  emotion: Emotion;
  intensity: number; // 0-1
  eyebrowRaise: number; // -1 to 1
  eyeOpenness: number; // 0 to 1
  mouthCurve: number; // -1 (frown) to 1 (smile)
  shoulderTension: number; // 0 to 1
}

// Simple keyword-based emotion detection
const emotionKeywords: Record<Emotion, string[]> = {
  happy: [
    'happy', 'joy', 'love', 'great', 'wonderful', 'amazing', 'fantastic', 
    'good', 'excellent', 'beautiful', 'lovely', 'glad', 'pleased', 'delighted',
    'excited', 'thrilled', 'blessed', 'grateful', 'thank', 'appreciate', '😊', '🎉', '❤️'
  ],
  sad: [
    'sad', 'sorry', 'miss', 'lost', 'gone', 'passed', 'death', 'grief', 'mourning',
    'cry', 'tears', 'heartbroken', 'devastated', 'upset', 'depressed', 'lonely',
    'missing', 'pain', 'hurt', 'unfortunate', 'tragic', 'condolences', '😢', '💔'
  ],
  angry: [
    'angry', 'mad', 'furious', 'hate', 'terrible', 'awful', 'horrible', 'worst',
    'rage', 'frustrated', 'annoyed', 'irritated', 'upset', 'outraged', 'disgusted',
    'unacceptable', 'ridiculous', 'stupid', 'idiot', '😠', '😡'
  ],
  neutral: [
    'okay', 'fine', 'alright', 'normal', 'usual', 'regular', 'standard',
    'perhaps', 'maybe', 'probably', 'likely', 'possibly', 'maybe'
  ],
  surprised: [
    'wow', 'surprise', 'shocked', 'amazed', 'incredible', 'unbelievable',
    'astonished', 'astounded', 'speechless', 'unexpected', '😲', '😮'
  ],
  scared: [
    'scared', 'afraid', 'fear', 'terrified', 'horror', 'panic', 'worried',
    'anxious', 'nervous', 'dread', 'frightened', 'concerned', '😨', '😱'
  ],
};

// Analyze text and return emotion data
export function analyzeEmotion(text: string): EmotionData {
  const lowerText = text.toLowerCase();
  const scores: Record<Emotion, number> = {
    happy: 0,
    sad: 0,
    angry: 0,
    neutral: 0,
    surprised: 0,
    scared: 0,
  };

  // Count emotion keywords
  for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        scores[emotion as Emotion]++;
      }
    }
  }

  // Find dominant emotion
  let dominantEmotion: Emotion = 'neutral';
  let maxScore = 0;
  
  for (const [emotion, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      dominantEmotion = emotion as Emotion;
    }
  }

  // Calculate intensity based on keyword count
  const totalMatches = Object.values(scores).reduce((a, b) => a + b, 0);
  const intensity = Math.min(totalMatches / 5, 1);

  // Map emotion to facial parameters
  const facialParams = mapEmotionToFacial(dominantEmotion, intensity);

  return {
    emotion: dominantEmotion,
    intensity,
    ...facialParams,
  };
}

// Map emotion to facial expression parameters
function mapEmotionToFacial(emotion: Emotion, intensity: number): Omit<EmotionData, 'emotion' | 'intensity'> {
  const base = {
    eyebrowRaise: 0,
    eyeOpenness: 0.5,
    mouthCurve: 0,
    shoulderTension: 0,
  };

  switch (emotion) {
    case 'happy':
      return {
        eyebrowRaise: 0.2 * intensity,
        eyeOpenness: 0.7 * intensity,
        mouthCurve: 0.8 * intensity,
        shoulderTension: 0.1,
      };
    case 'sad':
      return {
        eyebrowRaise: -0.3 * intensity,
        eyeOpenness: 0.4 * intensity,
        mouthCurve: -0.6 * intensity,
        shoulderTension: 0.3 * intensity,
      };
    case 'angry':
      return {
        eyebrowRaise: -0.4 * intensity,
        eyeOpenness: 0.6 * intensity,
        mouthCurve: -0.4 * intensity,
        shoulderTension: 0.8 * intensity,
      };
    case 'surprised':
      return {
        eyebrowRaise: 0.8 * intensity,
        eyeOpenness: 1.0 * intensity,
        mouthCurve: 0.2 * intensity,
        shoulderTension: 0.2,
      };
    case 'scared':
      return {
        eyebrowRaise: 0.7 * intensity,
        eyeOpenness: 0.9 * intensity,
        mouthCurve: -0.3 * intensity,
        shoulderTension: 0.9 * intensity,
      };
    default:
      return base;
  }
}

// Get color for emotion (for UI indicators)
export function getEmotionColor(emotion: Emotion): string {
  const colors: Record<Emotion, string> = {
    happy: '#10b981', // Green
    sad: '#3b82f6', // Blue
    angry: '#ef4444', // Red
    neutral: '#6b7280', // Gray
    surprised: '#f59e0b', // Yellow
    scared: '#8b5cf6', // Purple
  };
  return colors[emotion];
}

// Get emoji for emotion
export function getEmotionEmoji(emotion: Emotion): string {
  const emojis: Record<Emotion, string> = {
    happy: '😊',
    sad: '😢',
    angry: '😠',
    neutral: '😐',
    surprised: '😲',
    scared: '😨',
  };
  return emojis[emotion];
}

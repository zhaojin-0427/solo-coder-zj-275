export type FlowerType = 'main' | 'filler' | 'wrapping';

export type Scene = 'birthday' | 'wedding' | 'condolence' | 'graduation' | 'romantic' | 'appreciation';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface FlowerColor {
  name: string;
  hex: string;
  hue: number;
}

export interface Flower {
  id: string;
  name: string;
  type: FlowerType;
  color: FlowerColor;
  price: number;
  meaning: string;
  seasons: Season[];
  unlocked: boolean;
  description: string;
}

export interface Bouquet {
  mainFlower: Flower | null;
  fillerFlowers: Flower[];
  wrapping: Flower | null;
}

export interface LevelConfig {
  id: number;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  scene: Scene;
  requiredFlowerMeanings: string[];
  budget: number;
  timeLimit: number;
  season: Season;
  targetScore: number;
  unlockReward?: string[];
  harmonyHint: string;
}

export interface ScoreResult {
  totalScore: number;
  colorHarmonyScore: number;
  meaningScore: number;
  budgetScore: number;
  seasonalScore: number;
  colorHarmonyType: string;
  feedback: string[];
  passed: boolean;
}

export interface GameProgress {
  highScores: Record<number, number>;
  unlockedFlowers: string[];
  completedLevels: number[];
}

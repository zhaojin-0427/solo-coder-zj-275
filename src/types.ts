export type FlowerType = 'main' | 'filler' | 'wrapping';

export type Scene = 'birthday' | 'wedding' | 'condolence' | 'graduation' | 'romantic' | 'appreciation';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type OrderDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type ColorPalette = 'warm' | 'cool' | 'pastel' | 'monochrome' | 'vibrant' | 'elegant';

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
  bonusScore: number;
  timeBonusScore: number;
  colorHarmonyType: string;
  feedback: string[];
  passed: boolean;
}

export interface GameProgress {
  highScores: Record<number, number>;
  unlockedFlowers: string[];
  completedLevels: number[];
  completedOrders: CompletedOrderRecord[];
  customerReputation: number;
  coins: number;
  achievements: string[];
}

export interface BonusTarget {
  id: string;
  description: string;
  points: number;
  type: 'color' | 'meaning' | 'budget' | 'season' | 'time' | 'special';
  check: (bouquet: Bouquet, order: Order, result: ScoreResult) => boolean;
}

export interface Order {
  id: string;
  customerName: string;
  customerAvatar: string;
  title: string;
  description: string;
  difficulty: OrderDifficulty;
  scene: Scene;
  budget: number;
  season: Season;
  forbiddenFlowerIds: string[];
  requiredMeanings: string[];
  preferredPalette: ColorPalette;
  preferredColorHues?: number[];
  minHarmonyScore: number;
  timeLimit: number;
  targetScore: number;
  bonusTargets: BonusTarget[];
  unlockReward?: string[];
  coinReward: number;
  reputationReward: number;
  harmonyHint: string;
  deadline: number;
  orderPoolSeed: number;
}

export interface CompletedOrderRecord {
  orderId: string;
  orderTitle: string;
  score: number;
  passed: boolean;
  completedAt: number;
  earnedCoins: number;
  earnedReputation: number;
  unlockedFlowers: string[];
  achievedBonuses: string[];
  flowerIdsUsed: string[];
}

export interface OrderFilter {
  difficulty?: OrderDifficulty[];
  scene?: Scene[];
  season?: Season[];
  minBudget?: number;
  maxBudget?: number;
  hasBonus?: boolean;
}

export interface OrderPool {
  orders: Order[];
  generatedAt: number;
  refreshCooldown: number;
}

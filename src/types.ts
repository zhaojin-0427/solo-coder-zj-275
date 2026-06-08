export type FlowerType = 'main' | 'filler' | 'wrapping';

export type Scene = 'birthday' | 'wedding' | 'condolence' | 'graduation' | 'romantic' | 'appreciation';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type ColorPalette = 'warm' | 'cool' | 'pastel' | 'monochrome' | 'vibrant' | 'elegant';

export type OrderDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type CustomerTagType =
  | 'romantic_lover' | 'budget_sensitive' | 'color_picky' | 'meaning_focused'
  | 'season_prefers_spring' | 'season_prefers_summer' | 'season_prefers_autumn' | 'season_prefers_winter'
  | 'scene_birthday' | 'scene_wedding' | 'scene_condolence' | 'scene_graduation' | 'scene_romantic' | 'scene_appreciation'
  | 'warm_palette' | 'cool_palette' | 'pastel_palette' | 'monochrome_palette' | 'vibrant_palette' | 'elegant_palette'
  | 'loyal_customer' | 'high_satisfaction' | 'difficult_pleaser' | 'quick_turnaround' | 'premium_client';

export type ProfessionRank = 'apprentice' | 'junior' | 'intermediate' | 'senior' | 'master' | 'grandmaster';

export type SkillId =
  | 'customer_charm' | 'meaning_master' | 'color_expert' | 'budget_whiz'
  | 'season_sense' | 'speed_arranger' | 'forbidden_detector' | 'bonus_hunter'
  | 'palette_sense' | 'reputation_builder' | 'flower_discount' | 'reputation_recovery';

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
  timeBonusScore?: number;
}

export interface ScoreDetail {
  meaningMatchScore: number;
  paletteMatchScore: number;
  budgetControlScore: number;
  forbiddenAvoidanceScore: number;
  seasonFitScore: number;
  bonusAchievementScore: number;
}

export interface BonusTarget {
  id: string;
  description: string;
  points: number;
  type?: string;
  check: (bouquet: Bouquet, order: Order, result: ScoreResult) => boolean;
}

export interface Order {
  id: string;
  title: string;
  description: string;
  difficulty: OrderDifficulty;
  scene: Scene;
  season: Season;
  budget: number;
  timeLimit: number;
  targetScore: number;
  minHarmonyScore: number;
  requiredMeanings: string[];
  preferredColorHues?: number[];
  preferredPalette: ColorPalette;
  forbiddenFlowerIds: string[];
  bonusTargets: BonusTarget[];
  coinReward: number;
  reputationReward: number;
  unlockReward?: string[];
  customerId: string;
  customerName: string;
  customerAvatar: string;
  isRepurchase?: boolean;
  customerNotes?: string;
  harmonyHint?: string;
  deadline?: number;
  orderPoolSeed?: number;
}

export interface OrderFilter {
  difficulty?: OrderDifficulty[];
  scene?: Scene[];
}

export interface OrderPool {
  orders: Order[];
}

export interface CustomerProfile {
  id: string;
  name: string;
  avatar: string;
  satisfaction: number;
  repurchaseProbability: number;
  totalOrders: number;
  completedOrders: number;
  failedOrders: number;
  lifetimeValue: number;
  totalSpent: number;
  tags: CustomerTagType[];
  preferredScenes: Scene[];
  preferredSeasons: Season[];
  preferredPalettes: ColorPalette[];
  preferredMeanings: string[];
  createdAt?: number;
  lastOrderAt?: number | null;
  tone?: string;
  notes?: string;
}

export interface CustomerVisitRecord {
  orderId: string;
  orderTitle: string;
  timestamp?: number;
  passed: boolean;
  score: number;
  satisfactionDelta: number;
  repurchaseDelta: number;
  spent?: number;
  tagsAdded?: CustomerTagType[];
  at?: number;
}

export interface CustomerOrderHistory {
  customerId: string;
  visits: CustomerVisitRecord[];
}

export interface CustomerSatisfactionResult {
  satisfaction: number;
  satisfactionChange?: number;
  satisfactionDelta: number;
  repurchaseProbability: number;
  repurchaseChange?: number;
  repurchaseDelta: number;
  newTags: CustomerTagType[];
  scoreDetail: ScoreDetail;
  feedback: string[];
}

export interface ProfessionSkill {
  id: SkillId;
  name: string;
  description: string;
  maxLevel: number;
  currentLevel: number;
  icon: string;
  effectPerLevel: string;
}

export interface ProfessionLevelConfig {
  rank: ProfessionRank;
  name: string;
  title: string;
  icon: string;
  requiredExp: number;
  requiredReputation: number;
  flowerDiscount: number;
  orderRewardMultiplier: number;
  unlockSkillSlots: number;
}

export interface ReputationStatus {
  currentReputation: number;
  penaltyActive: boolean;
  penaltyAmount: number;
  penaltyReason: string;
  penaltyExpiresAt?: number | null;
  consecutiveFailures?: number;
  lastFailedAt?: number;
  recoveryRatePerOrder: number;
}

export interface CompletedOrderRecord {
  orderId: string;
  orderTitle: string;
  timestamp: number;
  score: number;
  passed: boolean;
  earnedCoins: number;
  earnedReputation: number;
  earnedExp: number;
  unlockedFlowers: string[];
  customerId: string;
  satisfaction: number;
  repurchaseProbability: number;
  scoreDetail: ScoreDetail;
  isRepurchase?: boolean;
}

export interface OrderExtendedResult {
  scoreResult: ScoreResult;
  earnedCoins: number;
  earnedReputation: number;
  earnedExp: number;
  passed: boolean;
  newAchievements: string[];
  newUnlocks: string[];
  customerResult?: CustomerSatisfactionResult;
  professionExpGained: number;
  newRank?: ProfessionRank;
  reputationChange: number;
}

export interface GameProgress {
  highScores: Record<number, number>;
  unlockedFlowers: string[];
  completedLevels: number[];
  completedOrders: CompletedOrderRecord[];
  coins: number;
  customerReputation: number;
  achievements: string[];
  firstPlayTime: number;
  lastPlayTime: number;
  totalPlayTime: number;
  totalEarnedCoins: number;
  customers: Record<string, CustomerProfile>;
  customerHistories: Record<string, CustomerOrderHistory>;
  professionRank: ProfessionRank;
  professionExp: number;
  skills: Record<SkillId, number>;
  reputationStatus: ReputationStatus;
  totalCompletedOrders: number;
  totalPassedOrders: number;
  totalFailedOrders: number;
  satisfiedCustomers: number;
  repurchaseOrders: number;
}

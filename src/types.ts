export type FlowerType = 'main' | 'filler' | 'wrapping';

export type Scene = 'birthday' | 'wedding' | 'condolence' | 'graduation' | 'romantic' | 'appreciation';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type OrderDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type ColorPalette = 'warm' | 'cool' | 'pastel' | 'monochrome' | 'vibrant' | 'elegant';

export type CustomerTagType = 'romantic_lover' | 'budget_sensitive' | 'color_picky' | 'meaning_focused' |
  'season_prefers_spring' | 'season_prefers_summer' | 'season_prefers_autumn' | 'season_prefers_winter' |
  'scene_birthday' | 'scene_wedding' | 'scene_condolence' | 'scene_graduation' | 'scene_romantic' | 'scene_appreciation' |
  'warm_palette' | 'cool_palette' | 'pastel_palette' | 'monochrome_palette' | 'vibrant_palette' | 'elegant_palette' |
  'loyal_customer' | 'high_satisfaction' | 'difficult_pleaser' | 'quick_turnaround' | 'premium_client';

export type ProfessionRank = 'apprentice' | 'junior' | 'intermediate' | 'senior' | 'master' | 'grandmaster';

export type SkillId = 'color_expert' | 'meaning_master' | 'budget_whiz' | 'season_sense' | 'speed_arranger' |
  'forbidden_detector' | 'palette_sense' | 'bonus_hunter' | 'customer_charm' | 'reputation_builder';

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

export interface OrderFilter {
  difficulty?: OrderDifficulty[];
  scene?: Scene[];
  season?: Season[];
  minBudget?: number;
  maxBudget?: number;
  hasBonus?: boolean;
}

export interface CustomerProfile {
  id: string;
  name: string;
  avatar: string;
  tone: string;
  satisfaction: number;
  tags: CustomerTagType[];
  totalOrders: number;
  completedOrders: number;
  failedOrders: number;
  repurchaseProbability: number;
  lastOrderAt: number | null;
  preferredPalettes: ColorPalette[];
  preferredScenes: Scene[];
  preferredSeasons: Season[];
  preferredMeanings: string[];
  totalSpent: number;
  lifetimeValue: number;
  notes: string;
}

export interface CustomerVisitRecord {
  orderId: string;
  orderTitle: string;
  score: number;
  passed: boolean;
  satisfactionDelta: number;
  repurchaseDelta: number;
  tagsAdded: CustomerTagType[];
  at: number;
}

export interface CustomerOrderHistory {
  customerId: string;
  visits: CustomerVisitRecord[];
}

export interface ScoreDetail {
  meaningMatchScore: number;
  paletteMatchScore: number;
  budgetControlScore: number;
  forbiddenAvoidanceScore: number;
  seasonFitScore: number;
  bonusAchievementScore: number;
}

export interface CustomerSatisfactionResult {
  satisfaction: number;
  satisfactionDelta: number;
  repurchaseProbability: number;
  repurchaseDelta: number;
  newTags: CustomerTagType[];
  feedback: string[];
  scoreDetail: ScoreDetail;
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
  requiredExp: number;
  requiredReputation: number;
  flowerDiscount: number;
  orderRewardMultiplier: number;
  unlockSkillSlots: number;
  icon: string;
}

export interface ReputationStatus {
  currentReputation: number;
  penaltyActive: boolean;
  penaltyAmount: number;
  penaltyReason: string;
  penaltyExpiresAt: number | null;
  recoveryRatePerOrder: number;
}

export interface OrderExtendedResult {
  scoreResult: ScoreResult;
  satisfaction: CustomerSatisfactionResult;
  gainedExp: number;
  reputationChange: number;
  reputationStatus: ReputationStatus;
  isRepurchaseOrder: boolean;
  originalCustomerId?: string;
}

export interface GameProgress {
  highScores: Record<number, number>;
  unlockedFlowers: string[];
  completedLevels: number[];
  completedOrders: CompletedOrderRecord[];
  customerReputation: number;
  coins: number;
  achievements: string[];
  customers: Record<string, CustomerProfile>;
  customerHistories: Record<string, CustomerOrderHistory>;
  professionRank: ProfessionRank;
  professionExp: number;
  skills: Record<SkillId, number>;
  reputationStatus: ReputationStatus;
  totalEarnedCoins: number;
  totalEarnedReputation: number;
  perfectOrderCount: number;
  failedOrderCount: number;
  repurchaseOrderCount: number;
}

export interface CompletedOrderRecord {
  orderId: string;
  orderTitle: string;
  customerId: string;
  customerName: string;
  score: number;
  passed: boolean;
  completedAt: number;
  earnedCoins: number;
  earnedReputation: number;
  unlockedFlowers: string[];
  achievedBonuses: string[];
  flowerIdsUsed: string[];
  satisfaction: number;
  repurchaseProbability: number;
  isRepurchase: boolean;
  gainedExp: number;
  scoreDetail: ScoreDetail;
}

export interface Order {
  id: string;
  customerName: string;
  customerAvatar: string;
  customerId: string;
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
  isRepurchase?: boolean;
  originalOrderId?: string;
  customerNotes?: string;
}

export interface BonusTarget {
  id: string;
  description: string;
  points: number;
  type: 'color' | 'meaning' | 'budget' | 'season' | 'time' | 'special';
  check: (bouquet: Bouquet, order: Order, result: ScoreResult) => boolean;
}

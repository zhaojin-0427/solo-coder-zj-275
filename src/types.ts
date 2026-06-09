export type FlowerType = 'main' | 'filler' | 'wrapping';

export type Scene = 'birthday' | 'wedding' | 'condolence' | 'graduation' | 'romantic' | 'appreciation';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type ColorPalette = 'warm' | 'cool' | 'pastel' | 'monochrome' | 'vibrant' | 'elegant';

export type OrderDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type SupplierTier = 'budget' | 'standard' | 'premium' | 'exclusive';
export type SupplierStatus = 'active' | 'on probation' | 'suspended' | 'trusted';
export type MarketTrend = 'rising' | 'stable' | 'falling' | 'volatile';
export type StockRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type StudioRank = 'workshop' | 'boutique' | 'atelier' | 'flagship' | 'brand';
export type AssistantSkill = 'inventory' | 'arrangement' | 'customer' | 'procurement' | 'design';

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
  difficulty: OrderDifficulty;
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
  studio: StudioState;
  inventory: Record<string, FlowerInventoryItem>;
  suppliers: Record<string, SupplierState>;
  businessDays: BusinessDay[];
  currentDay: number;
  assistants: Assistant[];
  dailyReports: DailyReport[];
}

export interface FlowerInventoryItem {
  flowerId: string;
  quantity: number;
  reservedQuantity: number;
  avgCost: number;
  lastRestockDate: number;
  freshnessDays: number;
  expiryRisk: number;
}

export interface Supplier {
  id: string;
  name: string;
  tier: SupplierTier;
  status: SupplierStatus;
  description: string;
  specialtyTypes: FlowerType[];
  specialtySeasons: Season[];
  basePriceMultiplier: number;
  minOrderAmount: number;
  deliveryDays: number;
  qualityRating: number;
  reliabilityRating: number;
  discountThreshold: number;
  availableFlowerIds: string[];
}

export interface SupplierState {
  supplierId: string;
  reputation: number;
  totalPurchases: number;
  totalSpent: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  lastPurchaseDate: number;
  loyaltyLevel: number;
  currentDiscount: number;
  pendingOrders: PurchaseOrder[];
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  items: Array<{ flowerId: string; quantity: number; unitPrice: number }>;
  totalCost: number;
  orderDate: number;
  expectedDeliveryDate: number;
  actualDeliveryDate?: number;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled' | 'failed';
  qualityScore?: number;
}

export interface MarketCondition {
  date: number;
  season: Season;
  trend: MarketTrend;
  overallMultiplier: number;
  flowerPriceModifiers: Record<string, number>;
  flowerAvailability: Record<string, number>;
  shortageFlowerIds: string[];
  surplusFlowerIds: string[];
  eventName?: string;
  eventDescription?: string;
}

export interface StockRiskAssessment {
  orderId: string;
  riskLevel: StockRiskLevel;
  riskScore: number;
  missingFlowerIds: string[];
  lowStockFlowerIds: string[];
  suggestedPurchaseItems: Array<{ flowerId: string; suggestedQuantity: number; estimatedCost: number }>;
  totalEstimatedRestockCost: number;
  deliveryTimeRisk: boolean;
}

export interface StudioRankConfig {
  rank: StudioRank;
  name: string;
  requiredReputation: number;
  requiredTotalRevenue: number;
  maxAssistantCount: number;
  inventoryCapacityMultiplier: number;
  dailyOrderPoolSize: number;
  customerReachMultiplier: number;
  icon: string;
}

export interface StudioState {
  rank: StudioRank;
  studioReputation: number;
  totalRevenue: number;
  totalProfit: number;
  totalCosts: number;
  inventoryCapacity: number;
  dailyRent: number;
  utilityCost: number;
  openingDate: number;
  renovationLevel: number;
  displayAreaLevel: number;
  storageLevel: number;
}

export interface Assistant {
  id: string;
  name: string;
  avatar: string;
  skills: Record<AssistantSkill, number>;
  level: number;
  experience: number;
  salary: number;
  hiredDate: number;
  morale: number;
  status: 'active' | 'resting' | 'training';
}

export interface BusinessDay {
  dayNumber: number;
  date: number;
  season: Season;
  startBalance: number;
  endBalance: number;
  ordersAccepted: number;
  ordersCompleted: number;
  ordersFailed: number;
  revenue: number;
  materialCost: number;
  operatingCost: number;
  assistantSalaries: number;
  profit: number;
  customerSatisfactionAvg: number;
  newCustomers: number;
  repurchaseCustomers: number;
  marketCondition: MarketCondition;
  stockWasteCost: number;
  restockCost: number;
}

export interface DailyReport {
  dayNumber: number;
  date: number;
  summary: {
    revenue: number;
    costs: number;
    profit: number;
    ordersCompleted: number;
    customerSatisfaction: number;
    studioReputationChange: number;
  };
  highlights: string[];
  warnings: string[];
  suggestions: string[];
  topSellingFlowers: Array<{ flowerId: string; count: number; revenue: number }>;
  lowStockAlerts: Array<{ flowerId: string; currentStock: number; recommendedRestock: number }>;
  supplierUpdates: Array<{ supplierId: string; message: string; change?: number }>;
  marketInsights: string[];
}

export interface ProcurementDecision {
  orderId: string;
  purchases: Array<{ supplierId: string; flowerId: string; quantity: number; unitPrice: number }>;
  applyBulkDiscount: boolean;
  useExpeditedShipping: boolean;
  budgetAllocated: number;
}

export interface OrderPreparationResult {
  canAccept: boolean;
  stockRisk?: StockRiskAssessment;
  procurementOptions?: ProcurementDecision[];
  estimatedTotalCost: number;
  estimatedProfit: number;
  budgetWarnings: string[];
}

export interface BusinessCalculationResult {
  materialCost: number;
  stockUsed: Record<string, number>;
  stockWaste: Record<string, number>;
  wasteCost: number;
  grossProfit: number;
  netProfit: number;
  studioReputationChange: number;
  supplierImpacts: Record<string, { reputationChange: number; spent: number }>;
}

export interface SeasonalStockAdvice {
  flowerId: string;
  flowerName: string;
  currentSeason: Season;
  isInSeason: boolean;
  priceTrend: MarketTrend;
  availabilityScore: number;
  recommendedAction: 'stock_up' | 'hold' | 'reduce' | 'clear';
  reasoning: string;
}

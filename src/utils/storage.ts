import {
  GameProgress,
  CustomerProfile,
  CustomerOrderHistory,
  CompletedOrderRecord,
  SkillId,
  StudioState,
  FlowerInventoryItem,
  SupplierState,
  Assistant,
  BusinessDay,
  DailyReport
} from '../types';
import { FLOWERS } from '../data/flowers';
import { PROFESSION_LEVELS, PROFESSION_SKILLS } from '../data/orders';
import {
  createInitialInventory,
  createInitialSuppliers,
  createInitialStudio,
  createInitialBusinessDay
} from './business';

const STORAGE_KEY = 'flower_bouquet_game_progress';

function createDefaultProgress(): GameProgress {
  const defaultUnlocked = FLOWERS.filter(f => f.unlocked).map(f => f.id);
  const skills: Record<SkillId, number> = {} as Record<SkillId, number>;
  PROFESSION_SKILLS.forEach(s => {
    skills[s.id] = 0;
  });

  const baseProgress: GameProgress = {
    highScores: {},
    unlockedFlowers: defaultUnlocked,
    completedLevels: [],
    completedOrders: [],
    coins: 200,
    customerReputation: 0,
    achievements: [],
    firstPlayTime: Date.now(),
    lastPlayTime: Date.now(),
    totalPlayTime: 0,
    totalEarnedCoins: 0,
    customers: {},
    customerHistories: {},
    professionRank: 'apprentice',
    professionExp: 0,
    skills,
    reputationStatus: {
      currentReputation: 0,
      penaltyActive: false,
      penaltyAmount: 0,
      penaltyReason: '',
      penaltyExpiresAt: null,
      consecutiveFailures: 0,
      lastFailedAt: undefined,
      recoveryRatePerOrder: 5
    },
    totalCompletedOrders: 0,
    totalPassedOrders: 0,
    totalFailedOrders: 0,
    satisfiedCustomers: 0,
    repurchaseOrders: 0,
    studio: createInitialStudio(),
    inventory: {},
    suppliers: createInitialSuppliers(),
    businessDays: [],
    currentDay: 0,
    assistants: [],
    dailyReports: []
  };

  baseProgress.inventory = createInitialInventory(baseProgress);
  const firstDay = createInitialBusinessDay(1, baseProgress.coins);
  baseProgress.businessDays = [firstDay];
  baseProgress.currentDay = 1;

  return baseProgress;
}

export function loadProgress(): GameProgress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const defaults = createDefaultProgress();
      return { ...defaults, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load progress', e);
  }
  return createDefaultProgress();
}

export function saveProgress(progress: GameProgress): void {
  try {
    progress.lastPlayTime = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save progress', e);
  }
}

export function updateHighScore(levelId: number, score: number): GameProgress {
  const progress = loadProgress();
  if (!progress.highScores[levelId] || score > progress.highScores[levelId]) {
    progress.highScores[levelId] = score;
    saveProgress(progress);
  }
  return progress;
}

export function unlockFlowers(flowerIds: string[]): GameProgress {
  const progress = loadProgress();
  let changed = false;
  flowerIds.forEach(id => {
    if (!progress.unlockedFlowers.includes(id)) {
      progress.unlockedFlowers.push(id);
      changed = true;
    }
  });
  if (changed) saveProgress(progress);
  return progress;
}

export function completeLevel(levelId: number): GameProgress {
  const progress = loadProgress();
  if (!progress.completedLevels.includes(levelId)) {
    progress.completedLevels.push(levelId);
    saveProgress(progress);
  }
  return progress;
}

export function saveCustomer(profile: CustomerProfile): GameProgress {
  const progress = loadProgress();
  progress.customers[profile.id] = profile;
  saveProgress(progress);
  return progress;
}

export function saveCustomerHistory(history: CustomerOrderHistory): GameProgress {
  const progress = loadProgress();
  progress.customerHistories[history.customerId] = history;
  saveProgress(progress);
  return progress;
}

export function addCompletedOrder(record: CompletedOrderRecord): GameProgress {
  const progress = loadProgress();
  progress.completedOrders.push(record);
  progress.totalCompletedOrders++;
  if (record.passed) {
    progress.totalPassedOrders++;
  } else {
    progress.totalFailedOrders++;
  }
  if (record.passed && record.satisfaction >= 80) {
    progress.satisfiedCustomers++;
  }
  if (record.isRepurchase) {
    progress.repurchaseOrders++;
  }
  saveProgress(progress);
  return progress;
}

export function addCoins(amount: number): GameProgress {
  const progress = loadProgress();
  progress.coins += amount;
  progress.totalEarnedCoins += Math.max(0, amount);
  saveProgress(progress);
  return progress;
}

export function addReputation(amount: number): GameProgress {
  const progress = loadProgress();
  progress.customerReputation += amount;
  progress.reputationStatus.currentReputation = progress.customerReputation;
  if (amount < 0) {
    progress.reputationStatus.penaltyActive = true;
    progress.reputationStatus.penaltyAmount = Math.abs(amount);
    progress.reputationStatus.penaltyReason = '订单失败，信誉受损';
    progress.reputationStatus.consecutiveFailures = (progress.reputationStatus.consecutiveFailures || 0) + 1;
    progress.reputationStatus.lastFailedAt = Date.now();
  } else {
    progress.reputationStatus.consecutiveFailures = 0;
    if (progress.reputationStatus.penaltyActive &&
        progress.customerReputation >= progress.reputationStatus.currentReputation + progress.reputationStatus.recoveryRatePerOrder) {
      progress.reputationStatus.penaltyActive = false;
      progress.reputationStatus.penaltyAmount = 0;
      progress.reputationStatus.penaltyReason = '';
    }
  }
  saveProgress(progress);
  return progress;
}

export function addProfessionExp(amount: number): GameProgress {
  const progress = loadProgress();
  progress.professionExp += amount;
  const currentRankIndex = PROFESSION_LEVELS.findIndex(l => l.rank === progress.professionRank);
  for (let i = currentRankIndex + 1; i < PROFESSION_LEVELS.length; i++) {
    if (progress.professionExp >= PROFESSION_LEVELS[i].requiredExp) {
      progress.professionRank = PROFESSION_LEVELS[i].rank;
    } else {
      break;
    }
  }
  saveProgress(progress);
  return progress;
}

export function upgradeSkill(skillId: SkillId): GameProgress {
  const progress = loadProgress();
  const currentLevel = progress.skills[skillId] || 0;
  const skillConfig = PROFESSION_SKILLS.find(s => s.id === skillId);
  if (skillConfig && currentLevel < skillConfig.maxLevel) {
    const cost = (currentLevel + 1) * 100;
    if (progress.coins >= cost) {
      progress.coins -= cost;
      progress.skills[skillId] = currentLevel + 1;
      saveProgress(progress);
    }
  }
  return progress;
}

export function getRecentOrders(limit: number = 10): CompletedOrderRecord[] {
  const progress = loadProgress();
  return progress.completedOrders
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export function getAllCustomers(): CustomerProfile[] {
  const progress = loadProgress();
  return Object.values(progress.customers);
}

export function getCustomerProfile(customerId: string): CustomerProfile | undefined {
  const progress = loadProgress();
  return progress.customers[customerId];
}

export function getCustomerHistory(customerId: string): CustomerOrderHistory | undefined {
  const progress = loadProgress();
  return progress.customerHistories[customerId];
}

export function resetProgress(): GameProgress {
  const progress = createDefaultProgress();
  saveProgress(progress);
  return progress;
}

export function addAchievement(achievementId: string): GameProgress {
  const progress = loadProgress();
  if (!progress.achievements.includes(achievementId)) {
    progress.achievements.push(achievementId);
    saveProgress(progress);
  }
  return progress;
}

export function addPlayTime(seconds: number): GameProgress {
  const progress = loadProgress();
  progress.totalPlayTime += seconds;
  saveProgress(progress);
  return progress;
}

export function getFlowerDiscount(): number {
  const progress = loadProgress();
  const rankConfig = PROFESSION_LEVELS.find(l => l.rank === progress.professionRank);
  return rankConfig ? rankConfig.flowerDiscount : 0;
}

export function getRewardMultiplier(): number {
  const progress = loadProgress();
  const rankConfig = PROFESSION_LEVELS.find(l => l.rank === progress.professionRank);
  return rankConfig ? rankConfig.orderRewardMultiplier : 1;
}

export function saveStudio(studio: StudioState): GameProgress {
  const progress = loadProgress();
  progress.studio = studio;
  saveProgress(progress);
  return progress;
}

export function saveInventory(inventory: Record<string, FlowerInventoryItem>): GameProgress {
  const progress = loadProgress();
  progress.inventory = inventory;
  saveProgress(progress);
  return progress;
}

export function getInventory(): Record<string, FlowerInventoryItem> {
  const progress = loadProgress();
  return progress.inventory;
}

export function saveSuppliers(suppliers: Record<string, SupplierState>): GameProgress {
  const progress = loadProgress();
  progress.suppliers = suppliers;
  saveProgress(progress);
  return progress;
}

export function getSuppliers(): Record<string, SupplierState> {
  const progress = loadProgress();
  return progress.suppliers;
}

export function addBusinessDay(day: BusinessDay): GameProgress {
  const progress = loadProgress();
  progress.businessDays.push(day);
  progress.currentDay = day.dayNumber;
  saveProgress(progress);
  return progress;
}

export function getBusinessDays(): BusinessDay[] {
  const progress = loadProgress();
  return progress.businessDays;
}

export function getLatestBusinessDay(): BusinessDay | undefined {
  const progress = loadProgress();
  if (progress.businessDays.length === 0) return undefined;
  return progress.businessDays[progress.businessDays.length - 1];
}

export function addDailyReport(report: DailyReport): GameProgress {
  const progress = loadProgress();
  progress.dailyReports.push(report);
  saveProgress(progress);
  return progress;
}

export function getDailyReports(limit?: number): DailyReport[] {
  const progress = loadProgress();
  const reports = progress.dailyReports.sort((a, b) => b.dayNumber - a.dayNumber);
  return limit ? reports.slice(0, limit) : reports;
}

export function saveAssistants(assistants: Assistant[]): GameProgress {
  const progress = loadProgress();
  progress.assistants = assistants;
  saveProgress(progress);
  return progress;
}

export function getAssistants(): Assistant[] {
  const progress = loadProgress();
  return progress.assistants;
}

export function addCoinsWithBusiness(amount: number, isRevenue: boolean = false): GameProgress {
  const progress = loadProgress();
  progress.coins += amount;
  if (isRevenue && amount > 0) {
    progress.totalEarnedCoins += amount;
    progress.studio.totalRevenue += amount;
  }
  if (amount < 0) {
    progress.studio.totalCosts += Math.abs(amount);
  }
  progress.studio.totalProfit = progress.studio.totalRevenue - progress.studio.totalCosts;
  saveProgress(progress);
  return progress;
}

export function updateStudioReputation(change: number): GameProgress {
  const progress = loadProgress();
  progress.studio.studioReputation = Math.max(0, progress.studio.studioReputation + change);
  saveProgress(progress);
  return progress;
}

export function getCurrentMarketCondition() {
  const progress = loadProgress();
  if (progress.businessDays.length > 0) {
    return progress.businessDays[progress.businessDays.length - 1].marketCondition;
  }
  return null;
}

export function getLowStockFlowers(threshold: number = 2): Array<{ flowerId: string; quantity: number }> {
  const progress = loadProgress();
  const result: Array<{ flowerId: string; quantity: number }> = [];
  Object.entries(progress.inventory).forEach(([flowerId, item]) => {
    const available = item.quantity - item.reservedQuantity;
    if (available <= threshold) {
      result.push({ flowerId, quantity: available });
    }
  });
  return result;
}

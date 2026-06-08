import { GameProgress, CompletedOrderRecord, Order, Bouquet, ScoreResult, Flower, CustomerProfile, CustomerOrderHistory, SkillId, ProfessionRank } from '../types';
import { FLOWERS } from '../data/flowers';
import { checkAchievements } from './orderGenerator';
import {
  calculateCustomerSatisfaction,
  calculateProfessionExp,
  calculateReputationChange,
  updateReputationStatus,
  getProfessionRank,
  initializeCustomerProfile,
  updateCustomerProfile,
  addCustomerVisitRecord,
  calculateScoreDetail
} from './customerGrowth';

const STORAGE_KEY = 'flower_bouquet_game_progress';

function getDefaultSkills(): Record<SkillId, number> {
  return {
    color_expert: 0,
    meaning_master: 0,
    budget_whiz: 0,
    season_sense: 0,
    speed_arranger: 0,
    forbidden_detector: 0,
    palette_sense: 0,
    bonus_hunter: 0,
    customer_charm: 0,
    reputation_builder: 0
  };
}

export function loadProgress(): GameProgress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        highScores: parsed.highScores || {},
        unlockedFlowers: parsed.unlockedFlowers || [],
        completedLevels: parsed.completedLevels || [],
        completedOrders: parsed.completedOrders || [],
        customerReputation: parsed.customerReputation || 0,
        coins: parsed.coins || 0,
        achievements: parsed.achievements || [],
        customers: parsed.customers || {},
        customerHistories: parsed.customerHistories || {},
        professionRank: parsed.professionRank || 'apprentice',
        professionExp: parsed.professionExp || 0,
        skills: parsed.skills || getDefaultSkills(),
        reputationStatus: parsed.reputationStatus || {
          currentReputation: 0,
          penaltyActive: false,
          penaltyAmount: 0,
          penaltyReason: '',
          penaltyExpiresAt: null,
          recoveryRatePerOrder: 5
        },
        totalEarnedCoins: parsed.totalEarnedCoins || 0,
        totalEarnedReputation: parsed.totalEarnedReputation || 0,
        perfectOrderCount: parsed.perfectOrderCount || 0,
        failedOrderCount: parsed.failedOrderCount || 0,
        repurchaseOrderCount: parsed.repurchaseOrderCount || 0
      };
    }
  } catch (e) {
    console.error('Failed to load progress', e);
  }
  const defaultUnlocked = FLOWERS.filter(f => f.unlocked).map(f => f.id);
  return {
    highScores: {},
    unlockedFlowers: defaultUnlocked,
    completedLevels: [],
    completedOrders: [],
    customerReputation: 0,
    coins: 0,
    achievements: [],
    customers: {},
    customerHistories: {},
    professionRank: 'apprentice',
    professionExp: 0,
    skills: getDefaultSkills(),
    reputationStatus: {
      currentReputation: 0,
      penaltyActive: false,
      penaltyAmount: 0,
      penaltyReason: '',
      penaltyExpiresAt: null,
      recoveryRatePerOrder: 5
    },
    totalEarnedCoins: 0,
    totalEarnedReputation: 0,
    perfectOrderCount: 0,
    failedOrderCount: 0,
    repurchaseOrderCount: 0
  };
}

export function saveProgress(progress: GameProgress): void {
  try {
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

export function getOrCreateCustomer(customerId: string, customerIndex: number): CustomerProfile {
  const progress = loadProgress();
  if (progress.customers[customerId]) {
    return progress.customers[customerId];
  }
  return initializeCustomerProfile(customerIndex);
}

export function completeOrder(
  order: Order,
  scoreResult: ScoreResult,
  bouquet: Bouquet,
  earnedCoins: number,
  earnedReputation: number,
  unlockedFlowerIds: string[],
  achievedBonusIds: string[],
  usedFlowerIds: string[]
): { progress: GameProgress; newAchievements: string[]; satisfaction: any } {
  const progress = loadProgress();

  const customerIndex = parseInt(order.customerId.replace('customer_', ''), 36) % 12;
  let customerProfile = progress.customers[order.customerId] || initializeCustomerProfile(customerIndex);

  const satisfaction = calculateCustomerSatisfaction(
    order,
    bouquet,
    scoreResult,
    achievedBonusIds,
    customerProfile,
    progress.skills
  );

  const spent = usedFlowerIds.reduce((sum, id) => {
    const flower = FLOWERS.find(f => f.id === id);
    return sum + (flower?.price || 0);
  }, 0);

  customerProfile = updateCustomerProfile(
    customerProfile,
    order,
    satisfaction,
    scoreResult.passed,
    spent
  );
  progress.customers[order.customerId] = customerProfile;

  const history = progress.customerHistories[order.customerId] || null;
  progress.customerHistories[order.customerId] = addCustomerVisitRecord(
    history,
    order.customerId,
    order,
    scoreResult,
    satisfaction
  );

  const gainedExp = calculateProfessionExp(scoreResult, order, satisfaction);
  progress.professionExp += gainedExp;

  const reputationChange = calculateReputationChange(scoreResult, order, progress.skills);
  progress.reputationStatus = updateReputationStatus(
    progress.reputationStatus,
    reputationChange,
    scoreResult.passed
  );
  progress.customerReputation = progress.reputationStatus.currentReputation;

  const newRank = getProfessionRank(progress.professionExp, progress.customerReputation);
  if (newRank !== progress.professionRank) {
    progress.professionRank = newRank;
  }

  const scoreDetail = calculateScoreDetail(bouquet, order, scoreResult, achievedBonusIds, progress.skills);

  const record: CompletedOrderRecord = {
    orderId: order.id,
    orderTitle: order.title,
    customerId: order.customerId,
    customerName: order.customerName,
    score: scoreResult.totalScore,
    passed: scoreResult.passed,
    completedAt: Date.now(),
    earnedCoins,
    earnedReputation: reputationChange,
    unlockedFlowers: unlockedFlowerIds,
    achievedBonuses: achievedBonusIds,
    flowerIdsUsed: usedFlowerIds,
    satisfaction: satisfaction.satisfaction,
    repurchaseProbability: satisfaction.repurchaseProbability,
    isRepurchase: !!order.isRepurchase,
    gainedExp,
    scoreDetail
  };

  progress.completedOrders.push(record);

  if (scoreResult.passed) {
    progress.coins += earnedCoins;
    progress.totalEarnedCoins += earnedCoins;
    if (reputationChange > 0) {
      progress.totalEarnedReputation += reputationChange;
    }
    if (scoreResult.totalScore >= 90) {
      progress.perfectOrderCount++;
    }
    if (order.isRepurchase) {
      progress.repurchaseOrderCount++;
    }

    unlockedFlowerIds.forEach(id => {
      if (!progress.unlockedFlowers.includes(id)) {
        progress.unlockedFlowers.push(id);
      }
    });
  } else {
    progress.failedOrderCount++;
  }

  const currentAchievements = checkAchievements(progress);
  const newAchievements = currentAchievements.filter(a => !progress.achievements.includes(a));
  progress.achievements.push(...newAchievements);

  saveProgress(progress);

  return { progress, newAchievements, satisfaction: { ...satisfaction, gainedExp } };
}

export function addCoins(amount: number): GameProgress {
  const progress = loadProgress();
  progress.coins += amount;
  saveProgress(progress);
  return progress;
}

export function addReputation(amount: number): GameProgress {
  const progress = loadProgress();
  progress.customerReputation += amount;
  progress.reputationStatus.currentReputation = progress.customerReputation;
  saveProgress(progress);
  return progress;
}

export function getCompletedOrderCount(): number {
  const progress = loadProgress();
  return progress.completedOrders.length;
}

export function getRecentOrders(limit: number = 10): CompletedOrderRecord[] {
  const progress = loadProgress();
  return progress.completedOrders.slice(-limit).reverse();
}

export function getCustomerProfile(customerId: string): CustomerProfile | null {
  const progress = loadProgress();
  return progress.customers[customerId] || null;
}

export function getCustomerHistory(customerId: string): CustomerOrderHistory | null {
  const progress = loadProgress();
  return progress.customerHistories[customerId] || null;
}

export function getAllCustomers(): CustomerProfile[] {
  const progress = loadProgress();
  return Object.values(progress.customers);
}

export function upgradeSkill(skillId: SkillId, cost: number): GameProgress | null {
  const progress = loadProgress();
  if (progress.coins < cost) return null;

  const currentLevel = progress.skills[skillId] || 0;
  const maxLevel = skillId === 'forbidden_detector' || skillId === 'bonus_hunter' ? 3 : 5;
  if (currentLevel >= maxLevel) return null;

  progress.coins -= cost;
  progress.skills[skillId] = currentLevel + 1;
  saveProgress(progress);
  return progress;
}

export function recoverReputationManually(): GameProgress {
  const progress = loadProgress();
  if (!progress.reputationStatus.penaltyActive) return progress;

  progress.reputationStatus.penaltyActive = false;
  progress.reputationStatus.penaltyAmount = 0;
  progress.reputationStatus.penaltyReason = '';
  progress.reputationStatus.penaltyExpiresAt = null;
  saveProgress(progress);
  return progress;
}

export function resetProgress(): void {
  localStorage.removeItem(STORAGE_KEY);
}

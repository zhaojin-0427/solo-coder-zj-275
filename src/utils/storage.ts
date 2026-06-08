import { GameProgress, CompletedOrderRecord, Order } from '../types';
import { FLOWERS } from '../data/flowers';
import { checkAchievements } from './orderGenerator';

const STORAGE_KEY = 'flower_bouquet_game_progress';

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
        achievements: parsed.achievements || []
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
    achievements: []
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

export function completeOrder(
  order: Order,
  score: number,
  passed: boolean,
  earnedCoins: number,
  earnedReputation: number,
  unlockedFlowerIds: string[],
  achievedBonusIds: string[],
  usedFlowerIds: string[]
): { progress: GameProgress; newAchievements: string[] } {
  const progress = loadProgress();

  const record: CompletedOrderRecord = {
    orderId: order.id,
    orderTitle: order.title,
    score,
    passed,
    completedAt: Date.now(),
    earnedCoins,
    earnedReputation,
    unlockedFlowers: unlockedFlowerIds,
    achievedBonuses: achievedBonusIds,
    flowerIdsUsed: usedFlowerIds
  };

  progress.completedOrders.push(record);

  if (passed) {
    progress.coins += earnedCoins;
    progress.customerReputation += earnedReputation;

    unlockedFlowerIds.forEach(id => {
      if (!progress.unlockedFlowers.includes(id)) {
        progress.unlockedFlowers.push(id);
      }
    });
  }

  const currentAchievements = checkAchievements(progress);
  const newAchievements = currentAchievements.filter(a => !progress.achievements.includes(a));
  progress.achievements.push(...newAchievements);

  saveProgress(progress);

  return { progress, newAchievements };
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

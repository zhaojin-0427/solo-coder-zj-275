import { GameProgress } from '../types';
import { FLOWERS } from '../data/flowers';

const STORAGE_KEY = 'flower_bouquet_game_progress';

export function loadProgress(): GameProgress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load progress', e);
  }
  const defaultUnlocked = FLOWERS.filter(f => f.unlocked).map(f => f.id);
  return {
    highScores: {},
    unlockedFlowers: defaultUnlocked,
    completedLevels: []
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

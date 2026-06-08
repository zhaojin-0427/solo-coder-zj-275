import {
  Bouquet,
  Order,
  ScoreResult,
  CustomerProfile,
  CustomerSatisfactionResult,
  CustomerTagType,
  ScoreDetail,
  ProfessionRank,
  ReputationStatus,
  GameProgress,
  SkillId,
  CustomerOrderHistory,
  CustomerVisitRecord
} from '../types';
import { FLOWERS } from '../data/flowers';
import { CUSTOMERS, PROFESSION_LEVELS, CUSTOMER_IDS } from '../data/orders';
import { calculateBouquetPrice } from './colorHarmony';

function calculateMeaningMatch(bouquet: Bouquet, order: Order): number {
  const usedFlowers = [bouquet.mainFlower, ...bouquet.fillerFlowers, bouquet.wrapping].filter(Boolean) as any[];
  const meanings = usedFlowers.map(f => f.meaning);
  let matched = 0;
  order.requiredMeanings.forEach(req => {
    if (meanings.includes(req)) matched++;
  });
  if (matched === order.requiredMeanings.length) return 100;
  return Math.round((matched / order.requiredMeanings.length) * 100);
}

function calculatePaletteMatch(bouquet: Bouquet, preferredHues?: number[]): number {
  if (!preferredHues || preferredHues.length === 0) return 100;
  const flowers = [bouquet.mainFlower, ...bouquet.fillerFlowers, bouquet.wrapping].filter(Boolean) as any[];
  if (flowers.length === 0) return 0;
  let matched = 0;
  flowers.forEach(f => {
    const hue = f.color.hue;
    const isMatch = preferredHues.some(h => Math.abs(hue - h) <= 40 || Math.abs(hue - h) >= 320);
    if (isMatch) matched++;
  });
  return Math.round((matched / flowers.length) * 100);
}

function calculateBudgetControl(bouquet: Bouquet, budget: number): number {
  const total = calculateBouquetPrice(bouquet);
  if (total <= budget) {
    const ratio = total / budget;
    if (ratio >= 0.7) return 100;
    if (ratio >= 0.5) return Math.round(80 + (ratio - 0.5) * 10 / 0.2);
    return Math.round(60 + ratio * 40);
  }
  return Math.max(0, 100 - (total - budget) / budget * 100);
}

function calculateForbiddenAvoidance(bouquet: Bouquet, forbiddenIds: string[]): number {
  const flowers = [bouquet.mainFlower, ...bouquet.fillerFlowers, bouquet.wrapping].filter(Boolean) as any[];
  if (forbiddenIds.length === 0) return 100;
  let usedForbidden = 0;
  flowers.forEach(f => {
    if (forbiddenIds.includes(f.id)) usedForbidden++;
  });
  if (usedForbidden === 0) return 100;
  return Math.max(0, 100 - usedForbidden * 25);
}

function calculateSeasonFit(bouquet: Bouquet, season: string): number {
  const flowers = [bouquet.mainFlower, ...bouquet.fillerFlowers, bouquet.wrapping].filter(Boolean) as any[];
  if (flowers.length === 0) return 0;
  let inSeason = 0;
  flowers.forEach(f => {
    if (f.seasons.includes(season)) inSeason++;
  });
  return Math.round((inSeason / flowers.length) * 100);
}

function calculateBonusAchievement(achievedBonusIds: string[], totalBonusTargets: any[]): number {
  if (totalBonusTargets.length === 0) return 100;
  return Math.round((achievedBonusIds.length / totalBonusTargets.length) * 100);
}

function applySkillBonus(baseScore: number, skillLevel: number, bonusPerLevel: number): number {
  return Math.min(100, Math.round(baseScore * (1 + skillLevel * bonusPerLevel / 100)));
}

export function calculateScoreDetail(
  bouquet: Bouquet,
  order: Order,
  scoreResult: ScoreResult,
  achievedBonusIds: string[],
  skills: Record<SkillId, number>
): ScoreDetail {
  let meaningMatch = calculateMeaningMatch(bouquet, order);
  let paletteMatch = calculatePaletteMatch(bouquet, order.preferredColorHues);
  let budgetControl = calculateBudgetControl(bouquet, order.budget);
  let forbiddenAvoidance = calculateForbiddenAvoidance(bouquet, order.forbiddenFlowerIds);
  let seasonFit = calculateSeasonFit(bouquet, order.season);
  let bonusAchievement = calculateBonusAchievement(achievedBonusIds, order.bonusTargets);

  meaningMatch = applySkillBonus(meaningMatch, skills.meaning_master || 0, 3);
  paletteMatch = applySkillBonus(paletteMatch, skills.palette_sense || 0, 3);
  budgetControl = applySkillBonus(budgetControl, skills.budget_whiz || 0, 3);
  seasonFit = applySkillBonus(seasonFit, skills.season_sense || 0, 3);

  return {
    meaningMatchScore: meaningMatch,
    paletteMatchScore: paletteMatch,
    budgetControlScore: budgetControl,
    forbiddenAvoidanceScore: forbiddenAvoidance,
    seasonFitScore: seasonFit,
    bonusAchievementScore: bonusAchievement
  };
}

export function generateCustomerTags(
  order: Order,
  scoreDetail: ScoreDetail,
  existingTags: CustomerTagType[]
): CustomerTagType[] {
  const newTags: CustomerTagType[] = [];

  if (scoreDetail.meaningMatchScore >= 90 && !existingTags.includes('meaning_focused')) {
    newTags.push('meaning_focused');
  }
  if (scoreDetail.paletteMatchScore >= 90 && !existingTags.includes('color_picky')) {
    newTags.push('color_picky');
  }
  if (scoreDetail.budgetControlScore >= 90 && !existingTags.includes('budget_sensitive')) {
    newTags.push('budget_sensitive');
  }

  const seasonTagMap: Record<string, CustomerTagType> = {
    spring: 'season_prefers_spring',
    summer: 'season_prefers_summer',
    autumn: 'season_prefers_autumn',
    winter: 'season_prefers_winter'
  };
  const seasonTag = seasonTagMap[order.season];
  if (seasonTag && scoreDetail.seasonFitScore >= 90 && !existingTags.includes(seasonTag)) {
    newTags.push(seasonTag);
  }

  const sceneTagMap: Record<string, CustomerTagType> = {
    birthday: 'scene_birthday',
    wedding: 'scene_wedding',
    condolence: 'scene_condolence',
    graduation: 'scene_graduation',
    romantic: 'scene_romantic',
    appreciation: 'scene_appreciation'
  };
  const sceneTag = sceneTagMap[order.scene];
  if (sceneTag && !existingTags.includes(sceneTag)) {
    newTags.push(sceneTag);
  }

  const paletteTagMap: Record<string, CustomerTagType> = {
    warm: 'warm_palette',
    cool: 'cool_palette',
    pastel: 'pastel_palette',
    monochrome: 'monochrome_palette',
    vibrant: 'vibrant_palette',
    elegant: 'elegant_palette'
  };
  const paletteTag = paletteTagMap[order.preferredPalette];
  if (paletteTag && scoreDetail.paletteMatchScore >= 80 && !existingTags.includes(paletteTag)) {
    newTags.push(paletteTag);
  }

  if (order.scene === 'romantic' && !existingTags.includes('romantic_lover')) {
    newTags.push('romantic_lover');
  }
  if (order.budget >= 150 && !existingTags.includes('premium_client')) {
    newTags.push('premium_client');
  }
  if (order.timeLimit <= 60 && !existingTags.includes('quick_turnaround')) {
    newTags.push('quick_turnaround');
  }

  return newTags;
}

export function calculateCustomerSatisfaction(
  order: Order,
  bouquet: Bouquet,
  scoreResult: ScoreResult,
  achievedBonusIds: string[],
  existingProfile: CustomerProfile | null,
  skills: Record<SkillId, number>
): CustomerSatisfactionResult {
  const scoreDetail = calculateScoreDetail(bouquet, order, scoreResult, achievedBonusIds, skills);

  const weightedScore =
    scoreDetail.meaningMatchScore * 0.25 +
    scoreDetail.paletteMatchScore * 0.2 +
    scoreDetail.budgetControlScore * 0.15 +
    scoreDetail.forbiddenAvoidanceScore * 0.15 +
    scoreDetail.seasonFitScore * 0.15 +
    scoreDetail.bonusAchievementScore * 0.1;

  const previousSatisfaction = existingProfile?.satisfaction ?? 50;

  const customerCharmBonus = 1 + (skills.customer_charm || 0) * 0.1;

  let satisfactionDelta: number;
  if (scoreResult.passed) {
    const baseDelta = (weightedScore - 50) * 0.3;
    const bonusDelta = achievedBonusIds.length * 2;
    const perfectBonus = scoreResult.totalScore >= 90 ? 5 : 0;
    satisfactionDelta = Math.round((baseDelta + bonusDelta + perfectBonus) * customerCharmBonus);
  } else {
    satisfactionDelta = Math.round(-(50 + (50 - weightedScore) * 0.5));
  }

  let newSatisfaction = Math.max(0, Math.min(100, previousSatisfaction + satisfactionDelta));

  const previousRepurchase = existingProfile?.repurchaseProbability ?? 20;
  let repurchaseDelta: number;
  if (scoreResult.passed) {
    repurchaseDelta = Math.round(weightedScore * 0.15 + achievedBonusIds.length * 3);
    if (newSatisfaction >= 80) repurchaseDelta += 10;
    if (newSatisfaction >= 90) repurchaseDelta += 10;
  } else {
    repurchaseDelta = Math.round(-(30 + (50 - weightedScore) * 0.3));
  }
  let newRepurchase = Math.max(0, Math.min(100, previousRepurchase + repurchaseDelta));

  const existingTags = existingProfile?.tags ?? [];
  const newTags = generateCustomerTags(order, scoreDetail, existingTags);

  if (existingProfile && existingProfile.totalOrders >= 3 && newSatisfaction >= 70) {
    if (!existingTags.includes('loyal_customer') && !newTags.includes('loyal_customer')) {
      newTags.push('loyal_customer');
    }
  }
  if (newSatisfaction >= 90 && !existingTags.includes('high_satisfaction') && !newTags.includes('high_satisfaction')) {
    newTags.push('high_satisfaction');
  }
  if (newSatisfaction < 30 && !existingTags.includes('difficult_pleaser') && !newTags.includes('difficult_pleaser')) {
    newTags.push('difficult_pleaser');
  }

  const feedback: string[] = [];
  if (scoreDetail.meaningMatchScore >= 90) {
    feedback.push('💝 客户非常满意花语的选择！');
  } else if (scoreDetail.meaningMatchScore < 50) {
    feedback.push('😕 客户觉得花语不太贴切...');
  }

  if (scoreDetail.paletteMatchScore >= 90) {
    feedback.push('🎨 色系搭配深得客户喜爱！');
  } else if (scoreDetail.paletteMatchScore < 50) {
    feedback.push('🤔 客户觉得色系可以再调整一下...');
  }

  if (scoreDetail.budgetControlScore >= 90) {
    feedback.push('💰 预算控制非常合理，客户很开心！');
  } else if (scoreDetail.budgetControlScore < 50) {
    feedback.push('💸 预算方面客户有些不满...');
  }

  if (scoreDetail.forbiddenAvoidanceScore < 100) {
    feedback.push('⚠️ 客户注意到了禁用花材，很在意！');
  }

  if (scoreDetail.seasonFitScore >= 90) {
    feedback.push('🍃 当季花材让客户感受到了季节的美好！');
  }

  if (scoreResult.passed && newSatisfaction >= 80) {
    feedback.push('✨ 客户非常满意，很可能会再次光顾！');
  } else if (!scoreResult.passed) {
    feedback.push('😞 这次没能达到客户期望，下次加油！');
  }

  return {
    satisfaction: newSatisfaction,
    satisfactionDelta,
    repurchaseProbability: newRepurchase,
    repurchaseDelta,
    newTags,
    feedback,
    scoreDetail
  };
}

export function calculateProfessionExp(
  scoreResult: ScoreResult,
  order: Order,
  satisfaction: CustomerSatisfactionResult
): number {
  if (!scoreResult.passed) {
    return Math.max(1, Math.round(scoreResult.totalScore * 0.1));
  }

  let baseExp = Math.round(scoreResult.totalScore * 0.5);

  const difficultyMultiplier: Record<string, number> = {
    easy: 1,
    medium: 1.5,
    hard: 2,
    expert: 3
  };
  baseExp = Math.round(baseExp * (difficultyMultiplier[order.difficulty] || 1));

  if (satisfaction.satisfaction >= 80) baseExp += 10;
  if (satisfaction.satisfaction >= 90) baseExp += 10;

  baseExp += satisfaction.repurchaseProbability >= 70 ? 5 : 0;

  return baseExp;
}

export function calculateReputationChange(
  scoreResult: ScoreResult,
  order: Order,
  skills: Record<SkillId, number>
): number {
  const reputationBonus = 1 + (skills.reputation_builder || 0) * 0.1;
  const reputationPenaltyReduction = 1 - (skills.reputation_builder || 0) * 0.1;

  if (scoreResult.passed) {
    return Math.round(order.reputationReward * reputationBonus);
  } else {
    const penalty = Math.round(order.reputationReward * 0.5 * reputationPenaltyReduction);
    return -penalty;
  }
}

export function updateReputationStatus(
  currentStatus: ReputationStatus,
  reputationChange: number,
  passed: boolean
): ReputationStatus {
  let newReputation = currentStatus.currentReputation + reputationChange;
  newReputation = Math.max(0, newReputation);

  let penaltyActive = currentStatus.penaltyActive;
  let penaltyAmount = currentStatus.penaltyAmount;
  let penaltyReason = currentStatus.penaltyReason;
  let penaltyExpiresAt = currentStatus.penaltyExpiresAt;

  if (penaltyActive && penaltyExpiresAt && Date.now() > penaltyExpiresAt) {
    penaltyActive = false;
    penaltyAmount = 0;
    penaltyReason = '';
    penaltyExpiresAt = null;
  }

  if (!passed && reputationChange < 0) {
    penaltyActive = true;
    penaltyAmount = Math.abs(reputationChange);
    penaltyReason = '订单未通过';
    penaltyExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
  }

  if (passed && penaltyActive) {
    const recovery = currentStatus.recoveryRatePerOrder;
    penaltyAmount = Math.max(0, penaltyAmount - recovery);
    if (penaltyAmount === 0) {
      penaltyActive = false;
      penaltyReason = '';
      penaltyExpiresAt = null;
    }
  }

  return {
    currentReputation: newReputation,
    penaltyActive,
    penaltyAmount,
    penaltyReason,
    penaltyExpiresAt,
    recoveryRatePerOrder: currentStatus.recoveryRatePerOrder
  };
}

export function getProfessionRank(exp: number, reputation: number): ProfessionRank {
  let rank: ProfessionRank = 'apprentice';
  for (const level of PROFESSION_LEVELS) {
    if (exp >= level.requiredExp && reputation >= level.requiredReputation) {
      rank = level.rank;
    }
  }
  return rank;
}

export function getExpProgressToNextRank(exp: number): { current: ProfessionRank; next: ProfessionRank | null; progress: number; requiredExp: number; currentExp: number } {
  let currentIndex = 0;
  for (let i = 0; i < PROFESSION_LEVELS.length; i++) {
    if (exp >= PROFESSION_LEVELS[i].requiredExp) {
      currentIndex = i;
    }
  }

  const current = PROFESSION_LEVELS[currentIndex].rank;
  const next = currentIndex < PROFESSION_LEVELS.length - 1 ? PROFESSION_LEVELS[currentIndex + 1].rank : null;

  let progress = 100;
  let requiredExp = 0;
  let currentExp = exp;

  if (next) {
    const currentLevel = PROFESSION_LEVELS[currentIndex];
    const nextLevel = PROFESSION_LEVELS[currentIndex + 1];
    const expNeeded = nextLevel.requiredExp - currentLevel.requiredExp;
    const expGained = exp - currentLevel.requiredExp;
    progress = Math.min(100, Math.round((expGained / expNeeded) * 100));
    requiredExp = expNeeded;
    currentExp = expGained;
  }

  return { current, next, progress, requiredExp, currentExp };
}

export function getFlowerDiscount(rank: ProfessionRank): number {
  const level = PROFESSION_LEVELS.find(l => l.rank === rank);
  return level?.flowerDiscount ?? 0;
}

export function getOrderRewardMultiplier(rank: ProfessionRank): number {
  const level = PROFESSION_LEVELS.find(l => l.rank === rank);
  return level?.orderRewardMultiplier ?? 1;
}

export function initializeCustomerProfile(customerIndex: number): CustomerProfile {
  const customer = CUSTOMERS[customerIndex % CUSTOMERS.length];
  const id = CUSTOMER_IDS[customerIndex % CUSTOMER_IDS.length];
  return {
    id,
    name: customer.name,
    avatar: customer.avatar,
    tone: customer.tone,
    satisfaction: 50,
    tags: [],
    totalOrders: 0,
    completedOrders: 0,
    failedOrders: 0,
    repurchaseProbability: 20,
    lastOrderAt: null,
    preferredPalettes: [],
    preferredScenes: [],
    preferredSeasons: [],
    preferredMeanings: [],
    totalSpent: 0,
    lifetimeValue: 0,
    notes: ''
  };
}

export function updateCustomerProfile(
  profile: CustomerProfile,
  order: Order,
  satisfaction: CustomerSatisfactionResult,
  passed: boolean,
  spent: number
): CustomerProfile {
  const updated = { ...profile };
  updated.satisfaction = satisfaction.satisfaction;
  updated.repurchaseProbability = satisfaction.repurchaseProbability;
  updated.totalOrders++;

  if (passed) {
    updated.completedOrders++;
  } else {
    updated.failedOrders++;
  }

  const allTags = [...profile.tags];
  satisfaction.newTags.forEach(tag => {
    if (!allTags.includes(tag)) allTags.push(tag);
  });
  updated.tags = allTags;

  if (!updated.preferredPalettes.includes(order.preferredPalette)) {
    updated.preferredPalettes.push(order.preferredPalette);
  }
  if (!updated.preferredScenes.includes(order.scene)) {
    updated.preferredScenes.push(order.scene);
  }
  if (!updated.preferredSeasons.includes(order.season)) {
    updated.preferredSeasons.push(order.season);
  }
  order.requiredMeanings.forEach(m => {
    if (!updated.preferredMeanings.includes(m)) {
      updated.preferredMeanings.push(m);
    }
  });

  updated.totalSpent += spent;
  updated.lifetimeValue = updated.totalSpent;
  updated.lastOrderAt = Date.now();

  return updated;
}

export function addCustomerVisitRecord(
  history: CustomerOrderHistory | null,
  customerId: string,
  order: Order,
  scoreResult: ScoreResult,
  satisfaction: CustomerSatisfactionResult
): CustomerOrderHistory {
  const record: CustomerVisitRecord = {
    orderId: order.id,
    orderTitle: order.title,
    score: scoreResult.totalScore,
    passed: scoreResult.passed,
    satisfactionDelta: satisfaction.satisfactionDelta,
    repurchaseDelta: satisfaction.repurchaseDelta,
    tagsAdded: satisfaction.newTags,
    at: Date.now()
  };

  if (history) {
    return {
      ...history,
      visits: [...history.visits, record]
    };
  }
  return {
    customerId,
    visits: [record]
  };
}

export function getSatisfactionEmoji(satisfaction: number): string {
  if (satisfaction >= 90) return '😍';
  if (satisfaction >= 80) return '😊';
  if (satisfaction >= 60) return '🙂';
  if (satisfaction >= 40) return '😐';
  if (satisfaction >= 20) return '😕';
  return '😠';
}

export function getSatisfactionLabel(satisfaction: number): string {
  if (satisfaction >= 90) return '非常满意';
  if (satisfaction >= 80) return '很满意';
  if (satisfaction >= 60) return '基本满意';
  if (satisfaction >= 40) return '一般';
  if (satisfaction >= 20) return '不满意';
  return '非常不满';
}

export function getRepurchaseLabel(probability: number): string {
  if (probability >= 80) return '极可能复购';
  if (probability >= 60) return '很可能复购';
  if (probability >= 40) return '可能复购';
  if (probability >= 20) return '不太可能';
  return '几乎不会';
}

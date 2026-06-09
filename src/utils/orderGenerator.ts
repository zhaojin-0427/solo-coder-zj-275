import { Order, OrderDifficulty, Scene, Season, ColorPalette, BonusTarget, Bouquet, ScoreResult, CustomerProfile, GameProgress, MarketCondition } from '../types';
import { FLOWERS } from '../data/flowers';
import { CUSTOMERS, PALETTE_HUES, SCENE_ORDER_TEMPLATES, SEASONAL_HINTS, HARMONY_HINTS_BY_PALETTE, BONUS_TARGET_POOL, CUSTOMER_IDS } from '../data/orders';
import { SCENE_NAMES, SEASON_NAMES } from '../data/levels';
import { getOrderRewardMultiplier, initializeCustomerProfile } from './customerGrowth';
import { generateMarketCondition, getStudioRankConfig } from './business';

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function pickRandom<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function pickRandomN<T>(arr: T[], n: number, rand: () => number): T[] {
  const shuffled = [...arr].sort(() => rand() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

function getDifficultyConfig(difficulty: OrderDifficulty) {
  const configs: Record<OrderDifficulty, {
    budget: [number, number];
    timeLimit: [number, number];
    targetScore: [number, number];
    minHarmonyScore: number;
    requiredMeaningsCount: [number, number];
    forbiddenCount: [number, number];
    bonusCount: [number, number];
    coinReward: [number, number];
    reputationReward: [number, number];
    unlockChance: number;
  }> = {
    easy: {
      budget: [50, 90],
      timeLimit: [100, 150],
      targetScore: [55, 65],
      minHarmonyScore: 50,
      requiredMeaningsCount: [1, 2],
      forbiddenCount: [0, 1],
      bonusCount: [1, 2],
      coinReward: [20, 40],
      reputationReward: [2, 5],
      unlockChance: 0.2
    },
    medium: {
      budget: [80, 130],
      timeLimit: [80, 120],
      targetScore: [65, 75],
      minHarmonyScore: 60,
      requiredMeaningsCount: [2, 3],
      forbiddenCount: [1, 2],
      bonusCount: [2, 3],
      coinReward: [40, 80],
      reputationReward: [5, 10],
      unlockChance: 0.4
    },
    hard: {
      budget: [100, 180],
      timeLimit: [60, 90],
      targetScore: [75, 85],
      minHarmonyScore: 70,
      requiredMeaningsCount: [3, 4],
      forbiddenCount: [2, 4],
      bonusCount: [3, 4],
      coinReward: [80, 150],
      reputationReward: [10, 20],
      unlockChance: 0.6
    },
    expert: {
      budget: [150, 250],
      timeLimit: [45, 70],
      targetScore: [85, 95],
      minHarmonyScore: 80,
      requiredMeaningsCount: [3, 5],
      forbiddenCount: [3, 6],
      bonusCount: [4, 6],
      coinReward: [150, 300],
      reputationReward: [20, 40],
      unlockChance: 0.8
    }
  };
  return configs[difficulty];
}

function randInRange(range: [number, number], rand: () => number): number {
  return Math.floor(rand() * (range[1] - range[0] + 1)) + range[0];
}

function buildBonusTargets(selected: typeof BONUS_TARGET_POOL): BonusTarget[] {
  return selected.map(b => {
    const bonus: BonusTarget = {
      id: b.id,
      description: b.description,
      points: b.points,
      type: b.type,
      check: (bouquet: Bouquet, order: Order, result: ScoreResult) => {
        const allFlowers = [bouquet.mainFlower, ...bouquet.fillerFlowers, bouquet.wrapping].filter(Boolean) as any[];
        switch (b.id) {
          case 'bonus_all_in_season':
            return allFlowers.length > 0 && allFlowers.every(f => f.seasons.includes(order.season));
          case 'bonus_under_budget':
            const price = calculateSimplePrice(bouquet);
            return price > 0 && price <= order.budget * 0.8;
          case 'bonus_three_meanings':
            const meanings = new Set(allFlowers.map(f => f.meaning));
            return meanings.size >= 3;
          case 'bonus_excellent_harmony':
            return result.colorHarmonyScore >= 90;
          case 'bonus_perfect_meaning':
            return result.meaningScore >= 100;
          case 'bonus_fast_delivery':
            return (result.timeBonusScore || 0) >= 5;
          case 'bonus_palette_match':
            return allFlowers.length > 0 && allFlowers.every(f => {
              if (!order.preferredColorHues) return true;
              const hue = f.color.hue;
              return order.preferredColorHues.some(h => Math.abs(hue - h) <= 40 || Math.abs(hue - h) >= 320);
            });
          case 'bonus_no_forbidden':
            return allFlowers.every(f => !order.forbiddenFlowerIds.includes(f.id));
          default:
            return false;
        }
      }
    };
    return bonus;
  });
}

function calculateSimplePrice(bouquet: Bouquet): number {
  let total = 0;
  if (bouquet.mainFlower) total += bouquet.mainFlower.price * 3;
  bouquet.fillerFlowers.forEach(f => total += f.price);
  if (bouquet.wrapping) total += bouquet.wrapping.price;
  return total;
}

export function generateOrder(seed: number, difficulty?: OrderDifficulty, customerIndex?: number, progress?: GameProgress): Order {
  const rand = seededRandom(seed);
  const difficulties: OrderDifficulty[] = ['easy', 'medium', 'hard', 'expert'];
  const selectedDifficulty = difficulty || pickRandom(difficulties, rand);
  const config = getDifficultyConfig(selectedDifficulty);

  const scenes: Scene[] = ['birthday', 'wedding', 'condolence', 'graduation', 'romantic', 'appreciation'];
  const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
  const palettes: ColorPalette[] = ['warm', 'cool', 'pastel', 'monochrome', 'vibrant', 'elegant'];

  const actualCustomerIndex = customerIndex ?? Math.floor(rand() * CUSTOMERS.length);
  const scene = pickRandom(scenes, rand);
  const season = pickRandom(seasons, rand);
  const palette = pickRandom(palettes, rand);
  const customer = CUSTOMERS[actualCustomerIndex % CUSTOMERS.length];
  const customerId = CUSTOMER_IDS[actualCustomerIndex % CUSTOMER_IDS.length];

  const template = SCENE_ORDER_TEMPLATES[scene];
  const titleIdx = Math.floor(rand() * template.titles.length);
  const title = template.titles[titleIdx];
  const description = template.descriptions[Math.floor(rand() * template.descriptions.length)];

  const meaningsCount = randInRange(config.requiredMeaningsCount, rand);
  const requiredMeanings = pickRandomN(template.meanings.flat(), meaningsCount, rand);

  const budget = randInRange(config.budget, rand);
  const timeLimit = randInRange(config.timeLimit, rand);
  const targetScore = randInRange(config.targetScore, rand);

  const unlockedFlowers = FLOWERS.filter(f => f.unlocked).map(f => f.id);
  const forbiddenCount = randInRange(config.forbiddenCount, rand);
  const forbiddenFlowerIds = pickRandomN(unlockedFlowers, forbiddenCount, rand);

  const bonusCount = randInRange(config.bonusCount, rand);
  const selectedBonuses = pickRandomN(BONUS_TARGET_POOL, bonusCount, rand);
  const bonusTargets = buildBonusTargets(selectedBonuses);

  let coinReward = randInRange(config.coinReward, rand);
  let reputationReward = randInRange(config.reputationReward, rand);

  if (progress) {
    const multiplier = getOrderRewardMultiplier(progress.professionRank);
    coinReward = Math.round(coinReward * multiplier);
    reputationReward = Math.round(reputationReward * multiplier);
  }

  let unlockReward: string[] | undefined;
  if (rand() < config.unlockChance) {
    const lockedFlowers = FLOWERS.filter(f => !f.unlocked).map(f => f.id);
    if (lockedFlowers.length > 0) {
      unlockReward = pickRandomN(lockedFlowers, selectedDifficulty === 'expert' ? 2 : 1, rand);
    }
  }

  const harmonyHint = HARMONY_HINTS_BY_PALETTE[palette] + '。' + SEASONAL_HINTS[season];

  return {
    id: `order_${seed}_${Date.now()}`,
    customerName: customer.name,
    customerAvatar: customer.avatar,
    customerId,
    title,
    description,
    difficulty: selectedDifficulty,
    scene,
    budget,
    season,
    forbiddenFlowerIds,
    requiredMeanings,
    preferredPalette: palette,
    preferredColorHues: PALETTE_HUES[palette],
    minHarmonyScore: config.minHarmonyScore,
    timeLimit,
    targetScore,
    bonusTargets,
    unlockReward,
    coinReward,
    reputationReward,
    harmonyHint,
    deadline: Date.now() + 24 * 60 * 60 * 1000,
    orderPoolSeed: seed
  };
}

export function generateRepurchaseOrder(
  customer: CustomerProfile,
  seed: number,
  progress: GameProgress
): Order {
  const rand = seededRandom(seed);

  const difficulties: OrderDifficulty[] = ['easy', 'medium', 'hard', 'expert'];
  let diffPool: OrderDifficulty[];
  if (customer.totalOrders >= 10) {
    diffPool = ['medium', 'hard', 'expert'];
  } else if (customer.totalOrders >= 5) {
    diffPool = ['easy', 'medium', 'hard'];
  } else {
    diffPool = ['easy', 'medium'];
  }
  const selectedDifficulty = pickRandom(diffPool, rand);
  const config = getDifficultyConfig(selectedDifficulty);

  let scene: Scene;
  if (customer.preferredScenes.length > 0 && rand() < 0.6) {
    scene = pickRandom(customer.preferredScenes, rand);
  } else {
    const allScenes: Scene[] = ['birthday', 'wedding', 'condolence', 'graduation', 'romantic', 'appreciation'];
    scene = pickRandom(allScenes, rand);
  }

  let season: Season;
  if (customer.preferredSeasons.length > 0 && rand() < 0.5) {
    season = pickRandom(customer.preferredSeasons, rand);
  } else {
    const allSeasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
    season = pickRandom(allSeasons, rand);
  }

  let palette: ColorPalette;
  if (customer.preferredPalettes.length > 0 && rand() < 0.6) {
    palette = pickRandom(customer.preferredPalettes, rand);
  } else {
    const allPalettes: ColorPalette[] = ['warm', 'cool', 'pastel', 'monochrome', 'vibrant', 'elegant'];
    palette = pickRandom(allPalettes, rand);
  }

  const template = SCENE_ORDER_TEMPLATES[scene];
  const titleIdx = Math.floor(rand() * template.titles.length);
  const title = template.titles[titleIdx];
  const description = template.descriptions[Math.floor(rand() * template.descriptions.length)];

  const meaningsCount = randInRange(config.requiredMeaningsCount, rand);
  let requiredMeanings: string[];
  if (customer.preferredMeanings.length > 0 && rand() < 0.5) {
    requiredMeanings = pickRandomN(customer.preferredMeanings, Math.min(meaningsCount, customer.preferredMeanings.length), rand);
    if (requiredMeanings.length < meaningsCount) {
      const extra = pickRandomN(template.meanings.flat().filter(m => !requiredMeanings.includes(m)), meaningsCount - requiredMeanings.length, rand);
      requiredMeanings = [...requiredMeanings, ...extra];
    }
  } else {
    requiredMeanings = pickRandomN(template.meanings.flat(), meaningsCount, rand);
  }

  const budget = randInRange(config.budget, rand);
  const timeLimit = randInRange(config.timeLimit, rand);
  const targetScore = randInRange(config.targetScore, rand);

  const unlockedFlowers = FLOWERS.filter(f => f.unlocked).map(f => f.id);
  const forbiddenCount = randInRange(config.forbiddenCount, rand);
  const forbiddenFlowerIds = pickRandomN(unlockedFlowers, forbiddenCount, rand);

  const bonusCount = randInRange(config.bonusCount, rand);
  const selectedBonuses = pickRandomN(BONUS_TARGET_POOL, bonusCount, rand);
  const bonusTargets = buildBonusTargets(selectedBonuses);

  let coinReward = Math.round(randInRange(config.coinReward, rand) * (1 + customer.lifetimeValue / 1000));
  let reputationReward = Math.round(randInRange(config.reputationReward, rand) * 1.2);

  const multiplier = getOrderRewardMultiplier(progress.professionRank);
  coinReward = Math.round(coinReward * multiplier);
  reputationReward = Math.round(reputationReward * multiplier);

  let unlockReward: string[] | undefined;
  if (rand() < config.unlockChance * 1.2) {
    const lockedFlowers = FLOWERS.filter(f => !f.unlocked).map(f => f.id);
    if (lockedFlowers.length > 0) {
      unlockReward = pickRandomN(lockedFlowers, selectedDifficulty === 'expert' ? 2 : 1, rand);
    }
  }

  const harmonyHint = HARMONY_HINTS_BY_PALETTE[palette] + '。' + SEASONAL_HINTS[season];

  return {
    id: `repurchase_${customer.id}_${seed}_${Date.now()}`,
    customerName: customer.name,
    customerAvatar: customer.avatar,
    customerId: customer.id,
    title: `[回头客] ${title}`,
    description: `老客户再次光临！${description}`,
    difficulty: selectedDifficulty,
    scene,
    budget: Math.round(budget * 1.1),
    season,
    forbiddenFlowerIds,
    requiredMeanings,
    preferredPalette: palette,
    preferredColorHues: PALETTE_HUES[palette],
    minHarmonyScore: config.minHarmonyScore,
    timeLimit,
    targetScore,
    bonusTargets,
    unlockReward,
    coinReward,
    reputationReward,
    harmonyHint,
    deadline: Date.now() + 24 * 60 * 60 * 1000,
    orderPoolSeed: seed,
    isRepurchase: true,
    customerNotes: customer.tags.length > 0 ? `客户偏好标签已生成，请用心服务！` : undefined
  };
}

export function generateOrderPool(count: number = 8, baseSeed?: number, progress?: GameProgress): Order[] {
  const seed = baseSeed || Date.now();
  const orders: Order[] = [];
  const rand = seededRandom(seed);

  let actualCount = count;
  let market: MarketCondition | null = null;
  let difficultyPool: OrderDifficulty[] = ['easy', 'easy', 'medium', 'medium', 'hard', 'hard', 'expert'];
  let budgetMultiplier = 1.0;
  let repurchaseBonus = 0;

  if (progress) {
    const studioConfig = getStudioRankConfig(progress.studio.rank);
    actualCount = Math.max(4, Math.min(count, studioConfig.dailyOrderPoolSize));
    actualCount = Math.round(actualCount * studioConfig.customerReachMultiplier);

    if (progress.studio.studioReputation >= 100) {
      difficultyPool = ['easy', 'medium', 'medium', 'hard', 'hard', 'expert', 'expert'];
      budgetMultiplier = 1.1;
    }
    if (progress.studio.studioReputation >= 300) {
      difficultyPool = ['medium', 'medium', 'hard', 'hard', 'hard', 'expert', 'expert'];
      budgetMultiplier = 1.2;
    }

    if (progress.businessDays && progress.businessDays.length > 0) {
      market = progress.businessDays[progress.businessDays.length - 1].marketCondition;
    } else {
      market = generateMarketCondition(progress.currentDay || 1, seed);
    }

    if (market && market.overallMultiplier > 1.1) {
      budgetMultiplier *= market.overallMultiplier * 0.8;
    } else if (market && market.overallMultiplier < 0.9) {
      budgetMultiplier *= 1.05;
    }

    if (market && market.eventName) {
      actualCount = Math.min(actualCount + 2, actualCount * 1.3);
    }

    const customersWithHighRepurchase = Object.values(progress.customers).filter(
      c => c.repurchaseProbability >= 50 && c.totalOrders > 0
    );
    repurchaseBonus = progress.studio.studioReputation >= 50 ? 1 : 0;
    const repurchaseCount = Math.min(
      2 + repurchaseBonus,
      customersWithHighRepurchase.length,
      Math.floor(actualCount * 0.3)
    );
    for (let i = 0; i < repurchaseCount; i++) {
      const customer = customersWithHighRepurchase[Math.floor(rand() * customersWithHighRepurchase.length)];
      const orderSeed = seed + i * 2000 + Math.floor(rand() * 999);
      orders.push(generateRepurchaseOrder(customer, orderSeed, progress));
    }
  } else {
    market = generateMarketCondition(1, seed);
  }

  const remainingCount = Math.max(0, actualCount - orders.length);
  for (let i = 0; i < remainingCount; i++) {
    const orderSeed = seed + (i + 10) * 1000 + Math.floor(rand() * 999);
    const diff = difficultyPool[i % difficultyPool.length];
    const order = generateOrder(orderSeed, diff, undefined, progress);

    if (budgetMultiplier !== 1.0) {
      order.budget = Math.round(order.budget * budgetMultiplier);
      order.coinReward = Math.round(order.coinReward * budgetMultiplier);
    }

    if (market) {
      order.season = market.season;
      const shortageModifiers = order.forbiddenFlowerIds.filter(
        id => market.shortageFlowerIds.includes(id)
      ).length;
      if (shortageModifiers > 0) {
        order.budget = Math.round(order.budget * (1 + shortageModifiers * 0.05));
      }

      const surplusPreferred = market.surplusFlowerIds.some(
        id => order.preferredColorHues && order.preferredColorHues.length > 0
      );
      if (surplusPreferred) {
        order.targetScore = Math.max(50, order.targetScore - 3);
      }

      if (market.eventName) {
        order.harmonyHint = `📢 市场动态：${market.eventName}。${order.harmonyHint || ''}`;
      }
    }

    orders.push(order);
  }

  orders.sort(() => Math.random() - 0.5);
  return orders;
}

export function getSceneName(scene: Scene): string {
  return SCENE_NAMES[scene] || scene;
}

export function getSeasonName(season: Season): string {
  return SEASON_NAMES[season] || season;
}

export function checkAchievements(progress: any): string[] {
  const newAchievements: string[] = [];
  const orderCount = progress.completedOrders?.length || 0;
  const highScores = progress.highScores || {};
  const maxScore = Math.max(0, ...(Object.values(highScores) as number[]));

  if (orderCount >= 1) newAchievements.push('first_order');
  if (orderCount >= 10) newAchievements.push('ten_orders');
  if (orderCount >= 50) newAchievements.push('fifty_orders');
  if (orderCount >= 100) newAchievements.push('hundred_orders');
  if (maxScore >= 100) newAchievements.push('perfect_score');
  if (progress.unlockedFlowers?.length >= FLOWERS.length) newAchievements.push('all_flowers');
  if (progress.customerReputation >= 100) newAchievements.push('reputation_100');
  if ((progress.totalEarnedCoins || progress.coins || 0) >= 1000) newAchievements.push('rich_florist');

  if (progress.repurchaseOrderCount >= 1) newAchievements.push('first_repurchase');

  const satisfiedCustomers = Object.values(progress.customers || {}).filter(
    (c: any) => c.satisfaction >= 80
  ).length;
  if (satisfiedCustomers >= 5) newAchievements.push('loyal_customers');

  if (progress.professionRank && progress.professionRank !== 'apprentice') {
    newAchievements.push('promotion');
  }

  return newAchievements;
}

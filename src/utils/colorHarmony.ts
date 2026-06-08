import { FlowerColor, Bouquet, ScoreResult, LevelConfig, Order } from '../types';

function hueDistance(h1: number, h2: number): number {
  let d = Math.abs(h1 - h2);
  if (d > 180) d = 360 - d;
  return d;
}

export function classifyColorHarmony(colors: FlowerColor[]): { type: string; score: number } {
  const distinctHues = colors.filter(c => c.name !== '纯白' && c.name !== '奶白' && c.name !== '香槟色').map(c => c.hue);

  if (distinctHues.length === 0) {
    return { type: '无彩（中性色系）', score: 75 };
  }
  if (distinctHues.length === 1) {
    return { type: '单色搭配', score: 85 };
  }

  let totalDist = 0;
  let pairCount = 0;
  for (let i = 0; i < distinctHues.length; i++) {
    for (let j = i + 1; j < distinctHues.length; j++) {
      totalDist += hueDistance(distinctHues[i], distinctHues[j]);
      pairCount++;
    }
  }
  const avgDist = totalDist / pairCount;

  if (avgDist <= 30) {
    return { type: '单色搭配', score: 85 - avgDist / 30 * 10 };
  } else if (avgDist <= 60) {
    return { type: '邻近色搭配', score: 90 - (avgDist - 30) / 30 * 10 };
  } else if (avgDist <= 120) {
    return { type: '对比色搭配', score: 80 + (120 - avgDist) / 60 * 15 };
  } else if (avgDist <= 180) {
    return { type: '互补色搭配', score: 75 + (180 - avgDist) / 60 * 10 };
  }
  return { type: '多色搭配', score: 60 };
}

function calculateMeaningScore(bouquet: Bouquet, required: string[]): number {
  const usedFlowers = [bouquet.mainFlower, ...bouquet.fillerFlowers, bouquet.wrapping].filter(Boolean) as any[];
  const meanings = usedFlowers.map(f => f.meaning);

  let matched = 0;
  required.forEach(req => {
    if (meanings.includes(req)) matched++;
  });

  if (matched === required.length) return 100;
  return Math.round((matched / required.length) * 100);
}

function calculateBudgetScore(bouquet: Bouquet, budget: number): number {
  const total = calculateBouquetPrice(bouquet);
  if (total <= budget) {
    const ratio = total / budget;
    if (ratio >= 0.7) return 100;
    return Math.round(80 + (ratio - 0.5) * 10 / 0.2);
  }
  return Math.max(0, 100 - (total - budget) / budget * 100);
}

export function calculateBouquetPrice(bouquet: Bouquet): number {
  let total = 0;
  if (bouquet.mainFlower) total += bouquet.mainFlower.price * 3;
  bouquet.fillerFlowers.forEach(f => total += f.price);
  if (bouquet.wrapping) total += bouquet.wrapping.price;
  return total;
}

function calculateSeasonalScore(bouquet: Bouquet, season: string): number {
  const flowers = [bouquet.mainFlower, ...bouquet.fillerFlowers, bouquet.wrapping].filter(Boolean) as any[];
  if (flowers.length === 0) return 0;

  let inSeason = 0;
  flowers.forEach(f => {
    if (f.seasons.includes(season)) inSeason++;
  });

  return Math.round((inSeason / flowers.length) * 100);
}

function calculateForbiddenPenalty(bouquet: Bouquet, forbiddenIds: string[]): number {
  const flowers = [bouquet.mainFlower, ...bouquet.fillerFlowers, bouquet.wrapping].filter(Boolean) as any[];
  let usedForbidden = 0;
  flowers.forEach(f => {
    if (forbiddenIds.includes(f.id)) usedForbidden++;
  });
  return usedForbidden * 10;
}

function calculateTimeBonus(timeRemaining: number, totalTime: number): number {
  if (timeRemaining <= 0) return 0;
  const ratio = timeRemaining / totalTime;
  if (ratio >= 0.5) return 10;
  if (ratio >= 0.3) return 5;
  if (ratio >= 0.1) return 2;
  return 0;
}

function calculatePaletteScore(bouquet: Bouquet, preferredHues?: number[]): number {
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

function calculateHarmonyMinPenalty(harmonyScore: number, minRequired: number): number {
  if (harmonyScore >= minRequired) return 0;
  return Math.round((minRequired - harmonyScore) * 0.5);
}

export function calculateScore(bouquet: Bouquet, level: LevelConfig): ScoreResult {
  const allFlowers: FlowerColor[] = [];
  if (bouquet.mainFlower) allFlowers.push(bouquet.mainFlower.color);
  bouquet.fillerFlowers.forEach(f => allFlowers.push(f.color));
  if (bouquet.wrapping) allFlowers.push(bouquet.wrapping.color);

  const colorHarmony = classifyColorHarmony(allFlowers);
  const meaningScore = calculateMeaningScore(bouquet, level.requiredFlowerMeanings);
  const budgetScore = calculateBudgetScore(bouquet, level.budget);
  const seasonalScore = calculateSeasonalScore(bouquet, level.season);

  const totalScore = Math.round(
    colorHarmony.score * 0.4 +
    meaningScore * 0.3 +
    budgetScore * 0.15 +
    seasonalScore * 0.15
  );

  const feedback: string[] = [];

  if (colorHarmony.score < 70) {
    feedback.push('色彩搭配可以优化：当前为「' + colorHarmony.type + '」得分较低，建议尝试' + level.harmonyHint);
  } else {
    feedback.push('色彩搭配优秀：「' + colorHarmony.type + '」效果很好！');
  }

  const allBouquetFlowers = [bouquet.mainFlower, ...bouquet.fillerFlowers, bouquet.wrapping].filter(Boolean) as any[];
  const missingMeanings = level.requiredFlowerMeanings.filter(
    m => !allBouquetFlowers.some(f => f.meaning === m)
  );
  if (missingMeanings.length > 0) {
    feedback.push('缺少花语：建议加入带有「' + missingMeanings.join('、') + '」含义的花材');
  } else {
    feedback.push('花语全部符合要求，非常棒！');
  }

  const bouquetPrice = calculateBouquetPrice(bouquet);
  if (bouquetPrice > level.budget) {
    feedback.push('预算超标！预算' + level.budget + '元，当前花费' + bouquetPrice + '元');
  } else if (bouquetPrice / level.budget < 0.5) {
    feedback.push('预算利用率较低，当前花费' + bouquetPrice + '元，建议更充分利用预算（预算' + level.budget + '元）');
  }

  const passed = totalScore >= level.targetScore;
  if (!passed) {
    feedback.push('距离目标分数还差 ' + (level.targetScore - totalScore) + ' 分');
  }

  return {
    totalScore,
    colorHarmonyScore: colorHarmony.score,
    meaningScore,
    budgetScore,
    seasonalScore,
    bonusScore: 0,
    timeBonusScore: 0,
    colorHarmonyType: colorHarmony.type,
    feedback,
    passed
  };
}

export function calculateOrderScore(
  bouquet: Bouquet,
  order: Order,
  timeRemaining: number
): { result: ScoreResult; achievedBonusIds: string[]; paletteScore: number } {
  const allFlowers: FlowerColor[] = [];
  if (bouquet.mainFlower) allFlowers.push(bouquet.mainFlower.color);
  bouquet.fillerFlowers.forEach(f => allFlowers.push(f.color));
  if (bouquet.wrapping) allFlowers.push(bouquet.wrapping.color);

  const colorHarmony = classifyColorHarmony(allFlowers);
  const meaningScore = calculateMeaningScore(bouquet, order.requiredMeanings);
  const budgetScore = calculateBudgetScore(bouquet, order.budget);
  const seasonalScore = calculateSeasonalScore(bouquet, order.season);
  const paletteScore = calculatePaletteScore(bouquet, order.preferredColorHues);
  const timeBonusScore = calculateTimeBonus(timeRemaining, order.timeLimit);
  const forbiddenPenalty = calculateForbiddenPenalty(bouquet, order.forbiddenFlowerIds);
  const harmonyPenalty = calculateHarmonyMinPenalty(colorHarmony.score, order.minHarmonyScore);

  let baseScore = Math.round(
    colorHarmony.score * 0.3 +
    meaningScore * 0.25 +
    budgetScore * 0.15 +
    seasonalScore * 0.15 +
    paletteScore * 0.15
  );

  baseScore = Math.max(0, baseScore - forbiddenPenalty - harmonyPenalty);

  const tempResult: ScoreResult = {
    totalScore: baseScore,
    colorHarmonyScore: colorHarmony.score,
    meaningScore,
    budgetScore,
    seasonalScore,
    bonusScore: 0,
    timeBonusScore,
    colorHarmonyType: colorHarmony.type,
    feedback: [],
    passed: false
  };

  const achievedBonusIds: string[] = [];
  let totalBonusPoints = 0;
  order.bonusTargets.forEach(bonus => {
    try {
      if (bonus.check(bouquet, order, tempResult)) {
        achievedBonusIds.push(bonus.id);
        totalBonusPoints += bonus.points;
      }
    } catch (e) {
      console.warn('Bonus check failed:', bonus.id, e);
    }
  });

  const totalScore = baseScore + totalBonusPoints + timeBonusScore;

  const feedback: string[] = [];

  if (colorHarmony.score < order.minHarmonyScore) {
    feedback.push('⚠ 色彩协调度未达最低要求（需' + order.minHarmonyScore + '分，当前' + Math.round(colorHarmony.score) + '分），已扣分');
  } else if (colorHarmony.score >= 90) {
    feedback.push('✨ 色彩搭配极佳：「' + colorHarmony.type + '」，完美和谐！');
  } else {
    feedback.push('色彩搭配：「' + colorHarmony.type + '」，得分' + Math.round(colorHarmony.score));
  }

  const allBouquetFlowers = [bouquet.mainFlower, ...bouquet.fillerFlowers, bouquet.wrapping].filter(Boolean) as any[];
  const missingMeanings = order.requiredMeanings.filter(
    m => !allBouquetFlowers.some(f => f.meaning === m)
  );
  if (missingMeanings.length > 0) {
    feedback.push('📝 缺少花语：「' + missingMeanings.join('、') + '」');
  } else {
    feedback.push('✅ 所有指定花语全部命中！');
  }

  const usedForbidden = allBouquetFlowers.filter(f => order.forbiddenFlowerIds.includes(f.id));
  if (usedForbidden.length > 0) {
    feedback.push('🚫 使用了禁用花材：' + usedForbidden.map(f => f.name).join('、') + '，扣' + (usedForbidden.length * 10) + '分');
  }

  const bouquetPrice = calculateBouquetPrice(bouquet);
  if (bouquetPrice > order.budget) {
    feedback.push('💸 预算超标！预算' + order.budget + '元，当前花费' + bouquetPrice + '元');
  } else {
    feedback.push('💰 预算控制良好：' + bouquetPrice + '元 / ' + order.budget + '元');
  }

  if (paletteScore >= 80) {
    feedback.push('🎨 色系偏好匹配度高：' + paletteScore + '%');
  } else if (paletteScore >= 50) {
    feedback.push('🎨 色系偏好基本匹配：' + paletteScore + '%');
  } else {
    feedback.push('🎨 色系偏好匹配度较低：' + paletteScore + '%，可考虑调整');
  }

  if (timeBonusScore >= 10) {
    feedback.push('⚡ 效率超高！剩余时间奖励+10分');
  } else if (timeBonusScore >= 5) {
    feedback.push('⏱ 完成及时，时间奖励+' + timeBonusScore + '分');
  }

  if (achievedBonusIds.length > 0) {
    const achievedNames = order.bonusTargets
      .filter(b => achievedBonusIds.includes(b.id))
      .map(b => b.description + '(+' + b.points + ')');
    feedback.push('🏆 达成加分目标：' + achievedNames.join('、'));
  }

  const passed = totalScore >= order.targetScore;
  if (!passed) {
    feedback.push('距离目标分数还差 ' + Math.max(0, order.targetScore - totalScore) + ' 分');
  } else {
    feedback.push('🎉 恭喜通过！总分' + totalScore + ' ≥ 目标' + order.targetScore);
  }

  return {
    result: {
      totalScore,
      colorHarmonyScore: colorHarmony.score,
      meaningScore,
      budgetScore,
      seasonalScore,
      bonusScore: totalBonusPoints,
      timeBonusScore,
      colorHarmonyType: colorHarmony.type,
      feedback,
      passed
    },
    achievedBonusIds,
    paletteScore
  };
}

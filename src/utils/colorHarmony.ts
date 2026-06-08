import { FlowerColor, Bouquet, ScoreResult, LevelConfig } from '../types';

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
    colorHarmonyType: colorHarmony.type,
    feedback,
    passed
  };
}

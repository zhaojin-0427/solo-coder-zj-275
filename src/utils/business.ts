import {
  FlowerInventoryItem,
  Supplier,
  SupplierState,
  MarketCondition,
  StockRiskAssessment,
  StockRiskLevel,
  StudioState,
  StudioRank,
  Assistant,
  BusinessDay,
  DailyReport,
  Order,
  Bouquet,
  Flower,
  GameProgress,
  Season,
  PurchaseOrder,
  BusinessCalculationResult,
  OrderPreparationResult,
  SeasonalStockAdvice,
  MarketTrend,
  ScoreResult
} from '../types';
import { FLOWERS } from '../data/flowers';
import {
  SUPPLIERS,
  STUDIO_RANKS,
  MARKET_EVENTS,
  BASE_STOCK_CONFIG,
  BUSINESS_CONFIG,
  ASSISTANT_TEMPLATES
} from '../data/suppliers';
import { calculateBouquetPrice } from './colorHarmony';

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function getCurrentSeason(dayNumber: number): Season {
  const seasonIndex = Math.floor((dayNumber - 1) / 7) % 4;
  const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
  return seasons[seasonIndex];
}

export function generateMarketCondition(dayNumber: number, seed?: number): MarketCondition {
  const actualSeed = seed ?? Date.now() + dayNumber * 1000;
  const rand = seededRandom(actualSeed);
  const season = getCurrentSeason(dayNumber);

  const trends: MarketTrend[] = ['rising', 'stable', 'falling', 'volatile'];
  const trend = trends[Math.floor(rand() * trends.length)];

  let overallMultiplier = 1.0;
  if (trend === 'rising') overallMultiplier = 1.1 + rand() * 0.15;
  else if (trend === 'falling') overallMultiplier = 0.85 + rand() * 0.1;
  else if (trend === 'volatile') overallMultiplier = 0.9 + rand() * 0.2;
  else overallMultiplier = 0.95 + rand() * 0.1;

  const flowerPriceModifiers: Record<string, number> = {};
  const flowerAvailability: Record<string, number> = {};
  const shortageFlowerIds: string[] = [];
  const surplusFlowerIds: string[] = [];

  FLOWERS.forEach(flower => {
    const isInSeason = flower.seasons.includes(season);
    let modifier = overallMultiplier;
    let availability = 0.5 + rand() * 0.5;

    if (isInSeason) {
      modifier *= 0.85 + rand() * 0.1;
      availability = Math.min(1, availability + 0.3);
    } else {
      modifier *= 1.15 + rand() * 0.2;
      availability = Math.max(0.1, availability - 0.3);
    }

    if (flower.type === 'main') modifier *= 1.05;
    if (flower.type === 'wrapping') modifier *= 0.95;

    modifier *= 0.9 + rand() * 0.2;

    flowerPriceModifiers[flower.id] = Math.round(modifier * 100) / 100;
    flowerAvailability[flower.id] = Math.round(availability * 100) / 100;

    if (availability < 0.25) shortageFlowerIds.push(flower.id);
    if (availability > 0.85) surplusFlowerIds.push(flower.id);
  });

  let eventName: string | undefined;
  let eventDescription: string | undefined;

  const matchingEvents = MARKET_EVENTS.filter(e => e.season === season);
  if (matchingEvents.length > 0 && rand() < 0.3) {
    const selectedEvent = matchingEvents[Math.floor(rand() * matchingEvents.length)];
    eventName = selectedEvent.name;
    eventDescription = selectedEvent.description;

    FLOWERS.forEach(flower => {
      if (flower.seasons.includes(season)) {
        flowerPriceModifiers[flower.id] = Math.round(flowerPriceModifiers[flower.id] * selectedEvent.priceImpact * 100) / 100;
      }
    });
  }

  return {
    date: Date.now(),
    season,
    trend,
    overallMultiplier: Math.round(overallMultiplier * 100) / 100,
    flowerPriceModifiers,
    flowerAvailability,
    shortageFlowerIds,
    surplusFlowerIds,
    eventName,
    eventDescription
  };
}

export function getSupplierFlowerPrice(supplier: Supplier, flower: Flower, market: MarketCondition, supplierState?: SupplierState): number {
  const baseModifier = supplier.basePriceMultiplier;
  const marketModifier = market.flowerPriceModifiers[flower.id] || 1;
  const loyaltyDiscount = supplierState ? (1 - supplierState.currentDiscount) : 1;

  let price = flower.price * baseModifier * marketModifier * loyaltyDiscount;

  const isSpecialty = supplier.specialtyTypes.includes(flower.type) || supplier.specialtySeasons.includes(market.season);
  if (isSpecialty) price *= 0.9;

  if (!flower.seasons.includes(market.season)) price *= 1.1;

  return Math.round(price * 100) / 100;
}

export function checkSupplierHasFlower(supplier: Supplier, flowerId: string, market: MarketCondition): boolean {
  if (!supplier.availableFlowerIds.includes(flowerId)) return false;
  const availability = market.flowerAvailability[flowerId] ?? 0.5;
  return availability > 0.1;
}

export function createInitialInventory(progress: GameProgress): Record<string, FlowerInventoryItem> {
  const inventory: Record<string, FlowerInventoryItem> = {};
  const now = Date.now();

  progress.unlockedFlowers.forEach(flowerId => {
    const flower = FLOWERS.find(f => f.id === flowerId);
    if (flower) {
      inventory[flowerId] = {
        flowerId,
        quantity: BASE_STOCK_CONFIG.initialStockPerFlower,
        reservedQuantity: 0,
        avgCost: flower.price,
        lastRestockDate: now,
        freshnessDays: BASE_STOCK_CONFIG.freshnessExpiryDays,
        expiryRisk: 0.1
      };
    }
  });

  return inventory;
}

export function createInitialSuppliers(): Record<string, SupplierState> {
  const suppliers: Record<string, SupplierState> = {};
  SUPPLIERS.forEach(supplier => {
    suppliers[supplier.id] = {
      supplierId: supplier.id,
      reputation: 50,
      totalPurchases: 0,
      totalSpent: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      lastPurchaseDate: 0,
      loyaltyLevel: 0,
      currentDiscount: 0,
      pendingOrders: []
    };
  });
  return suppliers;
}

export function createInitialStudio(): StudioState {
  return {
    rank: 'workshop',
    studioReputation: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalCosts: 0,
    inventoryCapacity: BASE_STOCK_CONFIG.baseInventoryCapacity,
    dailyRent: BUSINESS_CONFIG.baseDailyRent,
    utilityCost: BUSINESS_CONFIG.baseUtilityCost,
    openingDate: Date.now(),
    renovationLevel: 1,
    displayAreaLevel: 1,
    storageLevel: 1
  };
}

export function createInitialBusinessDay(dayNumber: number, startBalance: number): BusinessDay {
  return {
    dayNumber,
    date: Date.now(),
    season: getCurrentSeason(dayNumber),
    startBalance,
    endBalance: startBalance,
    ordersAccepted: 0,
    ordersCompleted: 0,
    ordersFailed: 0,
    revenue: 0,
    materialCost: 0,
    operatingCost: 0,
    assistantSalaries: 0,
    profit: 0,
    customerSatisfactionAvg: 0,
    newCustomers: 0,
    repurchaseCustomers: 0,
    marketCondition: generateMarketCondition(dayNumber),
    stockWasteCost: 0,
    restockCost: 0
  };
}

export function getAvailableStock(inventory: Record<string, FlowerInventoryItem>, flowerId: string): number {
  const item = inventory[flowerId];
  if (!item) return 0;
  return Math.max(0, item.quantity - item.reservedQuantity);
}

export function reserveStock(inventory: Record<string, FlowerInventoryItem>, flowerId: string, quantity: number): boolean {
  const item = inventory[flowerId];
  if (!item) return false;
  const available = item.quantity - item.reservedQuantity;
  if (available < quantity) return false;
  item.reservedQuantity += quantity;
  return true;
}

export function consumeStock(inventory: Record<string, FlowerInventoryItem>, flowerId: string, quantity: number): number {
  const item = inventory[flowerId];
  if (!item) return 0;

  const consumedReserved = Math.min(item.reservedQuantity, quantity);
  item.reservedQuantity -= consumedReserved;
  const remaining = quantity - consumedReserved;

  const consumedDirect = Math.min(item.quantity, remaining);
  item.quantity -= consumedDirect;

  const totalConsumed = consumedReserved + consumedDirect;
  if (item.quantity === 0) {
    item.avgCost = 0;
  }
  return totalConsumed;
}

export function addStock(
  inventory: Record<string, FlowerInventoryItem>,
  flowerId: string,
  quantity: number,
  unitCost: number
): FlowerInventoryItem {
  let item = inventory[flowerId];
  const now = Date.now();

  if (!item) {
    item = {
      flowerId,
      quantity: 0,
      reservedQuantity: 0,
      avgCost: unitCost,
      lastRestockDate: now,
      freshnessDays: BASE_STOCK_CONFIG.freshnessExpiryDays,
      expiryRisk: 0.1
    };
    inventory[flowerId] = item;
  }

  const totalQuantity = item.quantity + quantity;
  if (totalQuantity > 0) {
    item.avgCost = (item.avgCost * item.quantity + unitCost * quantity) / totalQuantity;
  } else {
    item.avgCost = unitCost;
  }

  item.quantity = totalQuantity;
  item.lastRestockDate = now;
  item.freshnessDays = BASE_STOCK_CONFIG.freshnessExpiryDays;
  item.expiryRisk = Math.max(0.05, item.expiryRisk - 0.05);

  return item;
}

export function calculateDailyStockWaste(inventory: Record<string, FlowerInventoryItem>): { waste: Record<string, number>; totalCost: number } {
  const waste: Record<string, number> = {};
  let totalCost = 0;

  Object.values(inventory).forEach(item => {
    const available = item.quantity - item.reservedQuantity;
    if (available <= 0) return;

    item.freshnessDays = Math.max(0, item.freshnessDays - 1);

    let wasteRate = BASE_STOCK_CONFIG.wasteRatePerDay;
    if (item.freshnessDays <= 2) wasteRate *= 3;
    if (item.freshnessDays <= 0) wasteRate = 0.5;

    wasteRate += item.expiryRisk * 0.5;

    const wasteQuantity = Math.min(available, Math.ceil(available * wasteRate));
    if (wasteQuantity > 0) {
      item.quantity -= wasteQuantity;
      waste[item.flowerId] = wasteQuantity;
      totalCost += wasteQuantity * item.avgCost;
      item.expiryRisk = Math.min(1, item.expiryRisk + 0.05);
    }
  });

  return { waste, totalCost: Math.round(totalCost * 100) / 100 };
}

export function assessStockRiskForOrder(
  order: Order,
  inventory: Record<string, FlowerInventoryItem>,
  market: MarketCondition
): StockRiskAssessment {
  const flowerRequirements: Record<string, number> = {};
  let missingFlowerIds: string[] = [];
  let lowStockFlowerIds: string[] = [];
  let suggestedPurchaseItems: Array<{ flowerId: string; suggestedQuantity: number; estimatedCost: number }> = [];
  let totalEstimatedRestockCost = 0;
  let riskScore = 0;
  let deliveryTimeRisk = false;

  const unlockedMainFlowers = FLOWERS.filter(f => f.type === 'main' && f.unlocked);
  const unlockedFillerFlowers = FLOWERS.filter(f => f.type === 'filler' && f.unlocked);
  const unlockedWrappingFlowers = FLOWERS.filter(f => f.type === 'wrapping' && f.unlocked);

  unlockedMainFlowers.slice(0, 3).forEach(f => {
    flowerRequirements[f.id] = (flowerRequirements[f.id] || 0) + 3;
  });
  unlockedFillerFlowers.slice(0, 4).forEach(f => {
    flowerRequirements[f.id] = (flowerRequirements[f.id] || 0) + 2;
  });
  unlockedWrappingFlowers.slice(0, 2).forEach(f => {
    flowerRequirements[f.id] = (flowerRequirements[f.id] || 0) + 1;
  });

  const standardSupplier = SUPPLIERS.find(s => s.tier === 'standard');

  Object.entries(flowerRequirements).forEach(([flowerId, requiredQty]) => {
    const available = getAvailableStock(inventory, flowerId);
    const flower = FLOWERS.find(f => f.id === flowerId);

    if (available === 0) {
      missingFlowerIds.push(flowerId);
      riskScore += 30;

      if (flower && standardSupplier) {
        const price = getSupplierFlowerPrice(standardSupplier, flower, market);
        const suggestedQty = Math.max(requiredQty, BASE_STOCK_CONFIG.initialStockPerFlower);
        const estCost = Math.round(price * suggestedQty * 100) / 100;
        suggestedPurchaseItems.push({ flowerId, suggestedQuantity: suggestedQty, estimatedCost: estCost });
        totalEstimatedRestockCost += estCost;
      }

      const availability = market.flowerAvailability[flowerId] ?? 0.5;
      if (availability < 0.3) {
        deliveryTimeRisk = true;
        riskScore += 20;
      }
    } else if (available < requiredQty) {
      lowStockFlowerIds.push(flowerId);
      riskScore += 15;

      if (flower && standardSupplier) {
        const shortageQty = requiredQty - available + BASE_STOCK_CONFIG.safetyStockThreshold;
        const price = getSupplierFlowerPrice(standardSupplier, flower, market);
        const estCost = Math.round(price * shortageQty * 100) / 100;
        suggestedPurchaseItems.push({ flowerId, suggestedQuantity: shortageQty, estimatedCost: estCost });
        totalEstimatedRestockCost += estCost;
      }
    }
  });

  if (order.budget < totalEstimatedRestockCost * 0.3) {
    riskScore += 25;
  }

  let riskLevel: StockRiskLevel;
  if (riskScore >= 80) riskLevel = 'critical';
  else if (riskScore >= 50) riskLevel = 'high';
  else if (riskScore >= 20) riskLevel = 'medium';
  else riskLevel = 'low';

  return {
    orderId: order.id,
    riskLevel,
    riskScore,
    missingFlowerIds,
    lowStockFlowerIds,
    suggestedPurchaseItems,
    totalEstimatedRestockCost: Math.round(totalEstimatedRestockCost * 100) / 100,
    deliveryTimeRisk
  };
}

export function prepareOrder(
  order: Order,
  progress: GameProgress
): OrderPreparationResult {
  const market = progress.businessDays.length > 0
    ? progress.businessDays[progress.businessDays.length - 1].marketCondition
    : generateMarketCondition(progress.currentDay);

  const stockRisk = assessStockRiskForOrder(order, progress.inventory, market);
  const budgetWarnings: string[] = [];

  let estimatedTotalCost = 0;
  const bouquetFlowerIds = order.requiredMeanings.length > 0 ? 5 : 3;
  estimatedTotalCost = Math.round(order.budget * 0.6 * 100) / 100;

  estimatedTotalCost += stockRisk.totalEstimatedRestockCost;
  const estimatedProfit = Math.round((order.coinReward - estimatedTotalCost) * 100) / 100;

  if (stockRisk.riskLevel === 'critical') {
    budgetWarnings.push('⚠️ 库存严重不足，必须紧急补货');
  }
  if (stockRisk.riskLevel === 'high') {
    budgetWarnings.push('库存不足，建议采购备货');
  }
  if (stockRisk.deliveryTimeRisk) {
    budgetWarnings.push('部分花材市场供应紧张，可能延迟到货');
  }
  if (estimatedProfit < 0) {
    budgetWarnings.push('预估利润为负，请谨慎接单');
  }
  if (progress.coins < stockRisk.totalEstimatedRestockCost) {
    budgetWarnings.push('金币不足以支付预估补货成本');
  }

  return {
    canAccept: true,
    stockRisk,
    estimatedTotalCost,
    estimatedProfit,
    budgetWarnings
  };
}

export function calculateBusinessResult(
  bouquet: Bouquet,
  order: Order,
  scoreResult: ScoreResult,
  progress: GameProgress
): BusinessCalculationResult {
  const stockUsed: Record<string, number> = {};
  const stockWaste: Record<string, number> = {};
  let materialCost = 0;

  const usedFlowers: Flower[] = [];
  if (bouquet.mainFlower) {
    usedFlowers.push(bouquet.mainFlower);
    const qty = 3;
    stockUsed[bouquet.mainFlower.id] = qty;
    const invItem = progress.inventory[bouquet.mainFlower.id];
    materialCost += (invItem?.avgCost || bouquet.mainFlower.price) * qty;
  }
  bouquet.fillerFlowers.forEach(f => {
    usedFlowers.push(f);
    stockUsed[f.id] = (stockUsed[f.id] || 0) + 1;
    const invItem = progress.inventory[f.id];
    materialCost += invItem?.avgCost || f.price;
  });
  if (bouquet.wrapping) {
    usedFlowers.push(bouquet.wrapping);
    stockUsed[bouquet.wrapping.id] = 1;
    const invItem = progress.inventory[bouquet.wrapping.id];
    materialCost += invItem?.avgCost || bouquet.wrapping.price;
  }

  let wasteCost = 0;
  Object.keys(stockUsed).forEach(flowerId => {
    const qty = stockUsed[flowerId];
    const available = getAvailableStock(progress.inventory, flowerId);
    if (available < qty) {
      const shortage = qty - available;
      stockWaste[flowerId] = shortage;
      const flower = FLOWERS.find(f => f.id === flowerId);
      if (flower) {
        wasteCost += flower.price * shortage * 1.5;
      }
    }
  });

  materialCost = Math.round(materialCost * 100) / 100;
  wasteCost = Math.round(wasteCost * 100) / 100;

  const revenue = order.coinReward;
  const grossProfit = Math.round((revenue - materialCost - wasteCost) * 100) / 100;

  let studioReputationChange = 0;
  if (scoreResult.passed) {
    studioReputationChange = Math.round(scoreResult.totalScore / 20);
    if (scoreResult.totalScore >= 90) studioReputationChange += 5;
    if (Object.keys(stockWaste).length > 0) studioReputationChange -= 3;
  } else {
    studioReputationChange = -Math.round((100 - scoreResult.totalScore) / 10);
  }

  const supplierImpacts: Record<string, { reputationChange: number; spent: number }> = {};

  return {
    materialCost,
    stockUsed,
    stockWaste,
    wasteCost,
    grossProfit,
    netProfit: grossProfit,
    studioReputationChange,
    supplierImpacts
  };
}

export function processPurchaseDelivery(
  inventory: Record<string, FlowerInventoryItem>,
  purchaseOrder: PurchaseOrder
): { delivered: boolean; qualityScore: number; message: string } {
  const supplier = SUPPLIERS.find(s => s.id === purchaseOrder.supplierId);
  if (!supplier) {
    return { delivered: false, qualityScore: 0, message: '供应商不存在' };
  }

  const rand = Math.random();
  const successRate = 0.7 + supplier.reliabilityRating * 0.05;

  if (rand > successRate) {
    return {
      delivered: false,
      qualityScore: 0,
      message: `${supplier.name}：部分花材运输损耗，订单部分失败`
    };
  }

  purchaseOrder.items.forEach(item => {
    addStock(inventory, item.flowerId, item.quantity, item.unitPrice);
  });

  const qualityScore = Math.round((supplier.qualityRating / 5) * 100);

  return {
    delivered: true,
    qualityScore,
    message: `${supplier.name}：订单顺利送达，品质评级 ${qualityScore}分`
  };
}

export function updateSupplierLoyalty(supplierState: SupplierState): SupplierState {
  const updated = { ...supplierState };

  updated.loyaltyLevel = Math.min(5, Math.floor(updated.totalSpent / 500));

  const discountTable = [0, 0.03, 0.06, 0.1, 0.15, 0.2];
  updated.currentDiscount = discountTable[updated.loyaltyLevel] || 0;

  if (updated.totalSpent >= 500 && updated.failedDeliveries === 0) {
    updated.reputation = Math.min(100, updated.reputation + 5);
  }

  return updated;
}

export function checkStudioRankUp(studio: StudioState): { newRank: StudioRank | null; message: string } {
  for (let i = STUDIO_RANKS.length - 1; i >= 0; i--) {
    const rankConfig = STUDIO_RANKS[i];
    if (
      studio.studioReputation >= rankConfig.requiredReputation &&
      studio.totalRevenue >= rankConfig.requiredTotalRevenue &&
      rankConfig.rank !== studio.rank
    ) {
      const currentIndex = STUDIO_RANKS.findIndex(r => r.rank === studio.rank);
      if (i > currentIndex) {
        return {
          newRank: rankConfig.rank,
          message: `🎉 工作室升级为「${rankConfig.name}」！`
        };
      }
    }
  }
  return { newRank: null, message: '' };
}

export function getSeasonalStockAdvice(
  flowerId: string,
  currentSeason: Season,
  market: MarketCondition
): SeasonalStockAdvice {
  const flower = FLOWERS.find(f => f.id === flowerId);
  if (!flower) {
    return {
      flowerId,
      flowerName: flowerId,
      currentSeason,
      isInSeason: false,
      priceTrend: 'stable',
      availabilityScore: 0.5,
      recommendedAction: 'hold',
      reasoning: '花材数据缺失'
    };
  }

  const isInSeason = flower.seasons.includes(currentSeason);
  const priceModifier = market.flowerPriceModifiers[flowerId] ?? 1;
  const availability = market.flowerAvailability[flowerId] ?? 0.5;

  let priceTrend: MarketTrend = 'stable';
  if (priceModifier > 1.15) priceTrend = 'rising';
  else if (priceModifier < 0.85) priceTrend = 'falling';
  else if (Math.abs(priceModifier - 1) > 0.05) priceTrend = 'volatile';

  let recommendedAction: 'stock_up' | 'hold' | 'reduce' | 'clear' = 'hold';
  let reasoning = '';

  if (isInSeason && priceModifier < 0.9 && availability > 0.7) {
    recommendedAction = 'stock_up';
    reasoning = '当季花材价格低廉供应充足，建议多备货';
  } else if (!isInSeason && priceModifier > 1.2) {
    recommendedAction = 'reduce';
    reasoning = '非当季花材价格偏高，建议减少库存';
  } else if (availability < 0.3) {
    recommendedAction = 'stock_up';
    reasoning = '市场供应紧张，建议提前补货避免缺货';
  } else if (priceTrend === 'rising') {
    recommendedAction = 'stock_up';
    reasoning = '价格呈上涨趋势，建议提前备货锁定成本';
  } else if (priceTrend === 'falling') {
    recommendedAction = 'hold';
    reasoning = '价格持续下跌，可等待更低价时采购';
  } else {
    reasoning = '市场平稳，维持现有库存水平即可';
  }

  return {
    flowerId,
    flowerName: flower.name,
    currentSeason,
    isInSeason,
    priceTrend,
    availabilityScore: availability,
    recommendedAction,
    reasoning
  };
}

export function generateDailyReport(day: BusinessDay, progress: GameProgress): DailyReport {
  const highlights: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const lowStockAlerts: Array<{ flowerId: string; currentStock: number; recommendedRestock: number }> = [];
  const topSellingFlowers: Array<{ flowerId: string; count: number; revenue: number }> = [];
  const supplierUpdates: Array<{ supplierId: string; message: string; change?: number }> = [];
  const marketInsights: string[] = [];

  if (day.profit > 0) {
    highlights.push(`💰 今日盈利 ¥${day.profit.toFixed(2)}`);
  } else {
    warnings.push(`📉 今日亏损 ¥${Math.abs(day.profit).toFixed(2)}`);
  }

  if (day.ordersCompleted >= 3) {
    highlights.push(`✅ 完成 ${day.ordersCompleted} 笔订单，表现出色！`);
  }
  if (day.ordersFailed > 0) {
    warnings.push(`❌ ${day.ordersFailed} 笔订单未通过，需要改进`);
  }

  if (day.customerSatisfactionAvg >= 80) {
    highlights.push(`😊 客户平均满意度 ${day.customerSatisfactionAvg.toFixed(0)} 分`);
  } else if (day.customerSatisfactionAvg < 50 && day.ordersCompleted > 0) {
    warnings.push(`😕 客户满意度偏低：${day.customerSatisfactionAvg.toFixed(0)} 分`);
  }

  if (day.newCustomers > 0) {
    highlights.push(`👋 新增 ${day.newCustomers} 位客户`);
  }
  if (day.repurchaseCustomers > 0) {
    highlights.push(`🔄 ${day.repurchaseCustomers} 位回头客再次光临`);
  }

  if (day.stockWasteCost > 10) {
    warnings.push(`🥀 花材损耗成本较高：¥${day.stockWasteCost.toFixed(2)}，请注意库存管理`);
  }

  Object.entries(progress.inventory).forEach(([flowerId, item]) => {
    const available = item.quantity - item.reservedQuantity;
    if (available <= 1) {
      lowStockAlerts.push({
        flowerId,
        currentStock: available,
        recommendedRestock: BASE_STOCK_CONFIG.safetyStockThreshold * 2
      });
    }
  });

  if (lowStockAlerts.length > 0) {
    warnings.push(`⚠️ ${lowStockAlerts.length} 种花材库存告急`);
    suggestions.push('建议尽快补货以免影响接单');
  }

  if (day.marketCondition.eventName) {
    marketInsights.push(`📢 市场动态：${day.marketCondition.eventName} - ${day.marketCondition.eventDescription}`);
  }

  if (day.marketCondition.shortageFlowerIds.length > 0) {
    const shortageNames = day.marketCondition.shortageFlowerIds.slice(0, 3).map(id => {
      const f = FLOWERS.find(fl => fl.id === id);
      return f?.name || id;
    }).join('、');
    marketInsights.push(`🔴 供应紧张：${shortageNames}${day.marketCondition.shortageFlowerIds.length > 3 ? ' 等' : ''}`);
  }

  if (day.marketCondition.surplusFlowerIds.length > 0) {
    const surplusNames = day.marketCondition.surplusFlowerIds.slice(0, 3).map(id => {
      const f = FLOWERS.find(fl => fl.id === id);
      return f?.name || id;
    }).join('、');
    marketInsights.push(`🟢 供应充足：${surplusNames}${day.marketCondition.surplusFlowerIds.length > 3 ? ' 等' : ''}，价格优惠`);
  }

  if (progress.coins < day.restockCost * 2) {
    warnings.push('💸 运营资金紧张，请合理控制采购成本');
  }

  if (day.ordersCompleted === 0 && day.ordersAccepted === 0) {
    suggestions.push('今日未接单，可适当降低价格或宣传吸引客户');
  }

  Object.entries(progress.suppliers).forEach(([supplierId, state]) => {
    const supplier = SUPPLIERS.find(s => s.id === supplierId);
    if (!supplier) return;
    if (state.loyaltyLevel >= 2) {
      supplierUpdates.push({
        supplierId,
        message: `${supplier.name} 忠诚度 ${state.loyaltyLevel} 级，优惠 ${(state.currentDiscount * 100).toFixed(0)}%`,
        change: state.currentDiscount
      });
    }
  });

  const studioRankUp = checkStudioRankUp(progress.studio);
  if (studioRankUp.newRank) {
    highlights.push(studioRankUp.message);
  }

  const avgMult = day.marketCondition.overallMultiplier;
  if (avgMult < 0.9) {
    suggestions.push('市场整体价格走低，是集中采购的好时机');
  } else if (avgMult > 1.15) {
    suggestions.push('市场价格偏高，建议按需采购，控制成本');
  }

  return {
    dayNumber: day.dayNumber,
    date: day.date,
    summary: {
      revenue: day.revenue,
      costs: day.materialCost + day.operatingCost + day.stockWasteCost + day.restockCost + day.assistantSalaries,
      profit: day.profit,
      ordersCompleted: day.ordersCompleted,
      customerSatisfaction: day.customerSatisfactionAvg,
      studioReputationChange: progress.studio.studioReputation
    },
    highlights,
    warnings,
    suggestions,
    topSellingFlowers,
    lowStockAlerts,
    supplierUpdates,
    marketInsights
  };
}

export function advanceBusinessDay(progress: GameProgress): { progress: GameProgress; report: DailyReport } {
  const newDayNumber = progress.currentDay + 1;
  const season = getCurrentSeason(newDayNumber);
  const market = generateMarketCondition(newDayNumber);

  const wasteResult = calculateDailyStockWaste(progress.inventory);

  const newDay: BusinessDay = {
    dayNumber: newDayNumber,
    date: Date.now(),
    season,
    startBalance: progress.coins,
    endBalance: progress.coins,
    ordersAccepted: 0,
    ordersCompleted: 0,
    ordersFailed: 0,
    revenue: 0,
    materialCost: 0,
    operatingCost: progress.studio.dailyRent + progress.studio.utilityCost,
    assistantSalaries: progress.assistants.reduce((sum, a) => sum + a.salary, 0),
    profit: 0,
    customerSatisfactionAvg: 0,
    newCustomers: 0,
    repurchaseCustomers: 0,
    marketCondition: market,
    stockWasteCost: wasteResult.totalCost,
    restockCost: 0
  };

  newDay.endBalance = newDay.startBalance - newDay.operatingCost - newDay.assistantSalaries - newDay.stockWasteCost;
  progress.coins = newDay.endBalance;
  progress.studio.totalCosts += newDay.operatingCost + newDay.assistantSalaries + newDay.stockWasteCost;

  const updatedSuppliers: Record<string, SupplierState> = {};
  Object.entries(progress.suppliers).forEach(([id, state]) => {
    updatedSuppliers[id] = updateSupplierLoyalty(state);
  });
  progress.suppliers = updatedSuppliers;

  progress.businessDays.push(newDay);
  progress.currentDay = newDayNumber;

  const report = generateDailyReport(newDay, progress);
  progress.dailyReports.push(report);

  if (progress.coins < BUSINESS_CONFIG.minBalancePenaltyThreshold) {
    progress.customerReputation = Math.max(0, progress.customerReputation - BUSINESS_CONFIG.reputationPenaltyForBankruptcy);
    progress.studio.studioReputation = Math.max(0, progress.studio.studioReputation - 10);
  }

  return { progress, report };
}

export function canHireAssistant(studio: StudioState, assistants: Assistant[]): boolean {
  const rankConfig = STUDIO_RANKS.find(r => r.rank === studio.rank);
  if (!rankConfig) return false;
  return assistants.length < rankConfig.maxAssistantCount;
}

export function hireAssistant(): Assistant | null {
  const template = ASSISTANT_TEMPLATES[Math.floor(Math.random() * ASSISTANT_TEMPLATES.length)];
  return {
    id: `assistant_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: template.name,
    avatar: template.avatar,
    skills: { ...template.skills },
    level: 1,
    experience: 0,
    salary: template.salary,
    hiredDate: Date.now(),
    morale: 80,
    status: 'active'
  };
}

export function getStudioRankConfig(rank: StudioRank) {
  return STUDIO_RANKS.find(r => r.rank === rank) || STUDIO_RANKS[0];
}

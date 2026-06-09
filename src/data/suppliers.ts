import { Supplier, StudioRankConfig, Season, SupplierTier, MarketTrend, AssistantSkill } from '../types';
import { FLOWERS } from './flowers';

const MAIN_FLOWERS = FLOWERS.filter(f => f.type === 'main').map(f => f.id);
const FILLER_FLOWERS = FLOWERS.filter(f => f.type === 'filler').map(f => f.id);
const WRAPPING_FLOWERS = FLOWERS.filter(f => f.type === 'wrapping').map(f => f.id);

const SPRING_FLOWERS = FLOWERS.filter(f => f.seasons.includes('spring')).map(f => f.id);
const SUMMER_FLOWERS = FLOWERS.filter(f => f.seasons.includes('summer')).map(f => f.id);
const AUTUMN_FLOWERS = FLOWERS.filter(f => f.seasons.includes('autumn')).map(f => f.id);
const WINTER_FLOWERS = FLOWERS.filter(f => f.seasons.includes('winter')).map(f => f.id);

export const SUPPLIERS: Supplier[] = [
  {
    id: 'supplier_eco',
    name: '绿野花卉合作社',
    tier: 'budget',
    status: 'active',
    description: '本地农户联营，主打平价鲜切花，品质普通但价格实惠',
    specialtyTypes: ['filler'],
    specialtySeasons: ['spring', 'summer'],
    basePriceMultiplier: 0.8,
    minOrderAmount: 30,
    deliveryDays: 2,
    qualityRating: 3,
    reliabilityRating: 3,
    discountThreshold: 200,
    availableFlowerIds: [...FILLER_FLOWERS.slice(0, 5), ...MAIN_FLOWERS.slice(0, 4)]
  },
  {
    id: 'supplier_standard',
    name: '城市花卉配送中心',
    tier: 'standard',
    status: 'active',
    description: '城市主流供应商，品类齐全，品质稳定可靠',
    specialtyTypes: ['main', 'filler'],
    specialtySeasons: ['spring', 'summer', 'autumn'],
    basePriceMultiplier: 1.0,
    minOrderAmount: 50,
    deliveryDays: 1,
    qualityRating: 4,
    reliabilityRating: 4,
    discountThreshold: 300,
    availableFlowerIds: [...MAIN_FLOWERS, ...FILLER_FLOWERS]
  },
  {
    id: 'supplier_premium',
    name: '雅致花苑精品供应',
    tier: 'premium',
    status: 'active',
    description: '高端花材供应商，主打进口花材和精品包装',
    specialtyTypes: ['main', 'wrapping'],
    specialtySeasons: ['autumn', 'winter'],
    basePriceMultiplier: 1.4,
    minOrderAmount: 100,
    deliveryDays: 1,
    qualityRating: 5,
    reliabilityRating: 4,
    discountThreshold: 500,
    availableFlowerIds: [...MAIN_FLOWERS.slice(2), ...WRAPPING_FLOWERS]
  },
  {
    id: 'supplier_seasonal',
    name: '四季时令花田',
    tier: 'standard',
    status: 'active',
    description: '专注当季花材，季节性品种丰富且新鲜度高',
    specialtyTypes: ['main', 'filler'],
    specialtySeasons: ['spring', 'summer', 'autumn', 'winter'],
    basePriceMultiplier: 0.95,
    minOrderAmount: 40,
    deliveryDays: 2,
    qualityRating: 4,
    reliabilityRating: 3,
    discountThreshold: 250,
    availableFlowerIds: [...SPRING_FLOWERS, ...SUMMER_FLOWERS, ...AUTUMN_FLOWERS, ...WINTER_FLOWERS]
  },
  {
    id: 'supplier_exclusive',
    name: '皇家花艺专属渠道',
    tier: 'exclusive',
    status: 'on probation',
    description: '独家代理稀有花材，提供定制化服务，价格昂贵',
    specialtyTypes: ['main', 'wrapping'],
    specialtySeasons: ['winter', 'spring'],
    basePriceMultiplier: 2.0,
    minOrderAmount: 200,
    deliveryDays: 3,
    qualityRating: 5,
    reliabilityRating: 5,
    discountThreshold: 1000,
    availableFlowerIds: FLOWERS.filter(f => !f.unlocked || f.price >= 20).map(f => f.id)
  },
  {
    id: 'supplier_wrap',
    name: '精美包装材料专营',
    tier: 'standard',
    status: 'trusted',
    description: '专注各类包装纸和装饰材料，款式更新快',
    specialtyTypes: ['wrapping'],
    specialtySeasons: ['spring', 'summer', 'autumn', 'winter'],
    basePriceMultiplier: 1.1,
    minOrderAmount: 20,
    deliveryDays: 1,
    qualityRating: 4,
    reliabilityRating: 5,
    discountThreshold: 150,
    availableFlowerIds: WRAPPING_FLOWERS
  }
];

export const STUDIO_RANKS: StudioRankConfig[] = [
  {
    rank: 'workshop',
    name: '家庭工作室',
    requiredReputation: 0,
    requiredTotalRevenue: 0,
    maxAssistantCount: 0,
    inventoryCapacityMultiplier: 1.0,
    dailyOrderPoolSize: 5,
    customerReachMultiplier: 1.0,
    icon: '🏠'
  },
  {
    rank: 'boutique',
    name: '社区精品店',
    requiredReputation: 50,
    requiredTotalRevenue: 2000,
    maxAssistantCount: 1,
    inventoryCapacityMultiplier: 1.5,
    dailyOrderPoolSize: 7,
    customerReachMultiplier: 1.3,
    icon: '🏪'
  },
  {
    rank: 'atelier',
    name: '花艺工作室',
    requiredReputation: 150,
    requiredTotalRevenue: 8000,
    maxAssistantCount: 2,
    inventoryCapacityMultiplier: 2.0,
    dailyOrderPoolSize: 9,
    customerReachMultiplier: 1.6,
    icon: '🏛️'
  },
  {
    rank: 'flagship',
    name: '品牌旗舰店',
    requiredReputation: 400,
    requiredTotalRevenue: 25000,
    maxAssistantCount: 4,
    inventoryCapacityMultiplier: 3.0,
    dailyOrderPoolSize: 12,
    customerReachMultiplier: 2.0,
    icon: '🏢'
  },
  {
    rank: 'brand',
    name: '连锁品牌',
    requiredReputation: 1000,
    requiredTotalRevenue: 80000,
    maxAssistantCount: 8,
    inventoryCapacityMultiplier: 5.0,
    dailyOrderPoolSize: 16,
    customerReachMultiplier: 3.0,
    icon: '🏰'
  }
];

export const SEASON_TO_MONTHS: Record<Season, number[]> = {
  spring: [3, 4, 5],
  summer: [6, 7, 8],
  autumn: [9, 10, 11],
  winter: [12, 1, 2]
};

export const TREND_NAMES: Record<MarketTrend, string> = {
  rising: '上涨',
  stable: '平稳',
  falling: '下跌',
  volatile: '波动'
};

export const SUPPLIER_TIER_NAMES: Record<SupplierTier, string> = {
  budget: '平价',
  standard: '标准',
  premium: '精品',
  exclusive: '独家'
};

export const MARKET_EVENTS = [
  { name: '情人节备货潮', flowerTypes: ['romantic'], season: 'winter' as Season, priceImpact: 1.3, description: '情人节前夕浪漫花材需求激增' },
  { name: '母亲节高峰', flowerTypes: ['appreciation'], season: 'spring' as Season, priceImpact: 1.25, description: '母亲节感恩花材热销' },
  { name: '毕业季需求', flowerTypes: ['graduation'], season: 'summer' as Season, priceImpact: 1.2, description: '毕业季庆祝花束走俏' },
  { name: '清明节供应', flowerTypes: ['condolence'], season: 'spring' as Season, priceImpact: 1.15, description: '清明祭扫花材需求稳定' },
  { name: '花田丰收', flowerTypes: [], season: 'summer' as Season, priceImpact: 0.8, description: '夏季花材供应充足，价格下降' },
  { name: '冬季减产', flowerTypes: [], season: 'winter' as Season, priceImpact: 1.15, description: '冬季产量降低，花材普遍涨价' },
  { name: '婚庆旺季', flowerTypes: ['wedding'], season: 'autumn' as Season, priceImpact: 1.25, description: '秋季婚礼密集，婚庆花材紧俏' }
];

export const ASSISTANT_TEMPLATES = [
  {
    name: '小花',
    avatar: '👧',
    skills: { inventory: 2, arrangement: 3, customer: 2, procurement: 1, design: 2 },
    salary: 80
  },
  {
    name: '阿杰',
    avatar: '👦',
    skills: { inventory: 3, arrangement: 2, customer: 1, procurement: 3, design: 1 },
    salary: 90
  },
  {
    name: '小美',
    avatar: '👩',
    skills: { inventory: 1, arrangement: 4, customer: 3, procurement: 1, design: 3 },
    salary: 120
  },
  {
    name: '老王',
    avatar: '👨',
    skills: { inventory: 4, arrangement: 2, customer: 2, procurement: 4, design: 1 },
    salary: 110
  }
];

export const ASSISTANT_SKILL_NAMES: Record<AssistantSkill, { name: string; icon: string }> = {
  inventory: { name: '库存管理', icon: '📦' },
  arrangement: { name: '花束搭配', icon: '💐' },
  customer: { name: '客户服务', icon: '😊' },
  procurement: { name: '采购议价', icon: '💰' },
  design: { name: '创意设计', icon: '🎨' }
};

export const BASE_STOCK_CONFIG = {
  initialStockPerFlower: 5,
  safetyStockThreshold: 3,
  freshnessExpiryDays: 7,
  wasteRatePerDay: 0.05,
  baseInventoryCapacity: 100
};

export const BUSINESS_CONFIG = {
  baseDailyRent: 50,
  baseUtilityCost: 15,
  minBalancePenaltyThreshold: -100,
  reputationPenaltyForBankruptcy: 50,
  dailyOrderBaseCount: 6,
  maxDaysPerSession: 30
};

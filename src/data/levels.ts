import { LevelConfig } from '../types';

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: '爱的告白',
    difficulty: 'easy',
    scene: 'romantic',
    requiredFlowerMeanings: ['爱情', '初恋'],
    budget: 80,
    timeLimit: 120,
    season: 'spring',
    targetScore: 60,
    harmonyHint: '推荐使用单色搭配（同色系深浅变化），让整体更温馨',
    unlockReward: ['rose_lightPink', 'gypsophila_pink']
  },
  {
    id: 2,
    name: '生日祝福',
    difficulty: 'easy',
    scene: 'birthday',
    requiredFlowerMeanings: ['祝福', '阳光', '希望'],
    budget: 70,
    timeLimit: 100,
    season: 'summer',
    targetScore: 65,
    harmonyHint: '推荐使用邻近色搭配，如黄+橙+粉，活泼有朝气',
    unlockReward: ['tulip_purple', 'freesia_yellow']
  },
  {
    id: 3,
    name: '温馨慰问',
    difficulty: 'medium',
    scene: 'condolence',
    requiredFlowerMeanings: ['纯洁', '慰问', '哀思'],
    budget: 60,
    timeLimit: 90,
    season: 'autumn',
    targetScore: 70,
    harmonyHint: '推荐使用素雅配色，以白、浅黄为主，庄重大方',
    unlockReward: ['carnation_white', 'lily_pink']
  },
  {
    id: 4,
    name: '浪漫婚礼',
    difficulty: 'medium',
    scene: 'wedding',
    requiredFlowerMeanings: ['纯洁', '永恒', '优雅'],
    budget: 150,
    timeLimit: 120,
    season: 'spring',
    targetScore: 75,
    harmonyHint: '推荐使用对比色中的柔和配色，如白+粉+浅紫，梦幻浪漫',
    unlockReward: ['hydrangea_blue', 'rose_champagne', 'wrap_champagne']
  },
  {
    id: 5,
    name: '感恩母亲',
    difficulty: 'hard',
    scene: 'appreciation',
    requiredFlowerMeanings: ['母爱', '感恩', '温柔'],
    budget: 100,
    timeLimit: 80,
    season: 'autumn',
    targetScore: 80,
    harmonyHint: '推荐使用邻近色搭配，如粉+桃+香槟，温馨甜美',
    unlockReward: ['hydrangea_purple', 'wrap_burgundy', 'baby_breath_purple']
  },
  {
    id: 6,
    name: '毕业启程',
    difficulty: 'hard',
    scene: 'graduation',
    requiredFlowerMeanings: ['希望', '阳光', '友谊'],
    budget: 90,
    timeLimit: 70,
    season: 'summer',
    targetScore: 85,
    harmonyHint: '推荐使用对比色搭配，如黄+紫，青春活力充满希望',
    unlockReward: ['wrap_navy', 'wrap_peach', 'freesia_white']
  }
];

export const SCENE_NAMES: Record<string, string> = {
  birthday: '生日',
  wedding: '婚礼',
  condolence: '慰问',
  graduation: '毕业',
  romantic: '浪漫约会',
  appreciation: '感恩致谢'
};

export const SEASON_NAMES: Record<string, string> = {
  spring: '春季',
  summer: '夏季',
  autumn: '秋季',
  winter: '冬季'
};

export const DIFFICULTY_NAMES: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难'
};

import { ColorPalette, Scene, Season, OrderDifficulty } from '../types';

export const CUSTOMERS = [
  { name: '林小姐', avatar: '👩', tone: 'gentle' },
  { name: '王先生', avatar: '👨', tone: 'formal' },
  { name: '张奶奶', avatar: '👵', tone: 'warm' },
  { name: '李同学', avatar: '🧑‍🎓', tone: 'casual' },
  { name: '陈女士', avatar: '👩‍💼', tone: 'professional' },
  { name: '赵先生', avatar: '🧔', tone: 'romantic' },
  { name: '孙阿姨', avatar: '👩‍🍳', tone: 'friendly' },
  { name: '周经理', avatar: '👨‍💼', tone: 'strict' },
  { name: '吴小姐', avatar: '👱‍♀️', tone: 'playful' },
  { name: '郑医生', avatar: '👨‍⚕️', tone: 'calm' },
  { name: '冯老师', avatar: '👩‍🏫', tone: 'kind' },
  { name: '韩设计师', avatar: '🧑‍🎨', tone: 'creative' }
];

export const PALETTE_HUES: Record<ColorPalette, number[]> = {
  warm: [0, 15, 30, 45, 60],
  cool: [170, 210, 240, 280, 285],
  pastel: [330, 340, 345, 15, 120, 170, 285],
  monochrome: [0],
  vibrant: [0, 30, 60, 120, 210, 280, 330],
  elegant: [45, 280, 285, 240]
};

export const PALETTE_NAMES: Record<ColorPalette, string> = {
  warm: '暖色调',
  cool: '冷色调',
  pastel: '马卡龙色',
  monochrome: '单色系',
  vibrant: '鲜艳多彩',
  elegant: '高雅色系'
};

export const ORDER_DIFFICULTY_NAMES: Record<OrderDifficulty, string> = {
  easy: '入门',
  medium: '进阶',
  hard: '挑战',
  expert: '大师'
};

export const DIFFICULTY_COLORS: Record<OrderDifficulty, string> = {
  easy: '#4CAF50',
  medium: '#FF9800',
  hard: '#F44336',
  expert: '#9C27B0'
};

export const SCENE_ORDER_TEMPLATES: Record<Scene, { titles: string[]; descriptions: string[]; meanings: string[][]; }> = {
  birthday: {
    titles: ['生日惊喜花束', '闺蜜生日贺礼', '父亲生日礼物', '孩子毕业生日', '长辈寿辰祝福'],
    descriptions: [
      '要给最好的朋友一个惊喜，她喜欢温馨浪漫的风格',
      '父亲60大寿，想要庄重又喜庆的花束',
      '女儿18岁成人礼，希望梦幻又有纪念意义',
      '同事生日聚会，需要大方得体的花束',
      '爷爷八十大寿，想要喜庆吉祥的搭配'
    ],
    meanings: [['祝福', '阳光'], ['希望', '快乐'], ['祝福', '感恩'], ['友谊', '阳光'], ['祝福', '纯洁']]
  },
  wedding: {
    titles: ['婚礼手捧花', '婚宴桌花定制', '结婚纪念日花束', '伴娘伴手礼花', '求婚浪漫花束'],
    descriptions: [
      '西式婚礼，白紫色系，要优雅梦幻',
      '中式婚礼，红色为主，喜庆大方',
      '结婚十周年，想要重温初恋的感觉',
      '给伴娘的小礼物，精致可爱',
      '海边求婚，蓝白配色，浪漫唯美'
    ],
    meanings: [['纯洁', '永恒', '优雅'], ['爱情', '祝福'], ['爱情', '温柔'], ['祝福', '友谊'], ['爱情', '浪漫']]
  },
  condolence: {
    titles: ['追悼会花束', '慰问逝者家属', '清明节扫墓花', '长辈离世悼念', '医院慰问花束'],
    descriptions: [
      '庄重肃穆，以白菊花为主',
      '慰问刚失去亲人的朋友，希望温暖安慰',
      '清明祭扫祖父母，素雅端庄',
      '老教授辞世，学生们联名送的花',
      '朋友生病住院，想送些温馨的花'
    ],
    meanings: [['哀思', '纯洁'], ['慰问', '思念'], ['怀念', '纯洁'], ['哀思', '感恩'], ['慰问', '希望']]
  },
  graduation: {
    titles: ['毕业典礼花束', '博士毕业祝贺', '出国留学饯行', '学弟学妹送别', '同学庆祝毕业'],
    descriptions: [
      '女儿大学毕业，想送她最喜欢的色系',
      '同门师兄博士毕业，要有学术气息',
      '闺蜜要去国外读书，纪念我们的友谊',
      '社团学弟学妹毕业，青春活力',
      '全班一起给辅导员送的毕业花'
    ],
    meanings: [['希望', '阳光', '友谊'], ['希望', '祝福'], ['友谊', '思念'], ['阳光', '希望'], ['感恩', '祝福']]
  },
  romantic: {
    titles: ['情人节告白花', '一周年纪念日', '挽回前女友的花', '暗恋对象表白', '日常浪漫惊喜'],
    descriptions: [
      '520表白，希望她能答应我',
      '恋爱三周年，她喜欢粉色系',
      '想和她复合，她最爱的花是百合',
      '暗恋很久的女生，温柔含蓄的表达',
      '没有特别的日子，就是想让她开心'
    ],
    meanings: [['爱情', '初恋'], ['爱情', '温柔', '永恒'], ['爱情', '纯洁'], ['初恋', '温柔'], ['爱情', '浪漫']]
  },
  appreciation: {
    titles: ['母亲节感谢花', '教师节谢师花', '上司离职送别', '帮助过我的恩人', '月嫂阿姨感谢礼'],
    descriptions: [
      '母亲节给妈妈的花，她喜欢康乃馨',
      '退休教授，感谢多年教导',
      '带我的领导要走了，想表达感谢',
      '陌生人帮助了我家人，想送花感谢',
      '照顾宝宝半年的阿姨，非常感谢她'
    ],
    meanings: [['母爱', '感恩'], ['感恩', '祝福'], ['感恩', '友谊'], ['感恩', '纯洁'], ['感恩', '温柔']]
  }
};

export const SEASONAL_HINTS: Record<Season, string> = {
  spring: '春季推荐使用郁金香、百合等当季花材，清新雅致',
  summer: '夏季推荐向日葵、绣球等阳光花材，活力四射',
  autumn: '秋季推荐菊花、康乃馨等温暖花材，成熟稳重',
  winter: '冬季推荐梅花、腊梅等耐寒花材，傲骨凌霜'
};

export const HARMONY_HINTS_BY_PALETTE: Record<ColorPalette, string> = {
  warm: '暖色调搭配：推荐红、橙、黄等相邻色，营造温馨氛围',
  cool: '冷色调搭配：推荐蓝、紫、绿等色，清新宁静',
  pastel: '马卡龙色系：推荐浅粉、浅蓝、浅紫，甜美可爱',
  monochrome: '单色系搭配：同色系深浅变化，简约大方',
  vibrant: '鲜艳多彩：推荐对比色或互补色搭配，活力满满',
  elegant: '高雅色系：推荐香槟、深紫、深蓝，优雅高贵'
};

export const BONUS_TARGET_POOL = [
  { id: 'bonus_all_in_season', description: '全部使用当季花材', points: 10, type: 'season' as const },
  { id: 'bonus_under_budget', description: '控制在预算80%以内', points: 5, type: 'budget' as const },
  { id: 'bonus_three_meanings', description: '同时包含3种以上花语', points: 8, type: 'meaning' as const },
  { id: 'bonus_excellent_harmony', description: '色彩协调度达到90分以上', points: 15, type: 'color' as const },
  { id: 'bonus_perfect_meaning', description: '所有指定花语全部命中', points: 12, type: 'meaning' as const },
  { id: 'bonus_fast_delivery', description: '剩余时间超过50%完成', points: 8, type: 'time' as const },
  { id: 'bonus_palette_match', description: '完全符合偏好色系', points: 10, type: 'color' as const },
  { id: 'bonus_no_forbidden', description: '未使用任何禁用花材', points: 5, type: 'special' as const }
];

export const ACHIEVEMENTS = [
  { id: 'first_order', name: '初出茅庐', description: '完成第一笔订单', icon: '🌱' },
  { id: 'ten_orders', name: '花艺学徒', description: '完成10笔订单', icon: '🌿' },
  { id: 'fifty_orders', name: '资深花艺师', description: '完成50笔订单', icon: '🌸' },
  { id: 'hundred_orders', name: '花艺大师', description: '完成100笔订单', icon: '💐' },
  { id: 'perfect_score', name: '完美花束', description: '单笔订单获得100分以上', icon: '⭐' },
  { id: 'all_flowers', name: '花材收藏家', description: '解锁所有花材', icon: '🏆' },
  { id: 'reputation_100', name: '口碑相传', description: '顾客声望达到100', icon: '👑' },
  { id: 'rich_florist', name: '财源广进', description: '累计获得1000金币', icon: '💰' }
];

import Phaser from 'phaser';
import { ScoreResult, LevelConfig, Bouquet, Flower, Order } from '../types';
import { FLOWERS } from '../data/flowers';
import { SCENE_NAMES } from '../data/levels';
import { PALETTE_NAMES, ORDER_DIFFICULTY_NAMES, DIFFICULTY_COLORS, ACHIEVEMENTS } from '../data/orders';
import { updateHighScore, completeLevel, unlockFlowers, completeOrder } from '../utils/storage';
import { calculateBouquetPrice } from '../utils/colorHarmony';

export class ResultScene extends Phaser.Scene {
  private result!: ScoreResult;
  private level?: LevelConfig;
  private order?: Order;
  private bouquet!: Bouquet;
  private isOrderMode: boolean = false;
  private achievedBonusIds: string[] = [];
  private newAchievements: string[] = [];
  private earnedCoins: number = 0;
  private earnedReputation: number = 0;
  private unlockedFlowerIds: string[] = [];

  constructor() {
    super('ResultScene');
  }

  init(data: {
    result: ScoreResult;
    level?: LevelConfig;
    order?: Order;
    bouquet: Bouquet;
    achievedBonusIds?: string[];
    timeRemaining?: number;
  }): void {
    this.result = data.result;
    this.level = data.level;
    this.order = data.order;
    this.bouquet = data.bouquet;
    this.isOrderMode = !!data.order;
    this.achievedBonusIds = data.achievedBonusIds || [];
  }

  create(): void {
    this.cameras.main.setBackgroundColor(this.result.passed ? '#E8F5E9' : '#FFEBEE');

    if (this.isOrderMode && this.order && this.result.passed) {
      this.processOrderResult();
    } else if (this.level && this.result.passed) {
      completeLevel(this.level.id);
      updateHighScore(this.level.id, this.result.totalScore);
      if (this.level.unlockReward) {
        unlockFlowers(this.level.unlockReward);
      }
    }

    this.createResultHeader();
    this.createScoreBreakdown();
    this.createBouquetSummary();
    this.createFeedback();

    if (this.isOrderMode) {
      this.createRewardsSection();
    } else {
      this.createUnlockRewards();
    }

    this.createActionButtons();
  }

  private processOrderResult(): void {
    const usedFlowers = [this.bouquet.mainFlower, ...this.bouquet.fillerFlowers, this.bouquet.wrapping].filter(Boolean) as Flower[];
    const usedFlowerIds = usedFlowers.map(f => f.id);
    this.earnedCoins = this.order!.coinReward;
    this.earnedReputation = this.order!.reputationReward;
    this.unlockedFlowerIds = this.order!.unlockReward || [];

    const { newAchievements } = completeOrder(
      this.order!,
      this.result.totalScore,
      this.result.passed,
      this.earnedCoins,
      this.earnedReputation,
      this.unlockedFlowerIds,
      this.achievedBonusIds,
      usedFlowerIds
    );
    this.newAchievements = newAchievements;
  }

  private createResultHeader(): void {
    const { width } = this.scale;

    const titleText = this.result.passed ? '🎉 挑战成功!' : '😢 挑战失败';
    if (this.isOrderMode) {
      this.add.text(width / 2, 55, titleText, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '42px',
        color: this.result.passed ? '#2E7D32' : '#C62828',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      const diffColor = DIFFICULTY_COLORS[this.order!.difficulty];
      this.add.rectangle(width / 2, 105, 200, 30, Number('0x' + diffColor.slice(1)), 0.9).setStrokeStyle(2, 0xFFFFFF);
      this.add.text(width / 2, 105, ORDER_DIFFICULTY_NAMES[this.order!.difficulty] + '订单', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '15px',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      const subText = this.order!.customerAvatar + ' ' + this.order!.customerName + ' · ' + this.order!.title;
      this.add.text(width / 2, 145, subText, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '18px',
        color: '#424242'
      }).setOrigin(0.5);
    } else {
      this.add.text(width / 2, 60, titleText, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '48px',
        color: this.result.passed ? '#2E7D32' : '#C62828',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      this.add.text(width / 2, 115, '第' + this.level!.id + '关 - ' + this.level!.name + ' (' + SCENE_NAMES[this.level!.scene] + ')', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '20px',
        color: '#424242'
      }).setOrigin(0.5);
    }

    const totalY = this.isOrderMode ? 195 : 180;
    const totalScoreBg = this.add.rectangle(width / 2, totalY, 300, 110, 0xFFFFFF, 0.9).setStrokeStyle(4, this.result.passed ? 0x66BB6A : 0xEF5353);
    this.add.text(width / 2, totalY - 30, '总分', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#616161'
    }).setOrigin(0.5);

    const targetScore = this.isOrderMode ? this.order!.targetScore : this.level!.targetScore;
    this.add.text(width / 2, totalY + 10, this.result.totalScore + ' 分', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '46px',
      color: this.result.passed ? '#2E7D32' : '#C62828',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(width / 2, totalY + 55, '目标分数: ' + targetScore + '分', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#9E9E9E'
    }).setOrigin(0.5);
  }

  private createScoreBreakdown(): void {
    const { width } = this.scale;
    const y = this.isOrderMode ? 340 : 330;

    const items: { label: string; score: number; desc: string; color: string }[] = this.isOrderMode
      ? [
          { label: '色彩协调度', score: this.result.colorHarmonyScore, desc: this.result.colorHarmonyType, color: '#9C27B0' },
          { label: '花语匹配', score: this.result.meaningScore, desc: '需包含: ' + this.order!.requiredMeanings.join(' '), color: '#E91E63' },
          { label: '预算控制', score: this.result.budgetScore, desc: calculateBouquetPrice(this.bouquet) + '元 / ' + this.order!.budget + '元', color: '#FF9800' },
          { label: '季节契合', score: this.result.seasonalScore, desc: this.getSeasonName(this.order!.season), color: '#4CAF50' },
          { label: '色系匹配', score: this.calculatePaletteScore(), desc: PALETTE_NAMES[this.order!.preferredPalette], color: '#2196F3' }
        ]
      : [
          { label: '色彩协调度', score: this.result.colorHarmonyScore, desc: this.result.colorHarmonyType, color: '#9C27B0' },
          { label: '花语匹配', score: this.result.meaningScore, desc: '需包含: ' + this.level!.requiredFlowerMeanings.join(' '), color: '#E91E63' },
          { label: '预算控制', score: this.result.budgetScore, desc: calculateBouquetPrice(this.bouquet) + '元 / ' + this.level!.budget + '元', color: '#FF9800' },
          { label: '季节契合', score: this.result.seasonalScore, desc: this.getSeasonName(this.level!.season), color: '#4CAF50' }
        ];

    const itemCount = items.length;
    const itemW = itemCount <= 4 ? 180 : 155;
    const gap = 10;
    const totalW = itemCount * itemW + (itemCount - 1) * gap;
    const startX = width / 2 - totalW / 2 + itemW / 2;

    items.forEach((item, i) => {
      const x = startX + i * (itemW + gap);
      this.add.rectangle(x, y, itemW, 125, 0xFFFFFF, 0.9).setStrokeStyle(2, 0xBDBDBD);
      this.add.text(x, y - 42, item.label, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '15px',
        color: item.color,
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.add.text(x, y, item.score + '分', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '28px',
        color: '#333333',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.add.text(x, y + 38, item.desc, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '11px',
        color: '#757575',
        align: 'center',
        wordWrap: { width: itemW - 20 }
      }).setOrigin(0.5);
    });

    if (this.isOrderMode && (this.result.bonusScore > 0 || this.result.timeBonusScore > 0)) {
      const bonusY = y + 95;
      let bonusText = '';
      if (this.result.bonusScore > 0) bonusText += '🏆 加分目标: +' + this.result.bonusScore + '分  ';
      if (this.result.timeBonusScore > 0) bonusText += '⚡ 时间奖励: +' + this.result.timeBonusScore + '分';
      if (bonusText) {
        this.add.text(width / 2, bonusY, bonusText, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '16px',
          color: '#FF6F00',
          fontStyle: 'bold'
        }).setOrigin(0.5);
      }
    }
  }

  private calculatePaletteScore(): number {
    if (!this.isOrderMode || !this.order!.preferredColorHues) return 100;
    const flowers = [this.bouquet.mainFlower, ...this.bouquet.fillerFlowers, this.bouquet.wrapping].filter(Boolean) as Flower[];
    if (flowers.length === 0) return 0;
    const hues = this.order!.preferredColorHues!;
    let matched = 0;
    flowers.forEach(f => {
      if (hues.some(h => Math.abs(f.color.hue - h) <= 40 || Math.abs(f.color.hue - h) >= 320)) matched++;
    });
    return Math.round((matched / flowers.length) * 100);
  }

  private createBouquetSummary(): void {
    const { width } = this.scale;
    const y = this.isOrderMode ? 490 : 510;
    this.add.text(100, y - 15, '你的花束:', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#424242',
      fontStyle: 'bold'
    });

    const allFlowers: (Flower | null)[] = [this.bouquet.mainFlower, ...this.bouquet.fillerFlowers, this.bouquet.wrapping];
    let x = 250;
    allFlowers.filter(Boolean).forEach(flower => {
      const f = flower as Flower;
      const colorCircle = this.add.circle(x, y, 16, Number('0x' + f.color.hex.slice(1))).setStrokeStyle(2, 0x9E9E9E);
      this.add.text(x + 22, y - 8, f.name, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: '#333333'
      });
      this.add.text(x + 22, y + 8, f.meaning, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: '#9C27B0'
      });
      x += 170;
      if (x > width - 100) {
        x = 250;
      }
    });
  }

  private createFeedback(): void {
    const fbY = this.isOrderMode ? 545 : 560;
    this.add.text(100, fbY, '📝 评分说明:', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#424242',
      fontStyle: 'bold'
    });

    this.result.feedback.forEach((msg, i) => {
      const y = fbY + 30 + i * 24;
      this.add.text(100, y, '- ' + msg, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '13px',
        color: '#616161',
        wordWrap: { width: 900 }
      });
    });
  }

  private createRewardsSection(): void {
    if (!this.result.passed) return;
    const baseY = 610;

    this.add.text(100, baseY, '🎁 获得奖励:', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#E65100',
      fontStyle: 'bold'
    });

    let rx = 250;
    const rewardItems: { icon: string; text: string; color: string }[] = [];
    rewardItems.push({ icon: '💰', text: this.earnedCoins + ' 金币', color: '#FF9800' });
    rewardItems.push({ icon: '⭐', text: this.earnedReputation + ' 声望', color: '#FBC02D' });

    if (this.unlockedFlowerIds.length > 0) {
      const unlockNames = this.unlockedFlowerIds.map(id => {
        const f = FLOWERS.find(fl => fl.id === id);
        return f ? f.name : id;
      }).join('、');
      rewardItems.push({ icon: '🌸', text: '解锁: ' + unlockNames, color: '#E91E63' });
    }

    rewardItems.forEach((item) => {
      this.add.text(rx, baseY + 30, item.icon + ' ' + item.text, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '16px',
        color: item.color,
        fontStyle: 'bold'
      });
      rx += 280;
    });

    if (this.newAchievements.length > 0) {
      const achY = baseY + 60;
      this.add.text(100, achY, '🏆 新成就解锁:', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '16px',
        color: '#6A1B9A',
        fontStyle: 'bold'
      });
      this.newAchievements.forEach((achId, i) => {
        const ach = ACHIEVEMENTS.find(a => a.id === achId);
        if (ach) {
          this.add.text(100 + i * 220, achY + 28, ach.icon + ' ' + ach.name + ' - ' + ach.description, {
            fontFamily: 'Microsoft YaHei, sans-serif',
            fontSize: '14px',
            color: '#7B1FA2'
          });
        }
      });
    }
  }

  private createUnlockRewards(): void {
    if (!this.result.passed || !this.level!.unlockReward || this.level!.unlockReward.length === 0) return;
    const unlockedFlowerNames = this.level!.unlockReward.map(id => {
      const flower = FLOWERS.find(f => f.id === id);
      return flower ? flower.name : id;
    });
    this.add.text(100, 630, '解锁新品种: ' + unlockedFlowerNames.join(' '), {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#FF9800',
      fontStyle: 'bold'
    });
  }

  private createActionButtons(): void {
    const { width, height } = this.scale;
    const y = height - 45;

    const retryBtn = this.add.rectangle(width / 2 - 150, y, 180, 50, 0x2196F3, 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.add.text(width / 2 - 150, y, '🔄 再试一次', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    retryBtn.setInteractive({ useHandCursor: true });
    retryBtn.on('pointerdown', () => {
      if (this.isOrderMode) {
        this.scene.start('GameScene', { order: this.order });
      } else {
        this.scene.start('GameScene', { levelId: this.level!.id });
      }
    });

    if (this.result.passed && !this.isOrderMode && this.level && this.level.id < 6) {
      const nextBtn = this.add.rectangle(width / 2 + 30, y, 180, 50, 0x4CAF50, 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);
      this.add.text(width / 2 + 30, y, '下一关', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '18px',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      nextBtn.setInteractive({ useHandCursor: true });
      nextBtn.on('pointerdown', () => {
        this.scene.start('GameScene', { levelId: this.level!.id + 1 });
      });
    }

    if (this.result.passed && this.isOrderMode) {
      const newOrderBtn = this.add.rectangle(width / 2 + 30, y, 200, 50, 0x4CAF50, 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);
      this.add.text(width / 2 + 30, y, '📋 接新订单', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '18px',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      newOrderBtn.setInteractive({ useHandCursor: true });
      newOrderBtn.on('pointerdown', () => {
        this.scene.start('OrderSelectScene');
      });
    }

    const menuBtn = this.add.rectangle(width - 100, y, 170, 50, 0x9E9E9E, 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.add.text(width - 100, y, this.isOrderMode ? '接单大厅' : '关卡选择', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    menuBtn.setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => {
      if (this.isOrderMode) {
        this.scene.start('OrderSelectScene');
      } else {
        this.scene.start('LevelSelectScene');
      }
    });
  }

  private getSeasonName(season: string): string {
    const map: Record<string, string> = { spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季' };
    return map[season] || season;
  }
}

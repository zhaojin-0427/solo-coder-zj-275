import Phaser from 'phaser';
import { ScoreResult, LevelConfig, Bouquet, Flower } from '../types';
import { FLOWERS } from '../data/flowers';
import { SCENE_NAMES } from '../data/levels';
import { updateHighScore, completeLevel, unlockFlowers } from '../utils/storage';
import { calculateBouquetPrice } from '../utils/colorHarmony';

export class ResultScene extends Phaser.Scene {
  private result!: ScoreResult;
  private level!: LevelConfig;
  private bouquet!: Bouquet;

  constructor() {
    super('ResultScene');
  }

  init(data: { result: ScoreResult; level: LevelConfig; bouquet: Bouquet }): void {
    this.result = data.result;
    this.level = data.level;
    this.bouquet = data.bouquet;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(this.result.passed ? '#E8F5E9' : '#FFEBEE');

    if (this.result.passed) {
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
    this.createUnlockRewards();
    this.createActionButtons();
  }

  private createResultHeader(): void {
    const { width } = this.scale;

    this.add.text(width / 2, 60, this.result.passed ? '🎉 挑战成功！' : '😢 挑战失败', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '48px',
      color: this.result.passed ? '#2E7D32' : '#C62828',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, 115, `第${this.level.id}关 - ${this.level.name} (${SCENE_NAMES[this.level.scene]})`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: '#424242'
    }).setOrigin(0.5);

    const totalScoreBg = this.add.rectangle(width / 2, 180, 280, 100, 0xFFFFFF, 0.9).setStrokeStyle(4, this.result.passed ? 0x66BB6A : 0xEF5353);
    this.add.text(width / 2, 170, `总分`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#616161'
    }).setOrigin(0.5);
    this.add.text(width / 2, 210, `${this.result.totalScore} 分`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '42px',
      color: this.result.passed ? '#2E7D32' : '#C62828',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(width / 2, 255, `目标分数: ${this.level.targetScore}分`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#9E9E9E'
    }).setOrigin(0.5);
  }

  private createScoreBreakdown(): void {
    const { width } = this.scale;
    const startX = 150;
    const y = 330;

    const items = [
      { label: '色彩协调度', score: this.result.colorHarmonyScore, desc: this.result.colorHarmonyType, color: '#9C27B0' },
      { label: '花语匹配', score: this.result.meaningScore, desc: `需包含: ${this.level.requiredFlowerMeanings.join('、')}`, color: '#E91E63' },
      { label: '预算控制', score: this.result.budgetScore, desc: `¥${calculateBouquetPrice(this.bouquet)}/${this.level.budget}`, color: '#FF9800' },
      { label: '季节契合', score: this.result.seasonalScore, desc: this.getSeasonName(this.level.season), color: '#4CAF50' }
    ];

    items.forEach((item, i) => {
      const x = startX + i * 200;
      this.add.rectangle(x, y, 180, 120, 0xFFFFFF, 0.9).setStrokeStyle(2, 0xBDBDBD);
      this.add.text(x, y - 40, item.label, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '16px',
        color: item.color,
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.add.text(x, y, `${item.score}分`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '30px',
        color: '#333333',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.add.text(x, y + 40, item.desc, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '11px',
        color: '#757575',
        align: 'center',
        wordWrap: { width: 160 }
      }).setOrigin(0.5);
    });
  }

  private createBouquetSummary(): void {
    const { width } = this.scale;
    const y = 510;
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
      this.add.text(x + 22, y + 8, `「${f.meaning}」`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: '#9C27B0'
      });
      x += 160;
      if (x > width - 100) {
        x = 250;
      }
    });
  }

  private createFeedback(): void {
    this.add.text(100, 560, '改进建议:', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#424242',
      fontStyle: 'bold'
    });

    this.result.feedback.forEach((msg, i) => {
      const y = 595 + i * 25;
      this.add.text(100, y, `• ${msg}`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: '#616161',
        wordWrap: { width: 900 }
      });
    });
  }

  private createUnlockRewards(): void {
    if (!this.result.passed || !this.level.unlockReward || this.level.unlockReward.length === 0) return;
    const unlockedFlowerNames = this.level.unlockReward.map(id => {
      const flower = FLOWERS.find(f => f.id === id);
      return flower ? flower.name : id;
    });
    this.add.text(100, 630, `🎁 解锁新品种: ${unlockedFlowerNames.join('、')}`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#FF9800',
      fontStyle: 'bold'
    });
  }

  private createActionButtons(): void {
    const { width, height } = this.scale;
    const y = height - 45;

    const retryBtn = this.add.rectangle(width / 2 - 140, y, 180, 50, 0x2196F3, 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.add.text(width / 2 - 140, y, '🔄 再试一次', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    retryBtn.setInteractive({ useHandCursor: true });
    retryBtn.on('pointerdown', () => {
      this.scene.start('GameScene', { levelId: this.level.id });
    });

    if (this.result.passed && this.level.id < 6) {
      const nextBtn = this.add.rectangle(width / 2 + 50, y, 180, 50, 0x4CAF50, 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);
      this.add.text(width / 2 + 50, y, '➡ 下一关', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '18px',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      nextBtn.setInteractive({ useHandCursor: true });
      nextBtn.on('pointerdown', () => {
        this.scene.start('GameScene', { levelId: this.level.id + 1 });
      });
    }

    const menuBtn = this.add.rectangle(width - 100, y, 160, 50, 0x9E9E9E, 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.add.text(width - 100, y, '🏠 关卡选择', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    menuBtn.setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => {
      this.scene.start('LevelSelectScene');
    });
  }

  private getSeasonName(season: string): string {
    const map: Record<string, string> = {
      spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季'
    };
    return map[season] || season;
  }
}

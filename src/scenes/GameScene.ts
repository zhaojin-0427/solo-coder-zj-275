import Phaser from 'phaser';
import { Flower, Bouquet, LevelConfig } from '../types';
import { FLOWERS } from '../data/flowers';
import { LEVELS, SCENE_NAMES, SEASON_NAMES } from '../data/levels';
import { loadProgress } from '../utils/storage';
import { calculateScore, calculateBouquetPrice, classifyColorHarmony } from '../utils/colorHarmony';

export class GameScene extends Phaser.Scene {
  private level!: LevelConfig;
  private bouquet: Bouquet = { mainFlower: null, fillerFlowers: [], wrapping: null };
  private timeRemaining: number = 0;
  private timerEvent?: Phaser.Time.TimerEvent;
  private timeText!: Phaser.GameObjects.Text;
  private costText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private activeTab: 'main' | 'filler' | 'wrapping' = 'main';
  private flowerListContainer!: Phaser.GameObjects.Container;
  private previewContainer!: Phaser.GameObjects.Container;

  constructor() {
    super('GameScene');
  }

  init(data: { levelId: number }): void {
    this.level = LEVELS.find(l => l.id === data.levelId) || LEVELS[0];
    this.bouquet = { mainFlower: null, fillerFlowers: [], wrapping: null };
    this.timeRemaining = this.level.timeLimit;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#FFF8E1');
    this.createLayout();
    this.startTimer();
    this.updateAllDisplays();
  }

  private createLayout(): void {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, 70, 0xFFE082, 0.9).setOrigin(0, 0).setStrokeStyle(0, 0xFFB300);
    
    this.add.text(20, 20, `第${this.level.id}关: ${this.level.name}`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#E65100',
      fontStyle: 'bold'
    });

    this.add.text(20, 45, `场景: ${SCENE_NAMES[this.level.scene]} | 季节: ${SEASON_NAMES[this.level.season]} | 预算: ¥${this.level.budget}`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#5D4037'
    });

    this.add.text(width / 2, 35, `需要花语: ${this.level.requiredFlowerMeanings.join(' / ')}`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#BF360C',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.timeText = this.add.text(width - 20, 15, `⏱ ${this.timeRemaining}s`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: '#D32F2F',
      fontStyle: 'bold'
    }).setOrigin(1, 0);

    this.costText = this.add.text(width - 20, 45, `💰 ¥0 / ¥${this.level.budget}`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#388E3C',
      fontStyle: 'bold'
    }).setOrigin(1, 0);

    this.add.rectangle(380, 385, 380, 560, 0xFFFFFF, 0.95).setStrokeStyle(3, 0xFFCC80).setOrigin(0.5);
    this.add.text(380, 110, '🌸 花束预览', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#E65100',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.previewContainer = this.add.container(380, 370);
    this.scoreText = this.add.text(380, 600, '协调性评分: --', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#6A1B9A',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(380, 630, this.level.harmonyHint, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '12px',
      color: '#888888'
    }).setOrigin(0.5);

    this.add.rectangle(830, 385, 480, 560, 0xFFFFFF, 0.95).setStrokeStyle(3, 0xFFCC80).setOrigin(0.5);
    this.add.text(830, 110, '💐 花材库', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#E65100',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.createTabs();
    this.flowerListContainer = this.add.container(610, 170);
    this.updateFlowerList();

    const submitBtn = this.add.rectangle(280, 670, 180, 50, 0x4CAF50, 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.add.text(280, 670, '✅ 提交花束', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    submitBtn.setInteractive({ useHandCursor: true });
    submitBtn.on('pointerdown', () => this.submitBouquet());

    const clearBtn = this.add.rectangle(480, 670, 180, 50, 0xF44336, 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.add.text(480, 670, '🗑 清空重来', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    clearBtn.setInteractive({ useHandCursor: true });
    clearBtn.on('pointerdown', () => {
      this.bouquet = { mainFlower: null, fillerFlowers: [], wrapping: null };
      this.updateAllDisplays();
    });

    const backBtn = this.add.rectangle(100, 670, 140, 50, 0x9E9E9E, 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.add.text(100, 670, '← 返回', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('LevelSelectScene'));
  }

  private createTabs(): void {
    const tabs: Array<{ key: 'main' | 'filler' | 'wrapping'; label: string; x: number }> = [
      { key: 'main', label: '主花', x: 660 },
      { key: 'filler', label: '配花/叶材', x: 800 },
      { key: 'wrapping', label: '包装纸', x: 960 }
    ];

    tabs.forEach(tab => {
      const isActive = this.activeTab === tab.key;
      const btn = this.add.rectangle(tab.x, 145, 130, 35, isActive ? 0xFF9800 : 0xE0E0E0, 1).setStrokeStyle(2, isActive ? 0xF57C00 : 0xBDBDBD);
      const label = this.add.text(tab.x, 145, tab.label, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '16px',
        color: isActive ? '#FFFFFF' : '#616161',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        this.activeTab = tab.key;
        this.resetTabs();
        this.updateFlowerList();
      });
      label.setInteractive({ useHandCursor: true });
      label.on('pointerdown', () => {
        this.activeTab = tab.key;
        this.resetTabs();
        this.updateFlowerList();
      });
    });
  }

  private resetTabs(): void {
    this.children.each(c => {
      if ((c as any).type === 'Rectangle' && (c as Phaser.GameObjects.Rectangle).width === 130 && (c as Phaser.GameObjects.Rectangle).height === 35) {
        (c as Phaser.GameObjects.Rectangle).setFillStyle(0xE0E0E0, 1);
        (c as Phaser.GameObjects.Rectangle).setStrokeStyle(2, 0xBDBDBD);
      }
      if ((c as any).type === 'Text' && ['主花', '配花/叶材', '包装纸'].includes((c as Phaser.GameObjects.Text).text)) {
        (c as Phaser.GameObjects.Text).setColor('#616161');
      }
    }, this);
    this.createTabs();
  }

  private updateFlowerList(): void {
    this.flowerListContainer.removeAll(true);
    const progress = loadProgress();

    let filteredFlowers = FLOWERS.filter(f => {
      const matchType = this.activeTab === 'main' ? f.type === 'main' :
                        this.activeTab === 'filler' ? f.type === 'filler' :
                        f.type === 'wrapping';
      const isUnlocked = progress.unlockedFlowers.includes(f.id);
      return matchType && isUnlocked;
    });

    const cols = 3;
    const cardW = 140;
    const cardH = 160;
    const gapX = 15;
    const gapY = 15;

    filteredFlowers.forEach((flower, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = col * (cardW + gapX) + cardW / 2;
      const y = row * (cardH + gapY) + cardH / 2;

      const isInSeason = flower.seasons.includes(this.level.season);

      const card = this.add.rectangle(x, y, cardW, cardH, 0xFFFFFF, 1).setStrokeStyle(2, isInSeason ? 0x81C784 : 0xE0E0E0);
      this.flowerListContainer.add(card);

      const colorCircle = this.add.circle(x, y - 35, 28, Number('0x' + flower.color.hex.slice(1))).setStrokeStyle(2, 0x9E9E9E);
      this.flowerListContainer.add(colorCircle);

      const nameText = this.add.text(x, y + 5, flower.name, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: '#333333',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.flowerListContainer.add(nameText);

      const metaText = this.add.text(x, y + 28, `¥${flower.price} | ${flower.meaning}`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '11px',
        color: isInSeason ? '#388E3C' : '#9E9E9E'
      }).setOrigin(0.5);
      this.flowerListContainer.add(metaText);

      const seasonTag = this.add.text(x, y + 50, isInSeason ? '当季' : '非当季', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '10px',
        color: isInSeason ? '#FFFFFF' : '#9E9E9E'
      }).setOrigin(0.5);
      seasonTag.setBackgroundColor(isInSeason ? '#4CAF50' : '#EEEEEE');
      seasonTag.setPadding(4, 2);
      this.flowerListContainer.add(seasonTag);

      card.setInteractive({ useHandCursor: true });
      card.on('pointerover', () => card.setStrokeStyle(3, 0xFF9800));
      card.on('pointerout', () => card.setStrokeStyle(2, isInSeason ? 0x81C784 : 0xE0E0E0));
      card.on('pointerdown', () => this.selectFlower(flower));

      colorCircle.setInteractive({ useHandCursor: true });
      colorCircle.on('pointerdown', () => this.selectFlower(flower));
    });
  }

  private selectFlower(flower: Flower): void {
    if (flower.type === 'main') {
      this.bouquet.mainFlower = flower;
    } else if (flower.type === 'filler') {
      if (this.bouquet.fillerFlowers.length >= 3) {
        this.bouquet.fillerFlowers.shift();
      }
      this.bouquet.fillerFlowers.push(flower);
    } else {
      this.bouquet.wrapping = flower;
    }
    this.updateAllDisplays();
  }

  private updateAllDisplays(): void {
    this.updatePreview();
    this.updateCost();
    this.updateLiveScore();
  }

  private updatePreview(): void {
    this.previewContainer.removeAll(true);

    if (this.bouquet.wrapping) {
      const wrap = this.add.rectangle(0, 80, 260, 120, Number('0x' + this.bouquet.wrapping.color.hex.slice(1)), 0.7).setStrokeStyle(3, 0x8D6E63);
      this.previewContainer.add(wrap);
      const wrapLabel = this.add.text(0, 80, this.bouquet.wrapping.name, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '13px',
        color: '#5D4037'
      }).setOrigin(0.5);
      this.previewContainer.add(wrapLabel);
    }

    if (this.bouquet.mainFlower) {
      const positions = [
        { x: 0, y: -60 }, { x: -40, y: -40 }, { x: 40, y: -40 }
      ];
      positions.forEach(pos => {
        const c = this.add.circle(pos.x, pos.y, 35, Number('0x' + this.bouquet.mainFlower!.color.hex.slice(1))).setStrokeStyle(3, 0xFFFFFF);
        this.previewContainer.add(c);
      });
      const label = this.add.text(0, -120, `主花: ${this.bouquet.mainFlower.name}`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: '#333333',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.previewContainer.add(label);
    } else {
      const placeholder = this.add.text(0, -60, '❀ 请选择主花', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '18px',
        color: '#BDBDBD'
      }).setOrigin(0.5);
      this.previewContainer.add(placeholder);
    }

    if (this.bouquet.fillerFlowers.length > 0) {
      const fillerPositions = [
        { x: -80, y: -10 }, { x: 80, y: -10 }, { x: -50, y: 20 }, { x: 50, y: 20 }
      ];
      this.bouquet.fillerFlowers.forEach((f, i) => {
        const pos = fillerPositions[i % fillerPositions.length];
        const c = this.add.circle(pos.x, pos.y, 18, Number('0x' + f.color.hex.slice(1))).setStrokeStyle(2, 0xFFFFFF);
        this.previewContainer.add(c);
      });
    }

    const flowerNames: string[] = [];
    if (this.bouquet.fillerFlowers.length > 0) {
      const unique = [...new Set(this.bouquet.fillerFlowers.map(f => f.name))];
      flowerNames.push(`配花: ${unique.join('、')}`);
    }
    if (this.bouquet.wrapping) {
      flowerNames.push(`花语: ${[this.bouquet.mainFlower?.meaning, ...this.bouquet.fillerFlowers.map(f => f.meaning), this.bouquet.wrapping.meaning].filter(Boolean).join('、')}`);
    }

    flowerNames.forEach((name, i) => {
      const t = this.add.text(0, 140 + i * 22, name, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: '#555555'
      }).setOrigin(0.5);
      this.previewContainer.add(t);
    });
  }

  private updateCost(): void {
    const price = calculateBouquetPrice(this.bouquet);
    const overBudget = price > this.level.budget;
    this.costText.setText(`💰 ¥${price} / ¥${this.level.budget}`);
    this.costText.setColor(overBudget ? '#D32F2F' : '#388E3C');
  }

  private updateLiveScore(): void {
    if (!this.bouquet.mainFlower) {
      this.scoreText.setText('协调性评分: --');
      return;
    }
    const result = calculateScore(this.bouquet, this.level);
    let colorText = '#6A1B9A';
    if (result.totalScore >= 80) colorText = '#388E3C';
    else if (result.totalScore >= 60) colorText = '#FF9800';
    else colorText = '#D32F2F';
    this.scoreText.setText(`协调性评分: ${result.totalScore}分 (${result.colorHarmonyType})`);
    this.scoreText.setColor(colorText);
  }

  private startTimer(): void {
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeRemaining--;
        this.timeText.setText(`⏱ ${this.timeRemaining}s`);
        if (this.timeRemaining <= 10) {
          this.timeText.setColor('#D32F2F');
          this.cameras.main.shake(50, 0.003);
        }
        if (this.timeRemaining <= 0) {
          this.submitBouquet();
        }
      },
      loop: true
    });
  }

  private submitBouquet(): void {
    if (this.timerEvent) this.timerEvent.remove(false);
    if (!this.bouquet.mainFlower) {
      const result = { totalScore: 0, colorHarmonyScore: 0, meaningScore: 0, budgetScore: 0, seasonalScore: 0, colorHarmonyType: '未完成', feedback: ['请至少选择一枝主花！'], passed: false };
      this.scene.start('ResultScene', { result, level: this.level, bouquet: this.bouquet });
      return;
    }
    const result = calculateScore(this.bouquet, this.level);
    this.scene.start('ResultScene', { result, level: this.level, bouquet: this.bouquet });
  }
}

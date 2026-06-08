import Phaser from 'phaser';
import { Flower, Bouquet, LevelConfig, Order, FlowerType } from '../types';
import { FLOWERS } from '../data/flowers';
import { LEVELS, SCENE_NAMES, SEASON_NAMES } from '../data/levels';
import { PALETTE_NAMES, ORDER_DIFFICULTY_NAMES, DIFFICULTY_COLORS } from '../data/orders';
import { loadProgress } from '../utils/storage';
import { calculateScore, calculateBouquetPrice, classifyColorHarmony, calculateOrderScore } from '../utils/colorHarmony';

export class GameScene extends Phaser.Scene {
  private level?: LevelConfig;
  private order?: Order;
  private isOrderMode: boolean = false;
  private bouquet: Bouquet = { mainFlower: null, fillerFlowers: [], wrapping: null };
  private timeRemaining: number = 0;
  private totalTime: number = 0;
  private timerEvent?: Phaser.Time.TimerEvent;
  private timeText!: Phaser.GameObjects.Text;
  private costText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private paletteHintText!: Phaser.GameObjects.Text;
  private activeTab: FlowerType | 'main' | 'filler' | 'wrapping' = 'main';
  private flowerListContainer!: Phaser.GameObjects.Container;
  private previewContainer!: Phaser.GameObjects.Container;
  private flowerScrollY = 0;
  private maxScrollY = 0;
  private maskRect!: Phaser.GameObjects.Graphics;
  private liveEstimateText!: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  init(data: { levelId?: number; order?: Order }): void {
    this.bouquet = { mainFlower: null, fillerFlowers: [], wrapping: null };
    this.flowerScrollY = 0;

    if (data.order) {
      this.order = data.order;
      this.isOrderMode = true;
      this.timeRemaining = this.order.timeLimit;
      this.totalTime = this.order.timeLimit;
    } else {
      this.level = LEVELS.find(l => l.id === data.levelId) || LEVELS[0];
      this.isOrderMode = false;
      this.timeRemaining = this.level.timeLimit;
      this.totalTime = this.level.timeLimit;
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor(this.isOrderMode ? '#FFF8E1' : '#FFF8E1');
    this.createLayout();
    this.startTimer();
    this.updateAllDisplays();
    this.setupMouseWheelScroll();
  }

  private setupMouseWheelScroll(): void {
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any[], _deltaX: number, deltaY: number) => {
      const pointerX = this.input.activePointer.x;
      if (pointerX > 590 && pointerX < 1070) {
        this.flowerScrollY += deltaY;
        this.flowerScrollY = Phaser.Math.Clamp(this.flowerScrollY, this.maxScrollY, 0);
        this.updateFlowerList();
      }
    });
  }

  private getSceneName(): string {
    return this.isOrderMode ? SCENE_NAMES[this.order!.scene] : SCENE_NAMES[this.level!.scene];
  }

  private getSeasonName(): string {
    return this.isOrderMode ? SEASON_NAMES[this.order!.season] : SEASON_NAMES[this.level!.season];
  }

  private getBudget(): number {
    return this.isOrderMode ? this.order!.budget : this.level!.budget;
  }

  private getRequiredMeanings(): string[] {
    return this.isOrderMode ? this.order!.requiredMeanings : this.level!.requiredFlowerMeanings;
  }

  private getHarmonyHint(): string {
    return this.isOrderMode ? this.order!.harmonyHint : this.level!.harmonyHint;
  }

  private getTargetScore(): number {
    return this.isOrderMode ? this.order!.targetScore : this.level!.targetScore;
  }

  private getForbiddenIds(): string[] {
    return this.isOrderMode ? this.order!.forbiddenFlowerIds : [];
  }

  private createLayout(): void {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, 95, 0xFFE082, 0.9).setOrigin(0, 0).setStrokeStyle(0, 0xFFB300);

    const titleText = this.isOrderMode
      ? this.order!.customerAvatar + ' ' + this.order!.customerName + ' · ' + this.order!.title
      : '第' + this.level!.id + '关: ' + this.level!.name;

    this.add.text(20, 15, titleText, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: this.isOrderMode ? '20px' : '22px',
      color: '#E65100',
      fontStyle: 'bold'
    });

    this.add.text(20, 45, '场景: ' + this.getSceneName() + ' | 季节: ' + this.getSeasonName() + ' | 预算: ' + this.getBudget() + '元', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#5D4037'
    });

    this.add.text(20, 68, '需要花语: ' + this.getRequiredMeanings().join(' / '), {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#BF360C',
      fontStyle: 'bold'
    });

    if (this.isOrderMode && this.order!.forbiddenFlowerIds.length > 0) {
      const forbiddenNames = this.order!.forbiddenFlowerIds.slice(0, 3).map(id => {
        const f = FLOWERS.find(fl => fl.id === id);
        return f ? f.name : id;
      }).join('、');
      const more = this.order!.forbiddenFlowerIds.length > 3 ? '...' : '';
      this.add.text(420, 68, '🚫禁用: ' + forbiddenNames + more, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: '#C62828',
        fontStyle: 'bold'
      });
    }

    if (this.isOrderMode) {
      const diffColor = DIFFICULTY_COLORS[this.order!.difficulty];
      this.add.rectangle(width / 2, 20, 100, 25, Number('0x' + diffColor.slice(1)), 0.9).setStrokeStyle(1, 0xFFFFFF);
      this.add.text(width / 2, 20, ORDER_DIFFICULTY_NAMES[this.order!.difficulty] + '订单', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '13px',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      this.add.text(width / 2, 50, '🎨 偏好: ' + PALETTE_NAMES[this.order!.preferredPalette] + ' | 目标: ' + this.order!.targetScore + '分', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '13px',
        color: '#6A1B9A',
        fontStyle: 'bold'
      }).setOrigin(0.5);
    }

    this.timeText = this.add.text(width - 20, 15, '⏱ ' + this.timeRemaining + 's', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: '#D32F2F',
      fontStyle: 'bold'
    }).setOrigin(1, 0);

    this.costText = this.add.text(width - 20, 45, '💰 0元 / ' + this.getBudget() + '元', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#388E3C',
      fontStyle: 'bold'
    }).setOrigin(1, 0);

    this.paletteHintText = this.add.text(width - 20, 68, this.isOrderMode ? '🌈 色系匹配: --' : '', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '12px',
      color: '#1565C0',
      fontStyle: 'bold'
    }).setOrigin(1, 0);

    this.add.rectangle(380, 395, 380, 545, 0xFFFFFF, 0.95).setStrokeStyle(3, 0xFFCC80).setOrigin(0.5);
    this.add.text(380, 130, '🌸 花束预览', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#E65100',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.previewContainer = this.add.container(380, 380);
    this.scoreText = this.add.text(380, 590, '协调性评分: --', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#6A1B9A',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.liveEstimateText = this.add.text(380, 618, '', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '12px',
      color: '#888888'
    }).setOrigin(0.5);

    this.add.text(380, 645, this.getHarmonyHint(), {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '12px',
      color: '#888888'
    }).setOrigin(0.5);

    this.add.rectangle(830, 395, 480, 545, 0xFFFFFF, 0.95).setStrokeStyle(3, 0xFFCC80).setOrigin(0.5);
    this.add.text(830, 130, '💐 花材库', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#E65100',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.maskRect = this.make.graphics({});
    this.maskRect.fillStyle(0xFFFFFF, 1);
    this.maskRect.fillRect(590, 185, 480, 470);

    this.createTabs();
    this.flowerListContainer = this.add.container(610, 195);
    this.flowerListContainer.setMask(this.maskRect.createGeometryMask());
    this.updateFlowerList();

    this.add.text(1040, 430, '↓滚动', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '12px',
      color: '#999999'
    }).setOrigin(0.5).setRotation(Math.PI / 2);

    const submitBtn = this.add.rectangle(280, 685, 180, 50, 0x4CAF50, 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.add.text(280, 685, '✅ 提交花束', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    submitBtn.setInteractive({ useHandCursor: true });
    submitBtn.on('pointerdown', () => this.submitBouquet());

    const clearBtn = this.add.rectangle(480, 685, 180, 50, 0xF44336, 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.add.text(480, 685, '🗑 清空重来', {
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

    const backBtn = this.add.rectangle(100, 685, 140, 50, 0x9E9E9E, 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.add.text(100, 685, '← 返回', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      if (this.isOrderMode) {
        this.scene.start('OrderDetailScene', { order: this.order! });
      } else {
        this.scene.start('LevelSelectScene');
      }
    });
  }

  private createTabs(): void {
    const tabs = [
      { key: 'main' as const, label: '主花', x: 660 },
      { key: 'filler' as const, label: '配花/叶材', x: 800 },
      { key: 'wrapping' as const, label: '包装纸', x: 960 }
    ];

    tabs.forEach(tab => {
      const isActive = this.activeTab === tab.key;
      const btn = this.add.rectangle(tab.x, 160, 130, 35, isActive ? 0xFF9800 : 0xE0E0E0, 1).setStrokeStyle(2, isActive ? 0xF57C00 : 0xBDBDBD);
      const label = this.add.text(tab.x, 160, tab.label, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '16px',
        color: isActive ? '#FFFFFF' : '#616161',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        this.activeTab = tab.key;
        this.flowerScrollY = 0;
        this.resetTabs();
        this.updateFlowerList();
      });
      label.setInteractive({ useHandCursor: true });
      label.on('pointerdown', () => {
        this.activeTab = tab.key;
        this.flowerScrollY = 0;
        this.resetTabs();
        this.updateFlowerList();
      });
    });
  }

  private resetTabs(): void {
    const existingTabs: Phaser.GameObjects.Rectangle[] = [];
    const existingLabels: Phaser.GameObjects.Text[] = [];
    this.children.each(c => {
      if ((c as any).type === 'Rectangle' && (c as Phaser.GameObjects.Rectangle).width === 130 && (c as Phaser.GameObjects.Rectangle).height === 35) {
        existingTabs.push(c as Phaser.GameObjects.Rectangle);
      }
      if ((c as any).type === 'Text') {
        const txt = c as Phaser.GameObjects.Text;
        if (txt.text === '主花' || txt.text === '配花/叶材' || txt.text === '包装纸') {
          existingLabels.push(txt);
        }
      }
    }, this);
    existingTabs.forEach(t => { t.setFillStyle(0xE0E0E0, 1); t.setStrokeStyle(2, 0xBDBDBD); });
    existingLabels.forEach(l => l.setColor('#616161'));
    this.createTabs();
  }

  private updateFlowerList(): void {
    this.flowerListContainer.removeAll(true);
    const progress = loadProgress();
    const forbiddenIds = this.getForbiddenIds();
    const requiredMeanings = this.getRequiredMeanings();
    const preferredHues = this.isOrderMode ? this.order!.preferredColorHues : undefined;

    let filteredFlowers = FLOWERS.filter(f => {
      const matchType = this.activeTab === 'main' ? f.type === 'main' :
                        this.activeTab === 'filler' ? f.type === 'filler' :
                        f.type === 'wrapping';
      const isUnlocked = progress.unlockedFlowers.includes(f.id);
      return matchType && isUnlocked;
    });

    const cols = 3;
    const cardW = 140;
    const cardH = 165;
    const gapX = 15;
    const gapY = 12;
    const totalRows = Math.ceil(filteredFlowers.length / cols);
    const totalHeight = totalRows * (cardH + gapY);
    this.maxScrollY = Math.min(0, 460 - totalHeight);
    this.flowerScrollY = Phaser.Math.Clamp(this.flowerScrollY, this.maxScrollY, 0);

    filteredFlowers.forEach((flower, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = col * (cardW + gapX) + cardW / 2;
      const y = this.flowerScrollY + row * (cardH + gapY) + cardH / 2;

      const isInSeason = flower.seasons.includes(this.isOrderMode ? this.order!.season : this.level!.season);
      const isForbidden = forbiddenIds.includes(flower.id);
      const matchesMeaning = requiredMeanings.includes(flower.meaning);
      let matchesPalette = true;
      if (preferredHues && preferredHues.length > 0) {
        matchesPalette = preferredHues.some(h => Math.abs(flower.color.hue - h) <= 40 || Math.abs(flower.color.hue - h) >= 320);
      }

      let bgColor = 0xFFFFFF;
      let borderColor = 0xE0E0E0;
      if (isForbidden) { bgColor = 0xFFEBEE; borderColor = 0xEF5350; }
      else if (matchesMeaning && matchesPalette) { bgColor = 0xE8F5E9; borderColor = 0x66BB6A; }
      else if (matchesMeaning) { bgColor = 0xF3E5F5; borderColor = 0xBA68C8; }
      else if (matchesPalette) { bgColor = 0xE3F2FD; borderColor = 0x64B5F6; }
      else if (isInSeason) { borderColor = 0x81C784; }

      const card = this.add.rectangle(x, y, cardW, cardH, bgColor, 1).setStrokeStyle(2, borderColor);
      this.flowerListContainer.add(card);

      const colorCircle = this.add.circle(x, y - 40, 26, Number('0x' + flower.color.hex.slice(1))).setStrokeStyle(2, 0x9E9E9E);
      this.flowerListContainer.add(colorCircle);

      const nameText = this.add.text(x, y - 2, flower.name, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: '#333333',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.flowerListContainer.add(nameText);

      const metaText = this.add.text(x, y + 20, flower.price + '元 | ' + flower.meaning, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '11px',
        color: matchesMeaning ? '#2E7D32' : (isInSeason ? '#388E3C' : '#9E9E9E')
      }).setOrigin(0.5);
      this.flowerListContainer.add(metaText);

      let tagY = y + 42;
      const tags: { text: string; color: string; bg: string }[] = [];
      if (isForbidden) {
        tags.push({ text: '🚫禁用', color: '#FFFFFF', bg: '#E53935' });
      }
      if (!isForbidden && !isInSeason) {
        tags.push({ text: '非当季', color: '#9E9E9E', bg: '#EEEEEE' });
      }
      if (!isForbidden && isInSeason) {
        tags.push({ text: '当季', color: '#FFFFFF', bg: '#4CAF50' });
      }
      if (!isForbidden && matchesMeaning) {
        tags.push({ text: '指定花语', color: '#FFFFFF', bg: '#7B1FA2' });
      }
      if (!isForbidden && matchesPalette && this.isOrderMode) {
        tags.push({ text: '色系匹配', color: '#FFFFFF', bg: '#1976D2' });
      }

      tags.forEach((tag, i) => {
        const tagEl = this.add.text(x + (i - (tags.length - 1) / 2) * 55, tagY, tag.text, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '10px',
          color: tag.color,
          fontStyle: 'bold'
        }).setOrigin(0.5);
        tagEl.setBackgroundColor(tag.bg);
        tagEl.setPadding(4, 2);
        this.flowerListContainer.add(tagEl);
      });

      if (!isForbidden) {
        card.setInteractive({ useHandCursor: true });
        card.on('pointerover', () => card.setStrokeStyle(3, 0xFF9800));
        card.on('pointerout', () => card.setStrokeStyle(2, borderColor));
        card.on('pointerdown', () => this.selectFlower(flower));

        colorCircle.setInteractive({ useHandCursor: true });
        colorCircle.on('pointerdown', () => this.selectFlower(flower));
      }
    });
  }

  private selectFlower(flower: Flower): void {
    if (this.isOrderMode && this.order!.forbiddenFlowerIds.includes(flower.id)) {
      return;
    }
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
    this.updatePaletteEstimate();
  }

  private updatePaletteEstimate(): void {
    if (!this.isOrderMode || !this.order!.preferredColorHues) {
      this.paletteHintText.setVisible(false);
      return;
    }
    this.paletteHintText.setVisible(true);
    const allFlowers = [this.bouquet.mainFlower, ...this.bouquet.fillerFlowers, this.bouquet.wrapping].filter(Boolean) as any[];
    if (allFlowers.length === 0) {
      this.paletteHintText.setText('🌈 色系匹配: --');
      this.paletteHintText.setColor('#1565C0');
      return;
    }
    const hues = this.order!.preferredColorHues;
    let matched = 0;
    allFlowers.forEach(f => {
      if (hues.some(h => Math.abs(f.color.hue - h) <= 40 || Math.abs(f.color.hue - h) >= 320)) {
        matched++;
      }
    });
    const pct = Math.round((matched / allFlowers.length) * 100);
    const color = pct >= 80 ? '#2E7D32' : pct >= 50 ? '#F57C00' : '#C62828';
    this.paletteHintText.setText('🌈 色系匹配: ' + pct + '%');
    this.paletteHintText.setColor(color);
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
      const label = this.add.text(0, -120, '主花: ' + this.bouquet.mainFlower.name, {
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
      flowerNames.push('配花: ' + unique.join('、'));
    }
    const allMeanings: string[] = [];
    if (this.bouquet.mainFlower) allMeanings.push(this.bouquet.mainFlower.meaning);
    this.bouquet.fillerFlowers.forEach(f => allMeanings.push(f.meaning));
    if (this.bouquet.wrapping) allMeanings.push(this.bouquet.wrapping.meaning);
    if (allMeanings.length > 0) flowerNames.push('花语: ' + allMeanings.join('、'));

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
    const overBudget = price > this.getBudget();
    this.costText.setText('💰 ' + price + '元 / ' + this.getBudget() + '元');
    this.costText.setColor(overBudget ? '#D32F2F' : '#388E3C');
  }

  private updateLiveScore(): void {
    if (!this.bouquet.mainFlower) {
      this.scoreText.setText('协调性评分: --');
      this.liveEstimateText.setText('选择主花后开始预估分数');
      return;
    }

    let totalScore: number;
    let harmonyType: string;
    let meaningPct = 0;
    let budgetPct = 0;

    if (this.isOrderMode) {
      const estimate = calculateOrderScore(this.bouquet, this.order!, Math.max(0, this.timeRemaining));
      totalScore = estimate.result.totalScore;
      harmonyType = estimate.result.colorHarmonyType;
      meaningPct = estimate.result.meaningScore;
      budgetPct = estimate.result.budgetScore;
      this.liveEstimateText.setText(
        '花语: ' + meaningPct + '% | 预算: ' + budgetPct + '% | 色系: ' + estimate.paletteScore + '%'
      );
    } else {
      const result = calculateScore(this.bouquet, this.level!);
      totalScore = result.totalScore;
      harmonyType = result.colorHarmonyType;
      this.liveEstimateText.setText('目标分: ' + this.getTargetScore() + '分');
    }

    let colorText = '#6A1B9A';
    if (totalScore >= this.getTargetScore()) colorText = '#388E3C';
    else if (totalScore >= this.getTargetScore() * 0.8) colorText = '#FF9800';
    else colorText = '#D32F2F';

    this.scoreText.setText('预估总分: ' + totalScore + '分 (' + harmonyType + ')');
    this.scoreText.setColor(colorText);
  }

  private startTimer(): void {
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeRemaining--;
        this.timeText.setText('⏱ ' + this.timeRemaining + 's');
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
      const result = { totalScore: 0, colorHarmonyScore: 0, meaningScore: 0, budgetScore: 0, seasonalScore: 0, bonusScore: 0, timeBonusScore: 0, colorHarmonyType: '未完成', feedback: ['请至少选择一枝主花！'], passed: false };
      if (this.isOrderMode) {
        this.scene.start('ResultScene', { result, order: this.order, bouquet: this.bouquet, achievedBonusIds: [], timeRemaining: 0 });
      } else {
        this.scene.start('ResultScene', { result, level: this.level, bouquet: this.bouquet });
      }
      return;
    }

    if (this.isOrderMode) {
      const { result, achievedBonusIds } = calculateOrderScore(this.bouquet, this.order!, Math.max(0, this.timeRemaining));
      this.scene.start('ResultScene', {
        result,
        order: this.order,
        bouquet: this.bouquet,
        achievedBonusIds,
        timeRemaining: Math.max(0, this.timeRemaining)
      });
    } else {
      const result = calculateScore(this.bouquet, this.level!);
      this.scene.start('ResultScene', { result, level: this.level, bouquet: this.bouquet });
    }
  }
}

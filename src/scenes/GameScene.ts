import Phaser from 'phaser';
import { Flower, Bouquet, LevelConfig, Order, ColorPalette } from '../types';
import { FLOWERS } from '../data/flowers';
import { LEVELS, SCENE_NAMES, SEASON_NAMES } from '../data/levels';
import { PALETTE_HUES, PALETTE_NAMES } from '../data/orders';
import { loadProgress, saveProgress, saveInventory } from '../utils/storage';
import { getAvailableStock, reserveStock, consumeStock } from '../utils/business';
import { calculateScore, calculateBouquetPrice, classifyColorHarmony } from '../utils/colorHarmony';

export class GameScene extends Phaser.Scene {
  private level!: LevelConfig;
  private order: Order | null = null;
  private isOrderMode: boolean = false;
  private bouquet: Bouquet = { mainFlower: null, fillerFlowers: [], wrapping: null };
  private timeRemaining: number = 0;
  private timerEvent?: Phaser.Time.TimerEvent;
  private timeText!: Phaser.GameObjects.Text;
  private costText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private activeTab: 'main' | 'filler' | 'wrapping' = 'main';
  private flowerListContainer!: Phaser.GameObjects.Container;
  private previewContainer!: Phaser.GameObjects.Container;
  private inventoryPanel!: Phaser.GameObjects.Container;
  private riskAlertText!: Phaser.GameObjects.Text;
  private budgetRiskText!: Phaser.GameObjects.Text;
  private reservedStock: Record<string, number> = {};
  private emergencyPurchaseCost: number = 0;

  constructor() {
    super('GameScene');
  }

  init(data: { levelId?: number; order?: Order }): void {
    if (data.order) {
      this.isOrderMode = true;
      this.order = data.order;
      this.level = {
        id: 0,
        name: data.order.title,
        difficulty: data.order.difficulty,
        scene: data.order.scene,
        requiredFlowerMeanings: data.order.requiredMeanings,
        budget: data.order.budget,
        timeLimit: data.order.timeLimit,
        season: data.order.season,
        targetScore: data.order.targetScore,
        harmonyHint: data.order.harmonyHint || ''
      };
    } else {
      this.isOrderMode = false;
      this.order = null;
      this.level = LEVELS.find(l => l.id === data.levelId) || LEVELS[0];
    }
    this.bouquet = { mainFlower: null, fillerFlowers: [], wrapping: null };
    this.timeRemaining = this.level.timeLimit;
    this.reservedStock = {};
    this.emergencyPurchaseCost = 0;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#FFF8E1');
    this.createLayout();
    this.startTimer();
    this.updateAllDisplays();
  }

  private createLayout(): void {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, 95, 0xFFE082, 0.9).setOrigin(0, 0).setStrokeStyle(0, 0xFFB300);

    if (this.isOrderMode && this.order) {
      this.add.text(20, 10, `${this.order.customerAvatar} ${this.order.customerName} · ${this.order.title}`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '20px',
        color: '#E65100',
        fontStyle: 'bold'
      });

      const paletteName = PALETTE_NAMES[this.order.preferredPalette] || this.order.preferredPalette;
      this.add.text(20, 35, `场景: ${SCENE_NAMES[this.level.scene]} | 季节: ${SEASON_NAMES[this.level.season]} | 预算: ¥${this.level.budget} | 色系: ${paletteName}`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '13px',
        color: '#5D4037'
      });
    } else {
      this.add.text(20, 10, `第${this.level.id}关: ${this.level.name}`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '20px',
        color: '#E65100',
        fontStyle: 'bold'
      });

      this.add.text(20, 35, `场景: ${SCENE_NAMES[this.level.scene]} | 季节: ${SEASON_NAMES[this.level.season]} | 预算: ¥${this.level.budget}`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '13px',
        color: '#5D4037'
      });
    }

    this.add.text(width / 2, 25, `需要花语: ${this.level.requiredFlowerMeanings.join(' / ')}`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '15px',
      color: '#BF360C',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.inventoryPanel = this.add.container(20, 58);
    this.riskAlertText = this.add.text(0, 0, '', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '12px',
      color: '#D32F2F',
      fontStyle: 'bold'
    });
    this.inventoryPanel.add(this.riskAlertText);

    this.budgetRiskText = this.add.text(0, 18, '', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '12px',
      color: '#FF9800',
      fontStyle: 'bold'
    });
    this.inventoryPanel.add(this.budgetRiskText);

    this.timeText = this.add.text(width - 20, 10, `⏱ ${this.timeRemaining}s`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: '#D32F2F',
      fontStyle: 'bold'
    }).setOrigin(1, 0);

    this.costText = this.add.text(width - 20, 38, `💰 ¥0 / ¥${this.level.budget}`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#388E3C',
      fontStyle: 'bold'
    }).setOrigin(1, 0);

    this.add.rectangle(380, 400, 380, 560, 0xFFFFFF, 0.95).setStrokeStyle(3, 0xFFCC80).setOrigin(0.5);
    this.add.text(380, 125, '🌸 花束预览', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#E65100',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.previewContainer = this.add.container(380, 385);
    this.scoreText = this.add.text(380, 615, '协调性评分: --', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#6A1B9A',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(380, 645, this.level.harmonyHint, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '12px',
      color: '#888888'
    }).setOrigin(0.5);

    this.add.rectangle(830, 400, 480, 560, 0xFFFFFF, 0.95).setStrokeStyle(3, 0xFFCC80).setOrigin(0.5);
    this.add.text(830, 125, '💐 花材库', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#E65100',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.createTabs();
    this.flowerListContainer = this.add.container(610, 185);
    this.updateFlowerList();

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
      this.releaseAllReservedStock();
      this.bouquet = { mainFlower: null, fillerFlowers: [], wrapping: null };
      this.reservedStock = {};
      this.emergencyPurchaseCost = 0;
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
      this.releaseAllReservedStock();
      this.scene.start('LevelSelectScene');
    });
  }

  private createTabs(): void {
    const tabs: Array<{ key: 'main' | 'filler' | 'wrapping'; label: string; x: number }> = [
      { key: 'main', label: '主花', x: 660 },
      { key: 'filler', label: '配花/叶材', x: 800 },
      { key: 'wrapping', label: '包装纸', x: 960 }
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

  private getRequiredQuantity(flower: Flower): number {
    if (flower.type === 'main') return 3;
    if (flower.type === 'filler') return 1;
    return 1;
  }

  private getBouquetFlowerUsage(): Record<string, number> {
    const usage: Record<string, number> = {};
    if (this.bouquet.mainFlower) {
      usage[this.bouquet.mainFlower.id] = (usage[this.bouquet.mainFlower.id] || 0) + 3;
    }
    this.bouquet.fillerFlowers.forEach(f => {
      usage[f.id] = (usage[f.id] || 0) + 1;
    });
    if (this.bouquet.wrapping) {
      usage[this.bouquet.wrapping.id] = (usage[this.bouquet.wrapping.id] || 0) + 1;
    }
    return usage;
  }

  private releaseAllReservedStock(): void {
    const progress = loadProgress();
    Object.entries(this.reservedStock).forEach(([flowerId, qty]) => {
      const item = progress.inventory[flowerId];
      if (item) {
        item.reservedQuantity = Math.max(0, item.reservedQuantity - qty);
      }
    });
    saveInventory(progress.inventory);
    this.reservedStock = {};
  }

  private releaseReservedStock(flowerId: string, qty: number): void {
    const progress = loadProgress();
    const item = progress.inventory[flowerId];
    if (item) {
      const toRelease = Math.min(qty, item.reservedQuantity, this.reservedStock[flowerId] || 0);
      item.reservedQuantity -= toRelease;
      this.reservedStock[flowerId] = (this.reservedStock[flowerId] || 0) - toRelease;
      if (this.reservedStock[flowerId] <= 0) {
        delete this.reservedStock[flowerId];
      }
      saveInventory(progress.inventory);
    }
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

    if (this.isOrderMode && this.order) {
      filteredFlowers.sort((a, b) => {
        const aHasMeaning = this.order!.requiredMeanings.includes(a.meaning) ? 1 : 0;
        const bHasMeaning = this.order!.requiredMeanings.includes(b.meaning) ? 1 : 0;
        return bHasMeaning - aHasMeaning;
      });
    }

    const cols = 3;
    const cardW = 140;
    const cardH = 175;
    const gapX = 15;
    const gapY = 15;

    filteredFlowers.forEach((flower, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = col * (cardW + gapX) + cardW / 2;
      const y = row * (cardH + gapY) + cardH / 2;

      const isInSeason = flower.seasons.includes(this.level.season);
      const available = getAvailableStock(progress.inventory, flower.id);
      const requiredQty = this.getRequiredQuantity(flower);
      const hasLowStock = available < requiredQty;

      let isForbidden = false;
      let hasRequiredMeaning = false;
      if (this.isOrderMode && this.order) {
        isForbidden = this.order.forbiddenFlowerIds.includes(flower.id);
        hasRequiredMeaning = this.order.requiredMeanings.includes(flower.meaning);
      }

      let cardBorderColor = hasLowStock ? 0xE53935 : (isInSeason ? 0x81C784 : 0xE0E0E0);
      if (this.isOrderMode && hasRequiredMeaning && !isForbidden) {
        cardBorderColor = 0xFF9800;
      }
      const cardFillColor = isForbidden ? 0xEEEEEE : 0xFFFFFF;
      const card = this.add.rectangle(x, y, cardW, cardH, cardFillColor, 1).setStrokeStyle(2, cardBorderColor);
      this.flowerListContainer.add(card);

      const colorCircle = this.add.circle(x, y - 42, 26, Number('0x' + flower.color.hex.slice(1))).setStrokeStyle(2, 0x9E9E9E);
      if (isForbidden) {
        colorCircle.setAlpha(0.4);
      }
      this.flowerListContainer.add(colorCircle);

      const nameTextColor = isForbidden ? '#AAAAAA' : '#333333';
      const nameText = this.add.text(x, y - 5, flower.name, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: nameTextColor,
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.flowerListContainer.add(nameText);

      const metaTextColor = isForbidden ? '#CCCCCC' : (isInSeason ? '#388E3C' : '#9E9E9E');
      const metaText = this.add.text(x, y + 18, `¥${flower.price} | ${flower.meaning}`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '11px',
        color: metaTextColor
      }).setOrigin(0.5);
      this.flowerListContainer.add(metaText);

      const stockTextColor = isForbidden ? '#CCCCCC' : (hasLowStock ? '#D32F2F' : '#4CAF50');
      const stockText = this.add.text(x, y + 40, `库存: ${available}/${requiredQty}`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '11px',
        color: stockTextColor,
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.flowerListContainer.add(stockText);

      if (isForbidden) {
        const forbidText = this.add.text(x, y + 58, '🚫 禁用', {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '10px',
          color: '#FFFFFF'
        }).setOrigin(0.5);
        forbidText.setBackgroundColor('#9E9E9E');
        forbidText.setPadding(4, 2);
        this.flowerListContainer.add(forbidText);
      } else if (hasLowStock) {
        const shortage = requiredQty - available;
        const emergencyCost = Math.round(flower.price * shortage * 1.5);
        const warnText = this.add.text(x, y + 58, `应急+¥${emergencyCost}`, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '10px',
          color: '#FFFFFF'
        }).setOrigin(0.5);
        warnText.setBackgroundColor('#E53935');
        warnText.setPadding(4, 2);
        this.flowerListContainer.add(warnText);
      } else {
        const tagText = hasRequiredMeaning ? '推荐' : (isInSeason ? '当季' : '非当季');
        const tagColor = hasRequiredMeaning ? '#FF9800' : (isInSeason ? '#4CAF50' : '#EEEEEE');
        const tagTextColor = hasRequiredMeaning ? '#FFFFFF' : (isInSeason ? '#FFFFFF' : '#9E9E9E');
        const seasonTag = this.add.text(x, y + 58, tagText, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '10px',
          color: tagTextColor
        }).setOrigin(0.5);
        seasonTag.setBackgroundColor(tagColor);
        seasonTag.setPadding(4, 2);
        this.flowerListContainer.add(seasonTag);
      }

      if (!isForbidden) {
        card.setInteractive({ useHandCursor: true });
        card.on('pointerover', () => card.setStrokeStyle(3, 0xFF9800));
        card.on('pointerout', () => card.setStrokeStyle(2, cardBorderColor));
        card.on('pointerdown', () => this.selectFlower(flower));

        colorCircle.setInteractive({ useHandCursor: true });
        colorCircle.on('pointerdown', () => this.selectFlower(flower));
      }
    });
  }

  private selectFlower(flower: Flower): void {
    const progress = loadProgress();
    const requiredQty = this.getRequiredQuantity(flower);

    if (flower.type === 'main') {
      if (this.bouquet.mainFlower && this.bouquet.mainFlower.id !== flower.id) {
        this.releaseReservedStock(this.bouquet.mainFlower.id, 3);
      }
      this.bouquet.mainFlower = flower;
      if (!this.reservedStock[flower.id] || this.reservedStock[flower.id] < 3) {
        const toReserve = 3 - (this.reservedStock[flower.id] || 0);
        reserveStock(progress.inventory, flower.id, toReserve);
        this.reservedStock[flower.id] = (this.reservedStock[flower.id] || 0) + toReserve;
        saveInventory(progress.inventory);
      }
    } else if (flower.type === 'filler') {
      if (this.bouquet.fillerFlowers.length >= 3) {
        const removed = this.bouquet.fillerFlowers.shift();
        if (removed) {
          this.releaseReservedStock(removed.id, 1);
        }
      }
      this.bouquet.fillerFlowers.push(flower);
      reserveStock(progress.inventory, flower.id, 1);
      this.reservedStock[flower.id] = (this.reservedStock[flower.id] || 0) + 1;
      saveInventory(progress.inventory);
    } else {
      if (this.bouquet.wrapping && this.bouquet.wrapping.id !== flower.id) {
        this.releaseReservedStock(this.bouquet.wrapping.id, 1);
      }
      this.bouquet.wrapping = flower;
      if (!this.reservedStock[flower.id] || this.reservedStock[flower.id] < 1) {
        reserveStock(progress.inventory, flower.id, 1);
        this.reservedStock[flower.id] = (this.reservedStock[flower.id] || 0) + 1;
        saveInventory(progress.inventory);
      }
    }
    this.updateAllDisplays();
  }

  private calculateEmergencyCost(): number {
    const progress = loadProgress();
    const usage = this.getBouquetFlowerUsage();
    let cost = 0;
    Object.entries(usage).forEach(([flowerId, qty]) => {
      const available = getAvailableStock(progress.inventory, flowerId);
      const reserved = this.reservedStock[flowerId] || 0;
      const totalAvailable = available + reserved;
      if (totalAvailable < qty) {
        const shortage = qty - totalAvailable;
        const flower = FLOWERS.find(f => f.id === flowerId);
        if (flower) {
          cost += Math.round(flower.price * shortage * 1.5);
        }
      }
    });
    return cost;
  }

  private updateInventoryAndRiskDisplay(): void {
    const progress = loadProgress();
    const usage = this.getBouquetFlowerUsage();
    const lowStockItems: string[] = [];
    const outOfStockItems: string[] = [];

    Object.entries(usage).forEach(([flowerId, qty]) => {
      const available = getAvailableStock(progress.inventory, flowerId);
      const reserved = this.reservedStock[flowerId] || 0;
      const totalAvailable = available + reserved;
      const flower = FLOWERS.find(f => f.id === flowerId);
      if (flower) {
        if (totalAvailable === 0) {
          outOfStockItems.push(`${flower.name}(缺货)`);
        } else if (totalAvailable < qty) {
          lowStockItems.push(`${flower.name}(${totalAvailable}/${qty})`);
        }
      }
    });

    this.emergencyPurchaseCost = this.calculateEmergencyCost();

    if (outOfStockItems.length > 0 || lowStockItems.length > 0) {
      const parts: string[] = [];
      if (outOfStockItems.length > 0) parts.push(`🔴 缺货: ${outOfStockItems.join('、')}`);
      if (lowStockItems.length > 0) parts.push(`🟠 库存不足: ${lowStockItems.join('、')}`);
      if (this.emergencyPurchaseCost > 0) parts.push(`应急采购成本: +¥${this.emergencyPurchaseCost}`);
      this.riskAlertText.setText(parts.join(' | '));
      this.riskAlertText.setColor('#D32F2F');
    } else {
      this.riskAlertText.setText('✅ 库存充足');
      this.riskAlertText.setColor('#388E3C');
    }

    const price = calculateBouquetPrice(this.bouquet);
    const totalCost = price + this.emergencyPurchaseCost;
    const overBudget = totalCost > this.level.budget;
    const budgetWarnings: string[] = [];

    if (overBudget) {
      budgetWarnings.push(`⚠️ 超预算 ¥${totalCost - this.level.budget}`);
    }
    if (this.emergencyPurchaseCost > this.level.budget * 0.2) {
      budgetWarnings.push(`高缺货风险!`);
    }
    if (price > 0) {
      const budgetUsage = Math.round((totalCost / this.level.budget) * 100);
      budgetWarnings.push(`预算使用: ${budgetUsage}%`);
    }

    this.budgetRiskText.setText(budgetWarnings.join(' | '));
    this.budgetRiskText.setColor(overBudget ? '#D32F2F' : (this.emergencyPurchaseCost > 0 ? '#FF9800' : '#388E3C'));
  }

  private updateAllDisplays(): void {
    this.updatePreview();
    this.updateCost();
    this.updateLiveScore();
    this.updateInventoryAndRiskDisplay();
    this.updateFlowerList();
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
    const emergencyCost = this.calculateEmergencyCost();
    const totalCost = price + emergencyCost;
    const overBudget = totalCost > this.level.budget;
    if (emergencyCost > 0) {
      this.costText.setText(`💰 ¥${price}+${emergencyCost}=¥${totalCost} / ¥${this.level.budget}`);
    } else {
      this.costText.setText(`💰 ¥${totalCost} / ¥${this.level.budget}`);
    }
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

  private consumeBouquetStock(): void {
    const progress = loadProgress();
    const usage = this.getBouquetFlowerUsage();
    Object.entries(usage).forEach(([flowerId, qty]) => {
      consumeStock(progress.inventory, flowerId, qty);
    });
    Object.keys(this.reservedStock).forEach(flowerId => {
      delete this.reservedStock[flowerId];
    });
    saveInventory(progress.inventory);
  }

  private submitBouquet(): void {
    if (this.timerEvent) this.timerEvent.remove(false);
    if (!this.bouquet.mainFlower) {
      this.releaseAllReservedStock();
      const result = { totalScore: 0, colorHarmonyScore: 0, meaningScore: 0, budgetScore: 0, seasonalScore: 0, colorHarmonyType: '未完成', feedback: ['请至少选择一枝主花！'], passed: false };
      if (this.isOrderMode && this.order) {
        this.scene.start('OrderResultScene', { order: this.order, bouquet: this.bouquet, result });
      } else {
        this.scene.start('ResultScene', { result, level: this.level, bouquet: this.bouquet });
      }
      return;
    }
    this.consumeBouquetStock();
    const result = calculateScore(this.bouquet, this.level);
    if (this.isOrderMode && this.order) {
      this.scene.start('OrderResultScene', { order: this.order, bouquet: this.bouquet, result });
    } else {
      this.scene.start('ResultScene', { result, level: this.level, bouquet: this.bouquet });
    }
  }
}

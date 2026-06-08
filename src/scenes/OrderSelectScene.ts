import Phaser from 'phaser';
import { Order, OrderDifficulty, OrderFilter, Scene as GameSceneType, Season, CustomerProfile } from '../types';
import { generateOrderPool } from '../utils/orderGenerator';
import { loadProgress, getRecentOrders, getAllCustomers, getCustomerHistory } from '../utils/storage';
import { ORDER_DIFFICULTY_NAMES, DIFFICULTY_COLORS, PALETTE_NAMES, CUSTOMER_TAG_NAMES, PROFESSION_RANK_NAMES } from '../data/orders';
import { SCENE_NAMES, SEASON_NAMES } from '../data/levels';
import { getSatisfactionEmoji, getSatisfactionLabel, getRepurchaseLabel, getFlowerDiscount } from '../utils/customerGrowth';

export class OrderSelectScene extends Phaser.Scene {
  private orders: Order[] = [];
  private activeFilter: OrderFilter = {};
  private ordersContainer!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScrollY = 0;
  private maskRect!: Phaser.GameObjects.Graphics;
  private recentOrdersContainer!: Phaser.GameObjects.Container;
  private rightPanelMode: 'recent' | 'customers' = 'recent';
  private selectedCustomerId: string | null = null;

  constructor() {
    super('OrderSelectScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#E3F2FD');
    const progress = loadProgress();
    this.orders = generateOrderPool(8, undefined, progress);

    this.createHeader();
    this.createFilterBar();
    this.createOrdersArea();
    this.createRightPanel();
    this.createBackButton();
    this.setupMouseWheelScroll();
    this.updateOrdersList();
  }

  private createHeader(): void {
    const { width } = this.scale;
    this.add.rectangle(0, 0, width, 110, 0x1976D2, 0.95).setOrigin(0, 0);

    this.add.text(25, 18, '📋 接单大厅', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '26px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    });

    this.add.text(25, 52, '接受客户委托，搭配完美花束赚取金币和声望', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '12px',
      color: '#BBDEFB'
    });

    const progress = loadProgress();
    const rankName = PROFESSION_RANK_NAMES[progress.professionRank];
    const discount = Math.round(getFlowerDiscount(progress.professionRank) * 100);

    this.add.text(width - 165, 22, '💰 ' + progress.coins + '  ⭐ ' + progress.customerReputation, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '15px',
      color: '#FFF59D',
      fontStyle: 'bold'
    }).setOrigin(1, 0);

    this.add.text(width - 165, 47, '🎖️ ' + rankName + '  📋订单:' + progress.completedOrders.length, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '11px',
      color: '#E3F2FD'
    }).setOrigin(1, 0);

    this.add.text(width - 165, 68, '花材折扣:' + discount + '%', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '11px',
      color: '#C5E1A5',
      fontStyle: 'bold'
    }).setOrigin(1, 0);

    if (progress.reputationStatus.penaltyActive) {
      this.add.text(width - 165, 88, '⚠️ 信誉惩罚', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '10px',
        color: '#FFCDD2',
        fontStyle: 'bold'
      }).setOrigin(1, 0);
    }

    const refreshBtn = this.add.rectangle(width - 55, 50, 95, 80, 0xFF9800, 0.95).setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.add.text(width - 55, 42, '🔄', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    this.add.text(width - 55, 65, '刷新订单', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '12px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    refreshBtn.setInteractive({ useHandCursor: true });
    refreshBtn.on('pointerover', () => refreshBtn.setScale(1.05));
    refreshBtn.on('pointerout', () => refreshBtn.setScale(1));
    refreshBtn.on('pointerdown', () => {
      const prog = loadProgress();
      this.orders = generateOrderPool(8, undefined, prog);
      this.scrollY = 0;
      this.updateOrdersList();
    });
  }

  private createFilterBar(): void {
    const { width } = this.scale;
    const y = 130;

    this.add.text(20, y, '筛选：', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#0D47A1',
      fontStyle: 'bold'
    });

    const difficulties: OrderDifficulty[] = ['easy', 'medium', 'hard', 'expert'];
    difficulties.forEach((diff, i) => {
      const x = 85 + i * 82;
      const isActive = this.activeFilter.difficulty?.includes(diff);
      const btn = this.add.rectangle(x, y, 72, 26, isActive ? Number('0x' + DIFFICULTY_COLORS[diff].slice(1)) : 0xFFFFFF, isActive ? 1 : 0.9).setStrokeStyle(2, Number('0x' + DIFFICULTY_COLORS[diff].slice(1)));
      this.add.text(x, y, ORDER_DIFFICULTY_NAMES[diff], {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: isActive ? '#FFFFFF' : DIFFICULTY_COLORS[diff],
        fontStyle: 'bold'
      }).setOrigin(0.5);
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        if (!this.activeFilter.difficulty) this.activeFilter.difficulty = [];
        const idx = this.activeFilter.difficulty.indexOf(diff);
        if (idx >= 0) {
          this.activeFilter.difficulty.splice(idx, 1);
          if (this.activeFilter.difficulty.length === 0) delete this.activeFilter.difficulty;
        } else {
          this.activeFilter.difficulty.push(diff);
        }
        this.scrollY = 0;
        this.scene.restart();
      });
    });

    const scenes: GameSceneType[] = ['birthday', 'wedding', 'condolence', 'graduation', 'romantic', 'appreciation'];
    let sceneX = 440;
    scenes.forEach((scene) => {
      const isActive = this.activeFilter.scene?.includes(scene);
      const btn = this.add.rectangle(sceneX, y, 68, 26, isActive ? 0x42A5F5 : 0xFFFFFF, isActive ? 1 : 0.9).setStrokeStyle(2, 0x42A5F5);
      this.add.text(sceneX, y, SCENE_NAMES[scene], {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '11px',
        color: isActive ? '#FFFFFF' : '#1565C0',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        if (!this.activeFilter.scene) this.activeFilter.scene = [];
        const idx = this.activeFilter.scene.indexOf(scene);
        if (idx >= 0) {
          this.activeFilter.scene.splice(idx, 1);
          if (this.activeFilter.scene.length === 0) delete this.activeFilter.scene;
        } else {
          this.activeFilter.scene.push(scene);
        }
        this.scrollY = 0;
        this.scene.restart();
      });
      sceneX += 76;
    });

    if (Object.keys(this.activeFilter).length > 0) {
      const clearBtn = this.add.rectangle(width - 95, y, 75, 26, 0xEF5350, 0.9).setStrokeStyle(2, 0xFFFFFF);
      this.add.text(width - 95, y, '清除筛选', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      clearBtn.setInteractive({ useHandCursor: true });
      clearBtn.on('pointerdown', () => {
        this.activeFilter = {};
        this.scrollY = 0;
        this.scene.restart();
      });
    }
  }

  private createOrdersArea(): void {
    const { width } = this.scale;

    this.add.rectangle(355, 415, 670, 520, 0xFFFFFF, 0.95).setStrokeStyle(3, 0x90CAF9);
    this.add.text(40, 180, '📝 可用订单', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#0D47A1',
      fontStyle: 'bold'
    });

    this.maskRect = this.make.graphics({});
    this.maskRect.fillStyle(0xFFFFFF, 1);
    this.maskRect.fillRect(40, 200, 630, 510);

    this.ordersContainer = this.add.container(40, 200);
    this.ordersContainer.setMask(this.maskRect.createGeometryMask());

    this.add.text(640, 188, '↓ 滚动查看更多', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '10px',
      color: '#90CAF9'
    });
  }

  private createRightPanel(): void {
    const { width } = this.scale;
    const x = 870;

    this.add.rectangle(x, 415, 250, 520, 0xFFFFFF, 0.95).setStrokeStyle(3, 0xCE93D8);

    const tabRecent = this.add.rectangle(x - 60, 190, 110, 28, this.rightPanelMode === 'recent' ? 0xAB47BC : 0xE1BEE7, this.rightPanelMode === 'recent' ? 1 : 0.9).setStrokeStyle(2, 0xAB47BC);
    this.add.text(x - 60, 190, '📜 最近订单', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '12px',
      color: this.rightPanelMode === 'recent' ? '#FFFFFF' : '#6A1B9A',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    tabRecent.setInteractive({ useHandCursor: true });
    tabRecent.on('pointerdown', () => {
      this.rightPanelMode = 'recent';
      this.selectedCustomerId = null;
      this.scene.restart();
    });

    const tabCustomers = this.add.rectangle(x + 60, 190, 110, 28, this.rightPanelMode === 'customers' ? 0xAB47BC : 0xE1BEE7, this.rightPanelMode === 'customers' ? 1 : 0.9).setStrokeStyle(2, 0xAB47BC);
    this.add.text(x + 60, 190, '👥 客户档案', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '12px',
      color: this.rightPanelMode === 'customers' ? '#FFFFFF' : '#6A1B9A',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    tabCustomers.setInteractive({ useHandCursor: true });
    tabCustomers.on('pointerdown', () => {
      this.rightPanelMode = 'customers';
      this.scene.restart();
    });

    if (this.rightPanelMode === 'recent') {
      this.createRecentOrders();
    } else {
      this.createCustomerPanel();
    }
  }

  private createRecentOrders(): void {
    const x = 870;
    const recent = getRecentOrders(6);
    if (recent.length === 0) {
      this.add.text(x, 370, '暂无订单记录\n快去接单吧！', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '15px',
        color: '#BDBDBD',
        align: 'center'
      }).setOrigin(0.5);
      return;
    }

    recent.forEach((record, i) => {
      const y = 245 + i * 70;
      const color = record.passed ? 0xE8F5E9 : 0xFFEBEE;
      const borderColor = record.passed ? 0x66BB6A : 0xEF5350;

      this.add.rectangle(x, y, 220, 60, color, 0.8).setStrokeStyle(2, borderColor);

      this.add.text(x - 100, y - 18, record.orderTitle, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: '#333333',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);

      this.add.text(x - 100, y + 5, record.passed ? '✅ ' + record.score + '分' : '❌ ' + record.score + '分', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '11px',
        color: record.passed ? '#2E7D32' : '#C62828'
      }).setOrigin(0, 0.5);

      this.add.text(x + 100, y - 18, '💰' + record.earnedCoins, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '11px',
        color: '#FF9800',
        fontStyle: 'bold'
      }).setOrigin(1, 0.5);

      this.add.text(x + 100, y + 5, '⭐' + record.earnedReputation, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '11px',
        color: '#FBC02D',
        fontStyle: 'bold'
      }).setOrigin(1, 0.5);

      if (record.isRepurchase) {
        this.add.text(x + 100, y + 22, '🔄复购', {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '9px',
          color: '#7B1FA2',
          fontStyle: 'bold'
        }).setOrigin(1, 0.5);
      }
    });
  }

  private createCustomerPanel(): void {
    const x = 870;
    const customers = getAllCustomers();

    if (customers.length === 0) {
      this.add.text(x, 370, '暂无客户档案\n完成订单后自动建立', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '13px',
        color: '#BDBDBD',
        align: 'center'
      }).setOrigin(0.5);
      return;
    }

    if (!this.selectedCustomerId) {
      const sortedCustomers = [...customers].sort((a, b) => b.lifetimeValue - a.lifetimeValue);
      sortedCustomers.slice(0, 6).forEach((customer, i) => {
        const y = 235 + i * 72;
        const isHighSat = customer.satisfaction >= 70;
        const color = isHighSat ? 0xF3E5F5 : 0xFFEBEE;
        const borderColor = isHighSat ? 0xBA68C8 : 0xEF9A9A;

        const card = this.add.rectangle(x, y, 220, 65, color, 0.8).setStrokeStyle(2, borderColor);
        card.setInteractive({ useHandCursor: true });
        card.on('pointerdown', () => {
          this.selectedCustomerId = customer.id;
          this.scene.restart();
        });

        this.add.text(x - 100, y - 22, customer.avatar + ' ' + customer.name, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '13px',
          color: '#4A148C',
          fontStyle: 'bold'
        }).setOrigin(0, 0.5);

        const satEmoji = getSatisfactionEmoji(customer.satisfaction);
        this.add.text(x - 100, y + 2, `${satEmoji} ${getSatisfactionLabel(customer.satisfaction)} (${customer.satisfaction})`, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '10px',
          color: '#6A1B9A'
        }).setOrigin(0, 0.5);

        this.add.text(x - 100, y + 22, `🔄${getRepurchaseLabel(customer.repurchaseProbability)}  📋${customer.totalOrders}单`, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '9px',
          color: '#7B1FA2'
        }).setOrigin(0, 0.5);

        this.add.text(x + 100, y + 2, `💎${customer.lifetimeValue}`, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '11px',
          color: '#FF6F00',
          fontStyle: 'bold'
        }).setOrigin(1, 0.5);
      });
      return;
    }

    const customer = customers.find(c => c.id === this.selectedCustomerId);
    if (!customer) return;

    const history = getCustomerHistory(customer.id);
    const y = 230;

    const backBtn = this.add.rectangle(x - 92, y, 48, 24, 0x9E9E9E, 0.9).setStrokeStyle(1, 0xFFFFFF);
    this.add.text(x - 92, y, '←返回', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '10px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.selectedCustomerId = null;
      this.scene.restart();
    });

    this.add.text(x, y, customer.avatar + ' ' + customer.name, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '17px',
      color: '#4A148C',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(x - 100, y + 32, `${getSatisfactionEmoji(customer.satisfaction)} 满意度: ${customer.satisfaction}`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '11px',
      color: '#6A1B9A'
    }).setOrigin(0, 0.5);

    this.add.text(x + 100, y + 32, `🔄 复购: ${customer.repurchaseProbability}%`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '11px',
      color: '#6A1B9A'
    }).setOrigin(1, 0.5);

    this.add.text(x - 100, y + 55, `📋 订单: ${customer.totalOrders} (✅${customer.completedOrders} ❌${customer.failedOrders})`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '10px',
      color: '#7B1FA2'
    }).setOrigin(0, 0.5);

    this.add.text(x + 100, y + 55, `💎 LTV: ${customer.lifetimeValue}`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '10px',
      color: '#FF6F00',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5);

    if (customer.tags.length > 0) {
      this.add.text(x - 100, y + 80, '🏷 标签:', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '10px',
        color: '#6A1B9A',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);

      let tagX = x - 55;
      let tagY = y + 80;
      customer.tags.slice(0, 6).forEach((tag) => {
        const tagInfo = CUSTOMER_TAG_NAMES[tag];
        if (tagInfo) {
          const tagText = `${tagInfo.icon}${tagInfo.name}`;
          if (tagX > x + 65) {
            tagX = x - 100;
            tagY += 18;
          }
          this.add.text(tagX, tagY, tagText, {
            fontFamily: 'Microsoft YaHei, sans-serif',
            fontSize: '9px',
            color: '#7B1FA2'
          }).setOrigin(0, 0.5).setBackgroundColor('#F3E5F5').setPadding(3, 1);
          tagX += 55;
        }
      });
    }

    if (history && history.visits.length > 0) {
      const lastVisits = history.visits.slice(-3).reverse();
      const headerY = customer.tags.length > 0 ? y + 115 : y + 100;
      this.add.text(x - 100, headerY, '📜 最近回访:', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '10px',
        color: '#4A148C',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);

      lastVisits.forEach((visit, i) => {
        const vy = headerY + 20 + i * 18;
        const deltaText = visit.satisfactionDelta >= 0 ? `+${visit.satisfactionDelta}` : `${visit.satisfactionDelta}`;
        this.add.text(x - 100, vy, `${visit.passed ? '✅' : '❌'} ${visit.orderTitle.slice(0, 9)}  满意度${deltaText}`, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '9px',
          color: visit.passed ? '#388E3C' : '#C62828'
        }).setOrigin(0, 0.5);
      });
    }
  }

  private setupMouseWheelScroll(): void {
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any[], _deltaX: number, deltaY: number) => {
      const pointerX = this.input.activePointer.x;
      const pointerY = this.input.activePointer.y;
      if (pointerX >= 40 && pointerX <= 670 && pointerY >= 200) {
        this.scrollY += deltaY;
        this.scrollY = Phaser.Math.Clamp(this.scrollY, this.maxScrollY, 0);
        this.updateOrdersList();
      }
    });
  }

  private updateOrdersList(): void {
    this.ordersContainer.removeAll(true);

    let filtered = this.orders;
    if (this.activeFilter.difficulty && this.activeFilter.difficulty.length > 0) {
      filtered = filtered.filter(o => this.activeFilter.difficulty!.includes(o.difficulty));
    }
    if (this.activeFilter.scene && this.activeFilter.scene.length > 0) {
      filtered = filtered.filter(o => this.activeFilter.scene!.includes(o.scene));
    }

    const cardW = 610;
    const cardH = 125;
    const gapY = 12;
    const totalHeight = filtered.length * (cardH + gapY);
    this.maxScrollY = Math.min(0, 500 - totalHeight);
    this.scrollY = Phaser.Math.Clamp(this.scrollY, this.maxScrollY, 0);

    if (filtered.length === 0) {
      this.add.text(305, 240, '暂无符合条件的订单\n试试清除筛选条件', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '16px',
        color: '#90A4AE',
        align: 'center'
      }).setOrigin(0.5);
      return;
    }

    filtered.forEach((order, index) => {
      const y = this.scrollY + index * (cardH + gapY) + cardH / 2;

      const isRepurchase = !!order.isRepurchase;
      const bgColor = isRepurchase ? 0xF3E5F5 : 0xFFFFFF;
      const borderColor = isRepurchase ? 0xBA68C8 : 0xBBDEFB;
      const card = this.add.rectangle(cardW / 2, y, cardW, cardH, bgColor, 1).setStrokeStyle(2, borderColor);
      this.ordersContainer.add(card);

      if (isRepurchase) {
        const repurchaseTag = this.add.rectangle(540, y - 50, 72, 20, 0x9C27B0, 0.95).setStrokeStyle(1, 0xFFFFFF);
        this.ordersContainer.add(repurchaseTag);
        this.ordersContainer.add(this.add.text(540, y - 50, '🔄 回头客', {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '10px',
          color: '#FFFFFF',
          fontStyle: 'bold'
        }).setOrigin(0.5));
      }

      const diffColor = Number('0x' + DIFFICULTY_COLORS[order.difficulty].slice(1));
      const diffTag = this.add.rectangle(isRepurchase ? 620 : 65, y - 50, 65, 22, diffColor, 0.9).setStrokeStyle(1, 0xFFFFFF);
      this.ordersContainer.add(diffTag);
      this.ordersContainer.add(this.add.text(isRepurchase ? 620 : 65, y - 50, ORDER_DIFFICULTY_NAMES[order.difficulty], {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '11px',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }).setOrigin(0.5));

      this.ordersContainer.add(this.add.text(15, y - 50, order.customerAvatar, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '20px'
      }).setOrigin(0, 0.5));

      this.ordersContainer.add(this.add.text(isRepurchase ? 15 : 110, y - 50, order.customerName + ' · ' + order.title, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '15px',
        color: '#0D47A1',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5));

      this.ordersContainer.add(this.add.text(15, y - 8, order.description, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '11px',
        color: '#546E7A',
        wordWrap: { width: 370 }
      }).setOrigin(0, 0.5));

      const tags = [
        SCENE_NAMES[order.scene],
        SEASON_NAMES[order.season],
        PALETTE_NAMES[order.preferredPalette],
        '预算¥' + order.budget
      ];
      tags.forEach((tag, i) => {
        const tx = 15 + i * 75;
        const tagBg = this.add.rectangle(tx + 30, y + 25, 68, 20, 0xE3F2FD, 0.8).setStrokeStyle(1, 0x90CAF9);
        this.ordersContainer.add(tagBg);
        this.ordersContainer.add(this.add.text(tx + 30, y + 25, tag, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '9px',
          color: '#1565C0'
        }).setOrigin(0.5));
      });

      this.ordersContainer.add(this.add.text(390, y - 10, '🌼 花语: ' + order.requiredMeanings.join('、'), {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '10px',
        color: '#7B1FA2'
      }).setOrigin(0, 0.5));

      this.ordersContainer.add(this.add.text(390, y + 8, '🎯 ' + order.targetScore + '分 | ⏱' + order.timeLimit + 's | 💰+' + order.coinReward, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '10px',
        color: '#F57C00'
      }).setOrigin(0, 0.5));

      if (order.forbiddenFlowerIds.length > 0) {
        this.ordersContainer.add(this.add.text(390, y + 28, '🚫 禁用: ' + order.forbiddenFlowerIds.length + '种', {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '9px',
          color: '#D32F2F'
        }).setOrigin(0, 0.5));
      }

      if (order.bonusTargets.length > 0) {
        this.ordersContainer.add(this.add.text(495, y + 28, '🏆 +' + order.bonusTargets.length, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '9px',
          color: '#388E3C',
          fontStyle: 'bold'
        }).setOrigin(0, 0.5));
      }

      const acceptBtn = this.add.rectangle(565, y - 10, 60, 40, 0x4CAF50, 0.95).setStrokeStyle(2, 0xFFFFFF, 0.8);
      this.ordersContainer.add(acceptBtn);
      this.ordersContainer.add(this.add.text(565, y - 18, '接单', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }).setOrigin(0.5));
      this.ordersContainer.add(this.add.text(565, y - 3, '详情', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '9px',
        color: '#C8E6C9'
      }).setOrigin(0.5));

      card.setInteractive({ useHandCursor: true });
      card.on('pointerover', () => card.setStrokeStyle(3, 0x2196F3));
      card.on('pointerout', () => card.setStrokeStyle(2, borderColor));
      card.on('pointerdown', () => {
        this.scene.start('OrderDetailScene', { order });
      });

      acceptBtn.setInteractive({ useHandCursor: true });
      acceptBtn.on('pointerover', () => acceptBtn.setScale(1.05));
      acceptBtn.on('pointerout', () => acceptBtn.setScale(1));
      acceptBtn.on('pointerdown', () => {
        this.scene.start('OrderDetailScene', { order });
      });
    });
  }

  private createBackButton(): void {
    const { width, height } = this.scale;
    const btn = this.add.rectangle(95, height - 35, 130, 40, 0x9E9E9E, 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.add.text(95, height - 35, '← 返回主菜单', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => this.scene.start('MainMenuScene'));
  }
}

import Phaser from 'phaser';
import { Order, OrderDifficulty, OrderFilter, Scene as GameSceneType, Season } from '../types';
import { generateOrderPool } from '../utils/orderGenerator';
import { loadProgress, getRecentOrders } from '../utils/storage';
import { ORDER_DIFFICULTY_NAMES, DIFFICULTY_COLORS, PALETTE_NAMES } from '../data/orders';
import { SCENE_NAMES, SEASON_NAMES } from '../data/levels';

export class OrderSelectScene extends Phaser.Scene {
  private orders: Order[] = [];
  private activeFilter: OrderFilter = {};
  private ordersContainer!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScrollY = 0;
  private maskRect!: Phaser.GameObjects.Graphics;
  private recentOrdersContainer!: Phaser.GameObjects.Container;

  constructor() {
    super('OrderSelectScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#E3F2FD');
    this.orders = generateOrderPool(8);

    this.createHeader();
    this.createFilterBar();
    this.createOrdersArea();
    this.createRecentOrders();
    this.createBackButton();
    this.setupMouseWheelScroll();
    this.updateOrdersList();
  }

  private createHeader(): void {
    const { width } = this.scale;
    this.add.rectangle(0, 0, width, 90, 0x1976D2, 0.95).setOrigin(0, 0);

    this.add.text(30, 25, '📋 接单大厅', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '32px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    });

    this.add.text(30, 60, '接受客户委托，搭配完美花束赚取金币和声望', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#BBDEFB'
    });

    const progress = loadProgress();
    this.add.text(width - 30, 25, '💰 ' + progress.coins + '  ⭐ ' + progress.customerReputation, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: '#FFF59D',
      fontStyle: 'bold'
    }).setOrigin(1, 0);

    this.add.text(width - 30, 58, '已完成 ' + progress.completedOrders.length + ' 笔订单', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#E3F2FD'
    }).setOrigin(1, 0);

    const refreshBtn = this.add.rectangle(width - 200, 45, 120, 40, 0xFF9800, 0.95).setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.add.text(width - 200, 45, '🔄 刷新订单', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    refreshBtn.setInteractive({ useHandCursor: true });
    refreshBtn.on('pointerover', () => refreshBtn.setScale(1.05));
    refreshBtn.on('pointerout', () => refreshBtn.setScale(1));
    refreshBtn.on('pointerdown', () => {
      this.orders = generateOrderPool(8);
      this.scrollY = 0;
      this.updateOrdersList();
    });
  }

  private createFilterBar(): void {
    const { width } = this.scale;
    const y = 110;

    this.add.text(20, y, '筛选：', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#0D47A1',
      fontStyle: 'bold'
    });

    const difficulties: OrderDifficulty[] = ['easy', 'medium', 'hard', 'expert'];
    difficulties.forEach((diff, i) => {
      const x = 90 + i * 90;
      const isActive = this.activeFilter.difficulty?.includes(diff);
      const btn = this.add.rectangle(x, y, 80, 30, isActive ? Number('0x' + DIFFICULTY_COLORS[diff].slice(1)) : 0xFFFFFF, isActive ? 1 : 0.9).setStrokeStyle(2, Number('0x' + DIFFICULTY_COLORS[diff].slice(1)));
      this.add.text(x, y, ORDER_DIFFICULTY_NAMES[diff], {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '13px',
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
    let sceneX = 480;
    scenes.forEach((scene) => {
      const isActive = this.activeFilter.scene?.includes(scene);
      const btn = this.add.rectangle(sceneX, y, 72, 30, isActive ? 0x42A5F5 : 0xFFFFFF, isActive ? 1 : 0.9).setStrokeStyle(2, 0x42A5F5);
      this.add.text(sceneX, y, SCENE_NAMES[scene], {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
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
      sceneX += 80;
    });

    if (Object.keys(this.activeFilter).length > 0) {
      const clearBtn = this.add.rectangle(width - 120, y, 80, 30, 0xEF5350, 0.9).setStrokeStyle(2, 0xFFFFFF);
      this.add.text(width - 120, y, '清除筛选', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '13px',
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

    this.add.rectangle(380, 400, 720, 540, 0xFFFFFF, 0.95).setStrokeStyle(3, 0x90CAF9);
    this.add.text(40, 160, '📝 可用订单', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: '#0D47A1',
      fontStyle: 'bold'
    });

    this.maskRect = this.make.graphics({});
    this.maskRect.fillStyle(0xFFFFFF, 1);
    this.maskRect.fillRect(40, 185, 680, 520);

    this.ordersContainer = this.add.container(40, 185);
    this.ordersContainer.setMask(this.maskRect.createGeometryMask());

    this.add.text(690, 175, '↓ 滚动查看更多', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '11px',
      color: '#90CAF9'
    });
  }

  private createRecentOrders(): void {
    const { width } = this.scale;
    const x = 820;

    this.add.rectangle(x, 400, 250, 540, 0xFFFFFF, 0.95).setStrokeStyle(3, 0xCE93D8);
    this.add.text(x, 170, '📜 最近订单', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#6A1B9A',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const recent = getRecentOrders(6);
    if (recent.length === 0) {
      this.add.text(x, 350, '暂无订单记录\n快去接单吧！', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '16px',
        color: '#BDBDBD',
        align: 'center'
      }).setOrigin(0.5);
      return;
    }

    recent.forEach((record, i) => {
      const y = 220 + i * 75;
      const color = record.passed ? 0xE8F5E9 : 0xFFEBEE;
      const borderColor = record.passed ? 0x66BB6A : 0xEF5350;

      this.add.rectangle(x, y, 220, 65, color, 0.8).setStrokeStyle(2, borderColor);

      this.add.text(x - 100, y - 20, record.orderTitle, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '13px',
        color: '#333333',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);

      this.add.text(x - 100, y + 2, record.passed ? '✅ 通过  ' + record.score + '分' : '❌ 未通过  ' + record.score + '分', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: record.passed ? '#2E7D32' : '#C62828'
      }).setOrigin(0, 0.5);

      this.add.text(x + 100, y - 20, '💰' + record.earnedCoins, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: '#FF9800',
        fontStyle: 'bold'
      }).setOrigin(1, 0.5);

      this.add.text(x + 100, y + 2, '⭐' + record.earnedReputation, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: '#FBC02D',
        fontStyle: 'bold'
      }).setOrigin(1, 0.5);
    });
  }

  private setupMouseWheelScroll(): void {
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any[], _deltaX: number, deltaY: number) => {
      const pointerX = this.input.activePointer.x;
      const pointerY = this.input.activePointer.y;
      if (pointerX >= 40 && pointerX <= 720 && pointerY >= 185) {
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

    const cardW = 660;
    const cardH = 130;
    const gapY = 15;
    const totalHeight = filtered.length * (cardH + gapY);
    this.maxScrollY = Math.min(0, 510 - totalHeight);
    this.scrollY = Phaser.Math.Clamp(this.scrollY, this.maxScrollY, 0);

    if (filtered.length === 0) {
      this.add.text(340, 250, '暂无符合条件的订单\n试试清除筛选条件', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '18px',
        color: '#90A4AE',
        align: 'center'
      }).setOrigin(0.5);
      return;
    }

    filtered.forEach((order, index) => {
      const y = this.scrollY + index * (cardH + gapY) + cardH / 2;

      const card = this.add.rectangle(cardW / 2, y, cardW, cardH, 0xFFFFFF, 1).setStrokeStyle(2, 0xBBDEFB);
      this.ordersContainer.add(card);

      const diffColor = Number('0x' + DIFFICULTY_COLORS[order.difficulty].slice(1));
      const diffTag = this.add.rectangle(70, y - 45, 70, 25, diffColor, 0.9).setStrokeStyle(1, 0xFFFFFF);
      this.ordersContainer.add(diffTag);
      this.ordersContainer.add(this.add.text(70, y - 45, ORDER_DIFFICULTY_NAMES[order.difficulty], {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '13px',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }).setOrigin(0.5));

      this.ordersContainer.add(this.add.text(15, y - 45, order.customerAvatar, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '22px'
      }).setOrigin(0, 0.5));

      this.ordersContainer.add(this.add.text(120, y - 45, order.customerName + ' · ' + order.title, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '18px',
        color: '#0D47A1',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5));

      this.ordersContainer.add(this.add.text(15, y - 10, order.description, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '13px',
        color: '#546E7A',
        wordWrap: { width: 420 }
      }).setOrigin(0, 0.5));

      const tags = [
        SCENE_NAMES[order.scene],
        SEASON_NAMES[order.season],
        PALETTE_NAMES[order.preferredPalette],
        '预算¥' + order.budget
      ];
      tags.forEach((tag, i) => {
        const tx = 15 + i * 90;
        const tagBg = this.add.rectangle(tx + 35, y + 30, 80, 22, 0xE3F2FD, 0.8).setStrokeStyle(1, 0x90CAF9);
        this.ordersContainer.add(tagBg);
        this.ordersContainer.add(this.add.text(tx + 35, y + 30, tag, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '11px',
          color: '#1565C0'
        }).setOrigin(0.5));
      });

      this.ordersContainer.add(this.add.text(480, y - 10, '🌼 需要花语: ' + order.requiredMeanings.join('、'), {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: '#7B1FA2'
      }).setOrigin(0, 0.5));

      this.ordersContainer.add(this.add.text(480, y + 15, '🎯 目标: ' + order.targetScore + '分  |  ⏱ ' + order.timeLimit + 's  |  💰+' + order.coinReward, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: '#F57C00'
      }).setOrigin(0, 0.5));

      if (order.forbiddenFlowerIds.length > 0) {
        this.ordersContainer.add(this.add.text(480, y + 40, '🚫 禁用花材: ' + order.forbiddenFlowerIds.length + '种', {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '11px',
          color: '#D32F2F'
        }).setOrigin(0, 0.5));
      }

      if (order.bonusTargets.length > 0) {
        this.ordersContainer.add(this.add.text(600, y + 40, '🏆 加分项: ' + order.bonusTargets.length + '个', {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '11px',
          color: '#388E3C',
          fontStyle: 'bold'
        }).setOrigin(0, 0.5));
      }

      const acceptBtn = this.add.rectangle(620, y - 20, 80, 50, 0x4CAF50, 0.95).setStrokeStyle(2, 0xFFFFFF, 0.8);
      this.ordersContainer.add(acceptBtn);
      this.ordersContainer.add(this.add.text(620, y - 25, '接单', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '18px',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }).setOrigin(0.5));
      this.ordersContainer.add(this.add.text(620, y - 7, '详情', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '11px',
        color: '#C8E6C9'
      }).setOrigin(0.5));

      card.setInteractive({ useHandCursor: true });
      card.on('pointerover', () => card.setStrokeStyle(3, 0x2196F3));
      card.on('pointerout', () => card.setStrokeStyle(2, 0xBBDEFB));
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
    const btn = this.add.rectangle(100, height - 40, 140, 45, 0x9E9E9E, 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.add.text(100, height - 40, '← 返回主菜单', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => this.scene.start('MainMenuScene'));
  }
}

import Phaser from 'phaser';
import { Order, FlowerType } from '../types';
import { FLOWERS } from '../data/flowers';
import { loadProgress } from '../utils/storage';
import { ORDER_DIFFICULTY_NAMES, DIFFICULTY_COLORS, PALETTE_NAMES } from '../data/orders';
import { SCENE_NAMES, SEASON_NAMES } from '../data/levels';

export class OrderDetailScene extends Phaser.Scene {
  private order!: Order;
  private flowerFilter: 'all' | FlowerType = 'all';
  private showForbidden: boolean = false;
  private flowersContainer!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScrollY = 0;
  private maskRect!: Phaser.GameObjects.Graphics;

  constructor() {
    super('OrderDetailScene');
  }

  init(data: { order: Order }): void {
    this.order = data.order;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#FFF3E0');

    this.createHeader();
    this.createOrderInfo();
    this.createFlowerLibrary();
    this.createActionButtons();
    this.setupMouseWheelScroll();
    this.updateFlowerList();
  }

  private createHeader(): void {
    const { width } = this.scale;
    this.add.rectangle(0, 0, width, 70, 0xFF9800, 0.95).setOrigin(0, 0);

    this.add.text(30, 20, '📋 订单详情', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '26px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    });

    const diffColor = DIFFICULTY_COLORS[this.order.difficulty];
    this.add.rectangle(width - 130, 35, 120, 35, Number('0x' + diffColor.slice(1)), 0.95).setStrokeStyle(2, 0xFFFFFF);
    this.add.text(width - 130, 35, '难度: ' + ORDER_DIFFICULTY_NAMES[this.order.difficulty], {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '15px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
  }

  private createOrderInfo(): void {
    const { width } = this.scale;

    this.add.rectangle(width / 2, 140, width - 40, 120, 0xFFFFFF, 0.95).setStrokeStyle(3, 0xFFCC80);

    this.add.text(40, 95, this.order.customerAvatar + ' ' + this.order.customerName, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: '#E65100',
      fontStyle: 'bold'
    });

    this.add.text(40, 125, '💐 ' + this.order.title, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#BF360C',
      fontStyle: 'bold'
    });

    this.add.text(40, 160, this.order.description, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '15px',
      color: '#5D4037',
      wordWrap: { width: width - 80 }
    });

    const infoY = 210;
    const infoItems = [
      { icon: '🎬', label: '场景', value: SCENE_NAMES[this.order.scene], color: '#D84315' },
      { icon: '🍂', label: '季节', value: SEASON_NAMES[this.order.season], color: '#2E7D32' },
      { icon: '🎨', label: '色系', value: PALETTE_NAMES[this.order.preferredPalette], color: '#6A1B9A' },
      { icon: '💰', label: '预算', value: '¥' + this.order.budget, color: '#F57F17' },
      { icon: '⏱', label: '限时', value: this.order.timeLimit + '秒', color: '#C62828' },
      { icon: '🎯', label: '目标分', value: this.order.targetScore + '分', color: '#1565C0' },
      { icon: '🌈', label: '最低协调', value: this.order.minHarmonyScore + '分', color: '#00838F' }
    ];

    const itemW = 145;
    infoItems.forEach((item, i) => {
      const x = 30 + (i % 4) * itemW;
      const y = infoY + Math.floor(i / 4) * 55;
      this.add.rectangle(x + itemW / 2, y, itemW - 10, 45, 0xFFF8E1, 0.9).setStrokeStyle(2, 0xFFE0B2);
      this.add.text(x + 5, y - 10, item.icon + ' ' + item.label, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: item.color
      });
      this.add.text(x + 5, y + 10, item.value, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '15px',
        color: '#333333',
        fontStyle: 'bold'
      });
    });

    const reqY = 330;
    this.add.text(30, reqY, '📝 需要包含花语:', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#4A148C',
      fontStyle: 'bold'
    });
    this.order.requiredMeanings.forEach((m, i) => {
      const tx = 200 + i * 85;
      this.add.rectangle(tx, reqY + 10, 75, 30, 0xF3E5F5, 0.95).setStrokeStyle(2, 0xCE93D8);
      this.add.text(tx, reqY + 10, '🌸 ' + m, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '13px',
        color: '#6A1B9A',
        fontStyle: 'bold'
      }).setOrigin(0.5);
    });

    if (this.order.forbiddenFlowerIds.length > 0) {
      const forbiddenY = 375;
      this.add.text(30, forbiddenY, '🚫 禁用花材 (' + this.order.forbiddenFlowerIds.length + '种):', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '16px',
        color: '#C62828',
        fontStyle: 'bold'
      });
      const forbiddenNames = this.order.forbiddenFlowerIds.map(id => {
        const f = FLOWERS.find(fl => fl.id === id);
        return f ? f.name : id;
      });
      this.add.text(240, forbiddenY, forbiddenNames.join('、'), {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '13px',
        color: '#D32F2F',
        wordWrap: { width: 800 }
      });
    }

    if (this.order.bonusTargets.length > 0) {
      const bonusY = this.order.forbiddenFlowerIds.length > 0 ? 410 : 385;
      this.add.text(30, bonusY, '🏆 可选加分目标:', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '16px',
        color: '#2E7D32',
        fontStyle: 'bold'
      });
      this.order.bonusTargets.forEach((b, i) => {
        const bx = 30 + (i % 2) * 500;
        const by = bonusY + 30 + Math.floor(i / 2) * 28;
        this.add.text(bx, by, '  ✦ ' + b.description + ' (+' + b.points + '分)', {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '13px',
          color: '#388E3C'
        });
      });
    }

    const rewardY = this.order.bonusTargets.length > 0
      ? (this.order.forbiddenFlowerIds.length > 0 ? 470 : 445) + Math.ceil(this.order.bonusTargets.length / 2) * 28
      : (this.order.forbiddenFlowerIds.length > 0 ? 410 : 385);

    this.add.text(30, rewardY, '🎁 完成奖励:', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#E65100',
      fontStyle: 'bold'
    });
    let rewardText = '💰 ' + this.order.coinReward + ' 金币  |  ⭐ ' + this.order.reputationReward + ' 声望';
    if (this.order.unlockReward && this.order.unlockReward.length > 0) {
      const unlockNames = this.order.unlockReward.map(id => {
        const f = FLOWERS.find(fl => fl.id === id);
        return f ? f.name : id;
      });
      rewardText += '  |  🌸 解锁: ' + unlockNames.join('、');
    }
    this.add.text(150, rewardY, rewardText, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#FF6F00',
      fontStyle: 'bold'
    });
  }

  private createFlowerLibrary(): void {
    const { width } = this.scale;
    const libY = 530;

    this.add.rectangle(width / 2, libY + 95, width - 40, 170, 0xFFFFFF, 0.95).setStrokeStyle(3, 0x81C784);

    this.add.text(30, libY - 5, '🌺 可用花材库 (点击查看详情)', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#2E7D32',
      fontStyle: 'bold'
    });

    const filters: { key: 'all' | FlowerType; label: string }[] = [
      { key: 'all', label: '全部' },
      { key: 'main', label: '主花' },
      { key: 'filler', label: '配花/叶材' },
      { key: 'wrapping', label: '包装纸' }
    ];

    filters.forEach((f, i) => {
      const fx = 300 + i * 90;
      const isActive = this.flowerFilter === f.key;
      const btn = this.add.rectangle(fx, libY + 5, 80, 28, isActive ? 0x66BB6A : 0xE0E0E0, isActive ? 1 : 0.9).setStrokeStyle(2, isActive ? 0x388E3C : 0xBDBDBD);
      this.add.text(fx, libY + 5, f.label, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '13px',
        color: isActive ? '#FFFFFF' : '#616161',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        this.flowerFilter = f.key;
        this.scrollY = 0;
        this.scene.restart();
      });
    });

    const showForBtnX = width - 100;
    const showForBtn = this.add.rectangle(showForBtnX, libY + 5, 130, 28, this.showForbidden ? 0xEF5350 : 0xEEEEEE, 0.9).setStrokeStyle(2, this.showForbidden ? 0xC62828 : 0xBDBDBD);
    this.add.text(showForBtnX, libY + 5, this.showForbidden ? '隐藏禁用' : '显示禁用', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '12px',
      color: this.showForbidden ? '#FFFFFF' : '#757575',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    showForBtn.setInteractive({ useHandCursor: true });
    showForBtn.on('pointerdown', () => {
      this.showForbidden = !this.showForbidden;
      this.scrollY = 0;
      this.scene.restart();
    });

    this.maskRect = this.make.graphics({});
    this.maskRect.fillStyle(0xFFFFFF, 1);
    this.maskRect.fillRect(30, libY + 25, width - 60, 130);

    this.flowersContainer = this.add.container(30, libY + 25);
    this.flowersContainer.setMask(this.maskRect.createGeometryMask());

    this.add.text(width - 45, libY + 60, '↓', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#A5D6A7'
    });
  }

  private setupMouseWheelScroll(): void {
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any[], _deltaX: number, deltaY: number) => {
      const pointerY = this.input.activePointer.y;
      if (pointerY >= 555 && pointerY <= 685) {
        this.scrollY += deltaY;
        this.scrollY = Phaser.Math.Clamp(this.scrollY, this.maxScrollY, 0);
        this.updateFlowerList();
      }
    });
  }

  private updateFlowerList(): void {
    this.flowersContainer.removeAll(true);
    const { width } = this.scale;
    const progress = loadProgress();

    let filtered = FLOWERS.filter(f => {
      if (!progress.unlockedFlowers.includes(f.id) && !this.showForbidden) return false;
      if (this.flowerFilter !== 'all' && f.type !== this.flowerFilter) return false;
      if (!this.showForbidden && this.order.forbiddenFlowerIds.includes(f.id)) return false;
      return true;
    });

    const cardW = 95;
    const cardH = 115;
    const gapX = 8;
    const cols = Math.floor((width - 70) / (cardW + gapX));
    const totalRows = Math.ceil(filtered.length / cols);
    const totalHeight = totalRows * (cardH + 10);
    this.maxScrollY = Math.min(0, 120 - totalHeight);
    this.scrollY = Phaser.Math.Clamp(this.scrollY, this.maxScrollY, 0);

    if (filtered.length === 0) {
      this.flowersContainer.add(this.add.text(500, 50, '暂无花材', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '16px',
        color: '#9E9E9E'
      }).setOrigin(0.5));
      return;
    }

    filtered.forEach((flower, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = col * (cardW + gapX) + cardW / 2;
      const y = this.scrollY + row * (cardH + 10) + cardH / 2;

      const isForbidden = this.order.forbiddenFlowerIds.includes(flower.id);
      const isUnlocked = progress.unlockedFlowers.includes(flower.id);
      const isInSeason = flower.seasons.includes(this.order.season);
      const matchesMeaning = this.order.requiredMeanings.includes(flower.meaning);

      let bgColor = 0xFFFFFF;
      let borderColor = 0xE0E0E0;
      if (isForbidden) { bgColor = 0xFFEBEE; borderColor = 0xEF5350; }
      else if (matchesMeaning) { bgColor = 0xE8F5E9; borderColor = 0x66BB6A; }
      else if (isInSeason) { bgColor = 0xE3F2FD; borderColor = 0x64B5F6; }

      const card = this.add.rectangle(x, y, cardW, cardH, bgColor, 1).setStrokeStyle(2, borderColor);
      this.flowersContainer.add(card);

      if (isUnlocked) {
        const colorCircle = this.add.circle(x, y - 30, 20, Number('0x' + flower.color.hex.slice(1))).setStrokeStyle(2, 0x9E9E9E);
        this.flowersContainer.add(colorCircle);

        this.flowersContainer.add(this.add.text(x, y + 5, flower.name, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '12px',
          color: '#333333',
          fontStyle: 'bold'
        }).setOrigin(0.5));

        this.flowersContainer.add(this.add.text(x, y + 22, flower.price + '元 | ' + flower.meaning, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '10px',
          color: matchesMeaning ? '#2E7D32' : '#666666'
        }).setOrigin(0.5));

        if (isForbidden) {
          this.flowersContainer.add(this.add.text(x, y + 40, '🚫禁用', {
            fontFamily: 'Microsoft YaHei, sans-serif',
            fontSize: '10px',
            color: '#C62828',
            fontStyle: 'bold'
          }).setOrigin(0.5));
        } else if (matchesMeaning) {
          this.flowersContainer.add(this.add.text(x, y + 40, '✓ 指定花语', {
            fontFamily: 'Microsoft YaHei, sans-serif',
            fontSize: '10px',
            color: '#2E7D32',
            fontStyle: 'bold'
          }).setOrigin(0.5));
        } else if (!isInSeason) {
          this.flowersContainer.add(this.add.text(x, y + 40, '非当季', {
            fontFamily: 'Microsoft YaHei, sans-serif',
            fontSize: '10px',
            color: '#9E9E9E'
          }).setOrigin(0.5));
        }
      } else {
        this.flowersContainer.add(this.add.circle(x, y - 15, 22, 0xBDBDBD, 0.5));
        this.flowersContainer.add(this.add.text(x, y - 15, '🔒', {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '18px'
        }).setOrigin(0.5));
        this.flowersContainer.add(this.add.text(x, y + 25, '未解锁', {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '12px',
          color: '#9E9E9E'
        }).setOrigin(0.5));
      }
    });
  }

  private createActionButtons(): void {
    const { width, height } = this.scale;

    const startBtn = this.add.rectangle(width / 2 + 100, height - 35, 220, 55, 0x4CAF50, 0.95).setStrokeStyle(3, 0xFFFFFF, 0.8);
    this.add.text(width / 2 + 100, height - 35, '🚀 开始搭配', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    startBtn.setInteractive({ useHandCursor: true });
    startBtn.on('pointerover', () => startBtn.setScale(1.05));
    startBtn.on('pointerout', () => startBtn.setScale(1));
    startBtn.on('pointerdown', () => {
      this.scene.start('GameScene', { order: this.order });
    });

    const backBtn = this.add.rectangle(width / 2 - 100, height - 35, 200, 55, 0x9E9E9E, 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.add.text(width / 2 - 100, height - 35, '← 返回订单列表', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('OrderSelectScene'));
  }
}

import Phaser from 'phaser';
import { Order, FlowerType } from '../types';
import { FLOWERS } from '../data/flowers';
import { loadProgress, getCustomerProfile, getCustomerHistory } from '../utils/storage';
import { ORDER_DIFFICULTY_NAMES, DIFFICULTY_COLORS, PALETTE_NAMES, CUSTOMER_TAG_NAMES } from '../data/orders';
import { SCENE_NAMES, SEASON_NAMES } from '../data/levels';
import { getSatisfactionEmoji, getSatisfactionLabel, getRepurchaseLabel, getFlowerDiscount } from '../utils/customerGrowth';

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
    this.createCustomerPanel();
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

    this.add.rectangle(width / 2, 130, width - 40, 100, 0xFFFFFF, 0.95).setStrokeStyle(3, 0xFFCC80);

    this.add.text(40, 90, this.order.customerAvatar + ' ' + this.order.customerName, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#E65100',
      fontStyle: 'bold'
    });

    if (this.order.isRepurchase) {
      this.add.text(300, 90, '🔄 回头客订单', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: '#FFFFFF',
        fontStyle: 'bold',
        backgroundColor: '#9C27B0'
      }).setPadding(8, 3);
    }

    this.add.text(40, 115, '💐 ' + this.order.title, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#BF360C',
      fontStyle: 'bold'
    });

    this.add.text(40, 145, this.order.description, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '13px',
      color: '#5D4037',
      wordWrap: { width: width - 80 }
    });

    const infoY = 195;
    const infoItems = [
      { icon: '🎬', label: '场景', value: SCENE_NAMES[this.order.scene], color: '#D84315' },
      { icon: '🍂', label: '季节', value: SEASON_NAMES[this.order.season], color: '#2E7D32' },
      { icon: '🎨', label: '色系', value: PALETTE_NAMES[this.order.preferredPalette], color: '#6A1B9A' },
      { icon: '💰', label: '预算', value: '¥' + this.order.budget, color: '#F57F17' },
      { icon: '⏱', label: '限时', value: this.order.timeLimit + '秒', color: '#C62828' },
      { icon: '🎯', label: '目标分', value: this.order.targetScore + '分', color: '#1565C0' },
      { icon: '🌈', label: '最低协调', value: this.order.minHarmonyScore + '分', color: '#00838F' }
    ];

    const itemW = 140;
    infoItems.forEach((item, i) => {
      const x = 30 + (i % 4) * itemW;
      const y = infoY + Math.floor(i / 4) * 45;
      this.add.rectangle(x + itemW / 2, y, itemW - 10, 38, 0xFFF8E1, 0.9).setStrokeStyle(2, 0xFFE0B2);
      this.add.text(x + 5, y - 9, item.icon + ' ' + item.label, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '10px',
        color: item.color
      });
      this.add.text(x + 5, y + 8, item.value, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '13px',
        color: '#333333',
        fontStyle: 'bold'
      });
    });

    const reqY = 285;
    this.add.text(30, reqY, '📝 花语:', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#4A148C',
      fontStyle: 'bold'
    });
    this.order.requiredMeanings.forEach((m, i) => {
      const tx = 100 + i * 80;
      this.add.rectangle(tx, reqY + 2, 70, 26, 0xF3E5F5, 0.95).setStrokeStyle(2, 0xCE93D8);
      this.add.text(tx, reqY + 2, '🌸 ' + m, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: '#6A1B9A',
        fontStyle: 'bold'
      }).setOrigin(0.5);
    });

    let cursorY = 325;
    if (this.order.forbiddenFlowerIds.length > 0) {
      this.add.text(30, cursorY, '🚫 禁用(' + this.order.forbiddenFlowerIds.length + '种):', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '13px',
        color: '#C62828',
        fontStyle: 'bold'
      });
      const forbiddenNames = this.order.forbiddenFlowerIds.map(id => {
        const f = FLOWERS.find(fl => fl.id === id);
        return f ? f.name : id;
      });
      this.add.text(200, cursorY, forbiddenNames.join('、'), {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: '#D32F2F',
        wordWrap: { width: 850 }
      });
      cursorY += 30;
    }

    if (this.order.bonusTargets.length > 0) {
      this.add.text(30, cursorY, '🏆 加分目标:', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '13px',
        color: '#2E7D32',
        fontStyle: 'bold'
      });
      this.order.bonusTargets.forEach((b, i) => {
        const bx = 140 + (i % 2) * 470;
        const by = cursorY + Math.floor(i / 2) * 22;
        this.add.text(bx, by, '✦ ' + b.description + ' (+' + b.points + '分)', {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '12px',
          color: '#388E3C'
        });
      });
      cursorY += 20 + Math.ceil(this.order.bonusTargets.length / 2) * 22;
    }

    this.add.text(30, cursorY, '🎁 奖励:', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '13px',
      color: '#E65100',
      fontStyle: 'bold'
    });
    let rewardText = '💰' + this.order.coinReward + '  ⭐' + this.order.reputationReward;
    if (this.order.unlockReward && this.order.unlockReward.length > 0) {
      const unlockNames = this.order.unlockReward.map(id => {
        const f = FLOWERS.find(fl => fl.id === id);
        return f ? f.name : id;
      });
      rewardText += '  🌸解锁: ' + unlockNames.join('、');
    }
    this.add.text(110, cursorY, rewardText, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '13px',
      color: '#FF6F00',
      fontStyle: 'bold'
    });
  }

  private createCustomerPanel(): void {
    const { width } = this.scale;
    if (!this.order.customerId) return;

    const customer = getCustomerProfile(this.order.customerId);
    const history = getCustomerHistory(this.order.customerId);
    if (!customer) return;

    const y = 420;
    this.add.rectangle(width / 2, y, width - 40, 80, 0xFCE4EC, 0.95).setStrokeStyle(2, 0xF48FB1);

    this.add.text(40, y - 30, '👤 客户画像', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#AD1457',
      fontStyle: 'bold'
    });

    this.add.text(40, y - 3, `${customer.avatar} ${customer.name}  ` +
      `${getSatisfactionEmoji(customer.satisfaction)}${getSatisfactionLabel(customer.satisfaction)}(${customer.satisfaction})  ` +
      `🔄${getRepurchaseLabel(customer.repurchaseProbability)}(${customer.repurchaseProbability}%)  ` +
      `📋历史订单:${customer.totalOrders}  💎消费:${customer.lifetimeValue}`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '11px',
      color: '#6A1B9A'
    });

    if (customer.tags.length > 0) {
      this.add.text(40, y + 18, '🏷 客户标签:', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '11px',
        color: '#7B1FA2',
        fontStyle: 'bold'
      });
      let tagX = 130;
      customer.tags.slice(0, 8).forEach((tag, i) => {
        const tagInfo = CUSTOMER_TAG_NAMES[tag];
        if (tagInfo) {
          const tagText = `${tagInfo.icon}${tagInfo.name}`;
          const displayTag = this.add.text(tagX, y + 18, tagText, {
            fontFamily: 'Microsoft YaHei, sans-serif',
            fontSize: '10px',
            color: '#7B1FA2'
          }).setOrigin(0, 0.5).setBackgroundColor('#F8BBD0').setPadding(4, 2);
          tagX += displayTag.width + 8;
        }
      });
    }

    if (this.order.customerNotes) {
      this.add.text(40, y + 38, `💬 客户留言: "${this.order.customerNotes}"`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '10px',
        color: '#880E4F',
        fontStyle: 'italic'
      });
    }

    if (history && history.visits.length > 0) {
      const lastVisit = history.visits[history.visits.length - 1];
      if (lastVisit) {
        const deltaText = lastVisit.satisfactionDelta >= 0 ? `+${lastVisit.satisfactionDelta}` : `${lastVisit.satisfactionDelta}`;
        this.add.text(width - 40, y - 3, `📜 上次:${lastVisit.passed ? '✅' : '❌'}${lastVisit.orderTitle.slice(0, 8)} 满意度${deltaText}`, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '10px',
          color: lastVisit.passed ? '#388E3C' : '#C62828'
        }).setOrigin(1, 0);
      }
    }
  }

  private createFlowerLibrary(): void {
    const { width } = this.scale;
    const progress = loadProgress();
    const discount = getFlowerDiscount(progress.professionRank);
    const libY = 510;

    this.add.rectangle(width / 2, libY + 65, width - 40, 115, 0xFFFFFF, 0.95).setStrokeStyle(3, 0x81C784);

    this.add.text(30, libY - 5, '🌺 可用花材库', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#2E7D32',
      fontStyle: 'bold'
    });

    if (discount > 0) {
      this.add.text(220, libY - 3, `🎁 花材折扣: -${Math.round(discount * 100)}% (职业等级加成)`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '11px',
        color: '#FF6F00',
        fontStyle: 'bold'
      });
    }

    const filters: { key: 'all' | FlowerType; label: string }[] = [
      { key: 'all', label: '全部' },
      { key: 'main', label: '主花' },
      { key: 'filler', label: '配花' },
      { key: 'wrapping', label: '包装' }
    ];

    filters.forEach((f, i) => {
      const fx = 430 + i * 75;
      const isActive = this.flowerFilter === f.key;
      const btn = this.add.rectangle(fx, libY + 5, 68, 25, isActive ? 0x66BB6A : 0xE0E0E0, isActive ? 1 : 0.9).setStrokeStyle(2, isActive ? 0x388E3C : 0xBDBDBD);
      this.add.text(fx, libY + 5, f.label, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
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
    const showForBtn = this.add.rectangle(showForBtnX, libY + 5, 120, 25, this.showForbidden ? 0xEF5350 : 0xEEEEEE, 0.9).setStrokeStyle(2, this.showForbidden ? 0xC62828 : 0xBDBDBD);
    this.add.text(showForBtnX, libY + 5, this.showForbidden ? '隐藏禁用' : '显示禁用', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '11px',
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
    this.maskRect.fillRect(30, libY + 22, width - 60, 85);

    this.flowersContainer = this.add.container(30, libY + 22);
    this.flowersContainer.setMask(this.maskRect.createGeometryMask());

    this.add.text(width - 45, libY + 55, '↓', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#A5D6A7'
    });
  }

  private setupMouseWheelScroll(): void {
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any[], _deltaX: number, deltaY: number) => {
      const pointerY = this.input.activePointer.y;
      if (pointerY >= 532 && pointerY <= 617) {
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
    const discount = getFlowerDiscount(progress.professionRank);

    let filtered = FLOWERS.filter(f => {
      if (!progress.unlockedFlowers.includes(f.id) && !this.showForbidden) return false;
      if (this.flowerFilter !== 'all' && f.type !== this.flowerFilter) return false;
      if (!this.showForbidden && this.order.forbiddenFlowerIds.includes(f.id)) return false;
      return true;
    });

    const cardW = 82;
    const cardH = 80;
    const gapX = 6;
    const cols = Math.floor((width - 70) / (cardW + gapX));
    const totalRows = Math.ceil(filtered.length / cols);
    const totalHeight = totalRows * (cardH + 8);
    this.maxScrollY = Math.min(0, 80 - totalHeight);
    this.scrollY = Phaser.Math.Clamp(this.scrollY, this.maxScrollY, 0);

    if (filtered.length === 0) {
      this.flowersContainer.add(this.add.text(500, 40, '暂无花材', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: '#9E9E9E'
      }).setOrigin(0.5));
      return;
    }

    filtered.forEach((flower, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = col * (cardW + gapX) + cardW / 2;
      const y = this.scrollY + row * (cardH + 8) + cardH / 2;

      const isForbidden = this.order.forbiddenFlowerIds.includes(flower.id);
      const isUnlocked = progress.unlockedFlowers.includes(flower.id);
      const isInSeason = flower.seasons.includes(this.order.season);
      const matchesMeaning = this.order.requiredMeanings.includes(flower.meaning);
      const discountedPrice = Math.round(flower.price * (1 - discount));

      let bgColor = 0xFFFFFF;
      let borderColor = 0xE0E0E0;
      if (isForbidden) { bgColor = 0xFFEBEE; borderColor = 0xEF5350; }
      else if (matchesMeaning) { bgColor = 0xE8F5E9; borderColor = 0x66BB6A; }
      else if (isInSeason) { bgColor = 0xE3F2FD; borderColor = 0x64B5F6; }

      const card = this.add.rectangle(x, y, cardW, cardH, bgColor, 1).setStrokeStyle(2, borderColor);
      this.flowersContainer.add(card);

      if (isUnlocked) {
        const colorCircle = this.add.circle(x, y - 20, 15, Number('0x' + flower.color.hex.slice(1))).setStrokeStyle(2, 0x9E9E9E);
        this.flowersContainer.add(colorCircle);

        this.flowersContainer.add(this.add.text(x, y + 6, flower.name, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '10px',
          color: '#333333',
          fontStyle: 'bold'
        }).setOrigin(0.5));

        if (discount > 0 && discountedPrice < flower.price) {
          this.flowersContainer.add(this.add.text(x, y + 20, `¥${discountedPrice}`, {
            fontFamily: 'Microsoft YaHei, sans-serif',
            fontSize: '10px',
            color: '#FF6F00',
            fontStyle: 'bold'
          }).setOrigin(0.5));
          this.flowersContainer.add(this.add.text(x, y + 31, `原¥${flower.price}`, {
            fontFamily: 'Microsoft YaHei, sans-serif',
            fontSize: '8px',
            color: '#9E9E9E'
          }).setOrigin(0.5));
        } else {
          this.flowersContainer.add(this.add.text(x, y + 20, flower.price + '元', {
            fontFamily: 'Microsoft YaHei, sans-serif',
            fontSize: '10px',
            color: matchesMeaning ? '#2E7D32' : '#666666'
          }).setOrigin(0.5));
        }

        if (isForbidden) {
          this.flowersContainer.add(this.add.text(x, y + 31, '🚫禁用', {
            fontFamily: 'Microsoft YaHei, sans-serif',
            fontSize: '8px',
            color: '#C62828',
            fontStyle: 'bold'
          }).setOrigin(0.5));
        } else if (matchesMeaning) {
          this.flowersContainer.add(this.add.text(x, y + 31, '✓花语', {
            fontFamily: 'Microsoft YaHei, sans-serif',
            fontSize: '8px',
            color: '#2E7D32',
            fontStyle: 'bold'
          }).setOrigin(0.5));
        } else if (!isInSeason) {
          this.flowersContainer.add(this.add.text(x, y + 31, '非当季', {
            fontFamily: 'Microsoft YaHei, sans-serif',
            fontSize: '8px',
            color: '#9E9E9E'
          }).setOrigin(0.5));
        }
      } else {
        this.flowersContainer.add(this.add.circle(x, y - 5, 16, 0xBDBDBD, 0.5));
        this.flowersContainer.add(this.add.text(x, y - 5, '🔒', {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '13px'
        }).setOrigin(0.5));
        this.flowersContainer.add(this.add.text(x, y + 18, '未解锁', {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '9px',
          color: '#9E9E9E'
        }).setOrigin(0.5));
      }
    });
  }

  private createActionButtons(): void {
    const { width } = this.scale;
    const btnY = 635;

    this.add.rectangle(width / 2, btnY + 35, width - 40, 60, 0xFFF3E0, 0.95).setStrokeStyle(2, 0xFFCC80);

    const startBtn = this.add.rectangle(width / 2 + 120, btnY, 200, 50, 0x4CAF50, 0.95).setStrokeStyle(3, 0xFFFFFF, 0.8);
    this.add.text(width / 2 + 120, btnY, '🚀 开始搭配', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    startBtn.setInteractive({ useHandCursor: true });
    startBtn.on('pointerover', () => startBtn.setScale(1.05));
    startBtn.on('pointerout', () => startBtn.setScale(1));
    startBtn.on('pointerdown', () => {
      this.scene.start('GameScene', { order: this.order });
    });

    const backBtn = this.add.rectangle(width / 2 - 120, btnY, 180, 50, 0x9E9E9E, 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.add.text(width / 2 - 120, btnY, '← 返回订单列表', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('OrderSelectScene'));
  }
}

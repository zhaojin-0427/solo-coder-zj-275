import Phaser from 'phaser';
import { ScoreResult, Order, Bouquet, Flower, CustomerTagType } from '../types';
import { FLOWERS } from '../data/flowers';
import { loadProgress, saveProgress, addCompletedOrder, addCoinsWithBusiness, unlockFlowers, updateStudioReputation, saveInventory, saveCustomer, saveCustomerHistory } from '../utils/storage';
import { calculateBouquetPrice } from '../utils/colorHarmony';
import { calculateBusinessResult, consumeStock } from '../utils/business';
import { calculateCustomerSatisfaction, calculateProfessionExp, updateCustomerProfile, addCustomerVisitRecord, initializeCustomerProfile, getProfessionRank } from '../utils/customerGrowth';
import { CUSTOMER_TAG_NAMES, PROFESSION_RANK_NAMES, PROFESSION_LEVELS } from '../data/orders';
import { SCENE_NAMES, SEASON_NAMES } from '../data/levels';

export class OrderResultScene extends Phaser.Scene {
  private order!: Order;
  private bouquet!: Bouquet;
  private result!: ScoreResult;

  constructor() {
    super('OrderResultScene');
  }

  init(data: { order: Order; bouquet: Bouquet; result: ScoreResult }): void {
    this.order = data.order;
    this.bouquet = data.bouquet;
    this.result = data.result;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(this.result.passed ? '#E8F5E9' : '#FFEBEE');

    const progress = loadProgress();

    const achievedBonusIds: string[] = [];
    this.order.bonusTargets.forEach(bonus => {
      if (bonus.check(this.bouquet, this.order, this.result)) {
        achievedBonusIds.push(bonus.id);
      }
    });

    const existingProfile = progress.customers[this.order.customerId] || null;
    const customerResult = calculateCustomerSatisfaction(
      this.order,
      this.bouquet,
      this.result,
      achievedBonusIds,
      existingProfile,
      progress.skills
    );

    const businessResult = calculateBusinessResult(
      this.bouquet,
      this.order,
      this.result,
      progress
    );

    const professionExpGained = calculateProfessionExp(this.result, this.order, customerResult);
    const oldRank = progress.professionRank;
    const newTotalExp = progress.professionExp + professionExpGained;
    const newRank = getProfessionRank(newTotalExp, progress.customerReputation);
    const rankUp = oldRank !== newRank;

    const unlockedFlowerIds: string[] = [];
    if (this.result.passed && this.order.unlockReward) {
      this.order.unlockReward.forEach(id => {
        if (!progress.unlockedFlowers.includes(id)) {
          unlockedFlowerIds.push(id);
        }
      });
    }

    this.createResultHeader();
    this.createBusinessPanel(businessResult);
    this.createCustomerPanel(customerResult, existingProfile);
    this.createProfessionPanel(professionExpGained, oldRank, newRank, rankUp, unlockedFlowerIds);
    this.createActionButtons();

    this.saveAllProgress(
      businessResult,
      customerResult,
      professionExpGained,
      achievedBonusIds,
      unlockedFlowerIds,
      existingProfile
    );
  }

  private createResultHeader(): void {
    const { width } = this.scale;

    this.add.text(width / 2, 50, this.result.passed ? '🎉 订单完成！' : '😢 订单未通过', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '42px',
      color: this.result.passed ? '#2E7D32' : '#C62828',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, 100, `${this.order.title}`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#424242',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, 130, `${SCENE_NAMES[this.order.scene] || this.order.scene} · ${this.getDifficultyName(this.order.difficulty)} · ${this.order.customerName}`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#757575'
    }).setOrigin(0.5);

    const totalScoreBg = this.add.rectangle(width / 2, 195, 260, 90, 0xFFFFFF, 0.9).setStrokeStyle(4, this.result.passed ? 0x66BB6A : 0xEF5353);
    this.add.text(width / 2, 180, `总分`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#616161'
    }).setOrigin(0.5);
    this.add.text(width / 2, 215, `${this.result.totalScore} 分`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '38px',
      color: this.result.passed ? '#2E7D32' : '#C62828',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(width / 2, 255, `目标分数: ${this.order.targetScore}分`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '13px',
      color: '#9E9E9E'
    }).setOrigin(0.5);
  }

  private createBusinessPanel(businessResult: any): void {
    const { width } = this.scale;
    const panelX = 80;
    const panelY = 295;
    const panelW = 300;
    const panelH = 310;

    this.add.rectangle(panelX + panelW / 2, panelY + panelH / 2, panelW, panelH, 0xFFFFFF, 0.92).setStrokeStyle(2, 0xBDBDBD);

    this.add.text(panelX + 15, panelY + 12, '💰 经营结算', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#E65100',
      fontStyle: 'bold'
    });

    const revenue = this.order.coinReward;
    const netProfit = revenue - businessResult.materialCost - businessResult.wasteCost;

    const items = [
      { label: '订单收入', value: `+¥${revenue.toFixed(2)}`, color: '#2E7D32' },
      { label: '花材成本', value: `-¥${businessResult.materialCost.toFixed(2)}`, color: '#C62828' },
      { label: '库存损耗', value: `-¥${businessResult.wasteCost.toFixed(2)}`, color: '#C62828' },
      { label: '净利润', value: `${netProfit >= 0 ? '+' : ''}¥${netProfit.toFixed(2)}`, color: netProfit >= 0 ? '#2E7D32' : '#C62828', bold: true },
      { label: '工作室声望', value: `${businessResult.studioReputationChange >= 0 ? '+' : ''}${businessResult.studioReputationChange}`, color: businessResult.studioReputationChange >= 0 ? '#1565C0' : '#C62828' }
    ];

    let y = panelY + 50;
    items.forEach(item => {
      this.add.text(panelX + 20, y, item.label, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: '#424242'
      });
      this.add.text(panelX + panelW - 20, y, item.value, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: item.color,
        fontStyle: item.bold ? 'bold' : 'normal'
      }).setOrigin(1, 0);
      y += 28;
    });

    this.add.text(panelX + 15, y + 5, '📦 库存消耗', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '15px',
      color: '#5D4037',
      fontStyle: 'bold'
    });

    y += 32;
    const stockEntries = Object.entries(businessResult.stockUsed);
    if (stockEntries.length === 0) {
      this.add.text(panelX + 20, y, '无花材使用', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: '#9E9E9E'
      });
    } else {
      stockEntries.forEach(([flowerId, qty]) => {
        const flower = FLOWERS.find(f => f.id === flowerId);
        const name = flower ? flower.name : flowerId;
        const wasteQty = businessResult.stockWaste[flowerId] || 0;
        const wasteText = wasteQty > 0 ? ` (缺货${wasteQty})` : '';
        this.add.text(panelX + 20, y, `• ${name}`, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '12px',
          color: '#424242'
        });
        this.add.text(panelX + panelW - 20, y, `x${qty}${wasteText}`, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '12px',
          color: wasteQty > 0 ? '#C62828' : '#616161'
        }).setOrigin(1, 0);
        y += 20;
      });
    }
  }

  private createCustomerPanel(customerResult: any, existingProfile: any): void {
    const { width } = this.scale;
    const panelX = 400;
    const panelY = 295;
    const panelW = 300;
    const panelH = 310;

    this.add.rectangle(panelX + panelW / 2, panelY + panelH / 2, panelW, panelH, 0xFFFFFF, 0.92).setStrokeStyle(2, 0xBDBDBD);

    this.add.text(panelX + 15, panelY + 12, '😊 客户反馈', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#AD1457',
      fontStyle: 'bold'
    });

    this.add.text(panelX + 15, panelY + 42, `${this.order.customerAvatar} ${this.order.customerName}`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '15px',
      color: '#424242',
      fontStyle: 'bold'
    });

    let y = panelY + 72;
    const prevSatisfaction = existingProfile?.satisfaction ?? 50;
    const prevRepurchase = existingProfile?.repurchaseProbability ?? 20;

    this.add.text(panelX + 20, y, '客户满意度', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '13px',
      color: '#616161'
    });
    this.add.text(panelX + panelW - 20, y, `${prevSatisfaction} → ${customerResult.satisfaction} (${customerResult.satisfactionDelta >= 0 ? '+' : ''}${customerResult.satisfactionDelta})`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '13px',
      color: customerResult.satisfactionDelta >= 0 ? '#2E7D32' : '#C62828',
      fontStyle: 'bold'
    }).setOrigin(1, 0);
    y += 24;

    this.add.text(panelX + 20, y, '复购率', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '13px',
      color: '#616161'
    });
    this.add.text(panelX + panelW - 20, y, `${prevRepurchase}% → ${customerResult.repurchaseProbability}% (${customerResult.repurchaseDelta >= 0 ? '+' : ''}${customerResult.repurchaseDelta})`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '13px',
      color: customerResult.repurchaseDelta >= 0 ? '#2E7D32' : '#C62828',
      fontStyle: 'bold'
    }).setOrigin(1, 0);
    y += 28;

    if (customerResult.newTags.length > 0) {
      this.add.text(panelX + 15, y, '🏷️ 新获得标签', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: '#6A1B9A',
        fontStyle: 'bold'
      });
      y += 22;
      customerResult.newTags.forEach((tag: CustomerTagType) => {
        const tagInfo = CUSTOMER_TAG_NAMES[tag as CustomerTagType];
        if (tagInfo) {
          this.add.text(panelX + 25, y, `${tagInfo.icon} ${tagInfo.name}`, {
            fontFamily: 'Microsoft YaHei, sans-serif',
            fontSize: '12px',
            color: '#6A1B9A'
          });
          y += 18;
        }
      });
      y += 4;
    }

    if (customerResult.feedback.length > 0) {
      this.add.text(panelX + 15, y, '💬 客户反馈', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: '#1565C0',
        fontStyle: 'bold'
      });
      y += 20;
      customerResult.feedback.slice(0, 3).forEach((msg: string) => {
        this.add.text(panelX + 20, y, msg, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '11px',
          color: '#424242',
          wordWrap: { width: panelW - 40 }
        });
        y += 16;
      });
    }
  }

  private createProfessionPanel(
    expGained: number,
    oldRank: string,
    newRank: string,
    rankUp: boolean,
    unlockedFlowerIds: string[]
  ): void {
    const { width } = this.scale;
    const panelX = 720;
    const panelY = 295;
    const panelW = 260;
    const panelH = 310;

    this.add.rectangle(panelX + panelW / 2, panelY + panelH / 2, panelW, panelH, 0xFFFFFF, 0.92).setStrokeStyle(2, 0xBDBDBD);

    this.add.text(panelX + 15, panelY + 12, '🎖️ 职业成长', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#1565C0',
      fontStyle: 'bold'
    });

    let y = panelY + 50;

    this.add.text(panelX + 20, y, '获得经验', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#616161'
    });
    this.add.text(panelX + panelW - 20, y, `+${expGained} EXP`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#1565C0',
      fontStyle: 'bold'
    }).setOrigin(1, 0);
    y += 32;

    if (rankUp) {
      this.add.text(panelX + 20, y, '🎉 职业晋升！', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '16px',
        color: '#FF6F00',
        fontStyle: 'bold'
      });
      y += 22;
      this.add.text(panelX + 30, y, `${this.getProfessionRankIcon(oldRank)} ${PROFESSION_RANK_NAMES[oldRank as keyof typeof PROFESSION_RANK_NAMES] || oldRank}`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '13px',
        color: '#9E9E9E'
      });
      y += 18;
      this.add.text(panelX + 30, y, `→ ${this.getProfessionRankIcon(newRank)} ${PROFESSION_RANK_NAMES[newRank as keyof typeof PROFESSION_RANK_NAMES] || newRank}`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '15px',
        color: '#FF6F00',
        fontStyle: 'bold'
      });
      y += 28;
    } else {
      this.add.text(panelX + 20, y, '当前等级', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: '#616161'
      });
      this.add.text(panelX + panelW - 20, y, `${this.getProfessionRankIcon(newRank)} ${PROFESSION_RANK_NAMES[newRank as keyof typeof PROFESSION_RANK_NAMES] || newRank}`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: '#1565C0',
        fontStyle: 'bold'
      }).setOrigin(1, 0);
      y += 40;
    }

    if (unlockedFlowerIds.length > 0) {
      this.add.text(panelX + 15, y, '🌺 新解锁花材', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '15px',
        color: '#4CAF50',
        fontStyle: 'bold'
      });
      y += 22;
      unlockedFlowerIds.forEach(id => {
        const flower = FLOWERS.find(f => f.id === id);
        if (flower) {
          const colorCircle = this.add.circle(panelX + 32, y, 8, Number('0x' + flower.color.hex.slice(1))).setStrokeStyle(1, 0x9E9E9E);
          this.add.text(panelX + 48, y - 8, flower.name, {
            fontFamily: 'Microsoft YaHei, sans-serif',
            fontSize: '13px',
            color: '#2E7D32',
            fontStyle: 'bold'
          });
          this.add.text(panelX + 48, y + 6, `「${flower.meaning}」`, {
            fontFamily: 'Microsoft YaHei, sans-serif',
            fontSize: '11px',
            color: '#757575'
          });
          y += 28;
        }
      });
    }
  }

  private createActionButtons(): void {
    const { width, height } = this.scale;
    const y = height - 45;

    const retryBtn = this.add.rectangle(width / 2 - 180, y, 180, 50, 0x2196F3, 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.add.text(width / 2 - 180, y, '📋 再做一单', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '17px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    retryBtn.setInteractive({ useHandCursor: true });
    retryBtn.on('pointerdown', () => {
      this.scene.start('OrderSelectScene');
    });

    const detailBtn = this.add.rectangle(width / 2, y, 180, 50, 0xFF9800, 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.add.text(width / 2, y, '📄 订单详情', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '17px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    detailBtn.setInteractive({ useHandCursor: true });
    detailBtn.on('pointerdown', () => {
      this.scene.start('OrderDetailScene', { order: this.order });
    });

    const menuBtn = this.add.rectangle(width - 100, y, 160, 50, 0x9E9E9E, 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.add.text(width - 100, y, '🏠 主菜单', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '17px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    menuBtn.setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => {
      this.scene.start('MainMenuScene');
    });
  }

  private saveAllProgress(
    businessResult: any,
    customerResult: any,
    expGained: number,
    achievedBonusIds: string[],
    unlockedFlowerIds: string[],
    existingProfile: any
  ): void {
    const progress = loadProgress();

    const revenue = this.order.coinReward;
    const netProfit = revenue - businessResult.materialCost - businessResult.wasteCost;

    addCoinsWithBusiness(netProfit, false);
    addCoinsWithBusiness(revenue, true);
    addCoinsWithBusiness(-businessResult.materialCost, false);
    addCoinsWithBusiness(-businessResult.wasteCost, false);

    updateStudioReputation(businessResult.studioReputationChange);

    if (unlockedFlowerIds.length > 0) {
      unlockFlowers(unlockedFlowerIds);
    }

    const updatedInventory = { ...progress.inventory };
    Object.entries(businessResult.stockUsed).forEach(([flowerId, qty]) => {
      consumeStock(updatedInventory, flowerId, qty as number);
    });
    saveInventory(updatedInventory);

    let customerProfile = existingProfile;
    if (!customerProfile) {
      const customerIndex = Object.keys(progress.customers).length;
      customerProfile = initializeCustomerProfile(customerIndex);
      customerProfile.id = this.order.customerId;
      customerProfile.name = this.order.customerName;
      customerProfile.avatar = this.order.customerAvatar;
    }
    customerProfile = updateCustomerProfile(customerProfile, this.order, customerResult, this.result.passed, revenue);
    saveCustomer(customerProfile);

    const history = progress.customerHistories[this.order.customerId] || null;
    const updatedHistory = addCustomerVisitRecord(history, this.order.customerId, this.order, this.result, customerResult);
    saveCustomerHistory(updatedHistory);

    progress.professionExp += expGained;
    progress.professionRank = getProfessionRank(progress.professionExp, progress.customerReputation + businessResult.studioReputationChange);
    saveProgress(progress);

    const completedRecord: any = {
      orderId: this.order.id,
      orderTitle: this.order.title,
      timestamp: Date.now(),
      score: this.result.totalScore,
      passed: this.result.passed,
      earnedCoins: netProfit,
      earnedReputation: businessResult.studioReputationChange,
      earnedExp: expGained,
      unlockedFlowers: unlockedFlowerIds,
      customerId: this.order.customerId,
      satisfaction: customerResult.satisfaction,
      repurchaseProbability: customerResult.repurchaseProbability,
      scoreDetail: customerResult.scoreDetail,
      isRepurchase: this.order.isRepurchase
    };
    addCompletedOrder(completedRecord);
  }

  private getDifficultyName(difficulty: string): string {
    const map: Record<string, string> = {
      easy: '入门', medium: '进阶', hard: '挑战', expert: '大师'
    };
    return map[difficulty] || difficulty;
  }

  private getProfessionRankIcon(rank: string): string {
    const level = PROFESSION_LEVELS.find(l => l.rank === rank);
    return level?.icon || '🌱';
  }
}

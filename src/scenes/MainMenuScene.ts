import Phaser from 'phaser';
import { loadProgress, getCurrentMarketCondition, getLowStockFlowers, getDailyReports } from '../utils/storage';
import { FLOWERS } from '../data/flowers';
import { PROFESSION_LEVELS, PROFESSION_RANK_NAMES } from '../data/orders';
import { STUDIO_RANKS, TREND_NAMES } from '../data/suppliers';
import { getFlowerDiscount, getExpProgressToNextRank, getOrderRewardMultiplier } from '../utils/customerGrowth';
import { getStudioRankConfig } from '../utils/business';
import { Season } from '../types';

const SEASON_NAMES: Record<Season, string> = {
  spring: '春季',
  summer: '夏季',
  autumn: '秋季',
  winter: '冬季'
};

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#FFE4EC');
    this.createBackground();
    this.createTitle();
    this.createProfessionPanel();
    this.createBusinessPanel();
    this.createMarketAndStockPanel();
    this.createMenuButtons();
  }

  private createBackground(): void {
    const { width, height } = this.scale;

    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.Between(20, 50);
      const alpha = Phaser.Math.FloatBetween(0.1, 0.3);
      const colors = [0xFFB6C1, 0xFFC0CB, 0xFF69B4, 0xE6E6FA, 0xF0FFF0];
      const color = Phaser.Utils.Array.GetRandom(colors) as number;
      this.add.circle(x, y, size, color, alpha);
    }
  }

  private createTitle(): void {
    const { width } = this.scale;

    this.add.text(width / 2, 60, '花束搭配挑战', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '48px',
      color: '#D81B60',
      fontStyle: 'bold'
    }).setOrigin(0.5).setShadow(2, 2, 'rgba(0,0,0,0.2)', 5);

    this.add.text(width / 2, 105, '花艺师的色彩艺术', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#880E4F'
    }).setOrigin(0.5);
  }

  private createProfessionPanel(): void {
    const { width } = this.scale;
    const progress = loadProgress();
    const expProgress = getExpProgressToNextRank(progress.professionExp);
    const currentRankConfig = PROFESSION_LEVELS.find(l => l.rank === progress.professionRank) || PROFESSION_LEVELS[0];

    const panelY = 185;
    this.add.rectangle(width / 2, panelY, width - 40, 160, 0xFFFFFF, 0.95).setStrokeStyle(3, 0xF48FB1);

    this.add.text(40, panelY - 68, `${currentRankConfig.icon} ${PROFESSION_RANK_NAMES[progress.professionRank]}`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#AD1457',
      fontStyle: 'bold'
    });

    if (expProgress.next) {
      const nextRankConfig = PROFESSION_LEVELS.find(l => l.rank === expProgress.next);
      this.add.text(width - 40, panelY - 66, `下一级: ${nextRankConfig?.icon} ${PROFESSION_RANK_NAMES[expProgress.next]}`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: '#880E4F'
      }).setOrigin(1, 0);
    } else {
      this.add.text(width - 40, panelY - 66, `🏆 已达最高等级`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: '#FF6F00',
        fontStyle: 'bold'
      }).setOrigin(1, 0);
    }

    const barX = 40;
    const barY = panelY - 42;
    const barW = width - 80;
    const barH = 16;
    this.add.rectangle(barX + barW / 2, barY, barW, barH, 0xFCE4EC, 1).setStrokeStyle(1, 0xF8BBD0);
    const progressW = (barW - 4) * (expProgress.progress / 100);
    this.add.rectangle(barX + 2 + progressW / 2, barY, Math.max(progressW, 0), barH - 4, 0xEC407A, 1);
    const expText = expProgress.next
      ? `经验: ${expProgress.currentExp} / ${expProgress.requiredExp} (${expProgress.progress}%)`
      : `总经验: ${progress.professionExp}`;
    this.add.text(barX + barW / 2, barY, expText, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '10px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const statY = panelY - 12;
    const stats = [
      { icon: '💰', label: '金币', value: progress.coins, color: '#FF9800' },
      { icon: '⭐', label: '声望', value: progress.customerReputation, color: '#FBC02D' },
      { icon: '📈', label: '经验', value: progress.professionExp, color: '#795548' },
      { icon: '📋', label: '订单', value: progress.completedOrders.length, color: '#2196F3' },
      { icon: '🌸', label: '花材', value: `${progress.unlockedFlowers.length}/${FLOWERS.length}`, color: '#E91E63' },
      { icon: '🎁', label: '折扣', value: `${Math.round(getFlowerDiscount(progress.professionRank) * 100)}%`, color: '#4CAF50' },
      { icon: '✨', label: '加成', value: `x${getOrderRewardMultiplier(progress.professionRank).toFixed(1)}`, color: '#9C27B0' }
    ];

    const statW = (width - 80) / stats.length;
    stats.forEach((stat, i) => {
      const sx = 40 + statW * i + statW / 2;
      this.add.text(sx, statY, stat.icon, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '16px'
      }).setOrigin(0.5);
      this.add.text(sx, statY + 16, stat.label, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '10px',
        color: '#880E4F'
      }).setOrigin(0.5);
      this.add.text(sx, statY + 31, String(stat.value), {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: stat.color,
        fontStyle: 'bold'
      }).setOrigin(0.5);
    });

    if (progress.reputationStatus.penaltyActive) {
      this.add.text(width / 2, panelY + 60, `⚠️ 信誉惩罚中: -${progress.reputationStatus.penaltyAmount} ${progress.reputationStatus.penaltyReason}`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '11px',
        color: '#C62828',
        fontStyle: 'bold'
      }).setOrigin(0.5);
    }
  }

  private createBusinessPanel(): void {
    const { width } = this.scale;
    const progress = loadProgress();
    const studioRankConfig = getStudioRankConfig(progress.studio.rank);

    const panelY = 380;
    const panelH = 110;
    this.add.rectangle(width / 2, panelY, width - 40, panelH, 0xFFFFFF, 0.95).setStrokeStyle(3, 0xFFB74D);

    this.add.text(40, panelY - panelH / 2 + 10, '🏪 经营概览', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#E65100',
      fontStyle: 'bold'
    });

    const stats = [
      { icon: studioRankConfig.icon, label: '工作室等级', value: studioRankConfig.name, color: '#BF360C' },
      { icon: '📅', label: '营业日', value: `第 ${progress.currentDay} 天`, color: '#EF6C00' },
      { icon: '💵', label: '总营收', value: `¥${progress.studio.totalRevenue.toFixed(0)}`, color: '#2E7D32' },
      { icon: '📊', label: '总利润', value: `¥${progress.studio.totalProfit.toFixed(0)}`, color: progress.studio.totalProfit >= 0 ? '#43A047' : '#C62828' }
    ];

    const statW = (width - 80) / 5;
    stats.forEach((stat, i) => {
      const sx = 40 + statW * i + statW / 2;
      const sy = panelY - 8;
      this.add.text(sx, sy, stat.icon, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '18px'
      }).setOrigin(0.5);
      this.add.text(sx, sy + 20, stat.label, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '10px',
        color: '#6D4C41'
      }).setOrigin(0.5);
      this.add.text(sx, sy + 36, String(stat.value), {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: stat.color,
        fontStyle: 'bold'
      }).setOrigin(0.5);
    });

    const reportBtnX = 40 + statW * 4 + statW / 2;
    const reportBtnY = panelY - 8;
    const reportBtn = this.add.rectangle(reportBtnX, reportBtnY + 10, 90, 44, 0xFF9800, 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);
    const reportLabel = this.add.text(reportBtnX, reportBtnY + 10, '📑 每日报表', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    reportBtn.setInteractive({ useHandCursor: true });
    reportBtn.on('pointerover', () => {
      reportBtn.setScale(1.05);
      reportBtn.fillAlpha = 1;
    });
    reportBtn.on('pointerout', () => {
      reportBtn.setScale(1);
      reportBtn.fillAlpha = 0.9;
    });
    reportBtn.on('pointerdown', () => {
      this.showDailyReport();
    });
    reportLabel.setInteractive({ useHandCursor: true });
    reportLabel.on('pointerdown', () => {
      this.showDailyReport();
    });
  }

  private createMarketAndStockPanel(): void {
    const { width } = this.scale;
    const market = getCurrentMarketCondition();
    const lowStockFlowers = getLowStockFlowers(2);

    const panelY = 520;
    const panelH = 115;
    this.add.rectangle(width / 2, panelY, width - 40, panelH, 0xFFFFFF, 0.95).setStrokeStyle(3, 0x81C784);

    this.add.text(40, panelY - panelH / 2 + 10, '📈 市场行情 & 库存预警', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#2E7D32',
      fontStyle: 'bold'
    });

    const leftX = 40;
    const leftY = panelY - 25;

    if (market) {
      const seasonText = `🌤️ 当前季节: ${SEASON_NAMES[market.season]}`;
      const trendText = `📊 市场趋势: ${TREND_NAMES[market.trend]}${market.eventName ? ` (${market.eventName})` : ''}`;

      this.add.text(leftX, leftY, seasonText, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: '#1B5E20'
      });

      this.add.text(leftX, leftY + 18, trendText, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: '#33691E'
      });

      if (market.shortageFlowerIds.length > 0) {
        const shortageNames = market.shortageFlowerIds.slice(0, 3).map(id => {
          const f = FLOWERS.find(fl => fl.id === id);
          return f?.name || id;
        }).join('、');
        this.add.text(leftX, leftY + 36, `🔴 供应紧张: ${shortageNames}${market.shortageFlowerIds.length > 3 ? ' 等' : ''}`, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '11px',
          color: '#C62828'
        });
      }

      if (market.surplusFlowerIds.length > 0) {
        const surplusNames = market.surplusFlowerIds.slice(0, 3).map(id => {
          const f = FLOWERS.find(fl => fl.id === id);
          return f?.name || id;
        }).join('、');
        const surplusY = market.shortageFlowerIds.length > 0 ? leftY + 54 : leftY + 36;
        this.add.text(leftX, surplusY, `🟢 供应充足: ${surplusNames}${market.surplusFlowerIds.length > 3 ? ' 等' : ''}`, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '11px',
          color: '#2E7D32'
        });
      }
    }

    const rightX = width - 40;
    const rightY = panelY - 25;

    if (lowStockFlowers.length > 0) {
      this.add.text(rightX, rightY, '⚠️ 库存预警', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '13px',
        color: '#BF360C',
        fontStyle: 'bold'
      }).setOrigin(1, 0);

      const displayCount = Math.min(lowStockFlowers.length, 3);
      for (let i = 0; i < displayCount; i++) {
        const item = lowStockFlowers[i];
        const flower = FLOWERS.find(f => f.id === item.flowerId);
        const name = flower?.name || item.flowerId;
        this.add.text(rightX, rightY + 18 + i * 16, `• ${name}: 仅剩 ${item.quantity}`, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '11px',
          color: '#E65100'
        }).setOrigin(1, 0);
      }

      if (lowStockFlowers.length > 3) {
        this.add.text(rightX, rightY + 18 + displayCount * 16, `...还有 ${lowStockFlowers.length - 3} 种`, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '10px',
          color: '#FF7043'
        }).setOrigin(1, 0);
      }
    } else {
      this.add.text(rightX, rightY, '✅ 库存充足', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '13px',
        color: '#2E7D32',
        fontStyle: 'bold'
      }).setOrigin(1, 0);
      this.add.text(rightX, rightY + 18, '所有花材库存状态良好', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '11px',
        color: '#558B2F'
      }).setOrigin(1, 0);
    }
  }

  private showDailyReport(): void {
    const reports = getDailyReports(1);
    const { width, height } = this.scale;

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    overlay.setInteractive();

    const modalW = width - 80;
    const modalH = 360;
    const modalX = width / 2;
    const modalY = height / 2;

    const modal = this.add.rectangle(modalX, modalY, modalW, modalH, 0xFFFFFF, 0.98).setStrokeStyle(3, 0xFF9800);

    this.add.text(modalX, modalY - modalH / 2 + 25, '📑 最近每日报表', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: '#E65100',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    if (reports.length === 0) {
      this.add.text(modalX, modalY, '暂无报表数据，完成营业后即可查看', {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: '#757575'
      }).setOrigin(0.5);
    } else {
      const report = reports[0];
      const contentY = modalY - modalH / 2 + 55;

      this.add.text(modalX - modalW / 2 + 20, contentY, `第 ${report.dayNumber} 天经营报表`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '15px',
        color: '#BF360C',
        fontStyle: 'bold'
      });

      const summaryStats = [
        { label: '营收', value: `¥${report.summary.revenue.toFixed(2)}`, color: '#2E7D32' },
        { label: '成本', value: `¥${report.summary.costs.toFixed(2)}`, color: '#C62828' },
        { label: '利润', value: `¥${report.summary.profit.toFixed(2)}`, color: report.summary.profit >= 0 ? '#43A047' : '#C62828' },
        { label: '完成订单', value: String(report.summary.ordersCompleted), color: '#1565C0' },
        { label: '满意度', value: `${report.summary.customerSatisfaction.toFixed(0)}分`, color: '#6A1B9A' }
      ];

      const sumW = (modalW - 40) / summaryStats.length;
      summaryStats.forEach((s, i) => {
        const sx = modalX - modalW / 2 + 20 + sumW * i + sumW / 2;
        this.add.text(sx, contentY + 30, s.label, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '11px',
          color: '#5D4037'
        }).setOrigin(0.5);
        this.add.text(sx, contentY + 48, s.value, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '13px',
          color: s.color,
          fontStyle: 'bold'
        }).setOrigin(0.5);
      });

      let lineY = contentY + 78;

      if (report.highlights.length > 0) {
        this.add.text(modalX - modalW / 2 + 20, lineY, '🌟 亮点', {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '13px',
          color: '#2E7D32',
          fontStyle: 'bold'
        });
        lineY += 18;
        report.highlights.slice(0, 2).forEach(h => {
          this.add.text(modalX - modalW / 2 + 30, lineY, h, {
            fontFamily: 'Microsoft YaHei, sans-serif',
            fontSize: '11px',
            color: '#388E3C'
          });
          lineY += 15;
        });
      }

      if (report.warnings.length > 0) {
        this.add.text(modalX - modalW / 2 + 20, lineY, '⚠️ 提醒', {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '13px',
          color: '#C62828',
          fontStyle: 'bold'
        });
        lineY += 18;
        report.warnings.slice(0, 2).forEach(w => {
          this.add.text(modalX - modalW / 2 + 30, lineY, w, {
            fontFamily: 'Microsoft YaHei, sans-serif',
            fontSize: '11px',
            color: '#D32F2F'
          });
          lineY += 15;
        });
      }

      if (report.marketInsights.length > 0) {
        this.add.text(modalX - modalW / 2 + 20, lineY, '📊 市场洞察', {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '13px',
          color: '#1565C0',
          fontStyle: 'bold'
        });
        lineY += 18;
        report.marketInsights.slice(0, 2).forEach(m => {
          this.add.text(modalX - modalW / 2 + 30, lineY, m, {
            fontFamily: 'Microsoft YaHei, sans-serif',
            fontSize: '11px',
            color: '#1976D2'
          });
          lineY += 15;
        });
      }

      if (report.suggestions.length > 0) {
        this.add.text(modalX - modalW / 2 + 20, lineY, '💡 建议', {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '13px',
          color: '#6A1B9A',
          fontStyle: 'bold'
        });
        lineY += 18;
        report.suggestions.slice(0, 2).forEach(s => {
          this.add.text(modalX - modalW / 2 + 30, lineY, s, {
            fontFamily: 'Microsoft YaHei, sans-serif',
            fontSize: '11px',
            color: '#7B1FA2'
          });
          lineY += 15;
        });
      }
    }

    const closeBtn = this.add.rectangle(modalX, modalY + modalH / 2 - 35, 140, 44, 0xFF9800, 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);
    const closeLabel = this.add.text(modalX, modalY + modalH / 2 - 35, '关闭', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const closeModal = () => {
      overlay.destroy();
      modal.destroy();
      closeBtn.destroy();
      closeLabel.destroy();
      this.children.list.filter((c: any) => c.x !== undefined).forEach((child: any) => {
        const cx = child as Phaser.GameObjects.GameObject;
        if (cx.type === 'Text' || cx.type === 'Rectangle') {
          const boundsObj = cx as any;
          const bounds = boundsObj.getBounds ? boundsObj.getBounds() : null;
          if (bounds && bounds.contains(modalX, modalY - modalH / 2)) {
            return;
          }
        }
      });
      const toRemove: Phaser.GameObjects.GameObject[] = [];
      this.children.each(child => {
        const go = child as Phaser.GameObjects.GameObject;
        const posX = (go as any).x ?? 0;
        const posY = (go as any).y ?? 0;
        if (
          posX >= modalX - modalW / 2 - 10 &&
          posX <= modalX + modalW / 2 + 10 &&
          posY >= modalY - modalH / 2 - 10 &&
          posY <= modalY + modalH / 2 + 10
        ) {
          toRemove.push(go);
        }
      });
      toRemove.forEach(go => go.destroy());
    };

    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => {
      closeBtn.setScale(1.05);
      closeBtn.fillAlpha = 1;
    });
    closeBtn.on('pointerout', () => {
      closeBtn.setScale(1);
      closeBtn.fillAlpha = 0.9;
    });
    closeBtn.on('pointerdown', closeModal);
    closeLabel.setInteractive({ useHandCursor: true });
    closeLabel.on('pointerdown', closeModal);
    overlay.on('pointerdown', closeModal);
  }

  private createMenuButtons(): void {
    const { width } = this.scale;

    this.createButton(width / 2, 685, '📋 接单大厅', '#E91E63', () => {
      this.scene.start('OrderSelectScene');
    });

    this.createButton(width / 2, 765, '🎯 固定关卡', '#FF5722', () => {
      this.scene.start('LevelSelectScene');
    });

    this.createButton(width / 2, 845, '📖 花材图鉴', '#FF9800', () => {
      this.scene.start('FlowerAlbumScene');
    });

    this.createButton(width / 2, 925, '🚪 退出游戏', '#9C27B0', () => {
      this.game.destroy(true);
    });
  }

  private createButton(x: number, y: number, text: string, color: string, onClick: () => void): void {
    const button = this.add.rectangle(x, y, 320, 60, Number('0x' + color.slice(1)), 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);

    const label = this.add.text(x, y, text, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => {
      button.setScale(1.05);
      button.fillAlpha = 1;
    });
    button.on('pointerout', () => {
      button.setScale(1);
      button.fillAlpha = 0.9;
    });
    button.on('pointerdown', onClick);
    label.setInteractive({ useHandCursor: true });
    label.on('pointerdown', onClick);
  }
}

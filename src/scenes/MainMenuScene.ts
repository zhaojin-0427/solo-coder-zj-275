import Phaser from 'phaser';
import { loadProgress } from '../utils/storage';
import { FLOWERS } from '../data/flowers';
import { PROFESSION_LEVELS, PROFESSION_RANK_NAMES } from '../data/orders';
import { getFlowerDiscount, getExpProgressToNextRank, getOrderRewardMultiplier } from '../utils/customerGrowth';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#FFE4EC');
    this.createBackground();
    this.createTitle();
    this.createProfessionPanel();
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

    const title = this.add.text(width / 2, 90, '花束搭配挑战', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '56px',
      color: '#D81B60',
      fontStyle: 'bold'
    }).setOrigin(0.5).setShadow(2, 2, 'rgba(0,0,0,0.2)', 5);

    this.add.text(width / 2, 150, '花艺师的色彩艺术', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#880E4F'
    }).setOrigin(0.5);
  }

  private createProfessionPanel(): void {
    const { width } = this.scale;
    const progress = loadProgress();
    const expProgress = getExpProgressToNextRank(progress.professionExp);
    const currentRankConfig = PROFESSION_LEVELS.find(l => l.rank === progress.professionRank) || PROFESSION_LEVELS[0];

    const panelY = 200;
    this.add.rectangle(width / 2, panelY, width - 60, 130, 0xFFFFFF, 0.95).setStrokeStyle(3, 0xF48FB1);

    this.add.text(40, panelY - 50, `${currentRankConfig.icon} ${PROFESSION_RANK_NAMES[progress.professionRank]}`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: '#AD1457',
      fontStyle: 'bold'
    });

    if (expProgress.next) {
      const nextRankConfig = PROFESSION_LEVELS.find(l => l.rank === expProgress.next);
      this.add.text(width - 40, panelY - 50, `下一级: ${nextRankConfig?.icon} ${PROFESSION_RANK_NAMES[expProgress.next]}`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: '#880E4F'
      }).setOrigin(1, 0);
    } else {
      this.add.text(width - 40, panelY - 50, `🏆 已达最高等级`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: '#FF6F00',
        fontStyle: 'bold'
      }).setOrigin(1, 0);
    }

    const barX = 40;
    const barY = panelY - 20;
    const barW = width - 80;
    const barH = 18;
    this.add.rectangle(barX + barW / 2, barY, barW, barH, 0xFCE4EC, 1).setStrokeStyle(1, 0xF8BBD0);
    const progressW = (barW - 4) * (expProgress.progress / 100);
    this.add.rectangle(barX + 2 + progressW / 2, barY, progressW, barH - 4, 0xEC407A, 1);
    const expText = expProgress.next
      ? `经验: ${expProgress.currentExp} / ${expProgress.requiredExp} (${expProgress.progress}%)`
      : `总经验: ${progress.professionExp}`;
    this.add.text(barX + barW / 2, barY, expText, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '11px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const statY = panelY + 15;
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
        fontSize: '18px'
      }).setOrigin(0.5);
      this.add.text(sx, statY + 20, stat.label, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '11px',
        color: '#880E4F'
      }).setOrigin(0.5);
      this.add.text(sx, statY + 38, String(stat.value), {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: stat.color,
        fontStyle: 'bold'
      }).setOrigin(0.5);
    });

    if (progress.reputationStatus.penaltyActive) {
      this.add.text(width / 2, panelY + 55, `⚠️ 信誉惩罚中: -${progress.reputationStatus.penaltyAmount} ${progress.reputationStatus.penaltyReason}`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: '#C62828',
        fontStyle: 'bold'
      }).setOrigin(0.5);
    }
  }

  private createMenuButtons(): void {
    const { width } = this.scale;

    this.createButton(width / 2, 390, '📋 接单大厅', '#E91E63', () => {
      this.scene.start('OrderSelectScene');
    });

    this.createButton(width / 2, 470, '🎯 固定关卡', '#FF5722', () => {
      this.scene.start('LevelSelectScene');
    });

    this.createButton(width / 2, 550, '📖 花材图鉴', '#FF9800', () => {
      this.scene.start('FlowerAlbumScene');
    });

    this.createButton(width / 2, 630, '🚪 退出游戏', '#9C27B0', () => {
      this.game.destroy(true);
    });
  }

  private createButton(x: number, y: number, text: string, color: string, onClick: () => void): void {
    const button = this.add.rectangle(x, y, 320, 65, Number('0x' + color.slice(1)), 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);

    const label = this.add.text(x, y, text, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '24px',
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

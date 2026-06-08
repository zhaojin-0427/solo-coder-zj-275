import Phaser from 'phaser';
import { loadProgress } from '../utils/storage';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenuScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#FFE4EC');
    this.createBackground();
    this.createTitle();
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

    const title = this.add.text(width / 2, 150, '花束搭配挑战', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '60px',
      color: '#D81B60',
      fontStyle: 'bold'
    }).setOrigin(0.5).setShadow(2, 2, 'rgba(0,0,0,0.2)', 5);

    this.add.text(width / 2, 230, '— 花艺师的色彩艺术 —', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '24px',
      color: '#880E4F'
    }).setOrigin(0.5);

    const progress = loadProgress();
    const totalScore = Object.values(progress.highScores).reduce((a, b) => a + b, 0);

    this.add.text(width / 2, 280, `累计最高分: ${totalScore}分  |  已通关: ${progress.completedLevels.length}/6`, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#AD1457'
    }).setOrigin(0.5);
  }

  private createMenuButtons(): void {
    const { width } = this.scale;

    this.createButton(width / 2, 380, '开始挑战', '#E91E63', () => {
      this.scene.start('LevelSelectScene');
    });

    this.createButton(width / 2, 470, '花材图鉴', '#FF9800', () => {
      this.scene.start('FlowerAlbumScene');
    });

    this.createButton(width / 2, 560, '退出游戏', '#9C27B0', () => {
      this.game.destroy(true);
    });
  }

  private createButton(x: number, y: number, text: string, color: string, onClick: () => void): void {
    const button = this.add.rectangle(x, y, 280, 60, Number('0x' + color.slice(1)), 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);

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

import Phaser from 'phaser';
import { LEVELS, SCENE_NAMES, SEASON_NAMES, DIFFICULTY_NAMES } from '../data/levels';
import { loadProgress } from '../utils/storage';

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelectScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#F3E5F5');
    this.createHeader();
    this.createLevelCards();
    this.createBackButton();
  }

  private createHeader(): void {
    const { width } = this.scale;
    this.add.text(width / 2, 50, '选择关卡', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '36px',
      color: '#4A148C',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, 100, '根据场景需求搭配出完美的花束吧！', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#6A1B9A'
    }).setOrigin(0.5);
  }

  private createLevelCards(): void {
    const progress = loadProgress();
    const cols = 3;
    const startX = 180;
    const startY = 250;
    const cardWidth = 300;
    const cardHeight = 200;
    const gapX = 40;
    const gapY = 30;

    LEVELS.forEach((level, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (cardWidth + gapX);
      const y = startY + row * (cardHeight + gapY);

      const isUnlocked = level.id === 1 || progress.completedLevels.includes(level.id - 1);
      const highScore = progress.highScores[level.id] || 0;
      const isCompleted = progress.completedLevels.includes(level.id);

      let bgColor = 0xFFFFFF;
      let borderColor = 0xE1BEE7;
      if (isCompleted) {
        bgColor = 0xE8F5E9;
        borderColor = 0x66BB6A;
      }

      const card = this.add.rectangle(x, y, cardWidth, cardHeight, bgColor, 0.95).setStrokeStyle(3, borderColor, 1);
      
      if (isUnlocked) {
        card.setInteractive({ useHandCursor: true });
        card.on('pointerdown', () => {
          this.scene.start('GameScene', { levelId: level.id });
        });
        card.on('pointerover', () => card.setScale(1.03));
        card.on('pointerout', () => card.setScale(1));
      }

      const difficultyColor = level.difficulty === 'easy' ? '#4CAF50' : level.difficulty === 'medium' ? '#FF9800' : '#F44336';

      this.add.text(x, y - 80, `第${level.id}关`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '16px',
        color: '#9E9E9E'
      }).setOrigin(0.5);

      this.add.text(x, y - 50, level.name, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '24px',
        color: '#4A148C',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      this.add.text(x, y - 15, `场景: ${SCENE_NAMES[level.scene]}`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '16px',
        color: '#333333'
      }).setOrigin(0.5);

      this.add.text(x, y + 12, `季节: ${SEASON_NAMES[level.season]}  |  预算: ¥${level.budget}`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: '#555555'
      }).setOrigin(0.5);

      this.add.text(x, y + 38, `目标分: ${level.targetScore}  |  限时: ${level.timeLimit}秒`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: '#555555'
      }).setOrigin(0.5);

      this.add.text(x, y + 64, `难度: ${DIFFICULTY_NAMES[level.difficulty]}`, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: difficultyColor,
        fontStyle: 'bold'
      }).setOrigin(0.5);

      if (isCompleted && highScore > 0) {
        this.add.text(x, y + 85, `★ 最高分: ${highScore}分`, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '14px',
          color: '#FF9800',
          fontStyle: 'bold'
        }).setOrigin(0.5);
      }

      if (!isUnlocked) {
        this.add.rectangle(x, y, cardWidth, cardHeight, 0x000000, 0.4);
        this.add.text(x, y, '🔒 未解锁', {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '28px',
          color: '#FFFFFF',
          fontStyle: 'bold'
        }).setOrigin(0.5);
      }
    });
  }

  private createBackButton(): void {
    const { width, height } = this.scale;
    const btn = this.add.rectangle(100, height - 50, 140, 50, 0xE91E63, 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.add.text(100, height - 50, '返回主菜单', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => this.scene.start('MainMenuScene'));
  }
}

import Phaser from 'phaser';
import { FLOWERS } from '../data/flowers';
import { Flower } from '../types';
import { loadProgress } from '../utils/storage';

export class FlowerAlbumScene extends Phaser.Scene {
  private activeFilter: 'all' | 'main' | 'filler' | 'wrapping' = 'all';
  private flowerCardsContainer!: Phaser.GameObjects.Container;
  private detailPanel!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScrollY = 0;
  private maskRect!: Phaser.GameObjects.Graphics;

  constructor() {
    super('FlowerAlbumScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#FFF3E0');
    this.createHeader();
    this.createFilters();

    this.maskRect = this.make.graphics({});
    this.maskRect.fillStyle(0xFFFFFF, 1);
    this.maskRect.fillRect(0, 160, 650, 520);

    this.flowerCardsContainer = this.add.container(20, 160);
    this.flowerCardsContainer.setMask(this.maskRect.createGeometryMask());

    this.detailPanel = this.add.container(0, 0).setDepth(100);
    this.setupMouseWheelScroll();
    this.updateFlowerCards();
    this.createBackButton();
    this.createColorHarmonyInfo();
  }

  private setupMouseWheelScroll(): void {
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any[], _deltaX: number, deltaY: number) => {
      const pointerX = this.input.activePointer.x;
      if (pointerX < 680) {
        this.scrollY += deltaY;
        this.scrollY = Phaser.Math.Clamp(this.scrollY, this.maxScrollY, 0);
        this.updateFlowerCards();
      }
    });
  }

  private createHeader(): void {
    const { width } = this.scale;
    this.add.text(width / 2, 40, '花材图鉴', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '36px',
      color: '#E65100',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, 80, '学习各种花材的花语、颜色与使用场景', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#5D4037'
    }).setOrigin(0.5);

    const progress = loadProgress();
    const unlocked = progress.unlockedFlowers.length;
    const total = FLOWERS.length;
    this.add.text(width - 30, 45, '收集进度: ' + unlocked + '/' + total, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#FF9800',
      fontStyle: 'bold'
    }).setOrigin(1, 0);
  }

  private createFilters(): void {
    const filters = [
      { key: 'all' as const, label: '全部', x: 80 },
      { key: 'main' as const, label: '主花', x: 180 },
      { key: 'filler' as const, label: '配花叶材', x: 300 },
      { key: 'wrapping' as const, label: '包装纸', x: 440 }
    ];

    filters.forEach(f => {
      const isActive = this.activeFilter === f.key;
      const btn = this.add.rectangle(f.x, 130, 100, 35, isActive ? 0xFF9800 : 0xE0E0E0, 1).setStrokeStyle(2, isActive ? 0xF57C00 : 0xBDBDBD);
      const label = this.add.text(f.x, 130, f.label, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '14px',
        color: isActive ? '#FFFFFF' : '#616161',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        this.activeFilter = f.key;
        this.scrollY = 0;
        this.scene.restart();
      });
      label.setInteractive({ useHandCursor: true });
      label.on('pointerdown', () => {
        this.activeFilter = f.key;
        this.scrollY = 0;
        this.scene.restart();
      });
    });
  }

  private updateFlowerCards(): void {
    this.flowerCardsContainer.removeAll(true);
    const progress = loadProgress();

    let filtered = FLOWERS;
    if (this.activeFilter !== 'all') {
      filtered = FLOWERS.filter(f => f.type === this.activeFilter);
    }

    const cols = 5;
    const cardW = 120;
    const cardH = 150;
    const gapX = 10;
    const gapY = 10;

    const totalRows = Math.ceil(filtered.length / cols);
    const totalHeight = totalRows * (cardH + gapY);
    this.maxScrollY = Math.min(0, 510 - totalHeight);
    this.scrollY = Phaser.Math.Clamp(this.scrollY, this.maxScrollY, 0);

    filtered.forEach((flower, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = col * (cardW + gapX) + cardW / 2;
      const y = this.scrollY + row * (cardH + gapY) + cardH / 2;
      const isUnlocked = progress.unlockedFlowers.includes(flower.id);

      const card = this.add.rectangle(x, y, cardW, cardH, isUnlocked ? 0xFFFFFF : 0xF5F5F5, 1).setStrokeStyle(2, isUnlocked ? 0xFFCC80 : 0xE0E0E0);
      this.flowerCardsContainer.add(card);

      if (isUnlocked) {
        const colorCircle = this.add.circle(x, y - 30, 25, Number('0x' + flower.color.hex.slice(1))).setStrokeStyle(2, 0x9E9E9E);
        this.flowerCardsContainer.add(colorCircle);

        const colorName = this.add.text(x, y - 30, flower.color.name, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '10px',
          color: this.isDarkColor(flower.color.hex) ? '#FFFFFF' : '#333333'
        }).setOrigin(0.5);
        this.flowerCardsContainer.add(colorName);

        const name = this.add.text(x, y + 12, flower.name, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '14px',
          color: '#333333',
          fontStyle: 'bold'
        }).setOrigin(0.5);
        this.flowerCardsContainer.add(name);

        const meaning = this.add.text(x, y + 35, flower.meaning, {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '12px',
          color: '#9C27B0'
        }).setOrigin(0.5);
        this.flowerCardsContainer.add(meaning);

        const price = this.add.text(x, y + 55, flower.price + '元', {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '12px',
          color: '#FF5722'
        }).setOrigin(0.5);
        this.flowerCardsContainer.add(price);

        card.setInteractive({ useHandCursor: true });
        card.on('pointerover', () => card.setStrokeStyle(3, 0xFF9800));
        card.on('pointerout', () => card.setStrokeStyle(2, 0xFFCC80));
        card.on('pointerdown', () => this.showFlowerDetail(flower));
      } else {
        const lockCircle = this.add.circle(x, y - 15, 25, 0xBDBDBD, 0.5);
        this.flowerCardsContainer.add(lockCircle);

        const lock = this.add.text(x, y - 15, 'LOCK', {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '12px',
          color: '#FFFFFF',
          fontStyle: 'bold'
        }).setOrigin(0.5);
        this.flowerCardsContainer.add(lock);

        const lockedText = this.add.text(x, y + 30, '未解锁', {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '14px',
          color: '#9E9E9E'
        }).setOrigin(0.5);
        this.flowerCardsContainer.add(lockedText);

        const hintText = this.add.text(x, y + 55, flower.id.split('_')[0], {
          fontFamily: 'Microsoft YaHei, sans-serif',
          fontSize: '12px',
          color: '#BDBDBD'
        }).setOrigin(0.5);
        this.flowerCardsContainer.add(hintText);
      }
    });
  }

  private isDarkColor(hex: string): boolean {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  }

  private showFlowerDetail(flower: Flower): void {
    this.detailPanel.removeAll(true);
    const { width, height } = this.scale;

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    overlay.setInteractive({ useHandCursor: true });
    overlay.on('pointerdown', () => this.detailPanel.removeAll(true));
    this.detailPanel.add(overlay);

    const panel = this.add.rectangle(width / 2, height / 2, 480, 420, 0xFFFFFF, 1).setStrokeStyle(4, 0xFF9800);
    this.detailPanel.add(panel);

    this.detailPanel.add(this.add.text(width / 2, height / 2 - 180, '花材详情', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '24px',
      color: '#E65100',
      fontStyle: 'bold'
    }).setOrigin(0.5));

    const colorCircle = this.add.circle(width / 2, height / 2 - 120, 50, Number('0x' + flower.color.hex.slice(1))).setStrokeStyle(3, 0xFFFFFF);
    this.detailPanel.add(colorCircle);

    this.detailPanel.add(this.add.text(width / 2, height / 2 - 120, flower.color.name, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: this.isDarkColor(flower.color.hex) ? '#FFFFFF' : '#333333',
      fontStyle: 'bold'
    }).setOrigin(0.5));

    this.detailPanel.add(this.add.text(width / 2, height / 2 - 50, flower.name, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '28px',
      color: '#333333',
      fontStyle: 'bold'
    }).setOrigin(0.5));

    const typeText = flower.type === 'main' ? '主花' : flower.type === 'filler' ? '配花叶材' : '包装纸';
    this.detailPanel.add(this.add.text(width / 2, height / 2 - 15, '类型: ' + typeText + ' | 价格: ' + flower.price + '元', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#666666'
    }).setOrigin(0.5));

    this.detailPanel.add(this.add.text(width / 2, height / 2 + 20, '花语: ' + flower.meaning, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#9C27B0',
      fontStyle: 'bold'
    }).setOrigin(0.5));

    const seasonMap: Record<string, string> = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
    const seasonsText = flower.seasons.map(s => seasonMap[s]).join(' ');
    this.detailPanel.add(this.add.text(width / 2, height / 2 + 55, '适用季节: ' + seasonsText, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#4CAF50'
    }).setOrigin(0.5));

    this.detailPanel.add(this.add.text(width / 2, height / 2 + 95, flower.description, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#555555',
      align: 'center',
      wordWrap: { width: 400 }
    }).setOrigin(0.5));

    const closeBtn = this.add.rectangle(width / 2, height / 2 + 160, 140, 45, 0xFF9800, 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.detailPanel.add(closeBtn);
    this.detailPanel.add(this.add.text(width / 2, height / 2 + 160, '关闭', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5));
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.detailPanel.removeAll(true));
  }

  private createColorHarmonyInfo(): void {
    const { width } = this.scale;
    this.add.rectangle(width - 220, 580, 400, 220, 0xFFFFFF, 0.95).setStrokeStyle(3, 0xCE93D8);
    this.add.text(width - 220, 490, '色彩和谐理论', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: '#6A1B9A',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const tips = [
      { name: '单色搭配', desc: '同色系深浅变化 和谐统一', color: '#E91E63' },
      { name: '邻近色搭配', desc: '色轮相邻色 自然舒适', color: '#4CAF50' },
      { name: '对比色搭配', desc: '色轮对面色 活力鲜明', color: '#2196F3' },
      { name: '互补色搭配', desc: '180度对立色 强烈视觉冲击', color: '#FF9800' }
    ];

    tips.forEach((tip, i) => {
      const y = 530 + i * 38;
      this.add.rectangle(width - 395, y, 15, 15, Number('0x' + tip.color.slice(1)));
      this.add.text(width - 375, y, tip.name, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '13px',
        color: tip.color,
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      this.add.text(width - 260, y, tip.desc, {
        fontFamily: 'Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: '#666666'
      }).setOrigin(0, 0.5);
    });
  }

  private createBackButton(): void {
    const { height } = this.scale;
    const btn = this.add.rectangle(100, height - 45, 140, 50, 0xE91E63, 0.9).setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.add.text(100, height - 45, '返回主菜单', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => this.scene.start('MainMenuScene'));
  }
}

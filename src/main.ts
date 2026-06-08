import Phaser from 'phaser';
import { MainMenuScene } from './scenes/MainMenuScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { OrderSelectScene } from './scenes/OrderSelectScene';
import { OrderDetailScene } from './scenes/OrderDetailScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';
import { FlowerAlbumScene } from './scenes/FlowerAlbumScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1100,
  height: 700,
  parent: 'game-container',
  backgroundColor: '#FFF5F5',
  scene: [
    MainMenuScene,
    LevelSelectScene,
    OrderSelectScene,
    OrderDetailScene,
    GameScene,
    ResultScene,
    FlowerAlbumScene
  ],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

new Phaser.Game(config);

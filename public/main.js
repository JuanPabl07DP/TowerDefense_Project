import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import CreditsScene from './scenes/CreditsScene.js';
import MusicScene from './scenes/MusicScene.js';
import SettingsScene from './scenes/SettingsScene.js';
import LobbyScene from './scenes/LobbyScene.js';
import RoomCreationScene from './scenes/RoomCreationScene.js';
import JoinRoomScene from './scenes/JoinRoomScene.js';
import LoginScene from "./scenes/LoginScene";
import ConfirmationScene from "./scenes/ConfirmationScene";
import RegisterScene from "./scenes/RegisterScene";

// Configuración del juego
const config = {
    type: Phaser.AUTO,
    parent: 'game-container', // Asegúrate de tener este contenedor en tu HTML
    dom: {
        createContainer: true // ¡Esta línea es crucial!
    },
    input: {
        activePointers: 3 // Asegura que reconozca clicks táctiles/mouse
    },
    width: window.innerWidth,
    height: window.innerHeight,
    scene: [
        LoginScene,
        ConfirmationScene,
        RegisterScene,
        MenuScene,
        MusicScene,
        GameScene,
        CreditsScene,
        SettingsScene,
        LobbyScene,
        RoomCreationScene,
        JoinRoomScene
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    audio: {
        disableWebAudio: false
    }
};

// Crear una instancia del juego
const game = new Phaser.Game(config);
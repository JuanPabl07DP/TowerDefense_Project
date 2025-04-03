// scenes/RoomCreationScene.js
import { createRoom, startGame, onPlayerJoined, onPlayerLeft, onGameStarted } from '../services/socketService.js';

export default class RoomCreationScene extends Phaser.Scene {
    constructor() {
        super({ key: 'RoomCreationScene' });
    }

    init(data) {
        // Determinar si estamos creando o uniéndonos a una sala
        this.isJoining = data && data.isJoining === true;
        this.roomCode = data && data.roomCode ? data.roomCode : null;
        this.playerId = null;
    }

    preload() {
        // Cargar imagen de fondo y sprites de jugadores
        this.load.image('room_background', 'assets/sala.jpeg');
        this.load.image('player1', 'assets/jugador1.jpeg');
        this.load.image('player2', 'assets/jugador2.jpeg');
    }

    async create() {
        // Obtener dimensiones de la pantalla
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Calcular escala proporcional
        this.scaleRatio = Math.min(width / 1280, height / 720);

        // Añadir imagen de fondo
        const background = this.add.image(width / 2, height / 2, 'room_background')
            .setDisplaySize(width, height);

        // Título
        const titleStyle = {
            font: `bold ${Math.max(24, Math.floor(36 * this.scaleRatio))}px Arial`,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        };
        this.add.text(width / 2, height * 0.15, 'SALA DE ESPERA', titleStyle)
            .setOrigin(0.5);

        // Texto del código de sala
        const codeStyle = {
            font: `bold ${Math.max(32, Math.floor(42 * this.scaleRatio))}px Arial`,
            fill: '#ffff00',
            stroke: '#000000',
            strokeThickness: 5
        };
        this.codeText = this.add.text(width / 2, height * 0.25, 'Código: ...', codeStyle)
            .setOrigin(0.5);

        // Mensaje de espera (guardamos referencia para poder ocultarlo)
        const waitStyle = {
            font: `${Math.max(18, Math.floor(24 * this.scaleRatio))}px Arial`,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        };
        this.waitingText = this.add.text(width / 2, height * 0.35, 'Esperando a jugador 2...', waitStyle)
            .setOrigin(0.5)
            .setPadding(10);

        // Añadir contenedor de jugador 1
        const player1Container = this.add.container(width * 0.25, height * 0.5);

        // Marco para jugador 1
        const player1Frame = this.add.graphics();
        player1Frame.fillStyle(0x444444, 0.7);
        player1Frame.fillRoundedRect(-100, -120, 200, 240, 16);
        player1Frame.lineStyle(4, 0xffff00, 1);
        player1Frame.strokeRoundedRect(-100, -120, 200, 240, 16);

        // Añadir texto "Jugador 1"
        const player1Text = this.add.text(0, -90, this.isJoining ? 'Jugador 1' : 'Jugador 1 (Tú)', {
            font: `bold ${Math.max(16, Math.floor(18 * this.scaleRatio))}px Arial`,
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Añadir imagen del jugador 1
        const player1Image = this.add.image(0, 0, 'player1')
            .setDisplaySize(120, 120);

        // Estado del jugador 1
        const player1Status = this.add.text(0, 80, this.isJoining ? 'Listo ✓' : 'Listo ✓', {
            font: `bold ${Math.max(16, Math.floor(18 * this.scaleRatio))}px Arial`,
            fill: '#00ff00'
        }).setOrigin(0.5);

        player1Container.add([player1Frame, player1Text, player1Image, player1Status]);

        // Añadir contenedor de jugador 2
        const player2Container = this.add.container(width * 0.75, height * 0.5);

        // Marco para jugador 2
        const player2Frame = this.add.graphics();
        player2Frame.fillStyle(0x444444, 0.7);
        player2Frame.fillRoundedRect(-100, -120, 200, 240, 16);

        if (this.isJoining) {
            // Si estamos uniéndonos, el jugador 2 (nosotros) está listo
            player2Frame.lineStyle(4, 0x00ff00, 1);
        } else {
            // Si somos el host, jugador 2 está esperando
            player2Frame.lineStyle(4, 0x888888, 1);
        }

        player2Frame.strokeRoundedRect(-100, -120, 200, 240, 16);

        // Añadir texto "Jugador 2"
        const player2Text = this.add.text(0, -90, this.isJoining ? 'Jugador 2 (Tú)' : 'Jugador 2', {
            font: `bold ${Math.max(16, Math.floor(18 * this.scaleRatio))}px Arial`,
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Añadir imagen del jugador 2
        const player2Image = this.add.image(0, 0, 'player2')
            .setDisplaySize(120, 120)
            .setAlpha(this.isJoining ? 1 : 0.5); // Semi-transparente si estamos esperando J2

        // Estado del jugador 2
        const player2Status = this.add.text(0, 80, this.isJoining ? 'Listo ✓' : 'Esperando...', {
            font: `${Math.max(16, Math.floor(18 * this.scaleRatio))}px Arial`,
            fill: this.isJoining ? '#00ff00' : '#ffff00'
        }).setOrigin(0.5);

        player2Container.add([player2Frame, player2Text, player2Image, player2Status]);

        // Botón para volver
        this.createButton(
            width * 0.15,
            height * 0.9,
            'Volver',
            () => this.scene.start('LobbyScene')
        );

        // Iniciar conexión con servidor
        if (!this.isJoining) {
            // Si estamos creando una sala, conectarse al servidor
            try {
                const roomData = await createRoom();
                this.roomCode = roomData.roomCode;
                this.playerId = roomData.playerId;

                // Actualizar texto del código
                this.codeText.setText(`Código: ${this.roomCode}`);

                // Escuchar cuando se une el jugador 2
                onPlayerJoined(({ players }) => {
                    if (players.length === 2) {
                        // Actualizar visual del jugador 2
                        player2Frame.clear();
                        player2Frame.fillStyle(0x444444, 0.7);
                        player2Frame.fillRoundedRect(-100, -120, 200, 240, 16);
                        player2Frame.lineStyle(4, 0x00ff00, 1);
                        player2Frame.strokeRoundedRect(-100, -120, 200, 240, 16);

                        // Hacer la imagen del jugador 2 visible
                        player2Image.setAlpha(1);

                        // Actualizar estado
                        player2Status.setText('Listo ✓');
                        player2Status.setFill('#00ff00');

                        // Ocultar mensaje de espera
                        this.waitingText.setVisible(false);

                        // NUEVO: Iniciar el juego automáticamente después de un breve retraso
                        this.time.delayedCall(1500, () => {
                            // Mostrar mensaje de inicio automático
                            const autoStartText = this.add.text(
                                this.cameras.main.width / 2,
                                this.cameras.main.height / 2,
                                '¡Iniciando partida!',
                                {
                                    font: `bold ${Math.floor(30 * this.scaleRatio)}px Arial`,
                                    fill: '#ffffff',
                                    stroke: '#000000',
                                    strokeThickness: 4,
                                    backgroundColor: '#00000080',
                                    padding: { x: 20, y: 10 }
                                }
                            ).setOrigin(0.5);

                            // Iniciar el juego después de mostrar el mensaje
                            this.time.delayedCall(1500, () => {
                                this.startGame();
                            });
                        });
                    }
                });

                // Manejar desconexión del jugador 2
                onPlayerLeft(({ playerId, playerIndex }) => {
                    console.log(`Jugador ${playerId} abandonó la sala`);

                    // Mostrar mensaje de desconexión
                    this.showDisconnectionMessage("El jugador 2 se ha desconectado");

                    // Restaurar estado de espera para el jugador 2
                    player2Frame.clear();
                    player2Frame.fillStyle(0x444444, 0.7);
                    player2Frame.fillRoundedRect(-100, -120, 200, 240, 16);
                    player2Frame.lineStyle(4, 0x888888, 1);
                    player2Frame.strokeRoundedRect(-100, -120, 200, 240, 16);

                    // Imagen semi-transparente
                    player2Image.setAlpha(0.5);

                    // Actualizar texto de estado
                    player2Status.setText('Desconectado');
                    player2Status.setFill('#ff0000');

                    // Mostrar mensaje de espera con texto actualizado
                    this.waitingText.setText('Esperando reconexión o nuevo jugador...');
                    this.waitingText.setVisible(true);

                    // Después de 3 segundos, volver al estado de "Esperando..."
                    this.time.delayedCall(3000, () => {
                        player2Status.setText('Esperando...');
                        player2Status.setFill('#ffff00');
                        this.waitingText.setText('Esperando a jugador 2...');
                    });
                });
            } catch (error) {
                console.error('Error al crear sala:', error);
            }
        } else {
            // Si estamos uniéndonos, actualizar el código de sala
            this.codeText.setText(`Código: ${this.roomCode}`);
            this.waitingText.setVisible(false);

            // Escuchar inicio de juego
            onGameStarted(({ roomCode }) => {
                if (roomCode === this.roomCode) {
                    this.scene.start('GameScene', { roomCode: this.roomCode, isHost: false });
                }
            });

            // Manejar desconexión del jugador 1
            onPlayerLeft(({ playerId }) => {
                console.log(`Jugador ${playerId} abandonó la sala`);

                // Mostrar mensaje de desconexión
                this.showDisconnectionMessage("El jugador 1 (host) se ha desconectado");

                // Actualizar estado del jugador 1
                player1Frame.clear();
                player1Frame.fillStyle(0x444444, 0.7);
                player1Frame.fillRoundedRect(-100, -120, 200, 240, 16);
                player1Frame.lineStyle(4, 0x888888, 1);
                player1Frame.strokeRoundedRect(-100, -120, 200, 240, 16);

                player1Image.setAlpha(0.5);
                player1Status.setText('Desconectado');
                player1Status.setFill('#ff0000');

                // Tiempo de espera antes de volver al lobby
                this.time.delayedCall(5000, () => {
                    this.scene.start('LobbyScene');
                });
            });
        }
    }

    createButton(x, y, text, callback, disabled = false) {
        const buttonWidth = 220;
        const buttonHeight = 50;
        const buttonX = x - buttonWidth / 2;
        const buttonY = y - buttonHeight / 2;

        // Crear fondo del botón
        const button = this.add.graphics();
        button.fillStyle(disabled ? 0x888888 : 0xA67C52, 1);
        button.lineStyle(3, disabled ? 0x666666 : 0x664433, 1);
        button.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        button.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

        // Agregar borde interior
        if (!disabled) {
            const borderThickness = Math.max(1, Math.floor(2 * this.scaleRatio));
            const borderOffset = Math.max(2, Math.floor(3 * this.scaleRatio));
            button.lineStyle(borderThickness, 0xD4A76A, 1);
            button.strokeRect(
                buttonX + borderOffset,
                buttonY + borderOffset,
                buttonWidth - (borderOffset * 2),
                buttonHeight - (borderOffset * 2)
            );
        }

        // Texto del botón
        const textObj = this.add.text(x, y, text, {
            font: `bold ${Math.max(16, Math.floor(22 * this.scaleRatio))}px Arial`,
            fill: disabled ? '#aaaaaa' : '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Hacer interactivo solo si no está desactivado
        if (!disabled) {
            const hitArea = new Phaser.Geom.Rectangle(buttonX, buttonY, buttonWidth, buttonHeight);
            button.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
                .on('pointerdown', () => {
                    // Efecto de botón presionado
                    button.clear();
                    button.fillStyle(0x7A5C32, 1);
                    button.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
                    button.lineStyle(3, 0x664433, 1);
                    button.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

                    // Llamar al callback después de un pequeño retraso
                    this.time.delayedCall(150, callback);
                })
                .on('pointerover', () => {
                    // Efecto hover
                    button.clear();
                    button.fillStyle(0xBB9062, 1);
                    button.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
                    button.lineStyle(3, 0x664433, 1);
                    button.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

                    const borderThickness = Math.max(1, Math.floor(2 * this.scaleRatio));
                    const borderOffset = Math.max(2, Math.floor(3 * this.scaleRatio));
                    button.lineStyle(borderThickness, 0xD4A76A, 1);
                    button.strokeRect(
                        buttonX + borderOffset,
                        buttonY + borderOffset,
                        buttonWidth - (borderOffset * 2),
                        buttonHeight - (borderOffset * 2)
                    );
                })
                .on('pointerout', () => {
                    // Restaurar estado normal
                    button.clear();
                    button.fillStyle(0xA67C52, 1);
                    button.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
                    button.lineStyle(3, 0x664433, 1);
                    button.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

                    const borderThickness = Math.max(1, Math.floor(2 * this.scaleRatio));
                    const borderOffset = Math.max(2, Math.floor(3 * this.scaleRatio));
                    button.lineStyle(borderThickness, 0xD4A76A, 1);
                    button.strokeRect(
                        buttonX + borderOffset,
                        buttonY + borderOffset,
                        buttonWidth - (borderOffset * 2),
                        buttonHeight - (borderOffset * 2)
                    );
                });
        }
    }

    // Método para mostrar mensaje de desconexión
    showDisconnectionMessage(message) {
        // Verificar que la escena esté activa
        if (!this.scene || !this.scene.isActive('RoomCreationScene')) {
            return;
        }

        // Obtener dimensiones de la pantalla con verificación
        const width = this.cameras?.main?.width || 800;
        const height = this.cameras?.main?.height || 600;

        // Crear contenedor para el mensaje
        const messageBox = this.add.graphics();
        messageBox.fillStyle(0x000000, 0.7);
        messageBox.fillRect(width/2 - 200, height/2 - 50, 400, 100);
        messageBox.lineStyle(3, 0xff0000, 1);
        messageBox.strokeRect(width/2 - 200, height/2 - 50, 400, 100);

        // Añadir texto
        const messageText = this.add.text(width/2, height/2, message, {
            font: '20px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Hacer que el mensaje desaparezca después de 3 segundos
        if (this.time) {
            this.time.delayedCall(3000, () => {
                if (messageBox && messageBox.destroy) messageBox.destroy();
                if (messageText && messageText.destroy) messageText.destroy();
            });
        }
    }

    startGame() {
        if (this.roomCode) {
            startGame(this.roomCode);
            this.scene.start('GameScene', { roomCode: this.roomCode, isHost: !this.isJoining });
        }
    }
}
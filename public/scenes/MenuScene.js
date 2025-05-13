import {authService} from "../services/AuthService";

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.authService = authService; // Importa authService
    }

    preload() {
        // Cargar la imagen de fondo
        this.load.image('background', 'assets/inicio2.jpeg');
    }

    create() {
        if (!this.authService.isAuthenticated()) {
            this.scene.start('LoginScene');
            return;
        }

        // Obtener dimensiones de la pantalla
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Calcular escala proporcional
        this.scaleRatio = Math.min(width / 1280, height / 720);

        // Lanzar la escena de música
        this.scene.launch('MusicScene');

        // Detectar la primera interacción para activar la música
        this.input.once('pointerdown', () => {
            // Verificar si el usuario no ha silenciado intencionalmente la música
            const music = this.registry.get('backgroundMusic');
            const musicMuted = this.registry.get('musicMutedByUser');

            if (music && !musicMuted) {
                this.game.events.emit('global-interaction');
            }
        });

        // Añadir imagen de fondo (escalada para cubrir toda la pantalla)
        const background = this.add.image(width / 2, height / 2, 'background')
            .setDisplaySize(width, height);

        // Configuración de botones - siempre vertical
        const buttonLayout = {
            posX: width * 0.2,                                 // Posición X de los botones (20% desde la izquierda)
            startY: height * 0.65,                             // Posición Y inicial (65% desde arriba)
            spacing: height * 0.075,                           // Espaciado entre botones (7.5% de la altura)
            width: Math.min(width * 0.25, 180),                // Ancho de botón (25% del ancho o máximo 180px)
            height: Math.min(height * 0.07, 50)                // Alto de botón (7% de la altura o máximo 50px)
        };

        // Estilo para el texto de los botones
        const textSize = Math.max(16, Math.floor(24 * this.scaleRatio));
        const buttonTextStyle = {
            font: `bold ${textSize}px Arial`,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: Math.max(2, Math.floor(3 * this.scaleRatio))
        };

        // Definir los botones
        const buttons = [
            { text: 'Jugar', callback: () => this.startGame() },
            { text: 'Créditos', callback: () => this.showCredits() },
            { text: 'Ajustes', callback: () => this.showSettings() }
        ];

        // Crear los botones en disposición vertical
        buttons.forEach((buttonData, index) => {
            // Calcular posición Y basada en el índice
            const buttonY = buttonLayout.startY + (index * buttonLayout.spacing);
            const buttonX = buttonLayout.posX;

            // Crear gráfico para el botón
            const button = this.add.graphics();
            button.fillStyle(0xA67C52, 1);
            button.lineStyle(Math.max(2, Math.floor(3 * this.scaleRatio)), 0x664433, 1);

            // Posicionar el botón
            const buttonWidth = buttonLayout.width;
            const buttonHeight = buttonLayout.height;
            const buttonRectX = buttonX - (buttonWidth / 2);
            const buttonRectY = buttonY - (buttonHeight / 2);

            // Dibujar el botón
            button.fillRect(buttonRectX, buttonRectY, buttonWidth, buttonHeight);
            button.strokeRect(buttonRectX, buttonRectY, buttonWidth, buttonHeight);

            // Borde interior decorativo
            const borderThickness = Math.max(1, Math.floor(2 * this.scaleRatio));
            const borderOffset = Math.max(2, Math.floor(3 * this.scaleRatio));
            button.lineStyle(borderThickness, 0xD4A76A, 1);
            button.strokeRect(
                buttonRectX + borderOffset,
                buttonRectY + borderOffset,
                buttonWidth - (borderOffset * 2),
                buttonHeight - (borderOffset * 2)
            );

            // Hacer el botón interactivo
            const hitArea = new Phaser.Geom.Rectangle(buttonRectX, buttonRectY, buttonWidth, buttonHeight);
            button.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
                .on('pointerdown', () => {
                    // Efecto de botón presionado
                    button.clear();
                    button.fillStyle(0x7A5C32, 1);
                    button.fillRect(buttonRectX, buttonRectY, buttonWidth, buttonHeight);
                    button.lineStyle(Math.max(2, Math.floor(3 * this.scaleRatio)), 0x664433, 1);
                    button.strokeRect(buttonRectX, buttonRectY, buttonWidth, buttonHeight);

                    // Llamar a la función de callback después de un pequeño retraso
                    this.time.delayedCall(150, buttonData.callback);
                })
                .on('pointerover', () => {
                    // Efecto hover
                    button.clear();
                    button.fillStyle(0xBB9062, 1);
                    button.fillRect(buttonRectX, buttonRectY, buttonWidth, buttonHeight);
                    button.lineStyle(Math.max(2, Math.floor(3 * this.scaleRatio)), 0x664433, 1);
                    button.strokeRect(buttonRectX, buttonRectY, buttonWidth, buttonHeight);
                    button.lineStyle(borderThickness, 0xD4A76A, 1);
                    button.strokeRect(
                        buttonRectX + borderOffset,
                        buttonRectY + borderOffset,
                        buttonWidth - (borderOffset * 2),
                        buttonHeight - (borderOffset * 2)
                    );
                })
                .on('pointerout', () => {
                    // Restaurar estado normal
                    button.clear();
                    button.fillStyle(0xA67C52, 1);
                    button.fillRect(buttonRectX, buttonRectY, buttonWidth, buttonHeight);
                    button.lineStyle(Math.max(2, Math.floor(3 * this.scaleRatio)), 0x664433, 1);
                    button.strokeRect(buttonRectX, buttonRectY, buttonWidth, buttonHeight);
                    button.lineStyle(borderThickness, 0xD4A76A, 1);
                    button.strokeRect(
                        buttonRectX + borderOffset,
                        buttonRectY + borderOffset,
                        buttonWidth - (borderOffset * 2),
                        buttonHeight - (borderOffset * 2)
                    );
                });

            // Añadir texto al botón
            this.add.text(buttonX, buttonY, buttonData.text, buttonTextStyle)
                .setOrigin(0.5);
        });

        // Evento de redimensionamiento
        this.scale.on('resize', this.resize, this);
    }

    resize(gameSize) {
        if (this.scene.isActive('MenuScene')) {
            this.scene.restart();
        }
    }

    startGame() {
        console.log("Mostrando salas...");
        this.scene.start('LobbyScene');
    }

    showCredits() {
        console.log('Mostrando créditos');
        this.scene.start('CreditsScene');
    }

    showSettings() {
        console.log('Mostrando ajustes');
        this.scene.start('SettingsScene');
    }
}
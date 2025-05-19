// scenes/CreditsScene.js
export default class CreditsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CreditsScene' });
    }

    preload() {
        // Cargar la imagen para la pantalla de créditos
        this.load.image('credits_background', 'assets/pinky_cerebro.jpeg');
    }

    create() {
        // Obtener dimensiones de la pantalla
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Calcular escala proporcional
        this.scaleRatio = Math.min(width / 1280, height / 720);

        // Añadir imagen de fondo
        const background = this.add.image(width / 2, height / 2, 'credits_background')
            .setDisplaySize(width, height);

        // Añadir título de créditos
        const titleStyle = {
            font: `bold ${Math.max(24, Math.floor(36 * this.scaleRatio))}px Arial`,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: Math.max(3, Math.floor(5 * this.scaleRatio))
        };
        this.add.text(width / 2, height * 0.1, 'CRÉDITOS', titleStyle)
            .setOrigin(0.5);

        // Añadir información de créditos
        const creditStyle = {
            font: `${Math.max(16, Math.floor(24 * this.scaleRatio))}px Arial`,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: Math.max(2, Math.floor(3 * this.scaleRatio))
        };

        // Puedes personalizar esta parte con los créditos que desees mostrar
        const credits = [
            'TOWER DEFENSE GAME',
            '',
            'Desarrollado por: Juan Pablo Daza Pereiray Nicolas Bernal Fuquene',
            '',
            'Programación: Juan Pablo Y Nicolas',
            'Diseño: Juan Pablo y Nicolas',
            'Arte: Recursos de terceros',
            '',
            'Copyright © 2025 - Todos los derechos reservados'
        ];

        // Mostrar los créditos
        credits.forEach((line, index) => {
            this.add.text(width / 2, height * 0.25 + (index * height * 0.06), line, creditStyle)
                .setOrigin(0.5);
        });

        // Crear botón de volver al inicio
        this.createBackButton(width, height);

        // Evento de redimensionamiento
        this.scale.on('resize', this.resize, this);
    }

    createBackButton(width, height) {
        // Configuración del botón
        const buttonX = width / 2;
        const buttonY = height * 0.85;
        const buttonWidth = Math.min(width * 0.25, 180);
        const buttonHeight = Math.min(height * 0.07, 50);

        // Estilo para el texto del botón
        const textSize = Math.max(16, Math.floor(24 * this.scaleRatio));
        const buttonTextStyle = {
            font: `bold ${textSize}px Arial`,
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: Math.max(2, Math.floor(3 * this.scaleRatio))
        };

        // Crear gráfico para el botón
        const button = this.add.graphics();
        button.fillStyle(0xA67C52, 1);
        button.lineStyle(Math.max(2, Math.floor(3 * this.scaleRatio)), 0x664433, 1);

        // Posicionar el botón
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

                // Volver al menú principal después de un pequeño retraso
                this.time.delayedCall(150, () => this.scene.start('MenuScene'));
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
        this.add.text(buttonX, buttonY, 'Volver al Inicio', buttonTextStyle)
            .setOrigin(0.5);
    }

    resize(gameSize) {
        if (this.scene.isActive('CreditsScene')) {
            this.scene.restart();
        }
    }
}
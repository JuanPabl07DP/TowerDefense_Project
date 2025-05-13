export default class ConfirmationScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ConfirmationScene' });
    }

    init(data) {
        this.email = data.email;
    }

    preload() {
        this.load.image('confirm_background', 'assets/fondo.jpeg');
    }

    create() {
        const { width, height } = this.cameras.main;

        // Fondo
        this.add.image(width / 2, height / 2, 'confirm_background')
            .setDisplaySize(width, height);

        // Contenedor principal
        const container = this.add.container(width / 2, height / 2);

        // Panel de confirmación
        const panel = this.add.graphics()
            .fillStyle(0x333333, 0.8)
            .fillRoundedRect(-200, -120, 400, 240, 10);
        container.add(panel);

        // Título
        const title = this.add.text(0, -90, 'Confirmar Código', {
            fontSize: '24px',
            fill: '#ffffff'
        }).setOrigin(0.5);
        container.add(title);

        // Mensaje
        const message = this.add.text(0, -50, `Se envió un código a ${this.email}`, {
            fontSize: '16px',
            fill: '#ffffff',
            wordWrap: { width: 350 }
        }).setOrigin(0.5);
        container.add(message);

        // Campo de código
        this.codeInput = this.createInputField(0, 0, 'Código de confirmación');
        container.add(this.codeInput);

        // Botón de confirmación
        const confirmButton = this.add.graphics()
            .fillStyle(0x4CAF50, 1)
            .fillRoundedRect(-80, 60, 160, 40, 5)
            .setInteractive(new Phaser.Geom.Rectangle(-80, 60, 160, 40), Phaser.Geom.Rectangle.Contains);

        const confirmText = this.add.text(0, 80, 'Confirmar', {
            fontSize: '18px',
            fill: '#ffffff'
        }).setOrigin(0.5);
        container.add(confirmButton);
        container.add(confirmText);

        // Eventos
        confirmButton.on('pointerdown', () => this.handleConfirmation());
    }

    createInputField(x, y, placeholder) {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = placeholder;
        input.style.position = 'absolute';
        input.style.width = '300px';
        input.style.height = '40px';
        input.style.padding = '0 10px';
        input.style.borderRadius = '5px';
        input.style.border = '1px solid #ccc';

        const domElement = this.add.dom(x, y, input);
        return domElement;
    }

    async handleConfirmation() {
        const code = this.codeInput.node.value;

        if (!code) {
            this.showError('Por favor ingresa el código de confirmación');
            return;
        }

        const result = await authService.confirm(this.email, code);

        if (result.success) {
            this.scene.start('LoginScene');
        } else {
            this.showError(result.error || 'Error al confirmar el código');
        }
    }

    showError(message) {
        if (this.errorText) this.errorText.destroy();

        this.errorText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 130,
            message,
            { fontSize: '16px', fill: '#ff0000' }
        ).setOrigin(0.5);
    }
}
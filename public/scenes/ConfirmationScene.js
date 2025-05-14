import { authService } from '../services/authService';

export default class ConfirmationScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ConfirmationScene' });
    }

    preload() {
        this.load.image('confirm_bg', 'assets/fondoLoginRegister.jpg');
    }

    create(data) {
        const { width, height } = this.cameras.main;
        this.email = data.email;

        // Fondo con efecto de desenfoque (simulado)
        this.bg = this.add.tileSprite(0, 0, width, height, 'confirm_bg')
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setAlpha(0.6);

        // Panel central
        const panel = this.add.graphics()
            .fillStyle(0x333333, 0.85)
            .fillRoundedRect(width/2 - 225, height/2 - 200, 450, 400, 20)
            .setDepth(0);

        // Efecto de borde
        this.add.graphics()
            .lineStyle(4, 0x4CAF50, 0.7)
            .strokeRoundedRect(width/2 - 225, height/2 - 200, 450, 400, 20);

        // Icono de verificación
        this.add.text(width/2, height/2 - 100, '✓', {
            fontSize: '72px',
            color: '#4CAF50',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Texto explicativo
        this.add.text(width/2, height/2 - 30, `Se envió un código de verificación a:`, {
            fontSize: '18px',
            color: '#E0E0E0',
            align: 'center',
            wordWrap: { width: 350 }
        }).setOrigin(0.5);

        // Email destacado
        this.add.text(width/2, height/2 + 10, this.email, {
            fontSize: '20px',
            color: '#81C784',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Campo de código
        this.codeInput = this.add.dom(width/2, height/2 + 70).createElement('input', {
            type: 'text',
            placeholder: 'Ingresa el código de 6 dígitos',
            style: `width: 250px; height: 45px; padding: 0 15px;
                    font-size: 18px; text-align: center;
                    border-radius: 8px; border: 2px solid #4CAF50;
                    background: rgba(255,255,255,0.9);`
        });

        // Botón de confirmación
        this.confirmBtn = this.add.graphics()
            .fillStyle(0x4CAF50, 1)
            .fillRoundedRect(width/2 - 100, height/2 + 120, 200, 50, 10)
            .setInteractive(new Phaser.Geom.Rectangle(width/2 - 100, height/2 + 120, 200, 50),
                Phaser.Geom.Rectangle.Contains)
            .on('pointerover', () => {
                this.confirmBtn.clear()
                    .fillStyle(0x81C784, 1)
                    .fillRoundedRect(width/2 - 100, height/2 + 120, 200, 50, 10);
                this.confirmText.setColor('#FFFFFF');
            })
            .on('pointerout', () => {
                this.confirmBtn.clear()
                    .fillStyle(0x4CAF50, 1)
                    .fillRoundedRect(width/2 - 100, height/2 + 120, 200, 50, 10);
                this.confirmText.setColor('#FFFFFF');
            })
            .on('pointerdown', () => this.confirmUser());

        this.confirmText = this.add.text(width/2, height/2 + 145, 'VERIFICAR', {
            fontSize: '20px',
            color: '#FFFFFF',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Opción para reenviar código
        this.resendText = this.add.text(width/2, height/2 + 190, '¿No recibiste el código? Reenviar', {
            fontSize: '16px',
            color: '#4CAF50',
            fontStyle: 'bold'
        })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerover', () => {
                this.resendText.setColor('#81C784');
                this.resendText.setStyle({ fontSize: '17px' });
            })
            .on('pointerout', () => {
                this.resendText.setColor('#4CAF50');
                this.resendText.setStyle({ fontSize: '16px' });
            })
            .on('pointerdown', () => this.resendCode());

        // Animación de entrada
        // this.tweens.add({
        //     targets: panel,
        //     y: { from: height + 100, to: height/2 - 200 },
        //     duration: 800,
        //     ease: 'Back.easeOut'
        // });
    }

    async confirmUser() {
        const code = this.codeInput.node.value;

        if (!code || code.length !== 6) {
            this.showError('Ingresa un código válido de 6 dígitos');
            return;
        }

        try {
            const result = await authService.confirm(this.email, code);

            if (result.success) {
                this.scene.start('LoginScene', {
                    message: '¡Cuenta confirmada! Ya puedes iniciar sesión.'
                });
            } else {
                this.showError(result.error || 'Error al confirmar el código');
            }
        } catch (error) {
            this.showError('Error de conexión. Intenta nuevamente.');
        }
    }

    async resendCode() {
        try {
            await authService.resendConfirmationCode(this.email);
            this.showError('¡Código reenviado! Revisa tu correo.');
        } catch (error) {
            this.showError('Error al reenviar el código');
        }
    }

    showError(message) {
        if (this.errorText) this.errorText.destroy();
        this.errorText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 220,
            message,
            {
                fontSize: '16px',
                fill: message.includes('¡') ? '#4CAF50' : '#ff0000',
                backgroundColor: '#ffffff',
                padding: { x: 10, y: 5 }
            }
        ).setOrigin(0.5);
    }
}
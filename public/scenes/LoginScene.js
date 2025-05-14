import { authService } from '../services/authService';

export default class LoginScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LoginScene' });
    }

    preload() {
        this.load.image('login_bg', 'assets/fondoLoginRegister.jpg');
    }

    create() {
        const { width, height } = this.cameras.main;

        // Fondo con efecto de paralaje
        this.bg = this.add.tileSprite(0, 0, width, height, 'login_bg')
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setAlpha(0.8);

        // Panel de login con sombra
        const panel = this.add.graphics()
            .fillStyle(0x333333, 0.85)
            .fillRoundedRect(width/2 - 225, height/2 - 250, 450, 500, 20)
            .setDepth(0);

        // Efecto de borde
        this.add.graphics()
            .lineStyle(4, 0x4CAF50, 0.7)
            .strokeRoundedRect(width/2 - 225, height/2 - 250, 450, 500, 20);

        // Título con efecto
        const title = this.add.text(width/2, height/2 - 180, 'INICIAR SESIÓN', {
            fontFamily: 'Arial',
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#4CAF50',
            stroke: '#FFFFFF',
            strokeThickness: 2,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 3,
                stroke: true
            }
        }).setOrigin(0.5);

        // Campos de entrada (asignados directamente a propiedades)
        this.emailInput = this.createInputField(width/2, height/2 - 120, '✉️ Email:', 'email', 'tucorreo@ejemplo.com');
        this.passwordInput = this.createInputField(width/2, height/2 - 30, '🔒 Contraseña:', 'password', '••••••••');

        // Botón de login con efectos
        this.loginBtn = this.add.graphics()
            .fillStyle(0x4CAF50, 1)
            .fillRoundedRect(width/2 - 100, height/2 + 60, 200, 50, 10)
            .setInteractive(new Phaser.Geom.Rectangle(width/2 - 100, height/2 + 60, 200, 50),
                Phaser.Geom.Rectangle.Contains)
            .on('pointerover', () => {
                this.loginBtn.clear()
                    .fillStyle(0x81C784, 1)
                    .fillRoundedRect(width/2 - 100, height/2 + 60, 200, 50, 10);
                this.loginText.setColor('#FFFFFF');
            })
            .on('pointerout', () => {
                this.loginBtn.clear()
                    .fillStyle(0x4CAF50, 1)
                    .fillRoundedRect(width/2 - 100, height/2 + 60, 200, 50, 10);
                this.loginText.setColor('#FFFFFF');
            })
            .on('pointerdown', () => this.handleLogin());

        this.loginText = this.add.text(width/2, height/2 + 85, 'INGRESAR', {
            fontSize: '20px',
            color: '#FFFFFF',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Enlace de registro
        this.registerLink = this.add.text(width/2, height/2 + 140, '¿No tienes cuenta? Regístrate aquí', {
            fontSize: '16px',
            color: '#4CAF50',
            fontStyle: 'bold'
        })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerover', () => {
                this.registerLink.setColor('#81C784');
                this.registerLink.setStyle({ fontSize: '17px' });
            })
            .on('pointerout', () => {
                this.registerLink.setColor('#4CAF50');
                this.registerLink.setStyle({ fontSize: '16px' });
            })
            .on('pointerdown', () => this.scene.start('RegisterScene'));

        // Animación de entrada
        // this.tweens.add({
        //     targets: panel,
        //     y: '-=20',
        //     alpha: { from: 0, to: 1 },
        //     duration: 600,
        //     ease: 'Cubic.easeOut'
        // });
    }

    createInputField(x, y, labelText, type, placeholder) {
        // Label
        this.add.text(x - 180, y - 25, labelText, {
            fontSize: '18px',
            fill: '#E0E0E0'
        });

        // Campo de entrada
        const input = this.add.dom(x, y).createElement('input', {
            type: type,
            placeholder: placeholder,
            style: `width: 300px; height: 45px; padding: 0 15px;
                    font-size: 16px; border-radius: 8px;
                    border: 2px solid #4CAF50; background: rgba(255,255,255,0.9);
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                    transition: all 0.3s ease;`
        });

        return input;
    }

    async handleLogin() {
        // Verificación de seguridad
        if (!this.emailInput || !this.passwordInput) {
            console.error('Error: Campos de entrada no inicializados');
            this.showError('Error interno. Por favor recarga la página.');
            return;
        }

        const email = this.emailInput.node.value;
        const password = this.passwordInput.node.value;

        if (!email || !password) {
            this.showError('Por favor completa todos los campos');
            return;
        }

        try {
            const result = await authService.login(email, password);

            if (result.success) {
                this.scene.start('MenuScene');
            } else if (result.needsConfirmation) {
                this.scene.start('ConfirmationScene', {
                    email: email,
                    message: 'Confirma tu cuenta con el código enviado por email'
                });
            } else {
                this.showError(result.error || 'Error al iniciar sesión');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Error de conexión. Intenta nuevamente.');
        }
    }

    showError(message) {
        if (this.errorText) this.errorText.destroy();

        this.errorText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 180,
            message,
            {
                fontSize: '16px',
                fill: '#ff0000',
                backgroundColor: '#ffffff',
                padding: { x: 10, y: 5 }
            }
        ).setOrigin(0.5);
    }
}
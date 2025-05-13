import { authService } from '../services/authService';

export default class LoginScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LoginScene' });
    }

    preload() {
        this.load.image('login_background', 'assets/fondo.jpeg');
    }

    create() {
        const { width, height } = this.cameras.main;

        // Fondo
        this.add.image(width / 2, height / 2, 'login_background')
            .setDisplaySize(width, height);

        // Panel de login
        this.add.graphics()
            .fillStyle(0x333333, 0.8)
            .fillRoundedRect(width / 2 - 200, height / 2 - 150, 400, 300, 10);

        // Título
        this.add.text(width / 2, height / 2 - 120, 'Iniciar Sesión', {
            fontSize: '24px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Label Email
        this.add.text(width / 2 - 150, height / 2 - 85, 'Email:', {
            fontSize: '16px',
            fill: '#ffffff'
        });

        // Campo Email
        this.emailInput = this.add.dom(width / 2, height / 2 - 60).createElement('input', {
            type: 'email',
            placeholder: 'ejemplo@email.com',
            style: 'width: 300px; height: 40px; padding: 0 10px; font-size: 16px; border-radius: 5px; border: 1px solid #ccc;'
        });

        // Label Contraseña
        this.add.text(width / 2 - 150, height / 2 - 25, 'Contraseña:', {
            fontSize: '16px',
            fill: '#ffffff'
        });

        // Campo Contraseña
        this.passwordInput = this.add.dom(width / 2, height / 2).createElement('input', {
            type: 'password',
            placeholder: '••••••••',
            style: 'width: 300px; height: 40px; padding: 0 10px; font-size: 16px; border-radius: 5px; border: 1px solid #ccc;'
        });

        // Botón de login
        this.loginButton = this.add.rectangle(width / 2, height / 2 + 80, 160, 40, 0x4CAF50)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.handleLogin())
            .on('pointerover', () => this.loginButton.setFillStyle(0x3e8e41))
            .on('pointerout', () => this.loginButton.setFillStyle(0x4CAF50));

        this.add.text(width / 2, height / 2 + 80, 'Iniciar Sesión', {
            fontSize: '18px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Botón de registro
        this.registerText = this.add.text(width / 2, height / 2 + 130, '¿No tienes cuenta? Regístrate', {
            fontSize: '16px',
            fill: '#4CAF50',
            fontStyle: 'bold'
        })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.scene.start('RegisterScene'))
            .on('pointerover', () => this.registerText.setColor('#3e8e41'))
            .on('pointerout', () => this.registerText.setColor('#4CAF50'));

        // Habilitar tecla Enter
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.enterKey.on('down', () => this.handleLogin());

        // Mostrar mensaje si viene de otra escena
        if (this.data?.message) {
            this.showMessage(this.data.message, 0x4CAF50);
        }
    }

    async handleLogin() {
        const email = this.emailInput.node.value.trim();
        const password = this.passwordInput.node.value;

        if (!email || !password) {
            this.showError('Por favor completa todos los campos');
            return;
        }

        this.showLoading(true);

        try {
            const result = await authService.login(email, password);

            if (result.success) {
                this.scene.start('MenuScene');
            } else if (result.needsConfirmation) {
                this.scene.start('ConfirmationScene', {
                    email: result.email,
                    message: 'Confirma tu cuenta con el código enviado por email'
                });
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Error inesperado. Intenta nuevamente.');
        } finally {
            this.showLoading(false);
        }
    }

    showLoading(show) {
        const { width, height } = this.cameras.main;

        if (!this.loadingIndicator) {
            this.loadingIndicator = this.add.rectangle(
                width / 2, height / 2 + 180,
                200, 40, 0x333333
            ).setDepth(10);

            this.loadingText = this.add.text(
                width / 2, height / 2 + 180,
                'Verificando...',
                { fontSize: '16px', fill: '#ffffff' }
            ).setOrigin(0.5).setDepth(10);
        }

        this.loadingIndicator.setVisible(show);
        this.loadingText.setVisible(show);
    }

    showError(message) {
        if (this.errorText) this.errorText.destroy();
        this.errorText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 160,
            message,
            {
                fontSize: '16px',
                fill: '#ff0000',
                backgroundColor: '#ffffff',
                padding: { x: 10, y: 5 }
            }
        ).setOrigin(0.5);
    }

    showMessage(message, color = 0x4CAF50) {
        this.add.text(
            this.cameras.main.width / 2,
            100,
            message,
            {
                fontSize: '18px',
                fill: Phaser.Display.Color.IntegerToColor(color).rgba,
                backgroundColor: '#333333',
                padding: { x: 10, y: 5 }
            }
        ).setOrigin(0.5);
    }
}
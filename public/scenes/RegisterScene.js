import { authService } from '../services/authService';

export default class RegisterScene extends Phaser.Scene {
    constructor() {
        super({ key: 'RegisterScene' });
    }

    preload() {
        this.load.image('register_background', 'assets/fondo.jpeg');
    }

    create() {
        const { width, height } = this.cameras.main;

        // Fondo
        this.add.image(width / 2, height / 2, 'register_background')
            .setDisplaySize(width, height);

        // Panel de registro
        this.add.graphics()
            .fillStyle(0x333333, 0.8)
            .fillRoundedRect(width / 2 - 200, height / 2 - 180, 400, 400, 10);

        // Título
        this.add.text(width / 2, height / 2 - 150, 'Registro', {
            fontSize: '24px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Label Email
        this.add.text(width / 2 - 150, height / 2 - 115, 'Email:', {
            fontSize: '16px',
            fill: '#ffffff'
        });

        // Campo Email
        this.emailInput = this.add.dom(width / 2, height / 2 - 90).createElement('input', {
            type: 'email',
            placeholder: 'ejemplo@email.com',
            style: 'width: 300px; height: 40px; padding: 0 10px; font-size: 16px; border-radius: 5px; border: 1px solid #ccc;'
        });

        // Label Nombre de Usuario
        this.add.text(width / 2 - 150, height / 2 - 55, 'Nombre:', {
            fontSize: '16px',
            fill: '#ffffff'
        });

        // Campo Nombre de Usuario
        this.usernameInput = this.add.dom(width / 2, height / 2 - 30).createElement('input', {
            type: 'text',
            placeholder: 'Tu nombre de usuario',
            style: 'width: 300px; height: 40px; padding: 0 10px; font-size: 16px; border-radius: 5px; border: 1px solid #ccc;'
        });

        // Label Contraseña
        this.add.text(width / 2 - 150, height / 2 + 5, 'Contraseña:', {
            fontSize: '16px',
            fill: '#ffffff'
        });

        // Campo Contraseña
        this.passwordInput = this.add.dom(width / 2, height / 2 + 30).createElement('input', {
            type: 'password',
            placeholder: 'Mínimo 8 caracteres',
            style: 'width: 300px; height: 40px; padding: 0 10px; font-size: 16px; border-radius: 5px; border: 1px solid #ccc;'
        });

        // Label Confirmar Contraseña
        this.add.text(width / 2 - 150, height / 2 + 65, 'Confirmar:', {
            fontSize: '16px',
            fill: '#ffffff'
        });

        // Campo Confirmar Contraseña
        this.confirmPasswordInput = this.add.dom(width / 2, height / 2 + 90).createElement('input', {
            type: 'password',
            placeholder: 'Repite tu contraseña',
            style: 'width: 300px; height: 40px; padding: 0 10px; font-size: 16px; border-radius: 5px; border: 1px solid #ccc;'
        });

        // Botón de registro
        this.registerButton = this.add.rectangle(width / 2, height / 2 + 140, 160, 40, 0x2196F3)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.handleRegister())
            .on('pointerover', () => this.registerButton.setFillStyle(0x1976D2))
            .on('pointerout', () => this.registerButton.setFillStyle(0x2196F3));

        this.add.text(width / 2, height / 2 + 140, 'Registrarse', {
            fontSize: '18px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Botón de volver
        this.backText = this.add.text(width / 2, height / 2 + 190, 'Volver a inicio de sesión', {
            fontSize: '16px',
            fill: '#2196F3',
            fontStyle: 'bold'
        })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.scene.start('LoginScene'))
            .on('pointerover', () => this.backText.setColor('#1976D2'))
            .on('pointerout', () => this.backText.setColor('#2196F3'));

        // Habilitar tecla Enter
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.enterKey.on('down', () => this.handleRegister());
    }

    async handleRegister() {
        const email = this.emailInput.node.value.trim();
        const username = this.usernameInput.node.value.trim();
        const password = this.passwordInput.node.value;
        const confirmPassword = this.confirmPasswordInput.node.value;

        // Validaciones
        if (!email || !username || !password || !confirmPassword) {
            this.showError('Por favor completa todos los campos');
            return;
        }

        if (!this.validateEmail(email)) {
            this.showError('Ingresa un email válido');
            return;
        }

        if (password.length < 8) {
            this.showError('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            this.showError('Las contraseñas no coinciden');
            return;
        }

        this.showLoading(true);

        try {
            const result = await authService.register(email, password, username);

            if (result.success) {
                this.scene.start('ConfirmationScene', {
                    email,
                    message: 'Se envió un código de confirmación a tu email'
                });
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showError('Error de conexión. Intenta nuevamente.');
        } finally {
            this.showLoading(false);
        }
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    showLoading(show) {
        const { width, height } = this.cameras.main; // Obtener dimensiones aquí

        if (!this.loadingIndicator) {
            this.loadingIndicator = this.add.rectangle(
                width / 2, height / 2 + 220,
                200, 40, 0x333333
            ).setDepth(10);

            this.loadingText = this.add.text(
                width / 2, height / 2 + 220,
                'Procesando...',
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
            this.cameras.main.height / 2 + 220,
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
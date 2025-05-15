import { authService } from '../services/authService';

export default class RegisterScene extends Phaser.Scene {
    constructor() {
        super({ key: 'RegisterScene' });
    }

    preload() {
        this.load.image('register_bg', 'assets/fondoLoginRegister.jpg');
    }

    create() {
        const { width, height } = this.cameras.main;

        // Fondo animado
        this.bg = this.add.tileSprite(0, 0, width, height, 'register_bg')
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setAlpha(0.8);

        // Panel de formulario con sombra
        const panel = this.add.graphics()
            .fillStyle(0x333333, 0.85)
            .fillRoundedRect(width/2 - 250, height/2 - 300, 500, 600, 20)
            .setDepth(0);

        // Efecto de borde
        this.add.graphics()
            .lineStyle(4, 0x4CAF50, 0.7)
            .strokeRoundedRect(width/2 - 250, height/2 - 300, 500, 600, 20);

        // Título con gradiente (simulado)
        const title = this.add.text(width/2, height/2 - 220, 'CREAR CUENTA', {
            fontFamily: 'Arial',
            fontSize: '36px',
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

        // Campos del formulario (asignados directamente a propiedades)
        this.nameInput = this.createInputField(width/2, height/2 - 140, '👤 Nombre Completo:', 'text', 'Ej: Juan Pérez');
        this.emailInput = this.createInputField(width/2, height/2 - 80, '✉️ Correo Electrónico:', 'email', 'tucorreo@ejemplo.com');
        this.passwordInput = this.createInputField(width/2, height/2 - 20, '🔒 Contraseña:', 'password', 'Mínimo 8 caracteres');
        this.confirmPasswordInput = this.createInputField(width/2, height/2 + 40, '🔁 Confirmar Contraseña:', 'password', 'Repite tu contraseña');

        // Botón de registro
        this.registerBtn = this.add.graphics()
            .fillStyle(0x4CAF50, 1)
            .fillRoundedRect(width/2 - 110, height/2 + 100, 220, 55, 10)
            .setInteractive(new Phaser.Geom.Rectangle(width/2 - 110, height/2 + 100, 220, 55),
                Phaser.Geom.Rectangle.Contains)
            .on('pointerover', () => {
                this.registerBtn.clear()
                    .fillStyle(0x81C784, 1)
                    .fillRoundedRect(width/2 - 110, height/2 + 100, 220, 55, 10);
                this.registerText.setColor('#FFFFFF');
            })
            .on('pointerout', () => {
                this.registerBtn.clear()
                    .fillStyle(0x4CAF50, 1)
                    .fillRoundedRect(width/2 - 110, height/2 + 100, 220, 55, 10);
                this.registerText.setColor('#FFFFFF');
            })
            .on('pointerdown', () => this.handleRegister());

        this.registerText = this.add.text(width/2, height/2 + 128, 'REGISTRARSE', {
            fontSize: '20px',
            color: '#FFFFFF',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Botón de volver
        this.backBtn = this.add.graphics()
            .fillStyle(0x333333, 1)
            .fillRoundedRect(width/2 - 90, height/2 + 170, 180, 45, 10)
            .setInteractive(new Phaser.Geom.Rectangle(width/2 - 90, height/2 + 170, 180, 45),
                Phaser.Geom.Rectangle.Contains)
            .on('pointerover', () => {
                this.backBtn.clear()
                    .fillStyle(0x454545, 1)
                    .fillRoundedRect(width/2 - 90, height/2 + 170, 180, 45, 10);
                this.backText.setColor('#81C784');
            })
            .on('pointerout', () => {
                this.backBtn.clear()
                    .fillStyle(0x333333, 1)
                    .fillRoundedRect(width/2 - 90, height/2 + 170, 180, 45, 10);
                this.backText.setColor('#4CAF50');
            })
            .on('pointerdown', () => this.scene.start('LoginScene'));

        this.backText = this.add.text(width/2, height/2 + 193, 'VOLVER', {
            fontSize: '18px',
            color: '#4CAF50',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Efecto de entrada
        // this.tweens.add({
        //     targets: panel,
        //     scale: { from: 0.9, to: 1 },
        //     alpha: { from: 0, to: 1 },
        //     duration: 800,
        //     ease: 'Elastic.easeOut'
        // });
    }

    createInputField(x, y, labelText, type, placeholder) {
        // Label
        this.add.text(x - 190, y - 25, labelText, {
            fontSize: '16px',
            fill: '#E0E0E0'
        });

        // Campo de entrada
        const input = this.add.dom(x, y).createElement('input', {
            type: type,
            placeholder: placeholder,
            style: `width: 350px; height: 45px; padding: 0 15px;
                font-size: 16px; border-radius: 8px;
                border: 2px solid #4CAF50; background: rgba(255,255,255,0.95);
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                transition: all 0.3s ease;
                -webkit-text-security: disc;
                text-security: disc;`
        });

        // Forzar el tipo después de la creación
        if (type === 'password') {
            input.node.type = 'password';
            input.node.setAttribute('type', 'password');
        }

        return input;
    }

    async handleRegister() {
        // Verificación de seguridad
        if (!this.nameInput || !this.emailInput || !this.passwordInput || !this.confirmPasswordInput) {
            console.error('Error: Campos de entrada no inicializados');
            this.showError('Error interno. Por favor recarga la página.');
            return;
        }

        const name = this.nameInput.node.value;
        const email = this.emailInput.node.value;
        const password = this.passwordInput.node.value;
        const confirmPassword = this.confirmPasswordInput.node.value;

        if (!name || !email || !password || !confirmPassword) {
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

        try {
            const result = await authService.register(email, password, name);

            if (result.success) {
                this.scene.start('ConfirmationScene', {
                    email: email,
                    message: 'Se envió un código de verificación a tu email'
                });
            } else {
                this.showError(result.error || 'Error al registrarse');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showError('Error de conexión. Intenta nuevamente.');
        }
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
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
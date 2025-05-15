export default class MusicScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MusicScene' });
    }

    preload() {
        this.load.audio('background_music', 'assets/musicaDeFondo.m4a');
    }

    create() {
        // Verificar si ya existe una instancia de música
        let music = this.registry.get('backgroundMusic');

        // Si no existe, crearla
        if (!music) {
            // Crear la música con volumen inicial (cambio principal aquí)
            music = this.sound.add('background_music', {
                volume: 0.4,  // Cambio de 0 a 0.4 para que suene desde el inicio
                loop: true
            });

            // Guardar referencia en el registro global
            this.registry.set('backgroundMusic', music);
            this.registry.set('musicMutedByUser', false);

            // Intentar reproducir inmediatamente
            try {
                music.play();
            } catch (error) {
                // Si no se puede reproducir (por políticas del navegador)
                // Esperar a la primera interacción del usuario
                console.log('La música necesita interacción del usuario para reproducirse');

                // Crear un evento global para la primera interacción
                this.game.events.once('global-interaction', () => {
                    if (!this.registry.get('musicMutedByUser')) {
                        music.play();
                    }
                });
            }
        }

        // Asegurarse de que la música siga reproduciéndose si la escena se reinicia
        if (music.isPaused && !this.registry.get('musicMutedByUser')) {
            music.resume();
        }

        // Escuchar si el contexto de audio se suspende (común en navegadores móviles)
        if (this.sound.context) {
            // Función para reanudar el contexto de audio cuando sea necesario
            const resumeAudio = () => {
                if (this.sound.context.state === 'suspended') {
                    this.sound.context.resume();
                }
            };

            // Intentar reanudar el contexto en varias interacciones
            this.input.on('pointerdown', resumeAudio);
            this.input.on('pointerup', resumeAudio);
        }

        // Debug: Mostrar estado de la música (opcional, puedes comentar esto)
        if (music) {
            console.log('Estado de la música:', {
                isPlaying: music.isPlaying,
                volume: music.volume,
                contextState: this.sound.context ? this.sound.context.state : 'no disponible'
            });
        }
    }

    // Método para activar la música cuando reciba el evento global
    enableMusic() {
        const music = this.registry.get('backgroundMusic');
        const musicMuted = this.registry.get('musicMutedByUser');

        if (music && !musicMuted && !music.isPlaying) {
            music.play();
        }
    }
}
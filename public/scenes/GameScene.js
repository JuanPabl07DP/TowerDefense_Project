import {colocarTorre, onTorreColocada, onTorresActualizadas, onNuevoEnemigo, onEnemigoEliminado, onNuevaOleada, onEnemigosRestantes, onTemporizadorOleada, gastarMonedas, agregarMonedas, onActualizarMonedas } from '../services/socketService.js';
import Map from '../classes/Map.js';
import Tower from '../classes/Tower.js';
import Enemy from '../classes/Enemy.js';
import EnemyManager from '../classes/EnemyManager.js';
import Decorations from '../classes/Decorations.js';
import CurrencyManager from "../classes/CurrencyManager";

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Cargar recursos
        this.load.image('grass', 'assets/grass.jpg');
        this.load.image('path', 'assets/camino.png');
        this.load.image('base', 'assets/puerta.jpeg');
        this.load.image('tower', 'assets/tower.png');
        this.load.image('enemy', 'assets/miniogro.gif');
        this.load.image('water', 'assets/agua.jpg');
        this.load.image('tree', 'assets/arbol.png');
        this.load.image('rock', 'assets/roca.png');
        this.load.image('bush', 'assets/casa.png');
        this.load.image('projectile', 'assets/projectile.png');
        this.load.image('coin', 'assets/coin.png')
        this.load.image('guardia', 'assets/guardia.png');
        this.load.image('guardia2', 'assets/guardia2.png');
        this.load.image('fondoguerra', 'assets/fondoguerra.jpg');
    }

    create() {
        // Hacer que las funciones de socket sean accesibles desde otras clases
        this.colocarTorre = colocarTorre;
        this.gastarMonedas = gastarMonedas;
        this.agregarMonedas = agregarMonedas;

        // Hacer accesible la función para eliminar enemigos
        this.eliminarEnemigo = (enemigoId) => {
            // Notificar al servidor cuando un enemigo es eliminado
            onEnemigoEliminado(enemigoId);
        };

        // Añadir imagen de fondo
        const background = this.add.image(0, 0, 'fondoguerra')
            .setOrigin(0, 0)
            .setDisplaySize(this.cameras.main.width, this.cameras.main.height);

        // Ajustar el fondo para que se mantenga en la capa inferior
        background.setDepth(-10);

        // Crear el gestor de monedas
        this.currencyManager = new CurrencyManager(this, 100); // 100 monedas iniciales

        // Crear el mapa
        this.map = new Map(this);
        this.map.create();

        // Añadir sistema de vida para el castillo
        this.castleHealth = 100; // Vida inicial
        this.castleMaxHealth = 100;

        // Crear contenedor para la barra de vida del castillo
        this.castleHealthContainer = this.add.container(this.cameras.main.width - 200, 110).setScrollFactor(0);

        // Fondo de la barra de vida
        this.castleHealthBackground = this.add.rectangle(0, 0, 150, 20, 0x000000, 0.7);
        this.castleHealthBar = this.add.rectangle(0, 0, 150, 20, 0x00FF00, 1);
        this.castleHealthBar.setOrigin(0, 0.5);
        this.castleHealthBar.x = -75; // Centrar la barra

        // Texto de la vida del castillo
        this.castleHealthText = this.add.text(0, 0, `${this.castleHealth}/${this.castleMaxHealth}`, {
            fontSize: '16px',
            fill: '#FFFFFF'
        }).setOrigin(0.5);

        // Añadir elementos al contenedor
        this.castleHealthContainer.add([
            this.castleHealthBackground,
            this.castleHealthBar,
            this.castleHealthText
        ]);

        // Etiqueta para la barra de vida
        this.castleHealthLabel = this.add.text(this.cameras.main.width - 200, 85, 'Vida del Castillo:', {
            fontSize: '18px',
            fill: '#FFFFFF',
            backgroundColor: '#000000',
            padding: { x: 5, y: 3 }
        }).setOrigin(0.5, 0.5).setScrollFactor(0);

        // Crear el sistema de torres
        this.tower = new Tower(this, this.map);

        // Crear el sistema de enemigos
        this.enemyManager = new EnemyManager(this, this.map);

        // Crear el sistema de decoraciones
        this.decorations = new Decorations(this, this.map);

        // Añadir bosque en la esquina superior izquierda
        this.decorations.addTree(0, 0);
        this.decorations.addTree(0, 1);
        this.decorations.addTree(0, 2);
        this.decorations.addTree(0, 3);
        this.decorations.addTree(1, 0);
        this.decorations.addTree(1, 1);
        this.decorations.addTree(1, 2);
        this.decorations.addTree(2, 0);
        this.decorations.addTree(2, 1);
        this.decorations.addTree(2, 2);
        this.decorations.addTree(3, 1);
        this.decorations.addTree(3, 2);

        // Añadir bosque en la parte inferior derecha
        this.decorations.addTree(9, 26);
        this.decorations.addTree(9, 27);
        this.decorations.addTree(9, 28);
        this.decorations.addTree(10, 25);
        this.decorations.addTree(10, 26);
        this.decorations.addTree(10, 27);
        this.decorations.addTree(10, 28);
        this.decorations.addTree(10, 29);
        this.decorations.addTree(11, 24);
        this.decorations.addTree(11, 25);
        this.decorations.addTree(11, 26);
        this.decorations.addTree(11, 27);
        this.decorations.addTree(11, 28);
        this.decorations.addTree(11, 29);
        this.decorations.addTree(11, 30);
        this.decorations.addTree(12, 23);
        this.decorations.addTree(12, 24);
        this.decorations.addTree(12, 25);
        this.decorations.addTree(12, 26);
        this.decorations.addTree(12, 27);
        this.decorations.addTree(12, 28);
        this.decorations.addTree(12, 29);
        this.decorations.addTree(13, 25);
        this.decorations.addTree(13, 26);
        this.decorations.addTree(13, 27);
        this.decorations.addTree(13, 28);

        this.decorations.addTree(9, 13);
        this.decorations.addTree(9, 14);
        this.decorations.addTree(7, 15);

        // Añadir grupos de casas
        // Grupo 1 - cerca del centro
        this.decorations.addBush(4, 16);
        this.decorations.addBush(4, 17);
        this.decorations.addBush(5, 15);
        this.decorations.addBush(5, 16);
        this.decorations.addBush(5, 17);
        this.decorations.addBush(5, 18);
        this.decorations.addBush(6, 15);
        this.decorations.addBush(6, 16);
        this.decorations.addBush(6, 17);
        this.decorations.addBush(6, 18);
        this.decorations.addBush(7, 16);
        this.decorations.addBush(7, 17);

        // Grupo 2 - lado izquierdo
        this.decorations.addBush(10, 2);
        this.decorations.addBush(10, 3);
        this.decorations.addBush(11, 1);
        this.decorations.addBush(11, 2);
        this.decorations.addBush(11, 3);
        this.decorations.addBush(11, 4);
        this.decorations.addBush(12, 1);
        this.decorations.addBush(12, 2);
        this.decorations.addBush(12, 3);
        this.decorations.addBush(12, 4);
        this.decorations.addBush(13, 2);
        this.decorations.addBush(13, 3);

        // Añadir guardias
        this.decorations.addGuard(15, 22);
        this.decorations.addGuard2(15, 24);

        //Añadir rocas
        this.decorations.addRock(0,11)
        this.decorations.addRock(0,13)
        this.decorations.addRock(3,12)
        this.decorations.addRock(3,11)
        this.decorations.addRock(4,11)
        this.decorations.addRock(4,10)
        this.decorations.addRock(2,8)
        this.decorations.addRock(1,8)
        this.decorations.addRock(1,9)
        this.decorations.addRock(2,7)
        this.decorations.addRock(3,7)

        this.decorations.addRock(14,22)
        this.decorations.addRock(14,24)
        this.decorations.addRock(11,23)
        this.decorations.addRock(11,22)
        this.decorations.addRock(10,22)
        this.decorations.addRock(10,21)
        this.decorations.addRock(10,20)

        this.decorations.addRock(13,20)
        this.decorations.addRock(13,19)
        this.decorations.addRock(12,19)

        this.decorations.addRock(10,17)
        this.decorations.addRock(12,15)
        this.decorations.addRock(11,15)
        this.decorations.addRock(10,15)

        // Escuchar actualizaciones de monedas desde el servidor
        onActualizarMonedas((amount) => {
            this.currencyManager.amount = amount;
            this.currencyManager.updateUI();
        });

        // Escuchar el evento para actualizar torres
        onTorreColocada((data) => {
            const { x, y, tipo } = data;
            this.tower.placeTower(x, y); // Colocar la torre en la vista
        });

        // Escuchar el evento para recibir el estado inicial de las torres
        onTorresActualizadas((torres) => {
            torres.forEach(torre => {
                this.tower.placeTower(torre.x, torre.y); // Colocar las torres existentes
            });
        });

        // Escuchar el evento para nuevos enemigos
        onNuevoEnemigo((enemigo) => {
            this.enemyManager.addEnemy(enemigo);
        });

        // Escuchar el evento para enemigos eliminados
        onEnemigoEliminado((enemigoId) => {
            this.enemyManager.removeEnemy(enemigoId);
        });

        // Texto para mostrar la oleada actual (fijar a la cámara con setScrollFactor)
        this.oleadaText = this.add.text(20, 20, 'Oleada: 1', {
            fontSize: '24px',
            fill: '#ffffff',
            backgroundColor: '#000000'
        }).setScrollFactor(0);

        // Escuchar actualizaciones de oleada
        onNuevaOleada((oleada) => {
            console.log("Nueva oleada recibida:", oleada);
            this.enemyManager.oleadaActual = oleada;
            this.enemyManager.oleadaEnCurso = true;

            // Actualizar UI si es necesario
            if (this.oleadaText) {
                this.oleadaText.setText(`Oleada: ${oleada}`);
            }

            // Contador de enemigos restantes (fijar a la cámara)
            if (!this.enemigosText) {
                this.enemigosText = this.add.text(20, 50, 'Enemigos: 0', {
                    fontSize: '24px',
                    fill: '#ffffff',
                    backgroundColor: '#000000'
                }).setScrollFactor(0);
            }

            // Temporizador entre oleadas (fijar a la cámara)
            if (!this.temporizadorText) {
                this.temporizadorText = this.add.text(20, 80, 'Siguiente oleada: -', {
                    fontSize: '24px',
                    fill: '#ffff00',
                    backgroundColor: '#000000'
                }).setScrollFactor(0);
            }

            // Mostrar anuncio de oleada (en el centro de la pantalla)
            const anuncio = this.add.text(
                this.cameras.main.width / 2,
                this.cameras.main.height / 2,
                `¡Oleada ${oleada}!`,
                { fontSize: '48px', fill: '#ff0000' }
            ).setOrigin(0.5).setScrollFactor(0);

            this.tweens.add({
                targets: anuncio,
                alpha: 0,
                duration: 3000,
                onComplete: () => anuncio.destroy()
            });

            // Actualizar texto de oleada
            this.oleadaText.setText(`Oleada: ${oleada}`);
        });

        // Escuchar eventos de enemigos restantes
        onEnemigosRestantes((cantidad) => {
            if (this.enemigosText) {
                this.enemigosText.setText(`Enemigos: ${cantidad}`);
            }
        });

        // Escuchar eventos de temporizador
        onTemporizadorOleada((segundos) => {
            if (this.temporizadorText) {
                if (segundos > 0) {
                    this.temporizadorText.setText(`Siguiente oleada: ${segundos}s`);
                    this.temporizadorText.setVisible(true);
                } else {
                    this.temporizadorText.setVisible(false);
                }
            }
        });

        // Escuchar cuando se completa una oleada
        this.events.on('oleada-completada', (oleada) => {
            console.log(`Oleada ${oleada} completada`);

            // Verificar si era la última oleada
            if (oleada >= 3) {
                // Esperar un momento antes de mostrar la victoria
                this.time.delayedCall(1500, () => {
                    this.gameOver(true); // true para victoria
                });
            }
        });
    }

    // Método para dañar el castillo
    damageCastle(amount) {
        this.castleHealth = Math.max(0, this.castleHealth - amount);

        // Actualizar barra de vida
        const healthPercent = this.castleHealth / this.castleMaxHealth;
        this.castleHealthBar.width = 150 * healthPercent;
        this.castleHealthText.setText(`${this.castleHealth}/${this.castleMaxHealth}`);

        // Cambiar color según vida restante
        if (healthPercent <= 0.25) {
            this.castleHealthBar.fillColor = 0xFF0000; // Rojo para poca vida
        } else if (healthPercent <= 0.5) {
            this.castleHealthBar.fillColor = 0xFFFF00; // Amarillo para vida media
        }

        // Efecto visual cuando recibe daño
        this.cameras.main.shake(250, 0.005);

        // Verificar si el castillo ha sido destruido
        if (this.castleHealth <= 0) {
            this.gameOver(false); // Pasar false indica derrota
        }
    }

    // Método para game over
    gameOver(victory) {
        // Detener actualizaciones del juego
        this.scene.pause();

        // Oscurecer el fondo
        const overlay = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.7
        ).setScrollFactor(0);

        // Mostrar mensaje de victoria o derrota
        const message = victory ? '¡Victoria!' : '¡Derrota!';
        const color = victory ? '#00FF00' : '#FF0000';

        const gameOverText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 - 50,
            message,
            {
                fontSize: '48px',
                fill: color,
                stroke: '#000000',
                strokeThickness: 6
            }
        ).setOrigin(0.5).setScrollFactor(0);

        // Añadir botón para volver al menú
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonX = this.cameras.main.width / 2 - buttonWidth / 2;
        const buttonY = this.cameras.main.height / 2 + 50 - buttonHeight / 2;

        const button = this.add.graphics();
        button.fillStyle(0xA67C52, 1);
        button.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        button.lineStyle(3, 0x664433, 1);
        button.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

        const buttonText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 50,
            'Volver al Menú',
            {
                fontSize: '24px',
                fill: '#FFFFFF'
            }
        ).setOrigin(0.5).setScrollFactor(0);

        // Hacer el botón interactivo
        const hitArea = new Phaser.Geom.Rectangle(buttonX, buttonY, buttonWidth, buttonHeight);
        button.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
            .on('pointerdown', () => {
                // Limpiar estado del juego y abandonar la sala
                this.cleanupGameAndLeaveRoom();
            });
    }

    cleanupGameAndLeaveRoom() {
        // Crear un evento de socket para abandonar la sala
        if (socket) {
            // Enviar evento para abandonar la sala explícitamente
            socket.emit('leaveRoom', { roomCode: this.roomCode });
        }

        // Detener todos los eventos y listeners activos
        this.events.removeAllListeners();

        // Limpiar cualquier intervalo o timeout que pueda estar ejecutándose
        this.time.removeAllEvents();

        // Detener cualquier sonido en reproducción
        this.sound.stopAll();

        // Iniciar la escena del menú
        this.scene.start('MenuScene');
    }

    update() {
        // Actualizar la posición de los monstruos
        this.enemyManager.update();

        // Actualizar los proyectiles
        this.tower.update();
    }
}
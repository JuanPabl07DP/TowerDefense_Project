import {colocarTorre, onTorreColocada, onTorresActualizadas, onNuevoEnemigo, onEnemigoEliminado, onNuevaOleada, onEnemigosRestantes, onTemporizadorOleada, gastarMonedas, agregarMonedas, onActualizarMonedas } from '../services/socketService.js';
import Map from '../classes/Map.js';
import Tower from '../classes/Tower.js';
import Enemy from '../classes/Enemy.js';
import EnemyManager from '../classes/EnemyManager.js';
import Decorations from '../classes/Decorations.js';
import CurrencyManager from "../classes/CurrencyManager";
import { leaveRoom } from '../services/socketService';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });

        // Estadísticas de juego
        this.gameStats = {
            towersBuilt: { basic: 0, sniper: 0, rapid: 0, total: 0 },
            enemiesKilled: { basic: 0, fast: 0, strong: 0, total: 0 },
            moneySpent: 0,
            moneyEarned: 0,
            castleDamage: 0,
            wavesSurvived: 0,
            playTime: 0,
            gameResult: null // 'victory' o 'defeat'
        };
    }

    preload() {
        // Cargar recursos
        this.load.image('grass', 'assets/grass.jpg');
        this.load.image('path', 'assets/camino.png');
        this.load.image('base', 'assets/puerta.jpeg');
        this.load.image('tower', 'assets/tower.png');
        this.load.image('tower_sniper', 'assets/sniper2.png');
        this.load.image('tower_rapid', 'assets/doble.png');
        this.load.image('enemy', 'assets/miniogro.gif');
        this.load.image('enemy_strong', 'assets/GIF.gif');
        this.load.image('enemy_fast', 'assets/mountro.gif');
        this.load.image('water', 'assets/agua.jpg');
        this.load.image('tree', 'assets/arbol.png');
        this.load.image('rock', 'assets/roca.png');
        this.load.image('bush', 'assets/casa.png');
        this.load.image('projectile', 'assets/projectile.png');
        this.load.image('projectile_sniper', 'assets/projectile_sniper.gif');
        this.load.image('coin', 'assets/coin.png')
        this.load.image('guardia', 'assets/guardia.png');
        this.load.image('guardia2', 'assets/guardia2.png');
        this.load.image('fondoguerra', 'assets/fondoguerra.jpg');
        this.load.image('fin', 'assets/fin.jpeg');
    }

    create() {
        this.input.keyboard.on('keydown-M', () => {
            console.log("Tecla M presionada - Forzando cambio a MenuScene");
            this.scene.start('MenuScene');
        });

        // Hacer que las funciones de socket sean accesibles desde otras clases
        this.colocarTorre = colocarTorre;
        this.gastarMonedas = (cantidad) => {
            gastarMonedas(cantidad);
            this.gameStats.moneySpent += cantidad;
        };
        this.agregarMonedas = (cantidad) => {
            agregarMonedas(cantidad);
            this.gameStats.moneyEarned += cantidad;
        };

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

        this.createTowerSelectionUI();

        // Escuchar actualizaciones de monedas desde el servidor
        onActualizarMonedas((amount) => {
            this.currencyManager.amount = amount;
            this.currencyManager.updateUI();
        });

        // Escuchar el evento para actualizar torres
        onTorreColocada((data) => {
            const { x, y, tipo } = data;
            this.tower.placeTower(x, y, tipo); // Colocar la torre en la vista
            // Actualizar estadísticas
            this.gameStats.towersBuilt[tipo || 'basic']++;
            this.gameStats.towersBuilt.total++;
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

            // Actualizar estadísticas
            this.gameStats.wavesSurvived = oleada;

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

            // Solo mostrar victoria si es la última oleada (6) y no hay enemigos activos
            if (oleada >= 6 && this.enemyManager.enemies.length === 0) {
                this.time.delayedCall(1500, () => {
                    this.gameOver(true); // true para victoria
                });
            }
        });

        // Eventos para actualizar estadísticas
        this.events.on('enemigo-eliminado', (tipo) => {
            this.gameStats.enemiesKilled[tipo]++;
            this.gameStats.enemiesKilled.total++;
        });

        // Iniciar el temporizador de juego para estadísticas
        this.startTime = this.time.now;
        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.gameStats.playTime++;
            },
            loop: true
        });
    }

    createTowerSelectionUI() {
        // 1. Configuración inicial
        const centerX = this.cameras.main.width / 2;
        const panelWidth = 400;
        const buttonWidth = 120;
        const buttonHeight = 50;
        const padding = 10;

        // 2. Contenedor principal (centrado en la parte inferior)
        this.towerSelectionContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(1000);

        // 3. Fondo del panel
        const bg = this.add.graphics()
            .fillStyle(0x333333, 0.9)
            .fillRoundedRect(
                centerX - panelWidth/2,
                this.cameras.main.height - 70,
                panelWidth,
                60,
                5
            );
        this.towerSelectionContainer.add(bg);

        // 4. Crear botones para cada tipo de torre
        this.towerButtons = [];
        const towerTypes = this.tower.towerTypes;
        const startX = centerX - panelWidth/2 + padding;

        Object.keys(towerTypes).forEach((type, index) => {
            const towerType = towerTypes[type];
            const xPos = startX + index * (buttonWidth + padding);
            const yPos = this.cameras.main.height - 65;

            // Grupo para cada botón (para manejar todo junto)
            const buttonGroup = this.add.container(xPos, yPos);

            // Fondo del botón
            const buttonBg = this.add.graphics()
                .fillStyle(this.tower.selectedTowerType === type ? 0x4a7cff : 0x555555, 1)
                .fillRoundedRect(0, 0, buttonWidth, buttonHeight, 5);

            // Texto del nombre
            const nameText = this.add.text(
                buttonWidth/2,
                15,
                this.getTowerDisplayName(type),
                {
                    fontSize: '16px',
                    color: '#FFFFFF',
                    fontStyle: 'bold'
                }
            ).setOrigin(0.5);

            // Texto del costo
            const costText = this.add.text(
                buttonWidth/2,
                35,
                `${towerType.cost} monedas`,
                {
                    fontSize: '14px',
                    color: '#FFD700'
                }
            ).setOrigin(0.5);

            // Añadir detalles de daño y velocidad
            const dps = (towerType.damage / (towerType.cooldown/1000)).toFixed(2);
            const infoText = this.add.text(
                buttonWidth/2,
                -20, // Posición encima del botón
                `Dmg: ${towerType.damage} | DPS: ${dps} | Rango: ${towerType.range}`,
                {
                    fontSize: '12px',
                    color: '#FFFFFF',
                    backgroundColor: '#000000',
                    padding: { x: 4, y: 2 },
                    stroke: '#000000',
                    strokeThickness: 2
                }
            ).setOrigin(0.5).setVisible(false);

            // Área interactiva
            const hitArea = this.add.rectangle(
                buttonWidth/2,
                buttonHeight/2,
                buttonWidth,
                buttonHeight,
                0x000000,
                0
            ).setInteractive();

            // Configurar eventos
            hitArea.on('pointerdown', () => {
                if (this.currencyManager.canAfford(towerType.cost)) {
                    this.tower.setTowerType(type);
                    this.updateTowerSelectionUI();
                } else {
                    // Feedback visual simple
                    costText.setColor('#FF0000');
                    this.time.delayedCall(500, () => costText.setColor('#FFD700'));
                }
            });

            // Mostrar/ocultar info al pasar el mouse
            hitArea.on('pointerover', () => {
                buttonBg.clear()
                    .fillStyle(this.tower.selectedTowerType === type ? 0x6a9cff : 0x777777, 1)
                    .fillRoundedRect(0, 0, buttonWidth, buttonHeight, 5);
                infoText.setVisible(true);
            });

            hitArea.on('pointerout', () => {
                buttonBg.clear()
                    .fillStyle(this.tower.selectedTowerType === type ? 0x4a7cff : 0x555555, 1)
                    .fillRoundedRect(0, 0, buttonWidth, buttonHeight, 5);
                infoText.setVisible(false);
            });

            // Añadir elementos al grupo
            buttonGroup.add([buttonBg, nameText, costText, hitArea, infoText]);
            this.towerSelectionContainer.add(buttonGroup);

            // Guardar referencia para actualización
            this.towerButtons.push({
                group: buttonGroup,
                bg: buttonBg,
                type: type
            });
        });
    }

    updateTowerSelectionUI() {
        this.towerButtons.forEach(button => {
            const isSelected = this.tower.selectedTowerType === button.type;
            button.bg.clear()
                .fillStyle(isSelected ? 0x4a7cff : 0x555555, 1)
                .fillRoundedRect(0, 0, 120, 50, 5);
        });
    }

    getTowerDisplayName(type) {
        const names = {
            'basic': 'BÁSICA',
            'sniper': 'SNIPER',
            'rapid': 'RÁPIDA'
        };
        return names[type] || type;
    }

    // Método para dañar el castillo
    damageCastle(amount) {
        this.castleHealth = Math.max(0, this.castleHealth - amount);

        // Actualizar estadísticas
        this.gameStats.castleDamage += amount;

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
        // Calcular estadísticas finales
        this.gameStats.gameResult = victory ? 'victory' : 'defeat';
        this.gameStats.wavesSurvived = this.enemyManager.oleadaActual;

        // Detener el temporizador
        if (this.timerEvent) this.timerEvent.remove();

        // Añadir la imagen de fin como fondo
        const finBackground = this.add.image(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            'fin'
        )
            .setDisplaySize(this.cameras.main.width, this.cameras.main.height)
            .setScrollFactor(0)
            .setDepth(99);

        // Oscurecer el fondo
        const overlay = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.5
        ).setScrollFactor(0).setDepth(100);

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
        ).setOrigin(0.5).setScrollFactor(0).setDepth(101);

        // Crear botón con estilo de LobbyScene
        const buttonX = this.cameras.main.width / 2;
        const buttonY = this.cameras.main.height / 2 + 100;
        const buttonWidth = 220;
        const buttonHeight = 50;
        const buttonRectX = buttonX - (buttonWidth / 2);
        const buttonRectY = buttonY - (buttonHeight / 2);

        // Crear gráfico para el botón
        const button = this.add.graphics();
        button.fillStyle(0xA67C52, 1);
        button.lineStyle(3, 0x664433, 1);
        button.fillRect(buttonRectX, buttonRectY, buttonWidth, buttonHeight);
        button.strokeRect(buttonRectX, buttonRectY, buttonWidth, buttonHeight);

        // Calcular valores para el borde interior
        const scaleRatio = Math.min(this.cameras.main.width / 1280, this.cameras.main.height / 720);
        const borderThickness = Math.max(1, Math.floor(2 * scaleRatio));
        const borderOffset = Math.max(2, Math.floor(3 * scaleRatio));

        // Borde interior decorativo
        button.lineStyle(borderThickness, 0xD4A76A, 1);
        button.strokeRect(
            buttonRectX + borderOffset,
            buttonRectY + borderOffset,
            buttonWidth - (borderOffset * 2),
            buttonHeight - (borderOffset * 2)
        );

        // Texto del botón
        const buttonText = this.add.text(
            buttonX,
            buttonY,
            'Ver Estadísticas',
            {
                font: `bold ${Math.max(16, Math.floor(22 * scaleRatio))}px Arial`,
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setDepth(102);

        // Hacer el botón interactivo
        const hitArea = new Phaser.Geom.Rectangle(buttonRectX, buttonRectY, buttonWidth, buttonHeight);
        button.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
            .on('pointerdown', () => {
                // Efecto de botón presionado
                button.clear();
                button.fillStyle(0x7A5C32, 1);
                button.fillRect(buttonRectX, buttonRectY, buttonWidth, buttonHeight);
                button.lineStyle(3, 0x664433, 1);
                button.strokeRect(buttonRectX, buttonRectY, buttonWidth, buttonHeight);

                // Mostrar estadísticas después de un pequeño retraso
                this.time.delayedCall(150, () => {
                    this.showGameStats();
                });
            })
            .on('pointerover', () => {
                // Efecto hover
                button.clear();
                button.fillStyle(0xBB9062, 1);
                button.fillRect(buttonRectX, buttonRectY, buttonWidth, buttonHeight);
                button.lineStyle(3, 0x664433, 1);
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
                button.lineStyle(3, 0x664433, 1);
                button.strokeRect(buttonRectX, buttonRectY, buttonWidth, buttonHeight);
                button.lineStyle(borderThickness, 0xD4A76A, 1);
                button.strokeRect(
                    buttonRectX + borderOffset,
                    buttonRectY + borderOffset,
                    buttonWidth - (borderOffset * 2),
                    buttonHeight - (borderOffset * 2)
                );
            });
    }
    // Método para mostrar estadísticas de juego
    showGameStats() {
        // Eliminar elementos anteriores
        this.children.each(child => {
            if (child.depth >= 99) {
                child.destroy();
            }
        });

        // Crear un fondo semitransparente
        const statsBg = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            this.cameras.main.width * 0.8,
            this.cameras.main.height * 0.8,
            0x000000,
            0.9
        ).setScrollFactor(0).setDepth(2000);

        // Título
        const title = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height * 0.15,
            'ESTADÍSTICAS DE JUEGO',
            {
                fontSize: '36px',
                fontStyle: 'bold',
                fill: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

        // Subtítulo con el resultado
        const subtitle = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height * 0.22,
            this.gameStats.gameResult === 'victory' ? '¡VICTORIA!' : 'DERROTA',
            {
                fontSize: '28px',
                fontStyle: 'bold',
                fill: this.gameStats.gameResult === 'victory' ? '#00FF00' : '#FF0000',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

        // Formatear tiempo
        const formatTime = (seconds) => {
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
        };

        // Crear tabla de estadísticas
        const stats = [
            [`Tiempo jugado:`, `${formatTime(this.gameStats.playTime)}`],
            [`Oleadas superadas:`, `${this.gameStats.wavesSurvived} de 6`],
            [`Daño al castillo:`, `${this.gameStats.castleDamage}`],
            [`Monedas gastadas:`, `${this.gameStats.moneySpent}`],
            [`Monedas ganadas:`, `${this.gameStats.moneyEarned}`],
            [`Torres construidas:`, ``],
            [`• Básica:`, `${this.gameStats.towersBuilt.basic}`],
            [`• Sniper:`, `${this.gameStats.towersBuilt.sniper}`],
            [`• Rápida:`, `${this.gameStats.towersBuilt.rapid}`],
            [`• Total:`, `${this.gameStats.towersBuilt.total}`],
            [`Enemigos eliminados:`, ``],
            [`• Básicos:`, `${this.gameStats.enemiesKilled.basic}`],
            [`• Fuertes:`, `${this.gameStats.enemiesKilled.strong}`],
            [`• Rápidos:`, `${this.gameStats.enemiesKilled.fast}`],
            [`• Total:`, `${this.gameStats.enemiesKilled.total}`]
        ];

        // Crear textos de estadísticas en dos columnas
        const startY = this.cameras.main.height * 0.3;
        const lineHeight = 30;
        const column1X = this.cameras.main.width * 0.3;
        const column2X = this.cameras.main.width * 0.7;

        stats.forEach((stat, index) => {
            // Etiqueta (columna izquierda)
            this.add.text(
                column1X,
                startY + index * lineHeight,
                stat[0],
                {
                    fontSize: '18px',
                    fill: '#FFFFFF',
                    align: 'right'
                }
            ).setOrigin(1, 0.5).setScrollFactor(0).setDepth(2001);

            // Valor (columna derecha)
            if (stat[1] !== '') {
                this.add.text(
                    column2X,
                    startY + index * lineHeight,
                    stat[1],
                    {
                        fontSize: '18px',
                        fontStyle: 'bold',
                        fill: '#FFFFFF',
                        align: 'left'
                    }
                ).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2001);
            }
        });

        // Botón para volver al menú
        const buttonX = this.cameras.main.width / 2;
        const buttonY = this.cameras.main.height * 0.85;
        const buttonWidth = 220;
        const buttonHeight = 50;

        // Calcular valores para bordes
        const scaleRatio = Math.min(this.cameras.main.width / 1280, this.cameras.main.height / 720);
        const borderThickness = Math.max(1, Math.floor(2 * scaleRatio));
        const borderOffset = Math.max(2, Math.floor(3 * scaleRatio));

        // Fondo del botón
        const buttonBg = this.add.graphics();
        buttonBg.fillStyle(0xA67C52, 1);
        buttonBg.lineStyle(3, 0x664433, 1);
        buttonBg.fillRect(
            buttonX - buttonWidth / 2,
            buttonY - buttonHeight / 2,
            buttonWidth,
            buttonHeight
        );
        buttonBg.strokeRect(
            buttonX - buttonWidth / 2,
            buttonY - buttonHeight / 2,
            buttonWidth,
            buttonHeight
        );

        // Borde interior
        buttonBg.lineStyle(borderThickness, 0xD4A76A, 1);
        buttonBg.strokeRect(
            buttonX - buttonWidth / 2 + borderOffset,
            buttonY - buttonHeight / 2 + borderOffset,
            buttonWidth - (borderOffset * 2),
            buttonHeight - (borderOffset * 2)
        );

        buttonBg.setScrollFactor(0).setDepth(2001);

        // Texto del botón
        const buttonText = this.add.text(
            buttonX,
            buttonY,
            'Volver al Menú',
            {
                fontSize: '20px',
                fill: '#FFFFFF',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(2002);

        // Hacer el botón interactivo
        const hitArea = new Phaser.Geom.Rectangle(
            buttonX - buttonWidth / 2,
            buttonY - buttonHeight / 2,
            buttonWidth,
            buttonHeight
        );

        buttonBg.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
            .on('pointerdown', () => {
                // Efecto de botón presionado
                buttonBg.clear();
                buttonBg.fillStyle(0x7A5C32, 1);
                buttonBg.fillRect(
                    buttonX - buttonWidth / 2,
                    buttonY - buttonHeight / 2,
                    buttonWidth,
                    buttonHeight
                );
                buttonBg.lineStyle(3, 0x664433, 1);
                buttonBg.strokeRect(
                    buttonX - buttonWidth / 2,
                    buttonY - buttonHeight / 2,
                    buttonWidth,
                    buttonHeight
                );

                // Volver al menú
                this.time.delayedCall(150, () => {
                    this.cleanupGameAndLeaveRoom();
                });
            })
            .on('pointerover', () => {
                // Efecto hover
                buttonBg.clear();
                buttonBg.fillStyle(0xBB9062, 1);
                buttonBg.fillRect(
                    buttonX - buttonWidth / 2,
                    buttonY - buttonHeight / 2,
                    buttonWidth,
                    buttonHeight
                );
                buttonBg.lineStyle(3, 0x664433, 1);
                buttonBg.strokeRect(
                    buttonX - buttonWidth / 2,
                    buttonY - buttonHeight / 2,
                    buttonWidth,
                    buttonHeight
                );
                buttonBg.lineStyle(borderThickness, 0xD4A76A, 1);
                buttonBg.strokeRect(
                    buttonX - buttonWidth / 2 + borderOffset,
                    buttonY - buttonHeight / 2 + borderOffset,
                    buttonWidth - (borderOffset * 2),
                    buttonHeight - (borderOffset * 2)
                );
            })
            .on('pointerout', () => {
                // Restaurar estado normal
                buttonBg.clear();
                buttonBg.fillStyle(0xA67C52, 1);
                buttonBg.fillRect(
                    buttonX - buttonWidth / 2,
                    buttonY - buttonHeight / 2,
                    buttonWidth,
                    buttonHeight
                );
                buttonBg.lineStyle(3, 0x664433, 1);
                buttonBg.strokeRect(
                    buttonX - buttonWidth / 2,
                    buttonY - buttonHeight / 2,
                    buttonWidth,
                    buttonHeight
                );
                buttonBg.lineStyle(borderThickness, 0xD4A76A, 1);
                buttonBg.strokeRect(
                    buttonX - buttonWidth / 2 + borderOffset,
                    buttonY - buttonHeight / 2 + borderOffset,
                    buttonWidth - (borderOffset * 2),
                    buttonHeight - (borderOffset * 2)
                );
            });
    }

    cleanupGameAndLeaveRoom() {
        // Detener el temporizador si existe
        if (this.timerEvent) this.timerEvent.remove();

        // Importar socketService localmente para asegurar la referencia
        // Abandonar la sala si existe roomCode
        if (this.roomCode) {
            leaveRoom(this.roomCode);
        }

        // Detener todos los sonidos
        this.sound.stopAll();

        // Limpiar todos los objetos de la escena
        this.children.removeAll();

        // Reiniciar la escena del menú
        this.scene.start('MenuScene');
    }

    update() {
        // Actualizar la posición de los monstruos
        this.enemyManager.update();

        // Actualizar los proyectiles
        this.tower.update();
    }
}
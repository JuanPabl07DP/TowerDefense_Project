import Enemy from './Enemy.js';
import { onEnemyPositionUpdated, onEnemyReachedBase } from '../services/socketService.js';

export default class EnemyManager {
    constructor(scene, map) {
        this.scene = scene; // Referencia a la escena de Phaser
        this.map = map;     // Referencia al mapa
        this.enemies = [];  // Lista de monstruos
        this.oleadaActual = 0;
        this.oleadaEnCurso = false;

        // Escuchar eventos de oleadas
        this.scene.events.on('nueva-oleada', (oleada) => {
            this.oleadaActual = oleada;
            this.oleadaEnCurso = true;
            console.log(`Oleada ${oleada} iniciada`);
        });

        // Escuchar actualizaciones de posición desde el servidor
        onEnemyPositionUpdated((data) => {
            const { id, x, y, currentPoint } = data;
            const enemy = this.enemies.find(e => e.id === id);
            if (enemy) {
                // Usar las coordenadas exactas enviadas por el servidor, ajustadas por el offset y escala
                const worldX = this.map.offsetX + (x * this.map.scale);
                const worldY = this.map.offsetY + (y * this.map.scale);
                enemy.sprite.x = worldX;
                enemy.sprite.y = worldY;

                // Actualizar barras de vida
                if (enemy.healthBar) {
                    enemy.healthBar.x = worldX;
                    enemy.healthBar.y = worldY - this.scene.map.tileSize / 2 - 5;
                }
                if (enemy.healthBarBackground) {
                    enemy.healthBarBackground.x = worldX;
                    enemy.healthBarBackground.y = worldY - this.scene.map.tileSize / 2 - 5;
                }

                enemy.currentPoint = currentPoint;
            }
        });

        // Escuchar cuando un enemigo llega a la base
        onEnemyReachedBase((enemyId) => {
            const enemy = this.enemies.find(e => e.id === enemyId);
            // Solo dañar el castillo si el enemigo existe y está activo
            if (enemy && enemy.sprite.active) {
                // Dañar el castillo antes de eliminar el enemigo
                if (this.scene.damageCastle) {
                    this.scene.damageCastle(15); // Restar 15 de vida
                }
            }
            this.removeEnemy(enemyId);
        });
    }

    addEnemy(enemigo) {
        const path = this.map.createPath(); // Usar createPath() de Map
        const enemy = new Enemy(this.scene, path, enemigo.id);
        // Guardar información de oleada si existe
        if (enemigo.oleada) {
            enemy.oleada = enemigo.oleada;
        }
        // Si el servidor proporciona una posición inicial, usarla
        if (enemigo.x && enemigo.y) {
            enemy.sprite.x = enemigo.x;
            enemy.sprite.y = enemigo.y;
        }
        if (enemigo.currentPoint) {
            enemy.currentPoint = enemigo.currentPoint;
        }
        this.enemies.push(enemy);
    }

    // Método para manejar el fin de oleada
    verificarFinOleada() {
        const enemigosActivos = this.enemies.filter(e => e.sprite.active);
        if (enemigosActivos.length === 0 && this.oleadaEnCurso) {
            this.oleadaEnCurso = false;

            // Emitir evento de oleada completada
            this.scene.events.emit('oleada-completada', this.oleadaActual);

            // Solo mostrar victoria si era la última oleada (4) y no hay enemigos activos
            if (this.oleadaActual >= 4 && enemigosActivos.length === 0) {
                this.scene.time.delayedCall(1500, () => {
                    if (this.scene.gameOver) {
                        this.scene.gameOver(true); // true para victoria
                    }
                });
            }
        }
    }

    removeEnemy(enemigoId) {
        const enemy = this.enemies.find(e => e.id === enemigoId);
        if (enemy) {
            enemy.destroy();
            this.enemies = this.enemies.filter(e => e.id !== enemigoId);
        }
    }

    // El método update ahora solo verifica enemigos eliminados
    update() {
        // Ya no actualizamos el movimiento aquí
        this.enemies = this.enemies.filter(e => e.sprite.active);
        this.verificarFinOleada();
    }
}
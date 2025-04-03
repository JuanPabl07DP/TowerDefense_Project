import {dispararProyectil} from "../services/socketService";
import Projectile from "./Projectile";

export default class Tower {
    constructor(scene, map) {
        this.scene = scene; // Referencia a la escena de Phaser
        this.map = map;     // Referencia al mapa
        this.range = 100 * this.map.scale;  // Rango de ataque de la torre (escalado)
        this.projectiles = []; // Lista de proyectiles activos
        this.cooldown = 5000; // Tiempo de espera entre disparos (en ms)
        this.lastShot = 0;  // Tiempo del último disparo
        this.towers = [];   // Lista de torres colocadas
    }

    // Método para colocar una torre
    placeTower(col, row) {
        if (this.map.getTileValue(row, col) === 1) {
            // Obtener la posición en la pantalla para esta casilla
            const position = this.map.getTilePosition(row, col);

            // Crear la base de pasto (si no existe ya)
            const grass = this.scene.add.image(
                position.x,
                position.y,
                'grass'
            )
                .setOrigin(0.5, 0.5)
                .setDisplaySize(this.map.tileSize, this.map.tileSize)
                .setAlpha(0.8); // Hacer el pasto un poco transparente

            // Luego crear la torre encima
            const tower = this.scene.add.image(
                position.x,
                position.y,
                'tower'
            )
                .setOrigin(0.5, 0.5)
                .setDisplaySize(this.map.tileSize, this.map.tileSize);

            // Marcar la casilla como ocupada
            this.map.setTileValue(row, col, 3);

            // Agregar la torre a la lista
            this.towers.push({
                sprite: tower,
                base: grass, // Guardar referencia a la base de pasto
                row: row,
                col: col,
                position: position,
                lastShot: 0
            });

            // Iniciar el sistema de disparo para esta torre
            this.scene.time.addEvent({
                delay: 500, // Verificar cada 500 ms
                callback: () => this.updateTower(tower),
                loop: true
            });
            return true;
        }
        return false;
    }

    // Método para actualizar el estado de la torre
    updateTower(tower) {
        const now = this.scene.time.now;
        const towerData = this.towers.find(t => t.sprite === tower);

        // Verificar si la torre puede disparar
        if (now - towerData.lastShot < this.cooldown) return;

        // Buscar enemigos dentro del rango
        const enemyManager = this.scene.enemyManager;
        const target = enemyManager.enemies.find(enemy => {
            const dx = enemy.sprite.x - towerData.position.x;
            const dy = enemy.sprite.y - towerData.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= this.range;
        });

        if (target) {
            // Disparar un proyectil
            const projectile = new Projectile(
                this.scene,
                towerData.position.x,
                towerData.position.y,
                target
            );
            this.projectiles.push(projectile);

            // Notificar al servidor sobre el disparo
            dispararProyectil(
                towerData.position.x,
                towerData.position.y,
                target.sprite.texture.key
            );

            // Actualizar el tiempo del último disparo
            towerData.lastShot = now;
        }
    }

    // Método para actualizar los proyectiles
    update() {
        this.projectiles.forEach(projectile => projectile.update());
        this.projectiles = this.projectiles.filter(projectile => projectile.sprite.active);
    }
}
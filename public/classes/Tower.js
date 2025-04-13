import {dispararProyectil} from "../services/socketService";
import Projectile from "./Projectile";

export default class Tower {
    constructor(scene, map) {
        this.scene = scene; // Referencia a la escena de Phaser
        this.map = map;     // Referencia al mapa
        this.projectiles = []; // Lista de proyectiles activos
        this.towers = [];   // Lista de torres colocadas
        this.selectedTowerType = 'basic'; // Tipo de torre seleccionada por defecto

        // Configuración de los tipos de torres
        this.towerTypes = {
            'basic': {
                cost: 20,
                range: 100,
                cooldown: 2000,
                damage: 1,
                texture: 'tower',
                projectileTexture: 'projectile',
                scale: 1.0
            },
            'sniper': {
                cost: 40,
                range: 180,
                cooldown: 3500,
                damage: 3,
                texture: 'tower_sniper',
                projectileTexture: 'projectile_sniper',
                scale: 1.0
            },
            'rapid': {
                cost: 30,
                range: 80,
                cooldown: 800,
                damage: 1,
                texture: 'tower_rapid',
                projectileTexture: 'projectile',
                scale: 1.0
            }
        };
    }

    // Método para cambiar el tipo de torre seleccionada
    setTowerType(type) {
        if (this.towerTypes[type]) {
            this.selectedTowerType = type;
        }
    }

    // Método para colocar una torre
    placeTower(col, row, type = this.selectedTowerType) {
        const towerType = this.towerTypes[type] || this.towerTypes.basic;
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
                towerType.texture
            )
                .setOrigin(0.5, 0.5)
                .setDisplaySize(this.map.tileSize, this.map.tileSize);

            // Marcar la casilla como ocupada
            this.map.setTileValue(row, col, 3);

            // Agregar la torre a la lista
            this.towers.push({
                sprite: tower,
                base: grass,
                row: row,
                col: col,
                position: position,
                lastShot: 0,
                type: type,
                config: towerType
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
        const range = towerData.config.range * this.map.scale;

        // Verificar si la torre puede disparar
        if (now - towerData.lastShot < towerData.config.cooldown) return;

        // Buscar enemigos dentro del rango
        const target = this.scene.enemyManager.enemies.find(enemy => {
            const dx = enemy.sprite.x - towerData.position.x;
            const dy = enemy.sprite.y - towerData.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= range;
        });

        if (target) {
            // Disparar un proyectil
            const projectile = new Projectile(
                this.scene,
                towerData.position.x,
                towerData.position.y,
                target,
                towerData.config.damage,
                towerData.config.projectileTexture
            );
            this.projectiles.push(projectile);

            // Notificar al servidor sobre el disparo
            dispararProyectil(
                towerData.position.x,
                towerData.position.y,
                target.id,
                towerData.config.damage
            );

            // Actualizar el tiempo del último disparo
            towerData.lastShot = now;
        }
    }

    // Método para actualizar los proyectiles
    update() {
        this.projectiles.forEach(projectile => projectile.update());
        this.projectiles = this.projectiles.filter(p => p.sprite.active);
    }
}
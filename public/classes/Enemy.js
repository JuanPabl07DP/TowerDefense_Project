export default class Enemy {
    constructor(scene, path, id, type = 'basic') {
        this.scene = scene; // Referencia a la escena de Phaser
        this.path = path;   // Ruta que el monstruo debe seguir
        this.currentPoint = 0; // Índice del punto actual en la ruta
        this.id = id || Date.now(); // Identificador único
        this.type = type;

        // Configuración basada en el tipo de monstruo
        const enemyConfig = {
            'basic': { health: 3, speed: 1, damage: 10, texture: 'enemy', scale: 1.0 },
            'strong': { health: 6, speed: 0.5, damage: 20, texture: 'enemy_strong', scale: 1.2 },
            'fast': { health: 2, speed: 1.5, damage: 5, texture: 'enemy_fast', scale: 0.9 }
        };

        this.config = enemyConfig[type] || enemyConfig.basic;
        this.health = this.config.health;
        this.maxHealth = this.config.health;
        this.damage = this.config.damage;

        // Crear el sprite del monstruo
        this.sprite = this.scene.add.sprite(
            this.path[0].x,
            this.path[0].y,
            this.config.texture
        ).setDisplaySize(
            this.scene.map.tileSize * this.config.scale,
            this.scene.map.tileSize * this.config.scale
        );

        // Barra de vida (fondo)
        this.healthBarBackground = this.scene.add.rectangle(
            this.sprite.x,
            this.sprite.y - this.scene.map.tileSize / 2 - 5,
            this.scene.map.tileSize,
            5,
            0x000000
        );

        // Barra de vida (frente)
        this.healthBar = this.scene.add.rectangle(
            this.sprite.x,
            this.sprite.y - this.scene.map.tileSize / 2 - 5,
            this.scene.map.tileSize,
            5,
            0x00FF00
        );
    }

    // Método para recibir daño
    takeDamage(amount) {
        this.health -= amount;

        // Actualizar la barra de vida
        this.healthBar.width = (this.health / this.maxHealth) * this.scene.map.tileSize;

        // Cambiar el color según la vida restante
        const healthPercent = this.health / this.maxHealth;
        if (healthPercent <= 0.25) {
            this.healthBar.fillColor = 0xFF0000; // Rojo
        } else if (healthPercent <= 0.5) {
            this.healthBar.fillColor = 0xFFFF00; // Amarillo
        }

        // Comprobar si el monstruo ha muerto
        if (this.health <= 0) {
            this.scene.eliminarEnemigo(this.id);
            this.destroy();
            return true;
        }
        return false;
    }

    // Este método actualiza la posición según los datos del servidor
    updatePosition(x, y, currentPoint) {
        this.sprite.x = x;
        this.sprite.y = y;

        // Actualizar posición de las barras de vida
        this.healthBarBackground.x = x;
        this.healthBarBackground.y = y - this.scene.map.tileSize / 2 - 5;
        this.healthBar.x = x;
        this.healthBar.y = y - this.scene.map.tileSize / 2 - 5;

        this.currentPoint = currentPoint;
    }

    // Método para actualizar el enemigo (ya no mueve el enemigo)
    update() {
        // No actualizamos el movimiento aquí, ahora viene del servidor
    }

    // Método para eliminar al monstruo
    destroy() {
        this.healthBar.destroy();
        this.healthBarBackground.destroy();
        this.sprite.destroy();
    }
}
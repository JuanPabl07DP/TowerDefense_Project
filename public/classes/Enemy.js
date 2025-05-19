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
            'strong': { health: 12, speed: 0.5, damage: 20, texture: 'enemy_strong', scale: 1.2 },
            'fast': { health: 2, speed: 2.5, damage: 5, texture: 'enemy_fast', scale: 0.9 }
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

        // Para seguimiento del tiempo desde la última actualización
        this.lastServerUpdate = Date.now();
        this.serverSyncThreshold = 2000; // 2 segundos para intentar sincronizar con servidor
        this.movementPaused = false;

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

    // Método para actualizar desde el servidor (mejorado)
    updateFromServer(worldX, worldY, currentPoint) {
        // Solo actualizar si la diferencia de posición es significativa o el punto es distinto
        const distance = Math.sqrt(
            Math.pow(this.sprite.x - worldX, 2) +
            Math.pow(this.sprite.y - worldY, 2)
        );

        // Si la diferencia es grande o el punto ha cambiado, actualizar
        if (distance > 20 || this.currentPoint !== currentPoint) {

            this.sprite.x = worldX;
            this.sprite.y = worldY;
            this.currentPoint = currentPoint;

            // Actualizar barras de vida
            this.updateHealthBarPosition();
        }

        // Marcar el tiempo de la última actualización
        this.lastServerUpdate = Date.now();
        this.movementPaused = false;
    }

    // Método para actualizar posición de barras de vida
    updateHealthBarPosition() {
        if (this.healthBar) {
            this.healthBar.x = this.sprite.x;
            this.healthBar.y = this.sprite.y - this.scene.map.tileSize / 2 - 5;
        }
        if (this.healthBarBackground) {
            this.healthBarBackground.x = this.sprite.x;
            this.healthBarBackground.y = this.sprite.y - this.scene.map.tileSize / 2 - 5;
        }
    }

    // Método de actualización mejorado
    update(time, delta) {

        const now = Date.now();
        const timeSinceUpdate = now - this.lastServerUpdate;

        // Si hace poco recibimos una actualización del servidor, esperar un poco
        if (timeSinceUpdate < this.serverSyncThreshold || this.movementPaused) {
            return false;
        }

        // Si ha pasado suficiente tiempo sin actualizaciones del servidor, usar movimiento local
        if (this.currentPoint < this.path.length - 1) {
            // Obtener siguiente punto en el camino
            const nextPoint = this.path[this.currentPoint + 1];

            // Calcular dirección y distancia
            const dx = nextPoint.x - this.sprite.x;
            const dy = nextPoint.y - this.sprite.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Usar velocidad normal según el tipo de enemigo
            const speed = this.config.speed * delta / 16; // Normalizar para 60fps

            // Si estamos cerca del punto, ir directamente al siguiente
            if (distance <= speed) {
                this.sprite.x = nextPoint.x;
                this.sprite.y = nextPoint.y;
                this.currentPoint++;

                // Actualizar barras de vida
                this.updateHealthBarPosition();

                // Si llegamos al último punto, notificar que hemos llegado a la base
                if (this.currentPoint >= this.path.length - 1) {
                    // Si tienes acceso directo al socket, notificar al servidor
                    if (window.socket) {
                        window.socket.emit('enemigo-reached-base', {
                            enemyId: this.id,
                            damage: this.damage
                        });
                    }

                    // Ya no actualizar más este enemigo
                    this.movementPaused = true;
                }

                return true;
            } else {
                // Moverse hacia el siguiente punto
                this.sprite.x += (dx / distance) * speed;
                this.sprite.y += (dy / distance) * speed;

                // Actualizar barras de vida
                this.updateHealthBarPosition();
                return true;
            }
        }

        return false;
    }

    // Método para eliminar al monstruo con limpieza
    destroy() {
        this.healthBar.destroy();
        this.healthBarBackground.destroy();
        this.sprite.destroy();
    }
}
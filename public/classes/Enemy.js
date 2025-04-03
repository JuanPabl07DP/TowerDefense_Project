export default class Enemy {
    constructor(scene, path, id) {
        this.scene = scene; // Referencia a la escena de Phaser
        this.path = path;   // Ruta que el monstruo debe seguir
        this.currentPoint = 0; // Índice del punto actual en la ruta
        this.id = id || Date.now(); // Identificador único
        this.health = 3; // Cada monstruo comienza con 3 puntos de vida

        // Crear el sprite del monstruo en el primer punto del camino
        this.sprite = this.scene.add.sprite(
            this.path[0].x,
            this.path[0].y,
            'enemy'
        );

        // Escalar el sprite al tamaño de las casillas
        this.sprite.setDisplaySize(this.scene.map.tileSize, this.scene.map.tileSize);

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
        this.healthBar.width = (this.health / 3) * this.scene.map.tileSize;

        // Cambiar el color según la vida restante
        if (this.health <= 1) {
            this.healthBar.fillColor = 0xFF0000; // Rojo
        } else if (this.health <= 2) {
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
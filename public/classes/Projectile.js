export default class Projectile {
    constructor(scene, x, y, target) {
        this.scene = scene; // Referencia a la escena de Phaser
        this.x = x;         // Posición inicial X
        this.y = y;         // Posición inicial Y
        this.target = target; // Referencia al enemigo objetivo
        this.speed = 5 * scene.map.scale; // Velocidad ajustada a la escala
        this.damage = 1;    // Cantidad de daño que aplica

        // Crear el sprite del proyectil
        this.sprite = this.scene.add.sprite(x, y, 'projectile')
            .setDisplaySize(10 * this.scene.map.scale, 10 * this.scene.map.scale); // Tamaño ajustado a la escala
    }

    // Método para actualizar la posición del proyectil
    update() {
        if (this.target && !this.target.sprite.active) {
            // Si el objetivo ya no existe, destruir el proyectil
            this.destroy();
            return;
        }

        // Calcular la dirección hacia el objetivo
        const dx = this.target.sprite.x - this.sprite.x;
        const dy = this.target.sprite.y - this.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > this.speed) {
            // Mover el proyectil hacia el objetivo
            this.sprite.x += (dx / distance) * this.speed;
            this.sprite.y += (dy / distance) * this.speed;
        } else {
            // El proyectil alcanzó al objetivo
            const enemyDied = this.target.takeDamage(this.damage);

            // Si el enemigo murió
            if (enemyDied) {
                // Dar recompensa de monedas
                if (this.scene.agregarMonedas) {
                    this.scene.agregarMonedas(30);
                }

                // Notificar al servidor que el enemigo ha sido eliminado
                // Esto evitará que el servidor envíe un evento onEnemyReachedBase
                if (this.scene.eliminarEnemigo) {
                    this.scene.eliminarEnemigo(this.target.id);
                }
            }

            this.destroy();
        }
    }

    // Método para eliminar el proyectil
    destroy() {
        this.sprite.destroy();
    }
}
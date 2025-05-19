export default class Projectile {
    constructor(scene, x, y, target, damage = 1, texture = 'projectile')  {
        this.scene = scene; // Referencia a la escena de Phaser
        this.x = x;         // Posición inicial X
        this.y = y;         // Posición inicial Y
        this.target = target; // Referencia al enemigo objetivo
        this.speed = 5 * scene.map.scale; // Velocidad ajustada a la escala
        this.damage = damage;    // Cantidad de daño que aplica

        // Crear el sprite del proyectil
        this.sprite = this.scene.add.sprite(x, y, texture)
            .setDisplaySize(10 * this.scene.map.scale, 10 * this.scene.map.scale); // Tamaño ajustado a la escala
    }

    // Método para actualizar la posición del proyectil
    update() {
        // Si el objetivo ya no existe, destruir el proyectil
        if (!this.isTargetValid()) {
            this.destroy();
            return;
        }

        const distance = this.calculateDistanceToTarget();

        if (distance > this.speed) {
            this.moveTowardsTarget(distance);
        } else {
            this.hitTarget();
        }
    }

    // Verifica si el objetivo es válido
    isTargetValid() {
        return this.target && this.target.sprite && this.target.sprite.active;
    }

    // Calcula la distancia al objetivo
    calculateDistanceToTarget() {
        const dx = this.target.sprite.x - this.sprite.x;
        const dy = this.target.sprite.y - this.sprite.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Mueve el proyectil hacia el objetivo
    moveTowardsTarget(distance) {
        const dx = this.target.sprite.x - this.sprite.x;
        const dy = this.target.sprite.y - this.sprite.y;

        this.sprite.x += (dx / distance) * this.speed;
        this.sprite.y += (dy / distance) * this.speed;
    }

    // Maneja el impacto con el objetivo
    hitTarget() {
        const enemyDied = this.target.takeDamage(this.damage);

        if (enemyDied) {
            this.handleEnemyDeath();
        }

        this.destroy();
    }

    // Maneja la lógica cuando un enemigo muere
    handleEnemyDeath() {
        const reward = this.calculateReward();
        this.awardMoney(reward);
        this.updateGameStats();
        this.notifyServer();
    }

    // Calcula la recompensa según el tipo de enemigo
    calculateReward() {
        switch (this.target.type) {
            case 'strong': return 10;
            case 'fast': return 8;
            default: return 5;
        }
    }

    // Añade monedas al jugador
    awardMoney(reward) {
        if (this.scene.agregarMonedas) {
            this.scene.agregarMonedas(reward);
            this.scene.gameStats.moneyEarned += reward;
        }
    }

    // Actualiza las estadísticas del juego
    updateGameStats() {
        if (this.scene.gameStats && this.scene.gameStats.enemiesKilled) {
            this.scene.gameStats.enemiesKilled[this.target.type]++;
            this.scene.gameStats.enemiesKilled.total++;
        }
    }

    // Notifica al servidor sobre la eliminación del enemigo
    notifyServer() {
        if (this.scene.eliminarEnemigo) {
            this.scene.eliminarEnemigo(this.target.id);
        }
    }

    // Método para eliminar el proyectil
    destroy() {
        if (this.sprite && this.sprite.active) {
            this.sprite.destroy();
        }
    }
}
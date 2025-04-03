export default class Decorations {
    constructor(scene, map) {
        this.scene = scene; // Referencia a la escena de Phaser
        this.map = map;     // Referencia al mapa
    }

    // Método para agregar un árbol
    addTree(row, col) {
        // Obtener la posición en la pantalla para esta casilla
        const position = this.map.getTilePosition(row, col);

        const tree = this.scene.add.image(
            position.x,
            position.y,
            'tree'
        );
        tree.setOrigin(0.5, 0.5);
        tree.setDisplaySize(this.map.tileSize, this.map.tileSize);

        // Marcar la casilla como no disponible para torres
        this.map.setTileValue(row, col, 4); // 4 representa una casilla con un árbol
    }

    // Método para agregar una roca
    addRock(row, col) {
        // Obtener la posición en la pantalla para esta casilla
        const position = this.map.getTilePosition(row, col);

        const rock = this.scene.add.image(
            position.x,
            position.y,
            'rock'
        );
        rock.setOrigin(0.5, 0.5);
        rock.setDisplaySize(this.map.tileSize, this.map.tileSize);

        // Marcar la casilla como no disponible para torres
        this.map.setTileValue(row, col, 5); // 5 representa una casilla con una roca
    }

    // Método para agregar un arbusto/casa
    addBush(row, col) {
        // Obtener la posición en la pantalla para esta casilla
        const position = this.map.getTilePosition(row, col);

        const bush = this.scene.add.image(
            position.x,
            position.y,
            'bush'
        );
        bush.setOrigin(0.5, 0.5);
        bush.setDisplaySize(this.map.tileSize, this.map.tileSize);

        // Marcar la casilla como no disponible para torres
        this.map.setTileValue(row, col, 6); // 6 representa una casilla con un arbusto
    }

    // Método para agregar un guardia
    addGuard(row, col) {
        // Obtener la posición en la pantalla para esta casilla
        const position = this.map.getTilePosition(row, col);

        const guard = this.scene.add.image(
            position.x,
            position.y,
            'guardia'
        );
        guard.setOrigin(0.5, 0.5);
        guard.setDisplaySize(this.map.tileSize, this.map.tileSize);

        // Marcar la casilla como no disponible para torres
        this.map.setTileValue(row, col, 7); // 7 representa una casilla con un guardia
    }

    // Método para agregar un guardia tipo 2
    addGuard2(row, col) {
        // Obtener la posición en la pantalla para esta casilla
        const position = this.map.getTilePosition(row, col);

        const guard2 = this.scene.add.image(
            position.x,
            position.y,
            'guardia2'
        );
        guard2.setOrigin(0.5, 0.5);
        guard2.setDisplaySize(this.map.tileSize, this.map.tileSize);

        // Marcar la casilla como no disponible para torres
        this.map.setTileValue(row, col, 8); // 8 representa una casilla con un guardia2
    }
}
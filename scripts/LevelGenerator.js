class LevelGenerator {
    constructor(config, objectPool) {
        this.config = config;
        this.objectPool = objectPool;
        this.obstacles = [];
    }

    generateLevel(playerX, playerY) {
        this.obstacles = this.generateObstacles(playerX, playerY);
        return {
            obstacles: this.obstacles,
            enemies: this.generateEnemies(playerX, playerY)
        };
    }

    generateObstacles(playerX, playerY) {
        const obstacles = [];
        const safeRadius = this.config.PLAYER_SAFE_RADIUS;

        for (let i = 0; i < this.config.OBSTACLE_COUNT; i++) {
            let obstacle;
            do {
                obstacle = this.createRandomObstacle();
            } while (this.isNearPlayer(obstacle, playerX, playerY, safeRadius) || this.intersectsAnyObstacle(obstacle, obstacles));

            obstacles.push(obstacle);
        }

        // Добавляем интерактивные деревья как препятствия
        for (let i = 0; i < this.config.INTERACTIVE_TREE_COUNT; i++) {
            let tree;
            do {
                tree = this.createInteractiveTree();
            } while (this.isNearPlayer(tree, playerX, playerY, safeRadius) || this.intersectsAnyObstacle(tree, obstacles));

            obstacles.push(tree);
        }

        return obstacles;
    }

    createRandomObstacle() {
        const width = Math.random() * (this.config.OBSTACLE_MAX_SIZE - this.config.OBSTACLE_MIN_SIZE) + this.config.OBSTACLE_MIN_SIZE;
        const height = Math.random() * (this.config.OBSTACLE_MAX_SIZE - this.config.OBSTACLE_MIN_SIZE) + this.config.OBSTACLE_MIN_SIZE;
        const x = Math.random() * (this.config.MAP_WIDTH - width);
        const y = Math.random() * (this.config.MAP_HEIGHT - height);
        return new Obstacle(x, y, width, height);
    }

    createInteractiveTree() {
        const x = Math.random() * this.config.MAP_WIDTH;
        const y = Math.random() * this.config.MAP_HEIGHT;
        const size = Math.random() * (this.config.TREE_MAX_SIZE - this.config.TREE_MIN_SIZE) + this.config.TREE_MIN_SIZE;
        return new InteractiveTree(x, y, size);
    }

    generateEnemies(playerX, playerY) {
        const enemies = [];
        const safeRadius = this.config.PLAYER_SAFE_RADIUS * 2;

        for (let i = 0; i < this.config.INITIAL_ENEMY_POOL_SIZE; i++) {
            let position;
            do {
                position = this.getRandomPosition();
            } while (
                this.intersectsAnyObstacle(position, this.obstacles) ||
                this.isNearPlayer(position, playerX, playerY, safeRadius)
            );

            const enemy = this.createEnemy();
            enemy.x = position.x;
            enemy.y = position.y;
            enemy.activate();
            enemies.push(enemy);
        }
        return enemies;
    }

    createEnemy() {
        if (!this.objectPool) {
            console.error('ObjectPool not initialized in LevelGenerator');
            return new Enemy(0, 0, this.config.ENEMY_SIZE, this.config.ENEMY_COLOR, this.config.ENEMY_SPEED);
        }
        if (Math.random() < this.config.SHOOTING_ENEMY_RATE) {
            const enemy = this.objectPool.create('shootingEnemy');
            enemy.init(0, 0, this.config.ENEMY_SIZE, this.config.ENEMY_COLOR, this.config.ENEMY_SPEED);
            return enemy;
        } else {
            const enemy = this.objectPool.create('enemy');
            enemy.init(0, 0, this.config.ENEMY_SIZE, this.config.ENEMY_COLOR, this.config.ENEMY_SPEED);
            return enemy;
        }
    }

    isNearPlayer(object, playerX, playerY, radius) {
        const dx = object.x + object.width / 2 - playerX;
        const dy = object.y + object.height / 2 - playerY;
        return dx * dx + dy * dy < radius * radius;
    }

    intersectsAnyObstacle(object, obstacles) {
        return obstacles.some(obstacle => this.intersects(object, obstacle));
    }

    intersects(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }

    getRandomPosition() {
        return {
            x: Math.random() * this.config.MAP_WIDTH,
            y: Math.random() * this.config.MAP_HEIGHT,
            width: this.config.ENEMY_SIZE,
            height: this.config.ENEMY_SIZE
        };
    }
}

console.log('LevelGenerator.js полностью обновлен');
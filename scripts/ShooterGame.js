class ShooterGame {
    constructor(canvas, soundManager, playerSkin) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.soundManager = soundManager;
        this.playerSkin = playerSkin;

        this.objectPool = new ObjectPool();
        // Регистрируем типы объектов в пуле
        this.objectPool.registerType('bullet', Bullet, ShooterConfig.INITIAL_BULLET_POOL_SIZE);
        this.objectPool.registerType('enemy', Enemy, ShooterConfig.INITIAL_ENEMY_POOL_SIZE);
        this.objectPool.registerType('shootingEnemy', ShootingEnemy, 5);
        this.objectPool.registerType('chargingEnemy', ChargingEnemy, 3);
        this.objectPool.registerType('explosiveEnemy', ExplosiveEnemy, 3);
        this.objectPool.registerType('shieldEnemy', ShieldEnemy, 3);
        this.objectPool.registerType('sniperEnemy', SniperEnemy, 2);
        this.objectPool.registerType('teleporterEnemy', TeleporterEnemy, 2);
        this.objectPool.registerType('boss', Boss, 1);
        this.objectPool.registerType('enemyBullet', EnemyBullet, 20);
        this.objectPool.registerType('droneBullet', DroneBullet, 10);
        this.objectPool.registerType('particle', Particle, ShooterConfig.INITIAL_PARTICLE_POOL_SIZE);

        this.particleManager = new ParticleManager(this.objectPool);
        this.collisionManager = new CollisionManager(this);
        this.marsTerrainRenderer = new MarsTerrainRenderer();
        this.obstacles = [];
        this.lastShotTime = 0;
        this.droneHelper = null;
        this.levelManager = new LevelManager(ShooterConfig, this.objectPool);
        this.spawnManager = new SpawnManager(ShooterConfig, this.objectPool, this.levelManager.generator);

        this.camera = new Camera(
            canvas.width,
            canvas.height,
            ShooterConfig.MAP_WIDTH,
            ShooterConfig.MAP_HEIGHT
        );
        this.stateManager = new GameStateManager(this);
        this.uiManager = new UIManager(canvas, this);
        this.score = 0;
        this.backgroundCache = this.createBackgroundCache();

        this.gameLoopManager = new GameLoopManager(this, 60);

        this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));

        this.resetGame();
    }

    createBackgroundCache() {
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = ShooterConfig.MAP_WIDTH;
        offscreenCanvas.height = ShooterConfig.MAP_HEIGHT;
        const offscreenContext = offscreenCanvas.getContext('2d');

        offscreenContext.fillStyle = ShooterConfig.BACKGROUND_COLOR;
        offscreenContext.fillRect(0, 0, ShooterConfig.MAP_WIDTH, ShooterConfig.MAP_HEIGHT);

        offscreenContext.strokeStyle = ShooterConfig.GRID_COLOR;
        offscreenContext.lineWidth = 1;

        for (let x = 0; x < ShooterConfig.MAP_WIDTH; x += ShooterConfig.GRID_SIZE) {
            offscreenContext.beginPath();
            offscreenContext.moveTo(x, 0);
            offscreenContext.lineTo(x, ShooterConfig.MAP_HEIGHT);
            offscreenContext.stroke();
        }

        for (let y = 0; y < ShooterConfig.MAP_HEIGHT; y += ShooterConfig.GRID_SIZE) {
            offscreenContext.beginPath();
            offscreenContext.moveTo(0, y);
            offscreenContext.lineTo(ShooterConfig.MAP_WIDTH, y);
            offscreenContext.stroke();
        }

        return offscreenCanvas;
    }

    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.uiManager.handleClick(x, y);
    }

    resetGame() {
        this.gameLoopManager.stop();
        if (this.enemySpawnInterval) {
            clearInterval(this.enemySpawnInterval);
        }
        this.soundManager.stopAllSounds();
        this.player = new Player(ShooterConfig.MAP_WIDTH / 2, ShooterConfig.MAP_HEIGHT / 2, this.playerSkin);
        this.droneHelper = new DroneHelper(this.player);
        this.objectPool.releaseAll('bullet');
        this.objectPool.releaseAll('enemy');
        this.objectPool.releaseAll('shootingEnemy');
        this.objectPool.releaseAll('boss');
        this.objectPool.releaseAll('enemyBullet');
        this.objectPool.releaseAll('droneBullet');
        this.objectPool.releaseAll('particle');

        this.levelManager.resetLevels();
        const level = this.levelManager.generateLevel();
        this.initializeLevel(level);

        this.score = 0;
        this.deathDelayTimer = null;
        this.stateManager.setState('menu');
    }

    initializeLevel(level) {
        this.obstacles = level.data.obstacles;

        // Используем позицию спавна из уровня, если она есть
        if (level.data.playerSpawn) {
            this.player.x = level.data.playerSpawn.x;
            this.player.y = level.data.playerSpawn.y;
        } else {
            const safePosition = this.findSafePosition();
            this.player.x = safePosition.x;
            this.player.y = safePosition.y;
        }

        this.spawnManager.initializeLevel(level, this.player);
        if (this.enemySpawnInterval) {
            clearInterval(this.enemySpawnInterval);
        }
        this.spawnManager.spawnInitialEnemies();
        this.enemySpawnInterval = setInterval(() => this.spawnManager.spawnEnemy(), ShooterConfig.ENEMY_SPAWN_DELAY);
    }

    findSafePosition() {
        let position;
        let attempts = 0;
        const maxAttempts = 100;

        do {
            position = {
                x: Math.random() * (ShooterConfig.MAP_WIDTH - ShooterConfig.PLAYER_SIZE),
                y: Math.random() * (ShooterConfig.MAP_HEIGHT - ShooterConfig.PLAYER_SIZE),
                width: ShooterConfig.PLAYER_SIZE,
                height: ShooterConfig.PLAYER_SIZE
            };
            attempts++;

            if (attempts > maxAttempts) {
                console.warn("Не удалось найти безопасную позицию для игрока после " + maxAttempts + " попыток, используем центр карты");
                return {
                    x: ShooterConfig.MAP_WIDTH / 2,
                    y: ShooterConfig.MAP_HEIGHT / 2
                };
            }
        } while (this.levelManager.generator.intersectsAnyObstacle(position, this.obstacles));

        return position;
    }

    start() {
        this.stateManager.setState('playing');
        this.soundManager.setMasterVolume(0.5);
        this.soundManager.playBackgroundMusic('backgroundMusic', { volume: 0.5 });
        this.gameLoopManager.start();
    }

    stop() {
        this.gameLoopManager.stop();
        this.soundManager.stopBackgroundMusic();
    }

    update(deltaTime) {
        switch (this.stateManager.currentState) {
            case 'playing':
                this.updatePlaying(deltaTime);
                break;
            case 'playerDying':
                this.updatePlayerDying(deltaTime);
                break;
            case 'levelComplete':
                this.updateLevelComplete(deltaTime);
                break;
            case 'gameOver':
            case 'gameWon':
                this.updateGameEnd(deltaTime);
                break;
        }
    }

    updatePlaying(deltaTime) {
        this.player.updatePosition(this.obstacles);
        this.player.update(deltaTime);
        this.droneHelper.update(deltaTime);

        this.camera.follow(this.player, deltaTime);

        const bullets = this.objectPool.getActiveObjects('bullet');
        const enemies = this.objectPool.getActiveObjects('enemy');
        const shootingEnemies = this.objectPool.getActiveObjects('shootingEnemy');
        const chargingEnemies = this.objectPool.getActiveObjects('chargingEnemy');
        const explosiveEnemies = this.objectPool.getActiveObjects('explosiveEnemy');
        const shieldEnemies = this.objectPool.getActiveObjects('shieldEnemy');
        const sniperEnemies = this.objectPool.getActiveObjects('sniperEnemy');
        const teleporterEnemies = this.objectPool.getActiveObjects('teleporterEnemy');
        const bosses = this.objectPool.getActiveObjects('boss');
        const enemyBullets = this.objectPool.getActiveObjects('enemyBullet');
        const droneBullets = this.objectPool.getActiveObjects('droneBullet');

        const allEnemies = enemies.concat(shootingEnemies)
                                  .concat(chargingEnemies)
                                  .concat(explosiveEnemies)
                                  .concat(shieldEnemies)
                                  .concat(sniperEnemies)
                                  .concat(teleporterEnemies)
                                  .concat(bosses);

        bullets.forEach(bullet => bullet.update(deltaTime));
        enemies.forEach(enemy => enemy.update(this.player.x, this.player.y, this.obstacles, allEnemies));
        shootingEnemies.forEach(enemy => enemy.update(this.player.x, this.player.y, this.obstacles, this.objectPool, allEnemies));
        chargingEnemies.forEach(enemy => enemy.update(this.player.x, this.player.y, this.obstacles, allEnemies));
        explosiveEnemies.forEach(enemy => {
            const shouldExplode = enemy.update(this.player.x, this.player.y, this.obstacles, allEnemies);
            if (shouldExplode && enemy.isExploding && enemy.explosionTimer <= 0) {
                // Создаем взрыв когда таймер закончился
                const explosionData = enemy.getExplosionData();
                this.particleManager.createExplosiveEnemyExplosion(explosionData.x, explosionData.y, ShooterConfig);
                this.collisionManager.handleExplosion(explosionData);
                this.objectPool.release('explosiveEnemy', enemy);
                this.spawnManager.enemyKilled();
                this.spawnManager.spawnEnemy();
                this.soundManager.playSound('enemyHit');
            }
        });
        shieldEnemies.forEach(enemy => enemy.update(this.player.x, this.player.y, this.obstacles, allEnemies));
        sniperEnemies.forEach(enemy => enemy.update(this.player.x, this.player.y, this.obstacles, this.objectPool, allEnemies));
        teleporterEnemies.forEach(enemy => enemy.update(this.player.x, this.player.y, this.obstacles, allEnemies));
        bosses.forEach(boss => boss.update(this.player.x, this.player.y, this.obstacles, this.objectPool, allEnemies));
        enemyBullets.forEach(bullet => bullet.update(deltaTime));
        droneBullets.forEach(bullet => bullet.update(deltaTime));

        this.obstacles.forEach(obstacle => {
            if (obstacle instanceof InteractiveTree) {
                obstacle.update(this.player.x, this.player.y);
            }
        });

        this.particleManager.update(deltaTime);
        this.collisionManager.checkCollisions();

        if (this.player.isShooting) {
            this.tryShoot();
        }

        if (this.droneHelper.shoot(allEnemies, this.objectPool)) {
            this.soundManager.playSound('shoot');
        }

        if (this.spawnManager.allEnemiesKilled()) {
            if (this.levelManager.currentLevel >= ShooterConfig.MAX_LEVELS) {
                this.endGame(true);
            } else {
                this.completeLevel();
            }
        }
    }

    updatePlayerDying(deltaTime) {
        // Обновляем только анимацию смерти игрока
        this.player.update(deltaTime);
        const isDeathComplete = this.player.updateDeathAnimation(deltaTime);

        // Инициализируем таймер задержки, если анимация завершена
        if (isDeathComplete && !this.deathDelayTimer) {
            this.deathDelayTimer = 180; // 3 секунды при 60 FPS
        }

        // Обратный отсчет таймера задержки
        if (this.deathDelayTimer) {
            this.deathDelayTimer--;
            if (this.deathDelayTimer <= 0) {
                this.endGame(false);
            }
        }

        // Продолжаем обновлять камеру и частицы для плавности
        this.camera.follow(this.player, deltaTime);
        this.particleManager.update(deltaTime);
    }

    updateLevelComplete(deltaTime) {
        // Логика для экрана завершения уровня
    }

    updateGameEnd(deltaTime) {
        // Логика для экрана окончания игры
    }

    tryShoot() {
        const currentTime = performance.now();
        if (currentTime - this.lastShotTime >= ShooterConfig.SHOOT_COOLDOWN) {
            this.shoot();
            this.lastShotTime = currentTime;
        }
    }

    shoot() {
        const bulletPosition = this.player.getBulletStartPosition();
        const bullet = this.objectPool.create('bullet');
        bullet.fire(bulletPosition.x, bulletPosition.y, this.player.direction);
        this.particleManager.createMuzzleFlash(bulletPosition.x, bulletPosition.y, this.player.direction, ShooterConfig);
        this.soundManager.playSound('shoot');
        
        // Активируем анимацию отдачи
        this.player.activateRecoil();
    }

    draw() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        switch (this.stateManager.currentState) {
            case 'playing':
            case 'playerDying':
            case 'levelComplete':
            case 'gameOver':
            case 'gameWon':
            case 'paused':
                this.drawPlaying();
                break;
        }

        this.uiManager.drawUI();

        this.context.fillStyle = 'white';
        this.context.font = '12px Arial';
        this.context.textAlign = 'center';
        this.context.fillText(`FPS: ${this.gameLoopManager.getCurrentFPS()}`, this.canvas.width / 2, this.canvas.height - 10);
        this.context.textAlign = 'left';
    }

    drawPlaying() {
        this.context.save();
        this.camera.applyToContext(this.context);

        // Рисуем тайловую текстуру поверхности Марса
        this.marsTerrainRenderer.drawTerrain(this.context, this.camera);

        this.obstacles.forEach(obstacle => {
            if (this.camera.inView(obstacle)) {
                obstacle.draw(this.context);
            }
        });

        this.objectPool.getActiveObjects('enemy')
            .concat(this.objectPool.getActiveObjects('shootingEnemy'))
            .concat(this.objectPool.getActiveObjects('chargingEnemy'))
            .concat(this.objectPool.getActiveObjects('explosiveEnemy'))
            .concat(this.objectPool.getActiveObjects('shieldEnemy'))
            .concat(this.objectPool.getActiveObjects('sniperEnemy'))
            .concat(this.objectPool.getActiveObjects('teleporterEnemy'))
            .concat(this.objectPool.getActiveObjects('boss'))
            .forEach(enemy => {
                if (this.camera.inView(enemy)) {
                    enemy.draw(this.context);
                }
            });

        this.objectPool.getActiveObjects('bullet').forEach(bullet => {
            if (this.camera.inView(bullet)) {
                bullet.draw(this.context);
            }
        });

        this.objectPool.getActiveObjects('enemyBullet').forEach(bullet => {
            if (this.camera.inView(bullet)) {
                bullet.draw(this.context);
            }
        });

        this.objectPool.getActiveObjects('droneBullet').forEach(bullet => {
            if (this.camera.inView(bullet)) {
                bullet.draw(this.context);
            }
        });

        this.particleManager.draw(this.context, this.camera);

        this.player.draw(this.context);
        this.droneHelper.draw(this.context);

        this.camera.restoreContext(this.context);
        this.context.restore();
    }

    endGame(isWin) {
        this.stop();
        if (this.enemySpawnInterval) {
            clearInterval(this.enemySpawnInterval);
        }
        this.soundManager.playSound(isWin ? 'gameWin' : 'gameOver');
        this.soundManager.stopBackgroundMusic();
        this.stateManager.setState(isWin ? 'gameWon' : 'gameOver');
        if (!isWin) {
            this.particleManager.createExplosion(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, ShooterConfig);
        }
        this.draw();
    }

    completeLevel() {
        this.stateManager.setState('levelComplete');
        this.soundManager.playSound('levelComplete');
        this.draw();
    }

    startNextLevel() {
        const nextLevel = this.levelManager.nextLevel();
        this.initializeLevel(nextLevel);
        this.stateManager.setState('playing');
        this.start();
    }

    setPlayerMovement(dx, dy) {
        if (this.player) {
            this.player.setMovement(dx, dy);
        }
    }

    setPlayerShootingDirection(dx, dy) {
        if (this.player) {
            this.player.setShootingDirection(dx, dy);
        }
    }

    startShooting() {
        if (this.player) {
            this.player.startShooting();
        }
    }

    stopShooting() {
        if (this.player) {
            this.player.stopShooting();
        }
    }

    getScore() {
        return this.score;
    }

    getPlayerHealth() {
        return this.player ? this.player.health : 0;
    }

    getPlayerShield() {
        return this.player ? this.player.shield : 0;
    }

    togglePause() {
        if (this.stateManager.currentState === 'playing') {
            this.stateManager.setState('paused');
            this.stop();
        } else if (this.stateManager.currentState === 'paused') {
            this.stateManager.setState('playing');
            this.start();
        }
    }

    setTargetFPS(fps) {
        this.gameLoopManager.setTargetFPS(fps);
    }

    addScore(points) {
        this.score += points;
    }

    spawnPowerUp() {
        // Логика создания и размещения усилений
    }

    collectPowerUp(powerUp) {
        // Логика сбора и применения усилений
    }

    updateDifficulty() {
        // Логика обновления сложности игры
    }

                saveGameState() {
                        const gameState = {
                            score: this.score,
                            level: this.levelManager.currentLevel,
                            playerHealth: this.player.health,
                            playerShield: this.player.shield,
                            playerX: this.player.x,
                            playerY: this.player.y,
                            enemies: this.objectPool.getActiveObjects('enemy').map(enemy => ({
                                x: enemy.x,
                                y: enemy.y,
                                health: enemy.health
                            })),
                            shootingEnemies: this.objectPool.getActiveObjects('shootingEnemy').map(enemy => ({
                                x: enemy.x,
                                y: enemy.y,
                                health: enemy.health
                            })),
                            obstacles: this.obstacles.map(obstacle => {
                                if (obstacle instanceof InteractiveTree) {
                                    return {
                                        type: 'InteractiveTree',
                                        x: obstacle.x,
                                        y: obstacle.y,
                                        size: obstacle.size
                                    };
                                } else {
                                    return {
                                        type: 'Obstacle',
                                        x: obstacle.x,
                                        y: obstacle.y,
                                        width: obstacle.width,
                                        height: obstacle.height
                                    };
                                }
                            })
                        };
                        localStorage.setItem('gameState', JSON.stringify(gameState));
                    }

                    loadGameState() {
                        const savedState = localStorage.getItem('gameState');
                        if (savedState) {
                            const gameState = JSON.parse(savedState);
                            this.score = gameState.score;
                            this.levelManager.currentLevel = gameState.level;
                            this.player.health = gameState.playerHealth;
                            this.player.shield = gameState.playerShield;
                            this.player.x = gameState.playerX;
                            this.player.y = gameState.playerY;

                            this.objectPool.releaseAll('enemy');
                            this.objectPool.releaseAll('shootingEnemy');

                            gameState.enemies.forEach(enemyData => {
                                const enemy = this.objectPool.create('enemy');
                                enemy.x = enemyData.x;
                                enemy.y = enemyData.y;
                                enemy.health = enemyData.health;
                                enemy.activate();
                            });

                            gameState.shootingEnemies.forEach(enemyData => {
                                const enemy = this.objectPool.create('shootingEnemy');
                                enemy.x = enemyData.x;
                                enemy.y = enemyData.y;
                                enemy.health = enemyData.health;
                                enemy.activate();
                            });

                            this.obstacles = gameState.obstacles.map(obstacleData => {
                                if (obstacleData.type === 'InteractiveTree') {
                                    return new InteractiveTree(obstacleData.x, obstacleData.y, obstacleData.size);
                                } else {
                                    return new Obstacle(obstacleData.x, obstacleData.y, obstacleData.width, obstacleData.height);
                                }
                            });

                            return true;
                        }
                        return false;
                    }

                    resize(width, height) {
                        this.canvas.width = width;
                        this.canvas.height = height;
                        this.camera.width = width;
                        this.camera.height = height;
                        this.uiManager.resize(width, height);
                    }

                    debug(enable) {
                        this.debugMode = enable;
                        if (this.debugMode) {
                            console.log('Debug mode enabled');
                            // Добавьте здесь дополнительную отладочную информацию
                        } else {
                            console.log('Debug mode disabled');
                        }
                    }

                    getGameStats() {
                        return {
                            score: this.score,
                            level: this.levelManager.currentLevel,
                            enemiesKilled: this.spawnManager.killedEnemies,
                            playerHealth: this.player.health,
                            playerShield: this.player.shield,
                            fps: this.gameLoopManager.getCurrentFPS()
                        };
                    }

    getAllEnemies() {
        return [
            ...this.objectPool.getActiveObjects('enemy'),
            ...this.objectPool.getActiveObjects('shootingEnemy'),
            ...this.objectPool.getActiveObjects('boss'),
            ...this.objectPool.getActiveObjects('chargingEnemy'),
            ...this.objectPool.getActiveObjects('explosiveEnemy'),
            ...this.objectPool.getActiveObjects('shieldEnemy'),
            ...this.objectPool.getActiveObjects('sniperEnemy'),
            ...this.objectPool.getActiveObjects('teleporterEnemy')
        ];
    }
                }

                console.log('ShooterGame.js полностью обновлен');
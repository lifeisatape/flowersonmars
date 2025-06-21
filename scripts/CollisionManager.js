class CollisionManager {
    constructor(game) {
        this.game = game;
    }

    checkCollisions() {
        const bullets = this.game.objectPool.getActiveObjects('bullet');
        const enemies = this.game.objectPool.getActiveObjects('enemy');
        const shootingEnemies = this.game.objectPool.getActiveObjects('shootingEnemy');
        const chargingEnemies = this.game.objectPool.getActiveObjects('chargingEnemy');
        const explosiveEnemies = this.game.objectPool.getActiveObjects('explosiveEnemy');
        const shieldEnemies = this.game.objectPool.getActiveObjects('shieldEnemy');
        const sniperEnemies = this.game.objectPool.getActiveObjects('sniperEnemy');
        const teleporterEnemies = this.game.objectPool.getActiveObjects('teleporterEnemy');
        const bosses = this.game.objectPool.getActiveObjects('boss');
        const enemyBullets = this.game.objectPool.getActiveObjects('enemyBullet');
        const droneBullets = this.game.objectPool.getActiveObjects('droneBullet');

        const allEnemies = enemies.concat(shootingEnemies)
                                  .concat(chargingEnemies)
                                  .concat(explosiveEnemies)
                                  .concat(shieldEnemies)
                                  .concat(sniperEnemies)
                                  .concat(teleporterEnemies)
                                  .concat(bosses);

        this.checkPlayerBulletCollisions(bullets, allEnemies);
        this.checkDroneBulletCollisions(droneBullets, allEnemies);
        this.checkEnemyBulletCollisions(enemyBullets);
        this.checkEnemyCollisions(allEnemies);
    }

    checkPlayerBulletCollisions(bullets, enemies) {
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            let bulletHit = false;

            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                if (!bulletHit && bullet.collidesWith(enemy)) {
                    this.game.objectPool.release('bullet', bullet);
                    bulletHit = true;

                    if (enemy.hit()) {
                        let enemyType = 'enemy';
                        let scoreMultiplier = 1;

                        // Определяем тип врага для правильного освобождения из пула
                        if (enemy instanceof Boss) {
                            enemyType = 'boss';
                            scoreMultiplier = 10;
                            // Отмечаем босса как убитого
                            this.game.spawnManager.bossKilledThisLevel();
                        } else if (enemy instanceof ShootingEnemy) {
                            enemyType = 'shootingEnemy';
                            scoreMultiplier = 2;
                        } else if (enemy instanceof ChargingEnemy) {
                            enemyType = 'chargingEnemy';
                            scoreMultiplier = 2;
                        } else if (enemy instanceof ExplosiveEnemy) {
                            enemyType = 'explosiveEnemy';
                            scoreMultiplier = 3;
                            // Взрывной враг создает мощный взрыв при смерти
                            const explosionData = enemy.getExplosionData();
                            this.game.particleManager.createExplosiveEnemyExplosion(explosionData.x, explosionData.y, ShooterConfig);
                            this.handleExplosion(explosionData);
                        } else if (enemy instanceof ShieldEnemy) {
                            enemyType = 'shieldEnemy';
                            scoreMultiplier = 3;
                        } else if (enemy instanceof SniperEnemy) {
                            enemyType = 'sniperEnemy';
                            scoreMultiplier = 4;
                        } else if (enemy instanceof TeleporterEnemy) {
                            enemyType = 'teleporterEnemy';
                            scoreMultiplier = 3;
                        }

                        // Создаем текст убийства с вероятностью 80%
                        if (Math.random() < 0.8) {
                            this.game.player.createKillText(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                        }

                        this.game.objectPool.release(enemyType, enemy);
                        this.game.particleManager.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, ShooterConfig);
                        this.game.score += ShooterConfig.SCORE_PER_ENEMY * scoreMultiplier;
                        this.game.spawnManager.enemyKilled();
                        this.game.spawnManager.spawnEnemy();
                        this.game.soundManager.playSound('enemyHit');

                        // Не спавним нового врага если убили босса (он последний)
                        if (!(enemy instanceof Boss)) {
                            this.game.spawnManager.spawnEnemy();
                        }
                    } else {
                        this.game.soundManager.playSound('enemyHit');
                    }
                }
            }

            if (!bulletHit) {
                this.checkBulletObstacleCollision(bullet);
            }
        }
    }

    checkEnemyCollisions(enemies) {
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            if (this.game.player.collidesWith(enemy)) {
                // Босс НЕ наносит урон при столкновении - только его пули опасны
                if (enemy instanceof Boss) {
                    continue;
                }

                let damage = 10;
                let scoreMultiplier = 1;
                let enemyType = 'enemy';

                // Определяем тип врага для правильного освобождения из пула
                if (enemy instanceof ShootingEnemy) {
                    enemyType = 'shootingEnemy';
                    damage = 15;
                } else if (enemy instanceof ChargingEnemy) {
                    enemyType = 'chargingEnemy';
                    damage = 20; // Берсерки наносят больше урона
                } else if (enemy instanceof ExplosiveEnemy) {
                    enemyType = 'explosiveEnemy';
                    damage = 25; // Взрывные враги очень опасны при контакте
                    const explosionData = enemy.getExplosionData();
                    this.game.particleManager.createExplosiveEnemyExplosion(explosionData.x, explosionData.y, ShooterConfig);
                    this.handleExplosion(explosionData);
                } else if (enemy instanceof ShieldEnemy) {
                    enemyType = 'shieldEnemy';
                    damage = 12;
                } else if (enemy instanceof SniperEnemy) {
                    enemyType = 'sniperEnemy';
                    damage = 8; // Снайперы слабы в ближнем бою
                } else if (enemy instanceof TeleporterEnemy) {
                    enemyType = 'teleporterEnemy';
                    damage = 10;
                }

                const isPlayerDead = this.game.player.takeDamage(damage, enemy.x, enemy.y);

                // Убираем обычных врагов при столкновении
                this.game.objectPool.release(enemyType, enemy);
                this.game.particleManager.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, ShooterConfig);
                this.game.score += ShooterConfig.SCORE_PER_ENEMY * scoreMultiplier;
                this.game.spawnManager.enemyKilled();
                this.game.spawnManager.spawnEnemy();

                if (isPlayerDead) {
                    this.game.stateManager.setState('playerDying');
                    this.game.soundManager.playSound('playerHit');
                    break;
                } else {
                    this.game.soundManager.playSound('playerHit');
                }
            }
        }
    }

    checkEnemyBulletCollisions(enemyBullets) {
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const bullet = enemyBullets[i];
            let bulletHit = false;

            if (this.game.player.collidesWith(bullet)) {
                this.game.objectPool.release('enemyBullet', bullet);
                const damage = ShooterConfig.ENEMY_BULLET_DAMAGE;
                const isPlayerDead = this.game.player.takeDamage(damage, bullet.x, bullet.y);
                bulletHit = true;
                if (isPlayerDead) {
                    this.game.stateManager.setState('playerDying');
                    this.game.soundManager.playSound('playerHit');
                } else {
                    this.game.soundManager.playSound('playerHit');
                }
            }

            if (!bulletHit) {
                this.checkBulletObstacleCollision(bullet, 'enemyBullet');
            }
        }
    }

    checkDroneBulletCollisions(droneBullets, enemies) {
        for (let i = droneBullets.length - 1; i >= 0; i--) {
            const bullet = droneBullets[i];
            let bulletHit = false;

            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                if (bullet.collidesWith(enemy)) {
                    this.game.objectPool.release('droneBullet', bullet);
                    bulletHit = true;
                    if (enemy.hit()) {
                        let enemyType = 'enemy';
                        let scoreMultiplier = 1;

                        // Определяем тип врага для правильного освобождения из пула
                        if (enemy instanceof Boss) {
                            enemyType = 'boss';
                            scoreMultiplier = 10;
                            // Отмечаем босса как убитого
                            this.game.spawnManager.bossKilledThisLevel();
                        } else if (enemy instanceof ShootingEnemy) {
                            enemyType = 'shootingEnemy';
                            scoreMultiplier = 2;
                        } else if (enemy instanceof ChargingEnemy) {
                            enemyType = 'chargingEnemy';
                            scoreMultiplier = 2;
                        } else if (enemy instanceof ExplosiveEnemy) {
                            enemyType = 'explosiveEnemy';
                            scoreMultiplier = 3;
                            const explosionData = enemy.getExplosionData();
                            this.game.particleManager.createExplosiveEnemyExplosion(explosionData.x, explosionData.y, ShooterConfig);
                            this.handleExplosion(explosionData);
                        } else if (enemy instanceof ShieldEnemy) {
                            enemyType = 'shieldEnemy';
                            scoreMultiplier = 3;
                        } else if (enemy instanceof SniperEnemy) {
                            enemyType = 'sniperEnemy';
                            scoreMultiplier = 4;
                        } else if (enemy instanceof TeleporterEnemy) {
                            enemyType = 'teleporterEnemy';
                            scoreMultiplier = 3;
                        }

                        // Создаем текст убийства с вероятностью 60% для дрона
                        if (Math.random() < 0.6) {
                            this.game.player.createKillText(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                        }

                        this.game.objectPool.release(enemyType, enemy);
                        this.game.particleManager.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, ShooterConfig);
                        this.game.score += ShooterConfig.SCORE_PER_ENEMY;
                        this.game.spawnManager.enemyKilled();
                        this.game.spawnManager.spawnEnemy();
                        this.game.soundManager.playSound('enemyHit');

                        this.game.objectPool.release('droneBullet', bullet);
                    }
                    break;
                }
            }

            if (!bulletHit) {
                this.checkBulletObstacleCollision(bullet, 'droneBullet');
            }
        }
    }

    checkBulletObstacleCollision(bullet, bulletType = 'bullet') {
        for (const obstacle of this.game.obstacles) {
            if (bullet.collidesWith(obstacle)) {
                this.game.objectPool.release(bulletType, bullet);
                this.game.particleManager.createSparks(bullet.x, bullet.y, ShooterConfig);
                break;
            }
        }
    }

    checkPlayerObstacleCollisions() {
        for (const obstacle of this.game.obstacles) {
            if (this.game.player.collidesWith(obstacle)) {
                this.resolvePlayerObstacleCollision(this.game.player, obstacle);
            }
        }
    }

    resolvePlayerObstacleCollision(player, obstacle) {
        const overlapX = (player.width + obstacle.width) / 2 - Math.abs(player.x - obstacle.x);
        const overlapY = (player.height + obstacle.height) / 2 - Math.abs(player.y - obstacle.y);

        if (overlapX < overlapY) {
            if (player.x < obstacle.x) {
                player.x = obstacle.x - player.width / 2 - obstacle.width / 2;
            } else {
                player.x = obstacle.x + player.width / 2 + obstacle.width / 2;
            }
            player.velocityX = 0;
        } else {
            if (player.y < obstacle.y) {
                player.y = obstacle.y - player.height / 2 - obstacle.height / 2;
            } else {
                player.y = obstacle.y + player.height / 2 + obstacle.height / 2;
            }
            player.velocityY = 0;
        }
    }

    handleExplosion(explosionData) {
        // Создаем мощный взрыв
        this.game.particleManager.createExplosion(explosionData.x, explosionData.y, {
            ...ShooterConfig,
            EXPLOSION_PARTICLE_COUNT: ShooterConfig.EXPLOSION_PARTICLE_COUNT * 3,
            EXPLOSION_PARTICLE_SPEED: ShooterConfig.EXPLOSION_PARTICLE_SPEED * 1.5
        });

        // Проверяем урон игроку от взрыва
        const dx = this.game.player.x - explosionData.x;
        const dy = this.game.player.y - explosionData.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= explosionData.radius) {
            const isPlayerDead = this.game.player.takeDamage(explosionData.damage, explosionData.x, explosionData.y);
            if (isPlayerDead) {
                this.game.stateManager.setState('playerDying');
            }
        }

        // Наносим урон другим врагам от взрыва
        const allEnemies = this.game.getAllEnemies();
        const enemiesToRemove = [];

        for (const enemy of allEnemies) {
            if (enemy.active) {
                const edx = enemy.x + enemy.width / 2 - explosionData.x;
                const edy = enemy.y + enemy.height / 2 - explosionData.y;
                const enemyDistance = Math.sqrt(edx * edx + edy * edy);

                if (enemyDistance <= explosionData.radius && enemyDistance > 0) {
                    // Взрыв наносит урон другим врагам
                    const isDead = enemy.hit();

                    if (isDead) {
                        // Определяем тип врага для правильного освобождения
                        let enemyType = 'enemy';
                        let scoreMultiplier = 1;

                        if (enemy instanceof Boss) {
                            enemyType = 'boss';
                            scoreMultiplier = 10;
                            // Отмечаем босса как убитого
                            this.game.spawnManager.bossKilledThisLevel();
                        } else if (enemy instanceof ShootingEnemy) {
                            enemyType = 'shootingEnemy';
                            scoreMultiplier = 2;
                        } else if (enemy instanceof ChargingEnemy) {
                            enemyType = 'shootingEnemy';
                            scoreMultiplier = 2;
                        } else if (enemy instanceof ExplosiveEnemy) {
                            enemyType = 'explosiveEnemy';
                            scoreMultiplier = 3;
                            // Если взрывной враг умирает от взрыва, запускаем его собственный взрыв
                            if (!enemy.isExploding) {
                                enemy.startExplosion();
                                continue; // Не убираем сразу, пусть взорвется сам
                            }
                        } else if (enemy instanceof ShieldEnemy) {
                            enemyType = 'shieldEnemy';
                            scoreMultiplier = 3;
                        } else if (enemy instanceof SniperEnemy) {
                            enemyType = 'sniperEnemy';
                            scoreMultiplier = 4;
                        } else if (enemy instanceof TeleporterEnemy) {
                            enemyType = 'teleporterEnemy';
                            scoreMultiplier = 3;
                        }

                        // Добавляем врага в список для удаления
                        enemiesToRemove.push({ enemy, enemyType, scoreMultiplier });
                    }
                }
            }
        }

        // Удаляем убитых врагов и обновляем счетчики
        for (const { enemy, enemyType, scoreMultiplier } of enemiesToRemove) {
            this.game.objectPool.release(enemyType, enemy);

            // Для босса не вызываем обычный enemyKilled(), так как уже вызвали bossKilledThisLevel()
            if (enemyType !== 'boss') {
                this.game.spawnManager.enemyKilled();
            }

            this.game.score += ShooterConfig.SCORE_PER_ENEMY * scoreMultiplier;
            this.game.particleManager.createExplosion(
                enemy.x + enemy.width / 2, 
                enemy.y + enemy.height / 2, 
                ShooterConfig
            );
            this.game.score += ShooterConfig.SCORE_PER_ENEMY * scoreMultiplier;
            this.game.spawnManager.enemyKilled();
            this.game.soundManager.playSound('enemyHit');

            // Спавним новых врагов (кроме боссов)
            if (!(enemy instanceof Boss)) {
                this.game.spawnManager.spawnEnemy();
            }
        }
    }
}

console.log('CollisionManager.js полностью обновлен');
class SniperEnemy extends Enemy {
    constructor(x, y, size, color, speed) {
        super(x, y, size * 0.8, color, speed * 0.5); // Меньше и медленнее
        this.shootCooldown = 0;
        this.maxShootCooldown = 100; // Стреляет реже, но метче
        this.sightRange = 800;
        this.aimTime = 60; // Время прицеливания
        this.isAiming = false;
        this.aimTimer = 0;
        this.targetX = 0;
        this.targetY = 0;

        // Лазерный прицел
        this.laserSight = {
            active: false,
            startX: 0,
            startY: 0,
            endX: 0,
            endY: 0
        };

        // Переопределяем цвета для снайпера
        this.feetParams.color = '#2F4F4F';
        this.body.color = '#2F4F4F';

        // Снайперская винтовка
        this.weaponImage = new Image();
        this.weaponImage.src = ShooterConfig.ENEMY_WEAPON_SKIN || ShooterConfig.WEAPON_SKIN;
        this.weaponSize = ShooterConfig.ENEMY_WEAPON_SIZE * 1.2;
        this.direction = 0;

        this.wobble = Math.random() * Math.PI * 2;
        this.wobbleSpeed = 0.02 + Math.random() * 0.04;
    }

    activate() {
        super.activate();
        // Убеждаемся что цвета применяются при активации
        this.feetParams.color = '#2F4F4F';
        this.body.color = '#2F4F4F';
        this.isAiming = false;
        this.laserSight.active = false;
    }

    update(playerX, playerY, obstacles, objectPool, allEnemies = []) {
        if (!this.active) return;

        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);

        // Снайпер использует тактику "бей и беги"
        let directionX = 0;
        let directionY = 0;

        if (this.isAiming) {
            // Во время прицеливания стоит на месте
            directionX = 0;
            directionY = 0;
        } else if (this.shootCooldown > this.maxShootCooldown * 0.7) {
            // После выстрела - быстро перемещается в новую позицию
            const retreatSpeed = this.speed * 3;

            // Выбираем случайное направление отступления (не обязательно от игрока)
            const retreatAngle = Date.now() * 0.001 + this.wobble;
            directionX = Math.cos(retreatAngle);
            directionY = Math.sin(retreatAngle);

            let newX = this.x + directionX * retreatSpeed;
            let newY = this.y + directionY * retreatSpeed;

            // Проверка коллизий
            let canMoveX = true;
            let canMoveY = true;

            for (const obstacle of obstacles) {
                if (this.checkCollision({x: newX, y: this.y, width: this.width, height: this.height}, obstacle)) {
                    canMoveX = false;
                }
                if (this.checkCollision({x: this.x, y: newY, width: this.width, height: this.height}, obstacle)) {
                    canMoveY = false;
                }
            }

            if (canMoveX) this.x = newX;
            if (canMoveY) this.y = newY;
        } else {
            // Обычное время - медленно маневрирует для лучшей позиции
            const optimalDistance = this.sightRange * 0.8;

            if (distanceToPlayer < optimalDistance * 0.6) {
                // Слишком близко - отступаем
                directionX = -dx / distanceToPlayer;
                directionY = -dy / distanceToPlayer;
            } else if (distanceToPlayer > optimalDistance * 1.2) {
                // Слишком далеко - медленно приближаемся
                directionX = dx / distanceToPlayer * 0.3;
                directionY = dy / distanceToPlayer * 0.3;
            } else {
                // На хорошей дистанции - движемся по дуге для лучшего угла
                const arcDirection = Math.sin(Date.now() * 0.002) > 0 ? 1 : -1;
                directionX = -dy / distanceToPlayer * arcDirection * 0.5;
                directionY = dx / distanceToPlayer * arcDirection * 0.5;
            }

            let newX = this.x + directionX * this.speed;
            let newY = this.y + directionY * this.speed;

            // Проверка коллизий
            let canMoveX = true;
            let canMoveY = true;

            for (const obstacle of obstacles) {
                if (this.checkCollision({x: newX, y: this.y, width: this.width, height: this.height}, obstacle)) {
                    canMoveX = false;
                }
                if (this.checkCollision({x: this.x, y: newY, width: this.width, height: this.height}, obstacle)) {
                    canMoveY = false;
                }
            }

            if (canMoveX) this.x = newX;
            if (canMoveY) this.y = newY;
        }

        this.x = Math.max(0, Math.min(this.x, ShooterConfig.MAP_WIDTH - this.width));
        this.y = Math.max(0, Math.min(this.y, ShooterConfig.MAP_HEIGHT - this.height));

        this.direction = Math.atan2(dy, dx);

        // Логика стрельбы
        if (distanceToPlayer <= this.sightRange) {
            if (!this.isAiming && this.shootCooldown <= 0) {
                this.startAiming(playerX, playerY);
            }

            if (this.isAiming) {
                this.aimTimer--;
                this.updateLaserSight(playerX, playerY);

                if (this.aimTimer <= 0) {
                    this.shoot(objectPool);
                    this.isAiming = false;
                    this.laserSight.active = false;
                    this.shootCooldown = this.maxShootCooldown;
                }
            }
        }

        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        }

        this.wobble += this.wobbleSpeed;
        this.updateFeet(directionX, directionY);
        this.updateIdleAnimation();
    }

    startAiming(playerX, playerY) {
        this.isAiming = true;
        this.aimTimer = this.aimTime;
        this.targetX = playerX;
        this.targetY = playerY;
        this.laserSight.active = true;
    }

    updateLaserSight(playerX, playerY) {
        this.laserSight.startX = this.x + this.width / 2;
        this.laserSight.startY = this.y + this.height / 2;
        this.laserSight.endX = playerX;
        this.laserSight.endY = playerY;
    }

    shoot(objectPool) {
        const bullet = objectPool.create('enemyBullet');
        const angle = Math.atan2(this.targetY - this.y, this.targetX - this.x);
        bullet.fire(this.x + this.width / 2, this.y + this.height / 2, angle);
        bullet.speed = ShooterConfig.BULLET_SPEED * 4; // Быстрее обычных пуль
    }

    draw(context) {
        if (!this.active) return;

        super.draw(context);

        // Рисуем оружие
        this.drawWeapon(context);

        // Рисуем лазерный прицел
        if (this.laserSight.active) {
            context.save();
            context.strokeStyle = `rgba(255, 0, 0, ${0.7 * (this.aimTimer / this.aimTime)})`;
            context.lineWidth = 2;
            context.setLineDash([5, 5]);
            context.beginPath();
            context.moveTo(this.laserSight.startX, this.laserSight.startY);
            context.lineTo(this.laserSight.endX, this.laserSight.endY);
            context.stroke();
            context.restore();
        }
    }

    drawWeapon(context) {
        context.save();
        context.translate(this.x + this.width / 2, this.y + this.height / 2);

        const isLookingLeft = Math.abs(this.direction) > Math.PI / 2;

        if (isLookingLeft) {
            context.scale(1, -1);
            context.rotate(-this.direction);
        } else {
            context.rotate(this.direction);
        }

        context.drawImage(
            this.weaponImage,
            -this.weaponSize / 2,
            -this.weaponSize / 2,
            this.weaponSize,
            this.weaponSize
        );

        context.restore();
    }
}

console.log('SniperEnemy.js loaded');
class ShootingEnemy extends Enemy {
    constructor(x, y, size, color, speed) {
        super(x, y, size, color, speed);
        this.shootCooldown = 0;
        this.maxShootCooldown = 120; // Стреляет каждые 2 секунды (при 60 FPS)

        // Параметры оружия
        this.weaponImage = new Image();
        this.weaponImage.src = ShooterConfig.ENEMY_WEAPON_SKIN || ShooterConfig.WEAPON_SKIN;
        this.weaponSize = ShooterConfig.ENEMY_WEAPON_SIZE || 80;
        this.direction = 0; // Направление, в котором смотрит враг

        // Параметры отдачи оружия
        this.recoil = {
            duration: 5,
            currentFrame: 0,
            offset: 5,
            rotation: Math.PI / 36
        };
    }

    activate() {
        super.activate();
        // Переопределяем цвета для стреляющего врага
        this.feetParams.color = '#FF6347';
        this.body.color = '#FF6347';
        this.shootCooldown = 0;
        this.recoil.currentFrame = 0;
    }

    update(playerX, playerY, obstacles, objectPool, allEnemies = []) {
        if (!this.active) return;

        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Стреляющие враги используют круговое движение (стрейфинг)
        const optimalDistance = 200; // Предпочитаемая дистанция для стрельбы
        
        let directionX, directionY;
        
        if (distance > optimalDistance + 50) {
            // Если слишком далеко - приближаемся
            directionX = dx / distance;
            directionY = dy / distance;
        } else if (distance < optimalDistance - 50) {
            // Если слишком близко - отступаем
            directionX = -dx / distance;
            directionY = -dy / distance;
        } else {
            // На оптимальной дистанции - двигаемся по кругу
            const strafeDirection = this.wobble > Math.PI ? 1 : -1;
            directionX = -dy / distance * strafeDirection;
            directionY = dx / distance * strafeDirection;
        }

        this.wobble += this.wobbleSpeed;

        // Добавляем отталкивание от других врагов
        let repulsionX = 0;
        let repulsionY = 0;
        const repulsionRadius = this.width * 1.5;
        const repulsionForce = 2;

        for (const enemy of allEnemies) {
            if (enemy !== this && enemy.active) {
                const edx = this.x - enemy.x;
                const edy = this.y - enemy.y;
                const enemyDistance = Math.sqrt(edx * edx + edy * edy);

                if (enemyDistance < repulsionRadius && enemyDistance > 0) {
                    const repulsionStrength = (repulsionRadius - enemyDistance) / repulsionRadius;
                    repulsionX += (edx / enemyDistance) * repulsionForce * repulsionStrength;
                    repulsionY += (edy / enemyDistance) * repulsionForce * repulsionStrength;
                }
            }
        }

        directionX += repulsionX * 0.3;
        directionY += repulsionY * 0.3;

        const finalDistance = Math.sqrt(directionX * directionX + directionY * directionY);
        if (finalDistance > 0) {
            directionX /= finalDistance;
            directionY /= finalDistance;
        }

        const wobbleX = Math.sin(this.wobble) * 2;
        const wobbleY = Math.cos(this.wobble) * 2;

        let newX = this.x + directionX * this.speed + wobbleX;
        let newY = this.y + directionY * this.speed + wobbleY;

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

        this.x = Math.max(0, Math.min(this.x, ShooterConfig.MAP_WIDTH - this.width));
        this.y = Math.max(0, Math.min(this.y, ShooterConfig.MAP_HEIGHT - this.height));

        // Обновляем направление на игрока для стрельбы
        this.direction = Math.atan2(playerY - this.y, playerX - this.x);

        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        } else {
            this.shoot(playerX, playerY, objectPool);
            this.shootCooldown = this.maxShootCooldown;
        }

        // Обновление отдачи
        if (this.recoil.currentFrame > 0) {
            this.recoil.currentFrame--;
        }

        this.updateFeet(directionX, directionY);
        this.updateIdleAnimation();
    }

    shoot(playerX, playerY, objectPool) {
        const bullet = objectPool.create('enemyBullet');
        const angle = Math.atan2(playerY - this.y, playerX - this.x);
        bullet.fire(this.x + this.width / 2, this.y + this.height / 2, angle);

        // Активация отдачи
        this.recoil.currentFrame = this.recoil.duration;
    }

    draw(context) {
        super.draw(context);

        // Рисуем оружие
        this.drawWeapon(context);
    }

    drawWeapon(context) {
        context.save();
        context.translate(this.x + this.width / 2, this.y + this.height / 2);

        // Определяем, смотрит ли враг влево
        const isLookingLeft = Math.abs(this.direction) > Math.PI / 2;

        if (isLookingLeft) {
            context.scale(1, -1);
            context.rotate(-this.direction);
        } else {
            context.rotate(this.direction);
        }

        // Применяем эффект отдачи
        const recoilProgress = this.recoil.currentFrame / this.recoil.duration;
        const recoilOffset = Math.sin(recoilProgress * Math.PI) * this.recoil.offset;
        const recoilRotation = Math.sin(recoilProgress * Math.PI) * this.recoil.rotation;

        context.translate(recoilOffset, 0);
        context.rotate(recoilRotation);

        // Рисуем оружие
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

console.log('Updated ShootingEnemy.js with mirrored weapon loaded');
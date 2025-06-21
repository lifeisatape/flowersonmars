class ShieldEnemy extends Enemy {
    constructor(x, y, size, color, speed) {
        super(x, y, size, color, speed);
        this.maxShieldHealth = 3;
        this.shieldHealth = this.maxShieldHealth;
        this.shieldSize = size * 1.5;
        this.shieldRotation = 0;
        this.shieldRotationSpeed = 0.05;

        // Переопределяем цвета для щитового врага
        this.feetParams.color = '#4169E1';
        this.body.color = '#4169E1';
    }

    activate() {
        super.activate();
        // Убеждаемся что цвета применяются при активации
        this.feetParams.color = '#4169E1';
        this.body.color = '#4169E1';
        this.shieldHealth = this.maxShieldHealth;
    }

    hit() {
        if (this.shieldHealth > 0) {
            this.shieldHealth--;
            return false; // Щит поглощает урон
        } else {
            this.health--;
            return this.health <= 0;
        }
    }

    update(playerX, playerY, obstacles, allEnemies = []) {
        if (!this.active) return;

        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Щитовые враги используют оборонительную тактику - медленно приближаются, защищая других врагов
        let directionX = dx / distance;
        let directionY = dy / distance;

        // Движутся медленнее обычного (танк-роль)
        const defensiveSpeed = this.speed * 0.7;

        // Если рядом есть другие враги, попытка встать между ними и игроком
        let protectionTargetX = 0;
        let protectionTargetY = 0;
        let hasProtectionTarget = false;

        for (const enemy of allEnemies) {
            if (enemy !== this && enemy.active && !(enemy instanceof ShieldEnemy)) {
                const enemyDx = enemy.x - this.x;
                const enemyDy = enemy.y - this.y;
                const enemyDistance = Math.sqrt(enemyDx * enemyDx + enemyDy * enemyDy);

                // Если враг близко и нуждается в защите
                if (enemyDistance < 100) {
                    protectionTargetX = enemy.x;
                    protectionTargetY = enemy.y;
                    hasProtectionTarget = true;
                    break;
                }
            }
        }

        if (hasProtectionTarget) {
            // Встаем между союзником и игроком
            const allyToPlayerX = playerX - protectionTargetX;
            const allyToPlayerY = playerY - protectionTargetY;
            const allyToPlayerDistance = Math.sqrt(allyToPlayerX * allyToPlayerX + allyToPlayerY * allyToPlayerY);

            if (allyToPlayerDistance > 0) {
                const protectionX = protectionTargetX + (allyToPlayerX / allyToPlayerDistance) * 60;
                const protectionY = protectionTargetY + (allyToPlayerY / allyToPlayerDistance) * 60;

                const toProtectionX = protectionX - this.x;
                const toProtectionY = protectionY - this.y;
                const toProtectionDistance = Math.sqrt(toProtectionX * toProtectionX + toProtectionY * toProtectionY);

                if (toProtectionDistance > 20) {
                    directionX = toProtectionX / toProtectionDistance;
                    directionY = toProtectionY / toProtectionDistance;
                }
            }
        }

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

        this.wobble += this.wobbleSpeed;
        const wobbleX = Math.sin(this.wobble) * 1; // Меньше дрожания для танка
        const wobbleY = Math.cos(this.wobble) * 1;

        let newX = this.x + directionX * defensiveSpeed + wobbleX;
        let newY = this.y + directionY * defensiveSpeed + wobbleY;

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

        this.updateFeet(directionX, directionY);
        this.updateIdleAnimation();
        this.shieldRotation += this.shieldRotationSpeed;
    }

    draw(context) {
        if (!this.active) return;

        super.draw(context);

        // Рисуем щит, если он есть
        if (this.shieldHealth > 0) {
            context.save();
            context.translate(this.x + this.width / 2, this.y + this.height / 2);
            context.rotate(this.shieldRotation);

            // Цвет щита зависит от его прочности
            const shieldAlpha = this.shieldHealth / this.maxShieldHealth;
            context.strokeStyle = `rgba(65, 105, 225, ${shieldAlpha})`;
            context.fillStyle = `rgba(65, 105, 225, ${shieldAlpha * 0.3})`;
            context.lineWidth = 3;

            // Рисуем шестиугольный щит
            context.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                const x = Math.cos(angle) * this.shieldSize / 2;
                const y = Math.sin(angle) * this.shieldSize / 2;
                if (i === 0) {
                    context.moveTo(x, y);
                } else {
                    context.lineTo(x, y);
                }
            }
            context.closePath();
            context.fill();
            context.stroke();

            context.restore();
        }
    }
}

console.log('ShieldEnemy.js loaded');
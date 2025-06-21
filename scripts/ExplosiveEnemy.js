class ExplosiveEnemy extends Enemy {
    constructor(x, y, size, color, speed) {
        super(x, y, size, color, speed);
        this.explosionRadius = 150; // Увеличиваем радиус взрыва
        this.explosionDamage = 20; // Увеличиваем урон взрыва
        this.fuseTime = 90; // 1.5 секунды до взрыва после смерти
        this.isExploding = false;
        this.explosionTimer = 0;
        this.blinkTimer = 0;

        // Переопределяем цвета для взрывного врага
        this.feetParams.color = '#8B0000';
        this.body.color = '#8B0000';
    }

    activate() {
        super.activate();
        // Убеждаемся что цвета применяются при активации
        this.feetParams.color = '#8B0000';
        this.body.color = '#8B0000';
        this.isExploding = false;
        this.explosionTimer = 0;
        this.blinkTimer = 0;
    }

    hit() {
        this.health--;
        if (this.health <= 0 && !this.isExploding) {
            this.startExplosion();
            return false; // Не убираем врага сразу
        }
        return false;
    }

    startExplosion() {
        this.isExploding = true;
        this.explosionTimer = this.fuseTime;
    }

    update(playerX, playerY, obstacles, allEnemies = []) {
        if (!this.active) return false;

        if (this.isExploding) {
            this.explosionTimer--;
            this.blinkTimer++;

            if (this.explosionTimer <= 0) {
                // Взрыв произошел - деактивируем врага
                this.active = false;
                return true; // Сигнал для удаления
            }
        } else {
            // Взрывной враг использует камикадзе-тактику - прямая атака на максимальной скорости
            const dx = playerX - this.x;
            const dy = playerY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Всегда движется прямо к игроку на максимальной скорости
            let directionX = dx / distance;
            let directionY = dy / distance;

            // Увеличиваем скорость по мере приближения (эффект нарастающей угрозы)
            const speedMultiplier = distance < 150 ? 2 : 1.5;
            const kamikazeSpeed = this.speed * speedMultiplier;

            this.wobble += this.wobbleSpeed * 2; // Быстрее дрожание от напряжения
            const wobbleX = Math.sin(this.wobble) * 1; // Меньше дрожания для точности
            const wobbleY = Math.cos(this.wobble) * 1;

            let newX = this.x + directionX * kamikazeSpeed + wobbleX;
            let newY = this.y + directionY * kamikazeSpeed + wobbleY;

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

            this.x = Math.max(0, Math.min(this.x, ShooterConfig.MAP_WIDTH - this.width));
            this.y = Math.max(0, Math.min(this.y, ShooterConfig.MAP_HEIGHT - this.height));

            this.updateFeet(directionX, directionY);
            this.updateIdleAnimation();
        }
        return false;
    }

    explode() {
        // Взрыв происходит - создаем эффекты
        this.active = false;
        return true;
    }

    draw(context) {
        if (!this.active) return;

        context.save();

        // Показываем радиус взрыва при мигании
        if (this.isExploding) {
            const alpha = Math.floor(this.blinkTimer / 5) % 2 === 0 ? 0.3 : 0.1;
            context.globalAlpha = alpha;
            context.strokeStyle = '#FF0000';
            context.lineWidth = 3;
            context.setLineDash([5, 5]);
            context.beginPath();
            context.arc(
                this.x + this.width / 2, 
                this.y + this.height / 2, 
                this.explosionRadius, 
                0, 
                Math.PI * 2
            );
            context.stroke();
            context.setLineDash([]);
        }

        // Мигание при взрыве
        if (this.isExploding && Math.floor(this.blinkTimer / 10) % 2 === 0) {
            context.globalAlpha = 0.5;
            context.shadowColor = '#FF0000';
            context.shadowBlur = 15;
        }

        super.draw(context);
        context.restore();
    }

    getExplosionData() {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2,
            radius: this.explosionRadius,
            damage: this.explosionDamage
        };
    }
}

console.log('ExplosiveEnemy.js loaded');
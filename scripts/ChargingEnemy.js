class ChargingEnemy extends Enemy {
    constructor(x, y, size, color, speed) {
        super(x, y, size, color, speed);
        this.chargeSpeed = speed * 3;
        this.chargeDistance = 200;
        this.isCharging = false;
        this.chargeTimer = 0;
        this.maxChargeTimer = 180; // 3 секунды
        this.detectionRadius = 150;

        // Визуальные эффекты для зарядки
        this.chargeGlow = 0;
        this.originalColor = color;

        // Переопределяем цвета для берсерка
        this.feetParams.color = '#FF4500';
        this.body.color = '#FF4500';
    }

    activate() {
        super.activate();
        this.isCharging = false;
        this.chargeTimer = 0;
    }

    update(playerX, playerY, obstacles, allEnemies = []) {
        if (!this.active) return;

        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);

        // Проверяем, нужно ли начать зарядку
        if (!this.isCharging && distanceToPlayer <= this.detectionRadius) {
            this.isCharging = true;
            this.chargeTimer = this.maxChargeTimer;
        }

        if (this.isCharging) {
            this.chargeTimer--;
            this.chargeGlow = Math.sin(Date.now() * 0.02) * 0.5 + 0.5;

            if (this.chargeTimer <= 0) {
                // Выполняем рывок к игроку
                const directionX = dx / distanceToPlayer;
                const directionY = dy / distanceToPlayer;

                let newX = this.x + directionX * this.chargeSpeed;
                let newY = this.y + directionY * this.chargeSpeed;

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

                // Сброс зарядки после рывка
                this.isCharging = false;
            }
        } else {
            // Берсерк использует тактику "засады" - подкрадывается медленно, затем резко атакует
            let directionX, directionY;

            if (distanceToPlayer > this.detectionRadius) {
                // Если далеко - подкрадываемся медленно и скрытно
                const sneakSpeed = this.speed * 0.3;

                // Используем непрямой путь для подкрадывания
                const angle = Math.atan2(dy, dx);
                const sneakAngleOffset = Math.sin(Date.now() * 0.005) * 0.8;
                const sneakAngle = angle + sneakAngleOffset;

                directionX = Math.cos(sneakAngle);
                directionY = Math.sin(sneakAngle);

                this.wobble += this.wobbleSpeed * 0.5; // Медленнее дрожание при подкрадывании

                let newX = this.x + directionX * sneakSpeed;
                let newY = this.y + directionY * sneakSpeed;

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
            }
        }

        this.updateIdleAnimation();
    }

    draw(context) {
        if (!this.active) return;

        context.save();

        // Эффект свечения при зарядке
        if (this.isCharging) {
            context.shadowColor = '#FF4500';
            context.shadowBlur = 20 * this.chargeGlow;
        }

        super.draw(context);
        context.restore();
    }
}

console.log('ChargingEnemy.js loaded');
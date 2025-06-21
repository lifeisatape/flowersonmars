class TeleporterEnemy extends Enemy {
    constructor(x, y, size, color, speed) {
        super(x, y, size, color, speed);
        this.teleportCooldown = 0;
        this.maxTeleportCooldown = 300; // 5 секунд
        this.teleportRange = 200;
        this.isTeleporting = false;
        this.teleportTimer = 0;
        this.teleportDuration = 30; // Время анимации телепорта

        // Эффекты телепортации
        this.teleportAlpha = 1;
        this.teleportParticles = [];

        // Переопределяем цвета для телепортера
        this.feetParams.color = '#9400D3';
        this.body.color = '#9400D3';
    }

    activate() {
        super.activate();
        // Убеждаемся что цвета применяются при активации
        this.feetParams.color = '#9400D3';
        this.body.color = '#9400D3';
        this.isTeleporting = false;
        this.teleportAlpha = 1;
        this.teleportParticles = [];
    }

    update(playerX, playerY, obstacles, allEnemies = []) {
        if (!this.active) return;

        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);

        if (this.isTeleporting) {
            this.teleportTimer--;

            // Анимация исчезновения/появления
            if (this.teleportTimer > this.teleportDuration / 2) {
                this.teleportAlpha = (this.teleportTimer - this.teleportDuration / 2) / (this.teleportDuration / 2);
            } else {
                this.teleportAlpha = (this.teleportDuration / 2 - this.teleportTimer) / (this.teleportDuration / 2);
            }

            // В середине телепорта меняем позицию
            if (this.teleportTimer === this.teleportDuration / 2) {
                this.performTeleport(playerX, playerY, obstacles);
            }

            if (this.teleportTimer <= 0) {
                this.isTeleporting = false;
                this.teleportAlpha = 1;
                this.teleportCooldown = this.maxTeleportCooldown;
            }
        } else {
            // Телепортер использует крайне непредсказуемое движение
            let directionX, directionY;

            // Случайные рывки в разные стороны
            if (Math.random() < 0.1) { // 10% шанс каждый кадр
                this.randomBurstDirection = Math.random() * Math.PI * 2;
                this.burstTimer = 30 + Math.random() * 30; // 0.5-1 секунда
            }

            if (this.burstTimer > 0) {
                // Движение в случайном направлении
                this.burstTimer--;
                directionX = Math.cos(this.randomBurstDirection);
                directionY = Math.sin(this.randomBurstDirection);
            } else {
                // Обычное хаотичное движение к игроку с большими отклонениями
                const baseDirectionX = dx / distanceToPlayer;
                const baseDirectionY = dy / distanceToPlayer;

                // Добавляем очень сильный случайный компонент
                const randomAngle = Date.now() * 0.01 + this.wobble * 5;
                const randomStrength = 0.8; // Сильное отклонение

                directionX = baseDirectionX + Math.cos(randomAngle) * randomStrength;
                directionY = baseDirectionY + Math.sin(randomAngle) * randomStrength;

                // Нормализуем
                const length = Math.sqrt(directionX * directionX + directionY * directionY);
                if (length > 0) {
                    directionX /= length;
                    directionY /= length;
                }
            }

            this.wobble += this.wobbleSpeed * 2; // Быстрее обычного

            // Применяем движение
            const wobbleX = Math.sin(this.wobble) * 3; // Сильнее дрожание
            const wobbleY = Math.cos(this.wobble) * 3;

            let newX = this.x + directionX * this.speed + wobbleX;
            let newY = this.y + directionY * this.speed + wobbleY;

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

            // Проверяем, нужно ли телепортироваться (более агрессивная логика)
            if (this.teleportCooldown <= 0 && (distanceToPlayer < 100 || Math.random() < 0.005)) {
                this.startTeleport();
            }
        }

        if (this.teleportCooldown > 0) {
            this.teleportCooldown--;
        }

        this.updateIdleAnimation();
        this.updateTeleportParticles();
    }

    startTeleport() {
        this.isTeleporting = true;
        this.teleportTimer = this.teleportDuration;
    }

    performTeleport(playerX, playerY, obstacles) {
        let attempts = 0;
        let newPosition;

        do {
            // Телепортируемся в случайное место рядом с игроком
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.teleportRange + 50;

            newPosition = {
                x: playerX + Math.cos(angle) * distance,
                y: playerY + Math.sin(angle) * distance,
                width: this.width,
                height: this.height
            };

            // Убеждаемся что позиция в пределах карты
            newPosition.x = Math.max(0, Math.min(newPosition.x, ShooterConfig.MAP_WIDTH - this.width));
            newPosition.y = Math.max(0, Math.min(newPosition.y, ShooterConfig.MAP_HEIGHT - this.height));

            attempts++;
        } while (this.intersectsObstacles(newPosition, obstacles) && attempts < 10);

        this.x = newPosition.x;
        this.y = newPosition.y;
        this.createTeleportParticles();
    }

    intersectsObstacles(position, obstacles) {
        for (const obstacle of obstacles) {
            if (position.x < obstacle.x + obstacle.width &&
                position.x + position.width > obstacle.x &&
                position.y < obstacle.y + obstacle.height &&
                position.y + position.height > obstacle.y) {
                return true;
            }
        }
        return false;
    }

    createTeleportParticles() {
        for (let i = 0; i < 10; i++) {
            this.teleportParticles.push({
                x: this.x + this.width / 2,
                y: this.y + this.height / 2,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 30,
                maxLife: 30
            });
        }
    }

    updateTeleportParticles() {
        for (let i = this.teleportParticles.length - 1; i >= 0; i--) {
            const particle = this.teleportParticles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;

            if (particle.life <= 0) {
                this.teleportParticles.splice(i, 1);
            }
        }
    }

    draw(context) {
        if (!this.active) return;

        context.save();
        context.globalAlpha = this.teleportAlpha;

        // Эффект свечения при телепортации
        if (this.isTeleporting) {
            context.shadowColor = '#9400D3';
            context.shadowBlur = 20;
        }

        super.draw(context);

        // Рисуем частицы телепортации
        this.teleportParticles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            context.fillStyle = `rgba(148, 0, 211, ${alpha})`;
            context.beginPath();
            context.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
            context.fill();
        });

        context.restore();
    }
}

console.log('TeleporterEnemy.js loaded');
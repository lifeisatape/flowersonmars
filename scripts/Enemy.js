class Enemy extends GameObject {
    constructor(x, y, size, color, speed) {
        super(x, y, size, size, color);
        this.init(x, y, size, color, speed);
    }

    init(x, y, size, color, speed) {
        this.x = x;
        this.y = y;
        this.width = size;
        this.height = size;
        this.color = color;
        this.speed = speed;
        this.health = 1;
        this.active = false;
        this.wobble = 0;
        this.wobbleSpeed = Math.random() * 0.1 + 0.05;
        this.changeDirectionCounter = 0;

        // Параметры для анимации тела и ног
        this.feet = {
            left: { x: -15, y: 30, phase: 0, angle: 0 },
            right: { x: 15, y: 30, phase: Math.PI, angle: 0 }
        };
        this.feetParams = {
            baseSpeed: 0.1,
            speedMultiplier: 0.03,
            jumpHeight: 10,
            strideLength: 25,
            size: { width: 20, height: 10 },
            color: '#68C490', // Зеленый цвет для ног врага
            separation: 7,
            startPositionLeft: { x: -20, y: 30 },
            startPositionRight: { x: 20, y: 30 }
        };
        this.body = {
            width: 30,
            height: 35,
            color: '#68C490', // Зеленый цвет для тела врага
            swayAngle: 15,
            swaySpeed: 0.01,
            swayAmplitude: Math.PI / 16
        };
        this.idleAnimation = {
            time: 0,
            speed: 0.03,
            amplitude: 5
        };

        // Обновленные параметры для головы и тени
        const headSizeRatio = ShooterConfig.ENEMY_HEAD_SIZE_RATIO || 0.8;
        const headOffsetYRatio = ShooterConfig.ENEMY_HEAD_OFFSET_Y_RATIO || -0.3;
        this.head = {
            image: new Image(),
            size: size * headSizeRatio,
            offsetY: size * headOffsetYRatio
        };
        this.head.image.src = this.getRandomSkin();
        this.direction = 0; // Направление движения врага

        const shadowSizeRatio = ShooterConfig.ENEMY_SHADOW_SIZE_RATIO || 1.2;
        const shadowOffsetYRatio = ShooterConfig.ENEMY_SHADOW_OFFSET_Y_RATIO || 0.5;
        this.shadow = {
            size: size * shadowSizeRatio,
            offsetY: size * shadowOffsetYRatio,
            color: 'rgba(0, 0, 0, 0.5)'
        };

        this.resetFeetToStartPosition();
    }

    getRandomSkin() {
        const skins = ShooterConfig.PLAYER_SKINS;
        return skins[Math.floor(Math.random() * skins.length)];
    }

    resetFeetToStartPosition() {
        this.feet.left.x = this.feetParams.startPositionLeft.x;
        this.feet.left.y = this.feetParams.startPositionLeft.y;
        this.feet.right.x = this.feetParams.startPositionRight.x;
        this.feet.right.y = this.feetParams.startPositionRight.y;
    }

    activate() {
        this.active = true;
    }

    update(playerX, playerY, obstacles, allEnemies = []) {
        if (!this.active) return;

        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.wobble += this.wobbleSpeed;
        
        // Базовые враги используют зигзагообразное движение
        let directionX, directionY;
        
        // Создаем зигзагообразный паттерн
        const zigzagAmplitude = 50;
        const zigzagFrequency = 0.02;
        const zigzagOffset = Math.sin(Date.now() * zigzagFrequency + this.wobble) * zigzagAmplitude;
        
        // Основное направление к игроку
        const baseDirectionX = dx / distance;
        const baseDirectionY = dy / distance;
        
        // Перпендикулярное направление для зигзага
        const perpX = -baseDirectionY;
        const perpY = baseDirectionX;
        
        // Комбинируем движения
        directionX = baseDirectionX + perpX * 0.3 * Math.sin(Date.now() * 0.01 + this.wobble);
        directionY = baseDirectionY + perpY * 0.3 * Math.sin(Date.now() * 0.01 + this.wobble);
        
        // Нормализуем направление
        const dirLength = Math.sqrt(directionX * directionX + directionY * directionY);
        if (dirLength > 0) {
            directionX /= dirLength;
            directionY /= dirLength;
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

        // Применяем отталкивание
        directionX += repulsionX * 0.3;
        directionY += repulsionY * 0.3;

        // Финальная нормализация
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

        this.direction = Math.atan2(directionY, directionX);
        this.updateFeet(directionX, directionY);
        this.updateIdleAnimation();
    }

    draw(context) {
        if (!this.active) return;

        context.save();
        context.translate(this.x + this.width / 2, this.y + this.height / 2);

        // Рисуем тень
        context.fillStyle = this.shadow.color;
        context.beginPath();
        context.ellipse(0, this.shadow.offsetY, this.shadow.size / 2, this.shadow.size / 4, 0, 0, Math.PI * 2);
        context.fill();

        const idleOffset = Math.sin(this.idleAnimation.time) * this.idleAnimation.amplitude;

        // Рисуем ноги
        this.drawFeet(context);

        // Рисуем тело с учетом покачивания
        context.save();
        context.translate(0, idleOffset);
        this.drawBody(context);
        context.restore();

        // Рисуем голову
        context.save();
        context.translate(0, this.head.offsetY + idleOffset * 0.5);

        // Отражаем голову по горизонтали, если враг движется влево
        if (Math.abs(this.direction) > Math.PI / 2) {
            context.scale(-1, 1);
        }

        context.drawImage(
            this.head.image,
            -this.head.size / 2,
            -this.head.size / 2,
            this.head.size,
            this.head.size
        );
        context.restore();

        context.restore();
    }

    drawFeet(context) {
        context.save();
        this.drawFoot(context, this.feet.left);
        this.drawFoot(context, this.feet.right);
        context.restore();
    }

    drawFoot(context, foot) {
        context.save();
        context.translate(foot.x, foot.y);
        context.rotate(foot.angle);

        context.fillStyle = this.feetParams.color;
        context.beginPath();
        context.ellipse(0, 0, this.feetParams.size.width / 2, this.feetParams.size.height / 2, 0, 0, Math.PI * 2);
        context.fill();

        context.strokeStyle = 'black';
        context.lineWidth = 1;
        context.stroke();

        context.restore();
    }

    drawBody(context) {
        context.save();
        context.rotate(this.body.swayAngle);
        context.fillStyle = this.body.color;
        context.beginPath();
        context.ellipse(0, 0, this.body.width / 2, this.body.height / 2, 0, 0, Math.PI * 2);
        context.fill();

        context.strokeStyle = 'black';
        context.lineWidth = 1;
        context.stroke();

        context.restore();
    }

    updateFeet(dx, dy) {
        const speed = Math.sqrt(dx * dx + dy * dy);
        if (speed > 0.1) {
            const feetSpeed = this.feetParams.baseSpeed + speed * this.feetParams.speedMultiplier;

            this.feet.left.phase += feetSpeed;
            this.feet.right.phase += feetSpeed;

            this.feet.left.phase %= (Math.PI * 2);
            this.feet.right.phase %= (Math.PI * 2);

            const movementAngle = Math.atan2(dy, dx);

            const verticalFactor = Math.abs(Math.sin(movementAngle));
            const horizontalFactor = Math.abs(Math.cos(movementAngle));
            const separation = this.feetParams.separation * verticalFactor;

            this.feet.left.x = Math.cos(this.feet.left.phase) * this.feetParams.strideLength * Math.cos(movementAngle) - separation;
            this.feet.left.y = 30 + Math.abs(Math.sin(this.feet.left.phase)) * this.feetParams.jumpHeight + Math.cos(this.feet.left.phase) * this.feetParams.strideLength * Math.sin(movementAngle);

            this.feet.right.x = Math.cos(this.feet.right.phase) * this.feetParams.strideLength * Math.cos(movementAngle) + separation;
            this.feet.right.y = 30 + Math.abs(Math.sin(this.feet.right.phase)) * this.feetParams.jumpHeight + Math.cos(this.feet.right.phase) * this.feetParams.strideLength * Math.sin(movementAngle);

            const leftLift = Math.sin(this.feet.left.phase) > 0 ? Math.sin(this.feet.left.phase) * this.feetParams.jumpHeight * 0.5 : 0;
            const rightLift = Math.sin(this.feet.right.phase) > 0 ? Math.sin(this.feet.right.phase) * this.feetParams.jumpHeight * 0.5 : 0;

            this.feet.left.y += leftLift;
            this.feet.right.y += rightLift;

            this.feet.left.angle = Math.sin(this.feet.left.phase) * Math.PI / 6;
            this.feet.right.angle = Math.sin(this.feet.right.phase) * Math.PI / 6;

            this.body.swayAngle = Math.sin(Date.now() * this.body.swaySpeed) * this.body.swayAmplitude;
        } else {
            this.resetFeetToStartPosition();
            this.feet.left.angle = 0;
            this.feet.right.angle = 0;
            this.body.swayAngle = 0;
        }
    }

    updateIdleAnimation() {
        this.idleAnimation.time += this.idleAnimation.speed;
        if (this.idleAnimation.time > Math.PI * 2) {
            this.idleAnimation.time -= Math.PI * 2;
        }
    }

    hit() {
        this.health--;
        return this.health <= 0;
    }

    checkCollision(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }

    reset() {
        this.active = false;
        this.health = 1;
        this.wobble = 0;
        this.changeDirectionCounter = 0;
        this.resetFeetToStartPosition();
        this.head.image.src = this.getRandomSkin(); // Выбираем новый случайный скин при сбросе
    }
}

console.log('Complete updated Enemy.js with configurable appearance loaded');
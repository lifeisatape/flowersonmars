class Player extends GameObject {
    constructor(x, y, skin) {
        super(x, y, ShooterConfig.PLAYER_SIZE, ShooterConfig.PLAYER_SIZE, ShooterConfig.PLAYER_COLOR);
        this.skin = skin || ShooterConfig.DEFAULT_SKIN;
        this.image = new Image();
        this.image.src = this.skin;
        this.weaponImage = new Image();
        this.weaponImage.src = ShooterConfig.WEAPON_SKIN;
        this.weaponSize = ShooterConfig.WEAPON_SIZE;
        this.shadowSize = ShooterConfig.PLAYER_SHADOW_SIZE;
        this.shadowColor = ShooterConfig.PLAYER_SHADOW_COLOR;
        this.maxSpeed = ShooterConfig.PLAYER_SPEED;
        this.acceleration = ShooterConfig.PLAYER_ACCELERATION;
        this.deceleration = ShooterConfig.PLAYER_DECELERATION;
        this.direction = 0;
        this.movementDirection = { x: 0, y: 0 };
        this.shootCooldown = 0;
        this.isShooting = false;
        this.shootingDirection = { x: 0, y: 0 };
        this.dustParticles = [];
        this.scaleFactor = 4.0;

        // Здоровье и щит
        this.health = ShooterConfig.PLAYER_MAX_HEALTH;
        this.shield = ShooterConfig.PLAYER_MAX_SHIELD;
        this.lastDamageTime = Date.now();
        this.shieldRegenerationDelay = 100; // 10 секунд в миллисекундах
        this.shieldRegenerationRate = 2; // 1 HP в секунду

        // Параметры анимации стоп
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
            color: '#0096ff',
            separation: 7,
            startPositionLeft: { x: -20, y: 30 },
            startPositionRight: { x: 20, y: 30 }
        };

        // Параметры тела
        this.body = {
            width: 30,
            height: 35,
            color: '#0096ff',
            swayAngle: 15,
            swaySpeed: 0.01,
            swayAmplitude: Math.PI / 16
        };

        // Параметры покачивания при бездействии
        this.idleAnimation = {
            time: 0,
            speed: 0.03,
            amplitude: 5,
            headAmplitude: 4,
            weaponAmplitude: 2
        };

        // Параметры отдачи
        this.recoil = {
            duration: 8, // Уменьшаем длительность для более резкой отдачи
            currentFrame: 0,
            bodyOffset: 5,
            headOffset: 3,
            weaponOffset: 10,
            weaponRotation: Math.PI / 24
        };

        // Параметры отдачи оружия (как у врагов)
        this.weaponRecoil = {
            duration: 8,
            currentFrame: 0,
            offset: 8,
            rotation: Math.PI / 24
        };

        // Параметры анимации смерти
        this.deathAnimation = {
            isPlaying: false,
            duration: 100, // 3 секунды при 60 FPS
            currentFrame: 0,
            explosionParticles: [],
            fallRotation: 0,
            fallSpeed: 0,
            maxFallSpeed: 2
        };

        // Параметры анимации щита
        this.shieldAnimation = {
            time: 0,
            speed: 0.08,
            pulseAmplitude: 3,
            rotationSpeed: 0.02,
            rotation: 0,
            segments: 6,
            particles: []
        };

        // Система текстовых сообщений при уроне
        this.damageTexts = [];
        this.damageTextMessages = ['ouch', 'oh', 'ow', 'ugh'];

        // Система текстовых сообщений при убийстве врагов
        this.killTexts = [];
        this.killTextMessages = ['frag', 'boom', 'rekt', 'owned'];

        this.resetFeetToStartPosition();

        console.log(`Космонавт создан: x=${x}, y=${y}, здоровье=${this.health}, щит=${this.shield}`);
    }

    resetFeetToStartPosition() {
        this.feet.left.x = this.feetParams.startPositionLeft.x;
        this.feet.left.y = this.feetParams.startPositionLeft.y;
        this.feet.right.x = this.feetParams.startPositionRight.x;
        this.feet.right.y = this.feetParams.startPositionRight.y;
    }

    setFeetStartPosition(leftX, leftY, rightX, rightY) {
        this.feetParams.startPositionLeft = { x: leftX, y: leftY };
        this.feetParams.startPositionRight = { x: rightX, y: rightY };
        this.resetFeetToStartPosition();
    }

    setMovement(dx, dy) {
        this.movementDirection.x = dx;
        this.movementDirection.y = dy;
    }

    setShootingDirection(dx, dy) {
        this.shootingDirection.x = dx;
        this.shootingDirection.y = dy;
        if (dx !== 0 || dy !== 0) {
            this.direction = Math.atan2(dy, dx);
        }
    }

    update(deltaTime) {
        this.velocityX += this.movementDirection.x * this.acceleration;
        this.velocityY += this.movementDirection.y * this.acceleration;

        const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        if (speed > this.maxSpeed) {
            const ratio = this.maxSpeed / speed;
            this.velocityX *= ratio;
            this.velocityY *= ratio;
        }

        if (this.movementDirection.x === 0) {
            this.velocityX *= this.deceleration;
        }
        if (this.movementDirection.y === 0) {
            this.velocityY *= this.deceleration;
        }

        if (Math.abs(this.velocityX) < 0.01) this.velocityX = 0;
        if (Math.abs(this.velocityY) < 0.01) this.velocityY = 0;

        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        }

        this.updateDustParticles();
        this.updateFeet();
        this.updateIdleAnimation();
        this.updateRecoil();
        this.updateWeaponRecoil();
        this.updateShield(deltaTime);
        this.updateShieldAnimation();
        this.updateDamageTexts();
        this.updateKillTexts();
    }

    updatePosition(obstacles) {
        // Сохраняем текущую позицию
        const oldX = this.x;
        const oldY = this.y;

        // Обновляем позицию по X
        this.x += this.velocityX;
        if (this.checkCollisionWithObstacles(obstacles)) {
            this.x = oldX;
            this.velocityX = 0;
        }

        // Обновляем позицию по Y
        this.y += this.velocityY;
        if (this.checkCollisionWithObstacles(obstacles)) {
            this.y = oldY;
            this.velocityY = 0;
        }

        // Ограничиваем движение границами карты
        this.x = Math.max(0, Math.min(this.x, ShooterConfig.MAP_WIDTH - this.width));
        this.y = Math.max(0, Math.min(this.y, ShooterConfig.MAP_HEIGHT - this.height));
    }

    interactWithDoors(doors) {
        for (const door of doors) {
            if (door instanceof DoorObstacle) {
                door.update(this);
            }
        }
    }

    tryInteract(doors) {
        for (const door of doors) {
            if (door instanceof DoorObstacle && door.canInteract) {
                return door.interact();
            }
        }
        return false;
    }

    checkCollisionWithObstacles(obstacles) {
        for (const obstacle of obstacles) {
            if (this.collidesWith(obstacle)) {
                return true;
            }
        }
        return false;
    }

    updateShield(deltaTime) {
        const currentTime = Date.now();
        const timeSinceLastDamage = currentTime - this.lastDamageTime;

        if (timeSinceLastDamage > this.shieldRegenerationDelay) {
            const regenAmount = this.shieldRegenerationRate * deltaTime;
            const newShield = Math.min(
                this.shield + regenAmount,
                ShooterConfig.PLAYER_MAX_SHIELD
            );

            if (newShield > this.shield) {
                this.shield = newShield;
            }
        }
    }

    takeDamage(damage, sourceX, sourceY) {
        this.lastDamageTime = Date.now();

        let remainingDamage = damage;

        if (this.shield > 0) {
            if (this.shield >= remainingDamage) {
                this.shield -= remainingDamage;
                remainingDamage = 0;
            } else {
                remainingDamage -= this.shield;
                this.shield = 0;
            }
        }

        if (remainingDamage > 0) {
            this.health = Math.max(0, this.health - remainingDamage);

            // С вероятностью 70% создаем текст урона
            if (Math.random() < 0.7) {
                this.createDamageText();
            }
        }

        // Отбрасывание игрока
        const angle = Math.atan2(this.y - sourceY, this.x - sourceX);
        this.x += Math.cos(angle) * ShooterConfig.PLAYER_KNOCKBACK_DISTANCE;
        this.y += Math.sin(angle) * ShooterConfig.PLAYER_KNOCKBACK_DISTANCE;

        const isDead = this.health <= 0;
        if (isDead && !this.deathAnimation.isPlaying) {
            this.startDeathAnimation();
        }

        return isDead;
    }

    startDeathAnimation() {
        this.deathAnimation.isPlaying = true;
        this.deathAnimation.currentFrame = 0;
        this.deathAnimation.fallRotation = 0;
        this.deathAnimation.fallSpeed = 0;

        // Создаем частицы взрыва
        for (let i = 0; i < 20; i++) {
            this.deathAnimation.explosionParticles.push({
                x: this.x + this.width / 2,
                y: this.y + this.height / 2,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 60 + Math.random() * 60,
                maxLife: 60 + Math.random() * 60,
                size: Math.random() * 4 + 2,
                color: `hsl(${Math.random() * 60}, 100%, 50%)`
            });
        }

        console.log('Анимация смерти игрока начата');
    }

    updateDeathAnimation(deltaTime) {
        if (!this.deathAnimation.isPlaying) return false;

        this.deathAnimation.currentFrame++;

        // Вращение при падении
        this.deathAnimation.fallRotation += 0.1;

        // Падение вниз
        this.deathAnimation.fallSpeed = Math.min(
            this.deathAnimation.fallSpeed + 0.2, 
            this.deathAnimation.maxFallSpeed
        );
        this.y += this.deathAnimation.fallSpeed;

        // Обновляем частицы взрыва
        for (let i = this.deathAnimation.explosionParticles.length - 1; i >= 0; i--) {
            const particle = this.deathAnimation.explosionParticles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.1; // Гравитация
            particle.vx *= 0.98; // Трение
            particle.vy *= 0.98;
            particle.life--;

            if (particle.life <= 0) {
                this.deathAnimation.explosionParticles.splice(i, 1);
            }
        }

        return this.deathAnimation.currentFrame >= this.deathAnimation.duration;
    }

    isDeathAnimationComplete() {
        return this.deathAnimation.isPlaying && 
               this.deathAnimation.currentFrame >= this.deathAnimation.duration;
    }

    updateIdleAnimation() {
        this.idleAnimation.time += this.idleAnimation.speed;
        if (this.idleAnimation.time > Math.PI * 2) {
            this.idleAnimation.time -= Math.PI * 2;
        }
    }

    updateRecoil() {
        if (this.recoil.currentFrame > 0) {
            this.recoil.currentFrame--;
        }
    }

    updateWeaponRecoil() {
        if (this.weaponRecoil.currentFrame > 0) {
            this.weaponRecoil.currentFrame--;
        }
    }

    draw(context) {
        // Рисуем щит на заднем плане (самый первый слой)
        if (this.shield > 0) {
            this.drawShield(context);
        }

        // Рисуем частицы смерти если анимация играет
        if (this.deathAnimation.isPlaying) {
            this.drawDeathParticles(context);
        }

        context.save();
        context.translate(this.x + this.width / 2, this.y + this.height / 2);

        // Применяем вращение при смерти
        if (this.deathAnimation.isPlaying) {
            context.rotate(this.deathAnimation.fallRotation);
            // Делаем игрока полупрозрачным при смерти
            context.globalAlpha = Math.max(0.3, 1 - (this.deathAnimation.currentFrame / this.deathAnimation.duration));
        }

        const idleOffset = this.deathAnimation.isPlaying ? 0 : Math.sin(this.idleAnimation.time) * this.idleAnimation.amplitude;
        const recoilProgress = this.recoil.currentFrame / this.recoil.duration;
        const recoilOffsetBody = Math.sin(recoilProgress * Math.PI) * this.recoil.bodyOffset;
        const recoilOffsetHead = Math.sin(recoilProgress * Math.PI) * this.recoil.headOffset;
        const recoilOffsetWeapon = Math.sin(recoilProgress * Math.PI) * this.recoil.weaponOffset;
        const recoilRotationWeapon = Math.sin(recoilProgress * Math.PI) * this.recoil.weaponRotation;

        // Рисуем тень
        context.save();
        context.fillStyle = this.shadowColor;
        context.beginPath();
        context.ellipse(0, this.height / 2, this.shadowSize / 2, this.shadowSize / 4, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();

        // Рисуем стопы
        this.drawFeet(context);

        // Рисуем тело с учетом покачивания и отдачи
        context.save();
        context.translate(0, idleOffset + recoilOffsetBody);
        this.drawBody(context);
        context.restore();

        // Рисуем оружие с учетом покачивания и отдачи
        context.save();
        context.translate(0, idleOffset * (this.idleAnimation.weaponAmplitude / this.idleAnimation.amplitude) + recoilOffsetWeapon);
        context.rotate(recoilRotationWeapon);
        this.drawWeapon(context);
        context.restore();

        // Отражаем голову по горизонтали, если игрок стреляет влево
        if (Math.abs(this.direction) > Math.PI / 2) {
            context.scale(-1, 1);
        }

        context.scale(this.scaleFactor, this.scaleFactor);

        // Смещаем изображение вверх и добавляем покачивание и отдачу
        const offsetY = -this.height / 8 + 
                        (idleOffset * (this.idleAnimation.headAmplitude / this.idleAnimation.amplitude) + recoilOffsetHead) / this.scaleFactor;
        context.drawImage(this.image, -this.width / (2 * this.scaleFactor), -this.height / (2 * this.scaleFactor) + offsetY, this.width / this.scaleFactor, this.height / this.scaleFactor);

        context.restore();

        this.drawDustParticles(context);

        // Рисуем полоски здоровья и щита
        this.drawHealthBar(context);
        // this.drawShieldBar(context); // Скрыт индикатор щита

        // Рисуем текстовые сообщения урона
        this.drawDamageTexts(context);
        this.drawKillTexts(context);
    }

    drawWeapon(context) {
        context.save();

        // Определяем, смотрит ли игрок влево
        const isLookingLeft = Math.abs(this.direction) > Math.PI / 2;

        if (isLookingLeft) {
            context.scale(1, -1);
            context.rotate(-this.direction);
        } else {
            context.rotate(this.direction);
        }

        // Применяем эффект отдачи оружия
        const weaponRecoilProgress = this.weaponRecoil.currentFrame / this.weaponRecoil.duration;
        const weaponRecoilOffset = Math.sin(weaponRecoilProgress * Math.PI) * this.weaponRecoil.offset;
        const weaponRecoilRotation = Math.sin(weaponRecoilProgress * Math.PI) * this.weaponRecoil.rotation;

        context.translate(weaponRecoilOffset, 0); // Отталкиваем оружие назад при выстреле
        context.rotate(-weaponRecoilRotation); // Поворачиваем оружие при отдаче

        context.drawImage(this.weaponImage, -this.weaponSize / 2, -this.weaponSize / 2, this.weaponSize, this.weaponSize);
        context.restore();
    }

    updateDustParticles() {
        const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);

        // Создаем частицы пыли только когда игрок движется
        if (speed > 3.5) {
            // Создаем больше частиц при быстром движении
            const particleCount = Math.min(1, Math.floor(speed * 0.8));

            for (let i = 0; i < particleCount; i++) {
                this.dustParticles.push({
                    x: this.x + this.width / 2 + (Math.random() - 0.5) * this.width,
                    y: this.y + this.height - 5 + Math.random() * 10, // Появляются под ногами
                    vx: (Math.random() - 0.5) * 1.5, // Случайное горизонтальное движение
                    vy: -Math.random() * 2 - 0.5, // Поднимаются вверх
                    life: 40 + Math.random() * 20, // Живут дольше
                    size: Math.random() * 3 + 1, // Разный размер
                    alpha: 0.6 + Math.random() * 0.4, // Разная прозрачность
                    gravity: 0.05 // Постепенно опускаются
                });
            }
        }

        // Обновляем частицы пыли
        for (let i = this.dustParticles.length - 1; i >= 0; i--) {
            const particle = this.dustParticles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += particle.gravity; // Применяем гравитацию
            particle.vx *= 0.98; // Трение воздуха
            particle.life--;
            particle.alpha *= 0.98; // Постепенно исчезает

            if (particle.life <= 0 || particle.alpha < 0.05) {
                this.dustParticles.splice(i, 1);
            }
        }
    }

    drawDustParticles(context) {
        context.save();

        for (const particle of this.dustParticles) {
            context.globalAlpha = particle.alpha;

            // Цвет пыли - коричневые и серые оттенки
            const dustColors = [
                '#696969', // Коричневый
                '#696969', // Темно-коричневый
                '#696969', // Песочный
                '#696969', // Шоколадный
                '#696969', // Розово-коричневый
                '#696969'  // Серый
            ];

            const colorIndex = Math.floor(particle.life / 10) % dustColors.length;
            context.fillStyle = dustColors[colorIndex];

            // Рисуем частицу пыли
            context.beginPath();
            context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            context.fill();

            // Добавляем легкое размытие для эффекта пыли
            context.shadowColor = dustColors[colorIndex];
            context.shadowBlur = particle.size * 0.5;
            context.fill();
            context.shadowBlur = 0;
        }

        context.restore();
    }

    canShoot() {
            return this.shootCooldown === 0;
        }

        shoot() {
            if (this.shootCooldown === 0) {
                this.shootCooldown = ShooterConfig.SHOOT_COOLDOWN;
                console.log('Космонавт выстрелил');
                return true;
            }
            return false;
        }

        activateRecoil() {
            this.recoil.currentFrame = this.recoil.duration;
            this.weaponRecoil.currentFrame = this.weaponRecoil.duration;
        }

        startShooting() {
            this.isShooting = true;
        }

        stopShooting() {
            this.isShooting = false;
        }

        getBulletStartPosition() {
            const distanceInFront = this.width / 2 + 10;
            return {
                x: this.x + this.width / 2 + Math.cos(this.direction) * distanceInFront,
                y: this.y + this.height / 2 + Math.sin(this.direction) * distanceInFront
            };
        }

        updateFeet() {
            const speed = Math.sqrt(this.velocityX ** 2 + this.velocityY ** 2);
            if (speed > 0.1) {
                const feetSpeed = this.feetParams.baseSpeed + speed * this.feetParams.speedMultiplier;

                this.feet.left.phase += feetSpeed;
                this.feet.right.phase += feetSpeed;

                this.feet.left.phase %= (Math.PI * 2);
                this.feet.right.phase %= (Math.PI * 2);

                const movementAngle = Math.atan2(this.velocityY, this.velocityX);

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

        drawHealthBar(context) {
            const barWidth = this.width;
            const barHeight = 5;
            const x = this.x;
            const y = this.y - 30;

            context.fillStyle = 'red';
            context.fillRect(x, y, barWidth, barHeight);

            context.fillStyle = 'green';
            context.fillRect(x, y, barWidth * (this.health / ShooterConfig.PLAYER_MAX_HEALTH), barHeight);
        }

        drawShieldBar(context) {
            const barWidth = this.width;
            const barHeight = 3;
            const x = this.x;
            const y = this.y - 35;

            context.fillStyle = 'gray';
            context.fillRect(x, y, barWidth, barHeight);

            context.fillStyle = 'cyan';
            context.fillRect(x, y, barWidth * (this.shield / ShooterConfig.PLAYER_MAX_SHIELD), barHeight);
        }

        drawDeathParticles(context) {
            context.save();
            for (const particle of this.deathAnimation.explosionParticles) {
                const alpha = particle.life / particle.maxLife;
                context.globalAlpha = alpha;
                context.fillStyle = particle.color;
                context.beginPath();
                context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                context.fill();
            }
            context.restore();
        }

        updateShieldAnimation() {
            if (this.shield > 0) {
                this.shieldAnimation.time += this.shieldAnimation.speed;
                this.shieldAnimation.rotation += this.shieldAnimation.rotationSpeed;

                if (this.shieldAnimation.time > Math.PI * 2) {
                    this.shieldAnimation.time -= Math.PI * 2;
                }

                // Обновляем частицы щита
                this.updateShieldParticles();
            }
        }

        updateShieldParticles() {
            // Добавляем новые частицы
            if (Math.random() < 0.3) {
                const angle = Math.random() * Math.PI * 2;
                const radius = this.width / 2 + 8;
                this.shieldAnimation.particles.push({
                    x: this.x + this.width / 2 + Math.cos(angle) * radius,
                    y: this.y + this.height / 2 + Math.sin(angle) * radius,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    life: 30 + Math.random() * 20,
                    maxLife: 30 + Math.random() * 20,
                    size: Math.random() * 2 + 1
                });
            }

            // Обновляем существующие частицы
            for (let i = this.shieldAnimation.particles.length - 1; i >= 0; i--) {
                const particle = this.shieldAnimation.particles[i];
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.life--;

                if (particle.life <= 0) {
                    this.shieldAnimation.particles.splice(i, 1);
                }
            }
        }

        drawShield(context) {
            context.save();

            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;
            const baseRadius = this.width / 2 + 5;
            const shieldStrength = this.shield / ShooterConfig.PLAYER_MAX_SHIELD;

            // Пульсация щита
            const pulse = Math.sin(this.shieldAnimation.time) * this.shieldAnimation.pulseAmplitude;
            const currentRadius = baseRadius + pulse;

            // Основной градиент щита
            const gradient = context.createRadialGradient(
                centerX, centerY, currentRadius * 0.7,
                centerX, centerY, currentRadius * 1.2
            );
            gradient.addColorStop(0, `rgba(0, 255, 255, ${shieldStrength * 0.1})`);
            gradient.addColorStop(0.7, `rgba(0, 200, 255, ${shieldStrength * 0.4})`);
            gradient.addColorStop(1, `rgba(0, 150, 255, ${shieldStrength * 0.8})`);

            // Рисуем основной щит
            context.fillStyle = gradient;
            context.beginPath();
            context.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
            context.fill();

            // Рисуем сегменты щита (гексагональные)
            context.save();
            context.translate(centerX, centerY);
            context.rotate(this.shieldAnimation.rotation);

            context.strokeStyle = `rgba(0, 255, 255, ${shieldStrength})`;
            context.lineWidth = 2;
            context.setLineDash([]);

            for (let i = 0; i < this.shieldAnimation.segments; i++) {
                const angle = (i * Math.PI * 2) / this.shieldAnimation.segments;
                const nextAngle = ((i + 1) * Math.PI * 2) / this.shieldAnimation.segments;

                const x1 = Math.cos(angle) * currentRadius;
                const y1 = Math.sin(angle) * currentRadius;
                const x2 = Math.cos(nextAngle) * currentRadius;
                const y2 = Math.sin(nextAngle) * currentRadius;

                context.beginPath();
                context.moveTo(x1, y1);
                context.lineTo(x2, y2);
                context.stroke();

                // Добавляем узлы на стыках
                context.fillStyle = `rgba(0, 255, 255, ${shieldStrength})`;
                context.beginPath();
                context.arc(x1, y1, 2, 0, Math.PI * 2);
                context.fill();
            }

            context.restore();

            // Внешнее кольцо
            context.strokeStyle = `rgba(100, 255, 255, ${shieldStrength * 0.8})`;
            context.lineWidth = 1;
            context.beginPath();
            context.arc(centerX, centerY, currentRadius + 3, 0, Math.PI * 2);
            context.stroke();

            // Рисуем частицы щита
            this.drawShieldParticles(context);

            context.restore();
        }

        drawShieldParticles(context) {
            context.save();
            for (const particle of this.shieldAnimation.particles) {
                const alpha = (particle.life / particle.maxLife) * 0.8;
                context.globalAlpha = alpha;
                context.fillStyle = '#00FFFF';
                context.shadowColor = '#00FFFF';
                context.shadowBlur = 5;
                context.beginPath();
                context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                context.fill();
            }
            context.restore();
        }

        createDamageText() {
            const message = this.damageTextMessages[Math.floor(Math.random() * this.damageTextMessages.length)];
            this.damageTexts.push({
                text: message,
                x: this.x + this.width / 2,
                y: this.y - 20,
                life: 60, // 1 секунда при 60 FPS
                maxLife: 60,
                vx: (Math.random() - 0.5) * 2,
                vy: -2,
                alpha: 1
            });
        }

        updateDamageTexts() {
            for (let i = this.damageTexts.length - 1; i >= 0; i--) {
                const text = this.damageTexts[i];
                text.x += text.vx;
                text.y += text.vy;
                text.vy += 0.05; // Гравитация
                text.life--;
                text.alpha = text.life / text.maxLife;

                if (text.life <= 0) {
                    this.damageTexts.splice(i, 1);
                }
            }
        }

        drawDamageTexts(context) {
            context.save();
            context.font = 'bold 24px Arial';
            context.textAlign = 'center';

            for (const text of this.damageTexts) {
                context.globalAlpha = text.alpha;
                context.fillStyle = '#FF6600';
                context.strokeStyle = '#000000';
                context.lineWidth = 1;

                // Рисуем обводку
                context.strokeText(text.text, text.x, text.y);
                // Рисуем основной текст
                context.fillText(text.text, text.x, text.y);
            }

            context.restore();
        }

        createKillText(enemyX, enemyY) {
            const message = this.killTextMessages[Math.floor(Math.random() * this.killTextMessages.length)];
            this.killTexts.push({
                text: message,
                x: enemyX,
                y: enemyY - 20,
                life: 90, // 1.5 секунды при 60 FPS
                maxLife: 90,
                vx: (Math.random() - 0.5) * 3,
                vy: -3,
                alpha: 1
            });
        }

        updateKillTexts() {
            for (let i = this.killTexts.length - 1; i >= 0; i--) {
                const text = this.killTexts[i];
                text.x += text.vx;
                text.y += text.vy;
                text.vy += 0.03; // Меньшая гравитация чем у урона
                text.life--;
                text.alpha = text.life / text.maxLife;

                if (text.life <= 0) {
                    this.killTexts.splice(i, 1);
                }
            }
        }

        drawKillTexts(context) {
            context.save();
            context.font = 'bold 24px Arial';
            context.textAlign = 'center';

            for (const text of this.killTexts) {
                context.globalAlpha = text.alpha;
                context.fillStyle = '#00FF00';
                context.strokeStyle = '#000000';
                context.lineWidth = 1;

                // Рисуем обводку
                context.strokeText(text.text, text.x, text.y);
                // Рисуем основной текст
                context.fillText(text.text, text.x, text.y);
            }

            context.restore();
        }
    }

    console.log('Player.js полностью обновлен и загружен');
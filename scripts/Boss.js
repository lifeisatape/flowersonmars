
class Boss extends Enemy {
    constructor(x, y, size, color, speed) {
        // Правильно вызываем конструктор родительского класса
        const bossSize = (size || 25) * 3;
        super(x || 0, y || 0, bossSize, color || '#FF0000', (speed || 10) * 2);
        
        // Переопределяем параметры после инициализации родителя
        this.speed = (speed || 10) * 2;
        this.color = color || '#FF0000';
        
        // Инициализируем Boss-специфичные параметры
        this.initBoss();
        
        // Переопределяем цвета для босса ПОСЛЕ инициализации
        if (this.feetParams) {
            this.feetParams.color = '#FF0000';
        }
        if (this.body) {
            this.body.color = '#FF0000';
        }
        
        console.log('Boss создан с здоровьем:', this.health, 'maxHealth:', this.maxHealth);
    }

    initBoss() {
        this.maxHealth = 100; // Увеличиваем здоровье босса
        this.health = this.maxHealth;
        this.attackCooldown = 0;
        this.maxAttackCooldown = 45; // Атакует каждые 1.5 секунды
        this.currentAttack = 0; // 0 - обычная стрельба, 1 - круговая атака
        this.circularAttackPhase = 0;
        this.isCharging = false;
        this.chargeTime = 0;
        this.maxChargeTime = 60; // 2 секунды зарядки
        
        // Увеличиваем скорость босса в 3 раза
        this.speed = this.speed * 4;
        
        // Визуальные эффекты
        this.glowIntensity = 0;
        this.glowDirection = 1;
        this.shakeMagnitude = 0;
        
        // Параметры вращающихся зубов 
        this.teethRotation = 0;
        this.teethRotationSpeed = 0.05; // Скорость вращения зубов
        this.teethCount = 12; // Количество зубов по кругу
        this.innerTeethCount = 8; // Внутренний ряд зубов
        
        // Параметры движения босса
        this.movementPattern = 0; // 0 - к игроку, 1 - по кругу
        this.circularMovementAngle = 0;
        this.movementChangeTimer = 0;
        this.maxMovementChangeTimer = 300; // Меняет поведение каждые 5 секунд
        
        // Инициализируем размер оружия для босса
        this.weaponSize = (ShooterConfig.ENEMY_WEAPON_SIZE || 90) * 3;
        this.weaponImage = new Image();
        this.weaponImage.src = ShooterConfig.ENEMY_WEAPON_SKIN || ShooterConfig.WEAPON_SKIN;
        
        // Специальные параметры для босса
        this.centerX = 0;
        this.centerY = 0;
        this.orbitalRadius = 150;
        
        // Скорость для эффектов растяжения тела
        this.vx = 0;
        this.vy = 0;
        
        // Инициализируем щупальца босса
        this.tentacles = [];
        this.initTentacles();
        
        // Инициализируем параметры ног босса (увеличенные версии)
        this.feet = {
            left: { x: -15, y: 30, phase: 0, angle: 0 },
            right: { x: 15, y: 30, phase: Math.PI, angle: 0 }
        };
        this.feetParams = {
            baseSpeed: 0.08, // Немного медленнее для босса
            speedMultiplier: 0.025,
            jumpHeight: 15, // Больше для босса
            strideLength: 35, // Больше шаг
            size: { width: 20, height: 10 },
            color: '#FF0000',
            separation: 28, // Больше расстояние между ногами
            startPositionLeft: { x: -28, y: 45 },
            startPositionRight: { x: 28, y: 45 }
        };
        
        this.resetFeetToStartPosition();
    }

    initTentacles() {
        const tentacleCount = 2;
        const segmentsPerTentacle = 16;
        const baseRadius = this.width * 0.4; // Радиус от центра босса
        
        for (let i = 0; i < tentacleCount; i++) {
            const angle = (Math.PI * 2 / tentacleCount) * i;
            const tentacle = {
                segments: [],
                baseAngle: angle,
                targetAngle: angle,
                chaseTimer: 0,
                maxChaseTime: 180, // 3 секунды преследования при 60 FPS
                restTimer: 0,
                maxRestTime: 120, // 2 секунды отдыха
                isChasing: false,
                chaosOffset: Math.random() * Math.PI * 2
            };
            
            // Создаем сегменты щупальца
            for (let j = 0; j < segmentsPerTentacle; j++) {
                const segmentLength = 25;
                const segment = {
                    x: 0,
                    y: 0,
                    angle: angle,
                    targetAngle: angle,
                    length: segmentLength,
                    width: Math.max(3, 12 - j * 1.2), // Ширина уменьшается к концу
                    flexibility: 0.1 + j * 0.05 // Гибкость увеличивается к концу
                };
                tentacle.segments.push(segment);
            }
            
            this.tentacles.push(tentacle);
        }
    }

    update(playerX, playerY, obstacles, objectPool) {
        if (!this.active) return;

        this.centerX = playerX;
        this.centerY = playerY;
        
        // Обновляем визуальные эффекты
        this.updateVisualEffects();
        
        // Обновляем вращение зубов
        this.updateTeethRotation();
        
        // Движение босса
        this.updateMovement(playerX, playerY, obstacles);
        
        // Обновляем направление на игрока
        this.direction = Math.atan2(playerY - this.y, playerX - this.x);
        
        // Атаки
        this.updateAttacks(playerX, playerY, objectPool);
        
        // Обновляем щупальца
        this.updateTentacles(playerX, playerY);
        
        // Обновляем анимацию ног босса (как у игрока и врагов)
        const directionX = this.vx;
        const directionY = this.vy;
        this.updateFeet(directionX, directionY);
        this.updateIdleAnimation();
    }

    updateMovement(playerX, playerY, obstacles) {
        this.movementChangeTimer++;
        
        if (this.movementChangeTimer >= this.maxMovementChangeTimer) {
            this.movementPattern = (this.movementPattern + 1) % 2;
            this.movementChangeTimer = 0;
        }
        
        // Сохраняем предыдущую позицию для расчета скорости
        const prevX = this.x;
        const prevY = this.y;
        
        let newX = this.x;
        let newY = this.y;
        
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
        const minDistance = 180; // Минимальное расстояние до игрока
        const maxDistance = 250; // Максимальное расстояние до игрока
        
        if (this.movementPattern === 0) {
            // Движение к игроку или от него в зависимости от расстояния
            if (distanceToPlayer < minDistance) {
                // Слишком близко - отходим от игрока
                newX = this.x - (dx / distanceToPlayer) * this.speed;
                newY = this.y - (dy / distanceToPlayer) * this.speed;
            } else if (distanceToPlayer > maxDistance) {
                // Слишком далеко - приближаемся к игроку
                newX = this.x + (dx / distanceToPlayer) * this.speed;
                newY = this.y + (dy / distanceToPlayer) * this.speed;
            } else {
                // Находимся на хорошем расстоянии - двигаемся по кругу
                const perpX = -dy / distanceToPlayer;
                const perpY = dx / distanceToPlayer;
                newX = this.x + perpX * this.speed;
                newY = this.y + perpY * this.speed;
            }
        } else {
            // Круговое движение вокруг игрока - плавное без телепортации
            this.circularMovementAngle += 0.02;
            const targetDistance = (minDistance + maxDistance) / 2; // Среднее расстояние
            
            // Вычисляем целевую позицию для кругового движения
            const targetX = playerX + Math.cos(this.circularMovementAngle) * targetDistance;
            const targetY = playerY + Math.sin(this.circularMovementAngle) * targetDistance;
            
            // Плавно двигаемся к целевой позиции вместо телепортации
            const dxToTarget = targetX - this.x;
            const dyToTarget = targetY - this.y;
            const distanceToTarget = Math.sqrt(dxToTarget * dxToTarget + dyToTarget * dyToTarget);
            
            if (distanceToTarget > this.speed) {
                // Движемся к целевой позиции с ограниченной скоростью
                newX = this.x + (dxToTarget / distanceToTarget) * this.speed;
                newY = this.y + (dyToTarget / distanceToTarget) * this.speed;
            } else {
                // Если очень близко к цели, просто двигаемся к ней
                newX = targetX;
                newY = targetY;
            }
        }
        
        // Проверка коллизий с препятствиями
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
        
        // Ограничение картой
        this.x = Math.max(0, Math.min(this.x, ShooterConfig.MAP_WIDTH - this.width));
        this.y = Math.max(0, Math.min(this.y, ShooterConfig.MAP_HEIGHT - this.height));
        
        // Вычисляем скорость для эффекта растяжения тела
        this.vx = this.x - prevX;
        this.vy = this.y - prevY;
    }

    updateAttacks(playerX, playerY, objectPool) {
        if (this.isCharging) {
            this.chargeTime++;
            this.shakeMagnitude = Math.sin(this.chargeTime * 0.3) * 3;
            
            if (this.chargeTime >= this.maxChargeTime) {
                this.executeCircularAttack(objectPool);
                this.isCharging = false;
                this.chargeTime = 0;
                this.shakeMagnitude = 0;
                this.attackCooldown = this.maxAttackCooldown;
            }
            return;
        }
        
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
            return;
        }
        
        // Выбираем тип атаки
        if (this.currentAttack === 0) {
            this.rapidFire(playerX, playerY, objectPool);
            this.currentAttack = 1;
        } else {
            this.startCircularAttack();
            this.currentAttack = 0;
        }
    }

    rapidFire(playerX, playerY, objectPool) {
        // Быстрая стрельба - 6 пули подряд
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                if (this.active) {
                    const bullet = objectPool.create('enemyBullet');
                    const angle = Math.atan2(playerY - this.y, playerX - this.x);
                    // Добавляем небольшое отклонение для каждой пули
                    const deviation = (i - 1) * 0.2;
                    
                    // Координаты центра рта босса
                    const mouthCenterX = this.x + this.width / 2;
                    const mouthCenterY = this.y + this.height / 2 + this.head.offsetY + this.head.size * 0.1;
                    
                    bullet.fire(mouthCenterX, mouthCenterY, angle + deviation);
                }
            }, i * 200); // 200мс между выстрелами
        }
        
        this.attackCooldown = this.maxAttackCooldown;
    }

    startCircularAttack() {
        this.isCharging = true;
        this.chargeTime = 0;
    }

    executeCircularAttack(objectPool) {
        // Круговая атака - 16 пуль во все стороны
        const bulletCount = 16;
        for (let i = 0; i < bulletCount; i++) {
            const angle = (Math.PI * 2 / bulletCount) * i;
            const bullet = objectPool.create('enemyBullet');
            
            // Координаты центра рта босса
            const mouthCenterX = this.x + this.width / 2;
            const mouthCenterY = this.y + this.height / 2 + this.head.offsetY + this.head.size * 0.1;
            
            bullet.fire(mouthCenterX, mouthCenterY, angle);
        }
    }

    updateVisualEffects() {
        // Эффект свечения
        this.glowIntensity += this.glowDirection * 0.05;
        if (this.glowIntensity >= 1) {
            this.glowIntensity = 1;
            this.glowDirection = -1;
        } else if (this.glowIntensity <= 0.3) {
            this.glowIntensity = 0.3;
            this.glowDirection = 1;
        }
    }

    updateTeethRotation() {
        // Постоянное вращение зубов как у песочного червя
        this.teethRotation += this.teethRotationSpeed;
        if (this.teethRotation >= Math.PI * 2) {
            this.teethRotation -= Math.PI * 2;
        }
    }

    updateTentacles(playerX, playerY) {
        const bossX = this.x + this.width / 2;
        const bossY = this.y + this.height / 2;
        
        this.tentacles.forEach((tentacle, tentacleIndex) => {
            // Обновляем таймеры поведения щупальца
            if (tentacle.isChasing) {
                tentacle.chaseTimer++;
                if (tentacle.chaseTimer >= tentacle.maxChaseTime) {
                    tentacle.isChasing = false;
                    tentacle.chaseTimer = 0;
                    tentacle.restTimer = 0;
                }
            } else {
                tentacle.restTimer++;
                if (tentacle.restTimer >= tentacle.maxRestTime) {
                    tentacle.isChasing = Math.random() < 0.6; // 60% шанс начать преследование
                    tentacle.restTimer = 0;
                    tentacle.chaseTimer = 0;
                }
            }
            
            // Вычисляем целевое направление для первого сегмента
            let targetAngle;
            if (tentacle.isChasing) {
                // Преследуем игрока
                targetAngle = Math.atan2(playerY - bossY, playerX - bossX);
            } else {
                // Хаотичное движение
                const time = Date.now() * 0.001;
                tentacle.chaosOffset += 0.02;
                targetAngle = tentacle.baseAngle + 
                             Math.sin(time * 0.5 + tentacleIndex) * 0.8 + 
                             Math.cos(time * 0.3 + tentacle.chaosOffset) * 0.5;
            }
            
            // Обновляем сегменты щупальца
            tentacle.segments.forEach((segment, segmentIndex) => {
                if (segmentIndex === 0) {
                    // Первый сегмент привязан к центру босса
                    segment.x = bossX;
                    segment.y = bossY;
                    
                    // Плавно поворачиваем к целевому углу
                    const angleDiff = targetAngle - segment.angle;
                    let normalizedDiff = angleDiff;
                    
                    // Нормализуем угол (-π до π)
                    while (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2;
                    while (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2;
                    
                    segment.angle += normalizedDiff * segment.flexibility;
                } else {
                    // Остальные сегменты следуют за предыдущими
                    const prevSegment = tentacle.segments[segmentIndex - 1];
                    const prevEndX = prevSegment.x + Math.cos(prevSegment.angle) * prevSegment.length;
                    const prevEndY = prevSegment.y + Math.sin(prevSegment.angle) * prevSegment.length;
                    
                    segment.x = prevEndX;
                    segment.y = prevEndY;
                    
                    // Добавляем хаотичность и инерцию
                    const time = Date.now() * 0.001;
                    const chaosAngle = Math.sin(time * 2 + segmentIndex * 0.5 + tentacleIndex) * 0.3;
                    const targetSegmentAngle = prevSegment.angle + chaosAngle;
                    
                    const angleDiff = targetSegmentAngle - segment.angle;
                    let normalizedDiff = angleDiff;
                    
                    while (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2;
                    while (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2;
                    
                    segment.angle += normalizedDiff * segment.flexibility;
                }
            });
        });
    }

    draw(context) {
        if (!this.active) return;

        context.save();
        
        // Применяем тряску при зарядке атаки
        const shakeX = (Math.random() - 0.9) * this.shakeMagnitude;
        const shakeY = (Math.random() - 0.9) * this.shakeMagnitude;
        
        context.translate(this.x + this.width / 2 + shakeX, this.y + this.height / 2 + shakeY);

        // Рисуем ауру босса
        if (this.isCharging) {
            context.fillStyle = `rgba(255, 0, 0, ${0.3 + this.glowIntensity * 0.3})`;
            context.beginPath();
            context.arc(0, 0, this.width * 0.8, 0, Math.PI * 2);
            context.fill();
        }
        
        // Свечение вокруг босса
        context.strokeStyle = `rgba(255, 0, 0, ${this.glowIntensity})`;
        context.lineWidth = 3;
        context.beginPath();
        context.arc(0, 0, this.width * 0.6, 0, Math.PI * 2);
        context.stroke();

        // Рисуем тень монстра (удлиненную)
        context.fillStyle = 'rgba(0, 0, 0, 0.1)';
        context.beginPath();
        context.ellipse(0, this.shadow.offsetY + 10, this.width * 0.8, this.width * 0.3, 0, 0, Math.PI * 2);
        context.fill();

        const idleOffset = Math.sin(this.idleAnimation.time) * this.idleAnimation.amplitude;

        // Рисуем щупальца (под телом)
        this.drawTentacles(context);
        
        // Рисуем тело червяка/змеи
        this.drawMonsterBody(context, idleOffset);

        // Рисуем голову монстра
        this.drawMonsterHead(context, idleOffset);

        // Рисуем оружие
        this.drawWeapon(context);

        // Полоска здоровья босса (скрыта)
        // this.drawHealthBar(context);

        context.restore();
    }

    drawMonsterBody(context, idleOffset) {
        context.save();
        context.translate(0, idleOffset);

        // Рисуем массивное тело босса (увеличенная версия тела врага)
        const bodyWidth = this.body.width * 2.5; // Увеличиваем тело босса
        const bodyHeight = this.body.height * 2.2;
        
        // Эффект покачивания тела при движении
        const swayAngle = Math.sin(this.idleAnimation.time * 0.8) * 0.1;
        context.rotate(swayAngle);
        
        // Основное тело босса с градиентом
        const gradient = context.createRadialGradient(0, 0, 0, 0, 0, bodyWidth / 2);
        gradient.addColorStop(0, '#4a0000'); // Темно-красный центр
        gradient.addColorStop(0.6, '#330000'); // Средний красный
        gradient.addColorStop(1, '#1a0000'); // Очень темный край
        
        context.fillStyle = gradient;
        context.beginPath();
        context.ellipse(0, 10, bodyWidth / 2, bodyHeight / 2, 0, 0, Math.PI * 2);
        context.fill();
        
        // Темная обводка тела
        context.strokeStyle = '#0a0000';
        context.lineWidth = 4;
        context.stroke();
        
        // Боевые шрамы на теле
        this.drawBattleScars(context, bodyWidth, bodyHeight);
        
        // Рисуем массивные ноги босса
        this.drawBossFeet(context);

        context.restore();
    }

    drawBattleScars(context, bodyWidth, bodyHeight) {
        context.strokeStyle = '#660000';
        context.lineWidth = 3;
        context.lineCap = 'round';
        
        // Горизонтальные шрамы
        for (let i = 0; i < 4; i++) {
            const y = -bodyHeight/4 + (i * bodyHeight/6);
            const startX = -bodyWidth/3 + Math.random() * 10;
            const endX = bodyWidth/3 - Math.random() * 10;
            
            context.beginPath();
            context.moveTo(startX, y);
            context.lineTo(endX, y);
            context.stroke();
        }
        
        // Диагональные шрамы
        context.beginPath();
        context.moveTo(-bodyWidth/4, -bodyHeight/3);
        context.lineTo(bodyWidth/5, bodyHeight/4);
        context.stroke();
        
        context.beginPath();
        context.moveTo(bodyWidth/4, -bodyHeight/4);
        context.lineTo(-bodyWidth/6, bodyHeight/3);
        context.stroke();
    }

    drawBossFeet(context) {
        // Используем анимированные позиции ног (как у игрока и врагов)
        const footWidth = this.feetParams.size.width * 2.5;
        const footHeight = this.feetParams.size.height * 2;
        
        // Рисуем левую ногу босса
        this.drawBossFoot(context, this.feet.left.x, this.feet.left.y, this.feet.left.angle, footWidth, footHeight);
        
        // Рисуем правую ногу босса
        this.drawBossFoot(context, this.feet.right.x, this.feet.right.y, this.feet.right.angle, footWidth, footHeight);
    }

    drawBossFoot(context, x, y, angle, width, height) {
        context.save();
        context.translate(x, y);
        context.rotate(angle);
        
        // Основная стопа босса
        const gradient = context.createRadialGradient(0, 0, 0, 0, 0, width / 2);
        gradient.addColorStop(0, '#4a0000');
        gradient.addColorStop(0.7, '#330000');
        gradient.addColorStop(1, '#1a0000');
        
        context.fillStyle = gradient;
        context.beginPath();
        context.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
        context.fill();
        
        // Обводка ноги
        context.strokeStyle = '#0a0000';
        context.lineWidth = 3;
        context.stroke();
        
        // Когти на ногах
        this.drawClaws(context, width, height);
        
        context.restore();
    }

    drawClaws(context, footWidth, footHeight) {
        context.strokeStyle = '#666';
        context.lineWidth = 2;
        context.lineCap = 'round';
        
        // 3 когтя на каждой ноге
        for (let i = 0; i < 3; i++) {
            const clawAngle = (i - 1) * 0.4; // -0.4, 0, 0.4 радиан
            const clawStartX = Math.cos(clawAngle) * footWidth * 0.3;
            const clawStartY = Math.sin(clawAngle) * footHeight * 0.2 - footHeight * 0.3;
            const clawEndX = Math.cos(clawAngle) * footWidth * 0.6;
            const clawEndY = Math.sin(clawAngle) * footHeight * 0.4 - footHeight * 0.6;
            
            context.beginPath();
            context.moveTo(clawStartX, clawStartY);
            context.lineTo(clawEndX, clawEndY);
            context.stroke();
        }
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

    drawSpikes(context, x, y, size) {
        const spikeCount = 6;
        for (let i = 0; i < spikeCount; i++) {
            const angle = (Math.PI * 2 / spikeCount) * i;
            const spikeX = x + Math.cos(angle) * size * 0.8;
            const spikeY = y + Math.sin(angle) * size * 0.8;
            const spikeEndX = x + Math.cos(angle) * size * 1.3;
            const spikeEndY = y + Math.sin(angle) * size * 1.3;
            
            context.strokeStyle = '#4a0000';
            context.lineWidth = 3;
            context.lineCap = 'round';
            context.beginPath();
            context.moveTo(spikeX, spikeY);
            context.lineTo(spikeEndX, spikeEndY);
            context.stroke();
        }
    }

    drawMonsterHead(context, idleOffset) {
        context.save();
        context.translate(0, this.head.offsetY + idleOffset * 0.5);

        // Отражаем голову по горизонтали, если босс смотрит влево
        if (Math.abs(this.direction) > Math.PI / 2) {
            context.scale(-1, 1);
        }

        const headSize = this.head.size * 1.2;
        
        // Основная голова монстра (череп)
        context.fillStyle = '#330000';
        context.beginPath();
        context.ellipse(0, 0, headSize * 0.5, headSize * 0.4, 0, 0, Math.PI * 2);
        context.fill();
        
        // Темная обводка головы
        context.strokeStyle = '#1a0000';
        context.lineWidth = 3;
        context.stroke();

        // Глаза монстра
        this.drawMonsterEyes(context, headSize);
        
        // Рот с зубами
        this.drawMonsterMouth(context, headSize);
        
        // Рога/антенны
        this.drawMonsterHorns(context, headSize);

        context.restore();
    }

    drawMonsterEyes(context, headSize) {
        const eyeGlow = Math.sin(this.idleAnimation.time * 2) * 0.3 + 0.7;
        
        // Левый глаз
        context.fillStyle = `rgba(255, 0, 0, ${eyeGlow})`;
        context.beginPath();
        context.ellipse(-headSize * 0.2, -headSize * 0.15, headSize * 0.08, headSize * 0.12, 0, 0, Math.PI * 2);
        context.fill();
        
        // Правый глаз
        context.beginPath();
        context.ellipse(headSize * 0.2, -headSize * 0.15, headSize * 0.08, headSize * 0.12, 0, 0, Math.PI * 2);
        context.fill();
        
        // Вычисляем направление к игроку для зрачков
        const pupilMaxOffset = headSize * 0.02; // Максимальное смещение зрачка
        let pupilOffsetX = Math.cos(this.direction) * pupilMaxOffset;
        const pupilOffsetY = Math.sin(this.direction) * pupilMaxOffset;
        
        // Если голова отражена (смотрит влево), инвертируем X-смещение зрачков
        const isLookingLeft = Math.abs(this.direction) > Math.PI / 2;
        if (isLookingLeft) {
            pupilOffsetX = -pupilOffsetX;
        }
        
        // Зрачки, смотрящие на игрока
        context.fillStyle = '#000';
        context.beginPath();
        context.ellipse(-headSize * 0.2 + pupilOffsetX, -headSize * 0.15 + pupilOffsetY, headSize * 0.03, headSize * 0.06, 0, 0, Math.PI * 2);
        context.fill();
        
        context.beginPath();
        context.ellipse(headSize * 0.2 + pupilOffsetX, -headSize * 0.15 + pupilOffsetY, headSize * 0.03, headSize * 0.06, 0, 0, Math.PI * 2);
        context.fill();
    }

    drawMonsterMouth(context, headSize) {
        context.save();
        
        // Основной рот (черная дыра)
        const mouthCenterY = headSize * 0.1;
        const mouthRadius = headSize * 0.25;
        
        // Создаем радиальный градиент для эффекта черной дыры
        const gradient = context.createRadialGradient(0, mouthCenterY, 0, 0, mouthCenterY, mouthRadius);
        gradient.addColorStop(0, '#000000');
        gradient.addColorStop(0.6, '#220000');
        gradient.addColorStop(1, '#440000');
        
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(0, mouthCenterY, mouthRadius, 0, Math.PI * 2);
        context.fill();
        
        // Внешний ряд зубов (вращается по часовой стрелке)
        this.drawRotatingTeeth(context, headSize, mouthCenterY, mouthRadius * 0.85, this.teethCount, this.teethRotation, '#fff', headSize * 0.08);
        
        // Внутренний ряд зубов (вращается против часовой стрелки)
        this.drawRotatingTeeth(context, headSize, mouthCenterY, mouthRadius * 0.55, this.innerTeethCount, -this.teethRotation * 1.5, '#ffcccc', headSize * 0.06);
        
        // Самый внутренний ряд (быстрое вращение по часовой)
        this.drawRotatingTeeth(context, headSize, mouthCenterY, mouthRadius * 0.3, 6, this.teethRotation * 2.5, '#ffaaaa', headSize * 0.04);
        
        context.restore();
    }

    drawRotatingTeeth(context, headSize, centerY, radius, teethCount, rotation, color, toothSize) {
        context.fillStyle = color;
        
        for (let i = 0; i < teethCount; i++) {
            const angle = (Math.PI * 2 / teethCount) * i + rotation;
            const toothX = Math.cos(angle) * radius;
            const toothY = centerY + Math.sin(angle) * radius * 0.6; // Слегка сплющиваем по Y
            
            // Направление зуба к центру (как у песочного червя)
            const toothAngle = angle + Math.PI; // Поворачиваем на 180 градусов чтобы зуб смотрел внутрь
            
            context.save();
            context.translate(toothX, toothY);
            context.rotate(toothAngle);
            
            // Рисуем треугольный зуб направленный к центру
            context.beginPath();
            context.moveTo(0, -toothSize * 0.3); // Основание зуба
            context.lineTo(-toothSize * 0.3, toothSize * 0.4); // Левый угол
            context.lineTo(toothSize * 0.3, toothSize * 0.4); // Правый угол
            context.closePath();
            context.fill();
            
            // Добавляем тень зуба для объема
            context.fillStyle = 'rgba(0, 0, 0, 0.3)';
            context.beginPath();
            context.moveTo(toothSize * 0.1, -toothSize * 0.2);
            context.lineTo(toothSize * 0.1, toothSize * 0.3);
            context.lineTo(toothSize * 0.3, toothSize * 0.4);
            context.closePath();
            context.fill();
            
            context.restore();
            
            // Восстанавливаем цвет для следующего зуба
            context.fillStyle = color;
        }
    }

    drawMonsterHorns(context, headSize) {
        context.strokeStyle = '#4a0000';
        context.lineWidth = 4;
        context.lineCap = 'round';
        
        // Левый рог
        context.beginPath();
        context.moveTo(-headSize * 0.4, -headSize * 0.3);
        context.lineTo(-headSize * 0.6, -headSize * 0.6);
        context.stroke();
        
        // Правый рог
        context.beginPath();
        context.moveTo(headSize * 0.4, -headSize * 0.3);
        context.lineTo(headSize * 0.6, -headSize * 0.6);
        context.stroke();
        
        // Наконечники рогов
        context.fillStyle = '#660000';
        context.beginPath();
        context.arc(-headSize * 0.6, -headSize * 0.6, headSize * 0.04, 0, Math.PI * 2);
        context.fill();
        
        context.beginPath();
        context.arc(headSize * 0.6, -headSize * 0.6, headSize * 0.04, 0, Math.PI * 2);
        context.fill();
    }

    drawTentacles(context) {
        const bossX = this.x + this.width / 2;
        const bossY = this.y + this.height / 2;
        
        this.tentacles.forEach((tentacle, tentacleIndex) => {
            tentacle.segments.forEach((segment, segmentIndex) => {
                context.save();
                
                // Позиция относительно босса (учитываем трансформацию контекста)
                const relativeX = segment.x - bossX;
                const relativeY = segment.y - bossY;
                
                context.translate(relativeX, relativeY);
                context.rotate(segment.angle);
                
                // Градиент от темно-красного к светло-красному
                const gradient = context.createLinearGradient(0, -segment.width/2, 0, segment.width/2);
                gradient.addColorStop(0, '#2a0000');
                gradient.addColorStop(0.5, '#4a0000');
                gradient.addColorStop(1, '#2a0000');
                
                // Рисуем сегмент щупальца
                context.fillStyle = gradient;
                context.beginPath();
                context.ellipse(segment.length/2, 0, segment.length/2, segment.width/2, 0, 0, Math.PI * 2);
                context.fill();
                
                // Темная обводка
                context.strokeStyle = '#1a0000';
                context.lineWidth = 1;
                context.stroke();
                
                // Добавляем текстуру (полоски)
                if (segmentIndex % 2 === 0) {
                    context.fillStyle = '#3a0000';
                    context.beginPath();
                    context.ellipse(segment.length/2, 0, segment.length/2 * 0.8, segment.width/2 * 0.6, 0, 0, Math.PI * 2);
                    context.fill();
                }
                
                // Присоски на щупальцах (только на нижней стороне)
                if (segmentIndex > 1) {
                    const suckersCount = Math.floor(segment.length / 8);
                    for (let i = 0; i < suckersCount; i++) {
                        const suckerX = (i + 1) * (segment.length / (suckersCount + 1));
                        const suckerRadius = segment.width * 0.15;
                        
                        context.fillStyle = '#1a0000';
                        context.beginPath();
                        context.arc(suckerX, segment.width * 0.2, suckerRadius, 0, Math.PI * 2);
                        context.fill();
                        
                        // Внутренняя часть присоски
                        context.fillStyle = '#0a0000';
                        context.beginPath();
                        context.arc(suckerX, segment.width * 0.2, suckerRadius * 0.5, 0, Math.PI * 2);
                        context.fill();
                    }
                }
                
                context.restore();
            });
        });
    }

    drawHealthBar(context) {
        const barWidth = this.width;
        const barHeight = 8;
        const barY = -this.height / 2 - 20;
        
        // Фон полоски здоровья
        context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        context.fillRect(-barWidth / 2, barY, barWidth, barHeight);
        
        // Полоска здоровья
        const healthPercent = this.health / this.maxHealth;
        const healthWidth = barWidth * healthPercent;
        
        // Цвет зависит от здоровья
        if (healthPercent > 0.6) {
            context.fillStyle = '#00FF00';
        } else if (healthPercent > 0.3) {
            context.fillStyle = '#FFFF00';
        } else {
            context.fillStyle = '#FF0000';
        }
        
        context.fillRect(-barWidth / 2, barY, healthWidth, barHeight);
        
        // Рамка полоски здоровья
        context.strokeStyle = 'white';
        context.lineWidth = 1;
        context.strokeRect(-barWidth / 2, barY, barWidth, barHeight);
    }

    drawWeapon(context) {
        // Увеличенное оружие для босса
        context.save();

        const isLookingLeft = Math.abs(this.direction) > Math.PI / 2;

        if (isLookingLeft) {
            context.scale(1, -1);
            context.rotate(-this.direction);
        } else {
            context.rotate(this.direction);
        }

        // Применяем эффект отдачи
        const recoilProgress = this.recoil ? this.recoil.currentFrame / this.recoil.duration : 0;
        const recoilOffset = Math.sin(recoilProgress * Math.PI) * (this.recoil ? this.recoil.offset : 0);
        const recoilRotation = Math.sin(recoilProgress * Math.PI) * (this.recoil ? this.recoil.rotation : 0);

        context.translate(recoilOffset, 0);
        context.rotate(recoilRotation);

        // Рисуем оружие
        if (this.weaponImage) {
            context.drawImage(
                this.weaponImage,
                -this.weaponSize / 2,
                -this.weaponSize / 2,
                this.weaponSize,
                this.weaponSize
            );
        }

        context.restore();
    }

    hit() {
        this.health--;
        
        // Визуальный эффект попадания
        this.shakeMagnitude = 5;
        setTimeout(() => { this.shakeMagnitude = 0; }, 200);
        
        return this.health <= 0;
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

    init(x, y, size, color, speed) {
        // Вызываем родительский метод init
        super.init(x, y, size, color, speed);
        
        // Переопределяем размеры для босса
        this.width = (size || 25) * 3;
        this.height = this.width;
        this.speed = (speed || 2) * 0.5;
        this.color = color || '#FF0000';
        this.active = false; // Будет активирован в spawnEnemy
        
        // Переинициализируем Boss-специфичные параметры
        this.initBoss();
        
        // Переинициализируем щупальца
        this.initTentacles();
        
        // Переопределяем цвета для босса ПОСЛЕ инициализации
        if (this.feetParams) {
            this.feetParams.color = '#FF0000';
        }
        if (this.body) {
            this.body.color = '#FF0000';
        }
        
        console.log(`Boss.init() вызван: x=${this.x}, y=${this.y}, size=${this.width}`);
    }

    reset() {
        this.active = false;
        this.wobble = 0;
        this.changeDirectionCounter = 0;
        this.resetFeetToStartPosition();
        this.head.image.src = this.getRandomSkin();
        this.initBoss(); // Восстанавливаем параметры босса
    }
}

console.log('Boss.js created and loaded');

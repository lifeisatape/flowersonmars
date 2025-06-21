class DroneHelper extends GameObject {
    constructor(player) {
        const droneSize = ShooterConfig.DRONE_SIZE || 40;
        super(player.x, player.y, droneSize, droneSize, '#4169E1');
        this.player = player;
        this.baseDistanceFromPlayer = 100;
        this.distanceFromPlayer = this.baseDistanceFromPlayer;
        this.angleOffset = Math.random() * Math.PI * 2;
        this.shootCooldown = 0;
        this.maxShootCooldown = 160;
        this.movementTimer = 0;
        this.movementInterval = 60;
        this.targetX = this.x;
        this.targetY = this.y;
        this.moveSpeed = 7;
        this.bobbingOffset = 0;
        this.bobbingSpeed = 0.05;

        this.image = new Image();
        this.image.src = ShooterConfig.DRONE_SKIN;
        this.image.onload = () => {
            console.log('Drone image loaded successfully');
        };
    }

    update(deltaTime) {
        this.updatePosition();
        this.updateBobbing();
        this.updateShooting(deltaTime);
    }

    updatePosition() {
        this.movementTimer++;
        if (this.movementTimer >= this.movementInterval) {
            this.setNewTarget();
            this.movementTimer = 0;
        }
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 1) {
            this.x += (dx / distance) * this.moveSpeed;
            this.y += (dy / distance) * this.moveSpeed;
        }

        const playerDx = this.x - this.player.x;
        const playerDy = this.y - this.player.y;
        const playerDistance = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
        if (playerDistance > this.baseDistanceFromPlayer * 1.5) {
            this.setNewTarget();
        }
    }

    setNewTarget() {
        const angle = Math.random() * Math.PI * 2;
        const distance = this.baseDistanceFromPlayer + Math.random() * 50 - 25;
        this.targetX = this.player.x + Math.cos(angle) * distance;
        this.targetY = this.player.y + Math.sin(angle) * distance;
    }

    updateBobbing() {
        this.bobbingOffset = Math.sin(Date.now() * this.bobbingSpeed) * 5;
    }

    updateShooting(deltaTime) {
        if (this.shootCooldown > 0) {
            this.shootCooldown -= 1;
        }
    }

    draw(context) {
        if (!this.image.complete) return;

        context.save();
        context.translate(this.x + this.width / 2, this.y + this.height / 2 + this.bobbingOffset);

        context.drawImage(
            this.image,
            -this.width / 1,
            -this.height / 1,
            this.width,
            this.height
        );

        context.restore();
    }

    canShoot() {
        return this.shootCooldown <= 0;
    }

    shoot(enemies, objectPool) {
        if (this.canShoot()) {
            let nearestEnemy = null;
            let nearestDistance = Infinity;

            for (const enemy of enemies) {
                const distance = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                if (distance < nearestDistance) {
                    nearestEnemy = enemy;
                    nearestDistance = distance;
                }
            }

            if (nearestEnemy && nearestDistance < 300) {
                const bullet = objectPool.create('droneBullet');
                const angle = Math.atan2(nearestEnemy.y - this.y, nearestEnemy.x - this.x);
                bullet.fire(this.x, this.y, angle);
                this.shootCooldown = this.maxShootCooldown;
                return true;
            }
        }
        return false;
    }
}

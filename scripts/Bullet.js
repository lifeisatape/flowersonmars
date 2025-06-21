class Bullet extends GameObject {
    constructor() {
        super(0, 0, ShooterConfig.BULLET_SIZE, ShooterConfig.BULLET_SIZE, ShooterConfig.BULLET_COLOR);
        this.speed = ShooterConfig.BULLET_SPEED;
        this.active = false;
        this.trailPoints = [];
        this.glowIntensity = 0.1;
        this.glowDirection = 0.1;
    }

    fire(x, y, direction) {
        this.x = x;
        this.y = y;
        this.velocityX = Math.cos(direction) * this.speed;
        this.velocityY = Math.sin(direction) * this.speed;
        this.active = true;
        this.trailPoints = [];
        console.log(`Лазер выпущен: x=${x}, y=${y}, direction=${direction}, vx=${this.velocityX}, vy=${this.velocityY}`);
    }

    update() {
        if (!this.active) return;

        this.trailPoints.unshift({ x: this.x, y: this.y });
        if (this.trailPoints.length > 3 ) {
            this.trailPoints.pop();
        }

        this.x += this.velocityX;
        this.y += this.velocityY;

        // Обновляем эффект свечения
        this.glowIntensity += this.glowDirection;
        if (this.glowIntensity >= 1 || this.glowIntensity <= 0.1) {
            this.glowDirection *= -1;
        }

        // Проверяем выход за границы карты
        if (this.x < 0 || this.x > ShooterConfig.MAP_WIDTH ||
            this.y < 0 || this.y > ShooterConfig.MAP_HEIGHT) {
            this.active = false;
            console.log('Лазер вышел за границы карты');
        }
    }

    draw(context) {
        if (!this.active) return;

        // Рисуем след лазера
        context.beginPath();
        context.moveTo(this.x, this.y);
        for (let i = 0; i < this.trailPoints.length; i++) {
            const point = this.trailPoints[i];
            context.lineTo(point.x, point.y);
        }
        context.strokeStyle = `rgba(0, 255, 255, ${0.5 * this.glowIntensity})`;
        context.lineWidth = this.width * 3.5;
        context.lineCap = 'round';
        context.stroke();

        // Рисуем основной лазерный луч
        context.beginPath();
        context.moveTo(this.x, this.y);
        context.lineTo(this.trailPoints[this.trailPoints.length - 1]?.x || this.x, this.trailPoints[this.trailPoints.length - 1]?.y || this.y);
        context.strokeStyle = this.color;
        context.lineWidth = this.width * 0.8;
        context.lineCap = 'round';
        context.stroke();

        // Добавляем свечение
        context.beginPath();
        context.arc(this.x, this.y, this.width, 0, Math.PI * 2);
        const gradient = context.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.width);
        gradient.addColorStop(0, `rgba(0, 255, 255, ${this.glowIntensity})`);
        gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
        context.fillStyle = gradient;
        context.fill();
    }

    isActive() {
        return this.active;
    }

    reset() {
        this.active = false;
        this.velocityX = 0;
        this.velocityY = 0;
        this.trailPoints = [];
    }
}

console.log('Марсианский Bullet.js загружен');
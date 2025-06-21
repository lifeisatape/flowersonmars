class EnemyBullet extends Bullet {
    constructor() {
        super();
        this.color = 'red'; // Изменяем цвет пули врага
        this.speed = ShooterConfig.BULLET_SPEED * 0.8; // Делаем пули врагов немного медленнее
    }

    draw(context) {
        if (!this.active) return;

        // Рисуем след пули врага
        context.beginPath();
        context.moveTo(this.x, this.y);
        for (let i = 0; i < this.trailPoints.length; i++) {
            const point = this.trailPoints[i];
            context.lineTo(point.x, point.y);
        }
        context.strokeStyle = `rgba(255, 0, 0, ${0.5 * this.glowIntensity})`;
        context.lineWidth = this.width * 3;
        context.lineCap = 'round';
        context.stroke();

        // Рисуем основной лазерный луч врага
        context.beginPath();
        context.moveTo(this.x, this.y);
        context.lineTo(this.trailPoints[this.trailPoints.length - 1]?.x || this.x, this.trailPoints[this.trailPoints.length - 1]?.y || this.y);
        context.strokeStyle = this.color;
        context.lineWidth = this.width * 0.7;
        context.lineCap = 'round';
        context.stroke();

        // Добавляем свечение
        context.beginPath();
        context.arc(this.x, this.y, this.width, 0, Math.PI * 2);
        const gradient = context.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.width);
        gradient.addColorStop(0, `rgba(255, 0, 0, ${this.glowIntensity})`);
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        context.fillStyle = gradient;
        context.fill();
    }
}
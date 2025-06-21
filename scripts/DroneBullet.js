class DroneBullet extends Bullet {
    constructor() {
        super();
        this.color = '#4169E1'; // Изменяем цвет пули дрона на синий
        this.speed = ShooterConfig.BULLET_SPEED * 1.2; // Делаем пули дрона немного быстрее
    }

    draw(context) {
        if (!this.active) return;

        // Рисуем след пули дрона
        context.beginPath();
        context.moveTo(this.x, this.y);
        for (let i = 0; i < this.trailPoints.length; i++) {
            const point = this.trailPoints[i];
            context.lineTo(point.x, point.y);
        }
        context.strokeStyle = `rgba(65, 105, 225, ${0.5 * this.glowIntensity})`;
        context.lineWidth = this.width * 3;
        context.lineCap = 'round';
        context.stroke();

        // Рисуем основной лазерный луч дрона
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
        gradient.addColorStop(0, `rgba(65, 105, 225, ${this.glowIntensity})`);
        gradient.addColorStop(1, 'rgba(65, 105, 225, 0)');
        context.fillStyle = gradient;
        context.fill();
    }
}
class Particle extends GameObject {
    constructor(x, y, color) {
        super(x, y, ShooterConfig.PARTICLE_SIZE, ShooterConfig.PARTICLE_SIZE, color);
        this.lifespan = ShooterConfig.PARTICLE_LIFESPAN;
        this.fadeRate = 1 / this.lifespan;
        this.alpha = 1;
        this.gravity = 0; // Гравитация для частиц
        this.expandRate = 0; // Скорость расширения
        this.originalSize = this.size;
    }

    update() {
        // Обновляем позицию
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        // Применяем гравитацию
        if (this.gravity > 0) {
            this.velocityY += this.gravity;
        }
        
        // Применяем расширение
        if (this.expandRate > 0) {
            this.size += this.expandRate;
            this.width = this.size;
            this.height = this.size;
        }
        
        // Применяем трение
        this.velocityX *= 0.98;
        this.velocityY *= 0.98;
        
        this.lifespan--;
        this.alpha -= this.fadeRate;
        if (this.lifespan <= 0) {
            this.active = false;
        }
    }

    draw(context) {
        if (!this.active) return; // Не рисуем неактивные частицы
        context.save();
        context.globalAlpha = this.alpha;
        super.draw(context);
        context.restore();
    }

    isActive() {
        return this.lifespan > 0;
    }
}

console.log('Particle.js загружен');

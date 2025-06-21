class Obstacle extends GameObject {
    constructor(x, y, width, height) {
        super(x, y, width, height, ShooterConfig.OBSTACLE_COLOR);
        console.log(`Препятствие создано: x=${x}, y=${y}, width=${width}, height=${height}`);
    }

    draw(context) {
        // Марсианские скальные образования
        this.drawMarsRock(context);
    }

    drawMarsRock(context) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;

        // Рисуем тень
        context.fillStyle = 'rgba(0, 0, 0, 0.4)';
        context.save();
        context.translate(centerX + 8, centerY + 8);
        this.drawRockShape(context, this.width * 0.9, this.height * 0.9);
        context.fill();
        context.restore();

        // Основная скала - темный марсианский цвет
        context.fillStyle = '#4A1F1F';
        context.save();
        context.translate(centerX, centerY);
        this.drawRockShape(context, this.width, this.height);
        context.fill();
        context.restore();

        // Текстура скалы
        this.addRockTexture(context);

        // Светлые грани для объемности
        context.fillStyle = 'rgba(139, 38, 53, 0.6)';
        context.save();
        context.translate(centerX, centerY);
        this.drawRockShape(context, this.width * 0.7, this.height * 0.7);
        context.fill();
        context.restore();

        // Блики на скале
        context.fillStyle = 'rgba(200, 100, 100, 0.3)';
        context.save();
        context.translate(centerX - this.width * 0.2, centerY - this.height * 0.2);
        this.drawRockShape(context, this.width * 0.3, this.height * 0.3);
        context.fill();
        context.restore();
    }

    drawRockShape(context, width, height) {
        // Создаем неровную скальную форму
        const points = 8;
        const angleStep = (Math.PI * 2) / points;
        
        context.beginPath();
        for (let i = 0; i < points; i++) {
            const angle = i * angleStep;
            const randomFactor = 0.7 + Math.sin(this.x + this.y + i) * 0.3; // Детерминированная случайность
            const x = Math.cos(angle) * (width / 2) * randomFactor;
            const y = Math.sin(angle) * (height / 2) * randomFactor;
            
            if (i === 0) {
                context.moveTo(x, y);
            } else {
                context.lineTo(x, y);
            }
        }
        context.closePath();
    }

    addRockTexture(context) {
        // Добавляем текстуру камня
        const seed = this.x + this.y;
        const texturePoints = 20;
        
        for (let i = 0; i < texturePoints; i++) {
            const x = this.x + ((seed + i * 73) % 97) / 97 * this.width;
            const y = this.y + ((seed + i * 37) % 97) / 97 * this.height;
            const size = 1 + ((seed + i * 17) % 3);
            
            // Проверяем, находится ли точка внутри препятствия
            if (x >= this.x && x <= this.x + this.width && 
                y >= this.y && y <= this.y + this.height) {
                
                context.fillStyle = `rgba(70, 30, 30, ${0.3 + ((seed + i) % 30) / 100})`;
                context.beginPath();
                context.arc(x, y, size, 0, Math.PI * 2);
                context.fill();
            }
        }

        // Добавляем трещины
        this.addRockCracks(context);
    }

    addRockCracks(context) {
        const seed = this.x + this.y;
        const crackCount = 2 + (seed % 3);
        
        context.strokeStyle = 'rgba(30, 10, 10, 0.6)';
        context.lineWidth = 1;
        
        for (let i = 0; i < crackCount; i++) {
            const startX = this.x + ((seed + i * 89) % 97) / 97 * this.width;
            const startY = this.y + ((seed + i * 67) % 97) / 97 * this.height;
            const endX = startX + (((seed + i * 43) % 30) - 15);
            const endY = startY + (((seed + i * 29) % 30) - 15);
            
            context.beginPath();
            context.moveTo(startX, startY);
            context.lineTo(endX, endY);
            context.stroke();
        }
    }

    update() {
        // Препятствия статичны, поэтому метод update пустой
    }
}

console.log('Obstacle.js загружен');
class CorridorWall extends GameObject {
    constructor(x, y, width, height, direction = 'horizontal') {
        super(x, y, width, height, '#2A1515');
        this.direction = direction;
    }

    draw(context) {
        this.drawCorridorWall(context);
    }

    drawCorridorWall(context) {
        // Тень стены коридора
        context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        context.fillRect(this.x + 3, this.y + 3, this.width, this.height);

        // Основной цвет - темнее чем стены комнат
        context.fillStyle = '#1A0F0F';
        context.fillRect(this.x, this.y, this.width, this.height);
    }

    update() {
        // Стены коридоров статичны
    }
}

console.log('CorridorWall.js создан');
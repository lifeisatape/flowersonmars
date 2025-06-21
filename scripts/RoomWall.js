
class RoomWall extends GameObject {
    constructor(x, y, width, height, roomType = 'normal') {
        super(x, y, width, height, '#2A1515');
        this.roomType = roomType;
    }

    draw(context) {
        this.drawMarsRoomWall(context);
    }

    drawMarsRoomWall(context) {
        const roomColors = {
            small: { base: '#4A1F1F', accent: '#6B2F2F', highlight: '#8B3F3F' },
            medium: { base: '#5A2F1F', accent: '#7B3F2F', highlight: '#9B4F3F' }, 
            large: { base: '#6A3F2F', accent: '#8B4F3F', highlight: '#AB5F4F' },
            boss: { base: '#2A0F0F', accent: '#4A1F1F', highlight: '#6A2F2F' },
            normal: { base: '#4A2525', accent: '#6A3535', highlight: '#8A4545' }
        };

        const colors = roomColors[this.roomType] || roomColors.normal;

        // Тень стены
        context.fillStyle = 'rgba(0, 0, 0, 0.4)';
        context.fillRect(this.x + 2, this.y + 2, this.width, this.height);

        // Основной цвет стены
        context.fillStyle = colors.base;
        context.fillRect(this.x, this.y, this.width, this.height);

        // Простая рамка
        context.strokeStyle = colors.accent;
        context.lineWidth = 2;
        context.strokeRect(this.x + 1, this.y + 1, this.width - 2, this.height - 2);

        // Простые детали для больших стен
        if (this.width > 100 || this.height > 100) {
            this.addSimpleDetails(context, colors);
        }
    }

    addSimpleDetails(context, colors) {
        // Простые детали только для больших стен
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        // Центральная линия
        context.strokeStyle = colors.highlight;
        context.lineWidth = 1;
        context.setLineDash([10, 5]);
        
        if (this.width > this.height) {
            // Горизонтальная линия для широких стен
            context.beginPath();
            context.moveTo(this.x + 10, centerY);
            context.lineTo(this.x + this.width - 10, centerY);
            context.stroke();
        } else {
            // Вертикальная линия для высоких стен
            context.beginPath();
            context.moveTo(centerX, this.y + 10);
            context.lineTo(centerX, this.y + this.height - 10);
            context.stroke();
        }
        
        context.setLineDash([]);
        
        // Простые угловые маркеры
        context.fillStyle = colors.highlight;
        const markerSize = 4;
        
        // Только по углам
        context.fillRect(this.x + 5, this.y + 5, markerSize, markerSize);
        context.fillRect(this.x + this.width - 5 - markerSize, this.y + 5, markerSize, markerSize);
        context.fillRect(this.x + 5, this.y + this.height - 5 - markerSize, markerSize, markerSize);
        context.fillRect(this.x + this.width - 5 - markerSize, this.y + this.height - 5 - markerSize, markerSize, markerSize);
    }

    update() {
        // Стены статичны
    }
}

console.log('RoomWall.js создан');

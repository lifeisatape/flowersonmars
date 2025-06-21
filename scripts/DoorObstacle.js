
class DoorObstacle extends GameObject {
    constructor(x, y, width, height, doorType = 'normal') {
        super(x, y, width, height, '#8B4513');
        this.doorType = doorType;
        this.isOpen = false;
        this.canInteract = false;
        this.interactionDistance = 80;
        this.isLocked = doorType === 'locked';
    }

    update(player) {
        // Проверяем, близко ли игрок к двери
        const dx = player.x + player.width / 2 - (this.x + this.width / 2);
        const dy = player.y + player.height / 2 - (this.y + this.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        this.canInteract = distance <= this.interactionDistance;
    }

    interact() {
        if (this.canInteract && !this.isLocked) {
            this.isOpen = !this.isOpen;
            return true;
        }
        return false;
    }

    unlock() {
        this.isLocked = false;
    }

    // Переопределяем коллизию - если дверь открыта, коллизии нет
    collidesWith(other) {
        if (this.isOpen) {
            return false;
        }
        return super.collidesWith(other);
    }

    draw(context) {
        if (!this.isOpen) {
            this.drawMartianDoor(context);
        } else {
            this.drawOpenDoor(context);
        }
        
        // Показываем подсказку для взаимодействия
        if (this.canInteract && !this.isOpen) {
            this.drawInteractionHint(context);
        }
    }

    drawOpenDoor(context) {
        // Рисуем открытую дверь как рамку
        context.strokeStyle = '#4A4A4A';
        context.lineWidth = 4;
        context.strokeRect(this.x, this.y, this.width, this.height);
        
        context.fillStyle = 'rgba(74, 74, 74, 0.3)';
        context.fillRect(this.x + 2, this.y + 2, this.width - 4, this.height - 4);
    }

    drawInteractionHint(context) {
        context.fillStyle = 'rgba(255, 255, 255, 0.9)';
        context.font = 'bold 12px Arial';
        context.textAlign = 'center';
        
        const text = this.isLocked ? 'ЗАПЕРТО' : 'E - ОТКРЫТЬ';
        const textX = this.x + this.width / 2;
        const textY = this.y - 10;
        
        // Фон для текста
        const textWidth = context.measureText(text).width;
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(textX - textWidth / 2 - 5, textY - 15, textWidth + 10, 20);
        
        // Текст
        context.fillStyle = 'white';
        context.fillText(text, textX, textY);
    }

    drawMartianDoor(context) {
        const doorColors = {
            normal: { base: '#4A4A4A', frame: '#6A6A6A', accent: '#8A8A8A', glow: '#FFFFFF' },
            locked: { base: '#B8860B', frame: '#DAA520', accent: '#FFD700', glow: '#FFFF00' },
            boss: { base: '#4B0000', frame: '#8B0000', accent: '#FF0000', glow: '#FF4500' },
            secret: { base: '#4B0082', frame: '#6A0DAD', accent: '#9370DB', glow: '#DDA0DD' }
        };

        const colors = doorColors[this.doorType];

        // Тень двери
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(this.x + 4, this.y + 4, this.width, this.height);

        // Основная рамка двери
        context.fillStyle = colors.frame;
        context.fillRect(this.x, this.y, this.width, this.height);

        // Внутренняя часть двери
        context.fillStyle = colors.base;
        context.fillRect(this.x + 4, this.y + 4, this.width - 8, this.height - 8);

        // Технологические панели
        this.addTechPanels(context, colors);

        // Центральный элемент управления
        this.addControlPanel(context, colors);

        // Энергетические линии для специальных дверей
        if (this.doorType !== 'normal') {
            this.addEnergyLines(context, colors);
        }

        // Замок для заперых дверей
        if (this.doorType === 'locked') {
            this.addLockMechanism(context, colors);
        }

        // Предупреждающие знаки для дверей босса
        if (this.doorType === 'boss') {
            this.addWarningSymbols(context, colors);
        }
    }

    addTechPanels(context, colors) {
        context.fillStyle = colors.accent;
        const panelWidth = this.width * 0.8;
        const panelHeight = this.height * 0.12;

        // Верхняя панель
        context.fillRect(
            this.x + (this.width - panelWidth) / 2,
            this.y + this.height * 0.15,
            panelWidth,
            panelHeight
        );

        // Нижняя панель
        context.fillRect(
            this.x + (this.width - panelWidth) / 2,
            this.y + this.height * 0.73,
            panelWidth,
            panelHeight
        );

        // Детализация панелей
        context.fillStyle = colors.glow;
        const indicatorSize = 2;
        for (let i = 0; i < 5; i++) {
            const indicatorX = this.x + (this.width - panelWidth) / 2 + 10 + i * 15;
            context.fillRect(indicatorX, this.y + this.height * 0.17, indicatorSize, indicatorSize);
            context.fillRect(indicatorX, this.y + this.height * 0.75, indicatorSize, indicatorSize);
        }
    }

    addControlPanel(context, colors) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const radius = Math.min(this.width, this.height) * 0.15;

        // Основная панель управления
        context.fillStyle = colors.accent;
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        context.fill();

        // Внутренний индикатор
        context.fillStyle = colors.glow;
        context.beginPath();
        context.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
        context.fill();

        // Символ типа двери
        context.fillStyle = colors.base;
        context.font = 'bold 12px Arial';
        context.textAlign = 'center';

        const doorSymbols = {
            normal: '◈',
            locked: '⚿',
            boss: '☠',
            secret: '◊'
        };

        context.fillText(
            doorSymbols[this.doorType],
            centerX,
            centerY + 4
        );
    }

    addEnergyLines(context, colors) {
        context.strokeStyle = colors.glow;
        context.lineWidth = 2;
        context.setLineDash([6, 3]);

        // Вертикальные энергетические линии
        for (let i = 0; i < 3; i++) {
            const lineX = this.x + this.width * (0.2 + i * 0.3);
            context.beginPath();
            context.moveTo(lineX, this.y + 8);
            context.lineTo(lineX, this.y + this.height - 8);
            context.stroke();
        }

        context.setLineDash([]);

        // Эффект свечения
        context.shadowColor = colors.glow;
        context.shadowBlur = 6;
        context.strokeStyle = colors.glow;
        context.lineWidth = 1;
        context.strokeRect(this.x + 2, this.y + 2, this.width - 4, this.height - 4);
        context.shadowBlur = 0;
    }

    addLockMechanism(context, colors) {
        const lockX = this.x + this.width * 0.8;
        const lockY = this.y + this.height / 2;

        // Замочная скважина
        context.fillStyle = '#000000';
        context.beginPath();
        context.arc(lockX, lockY, 6, 0, Math.PI * 2);
        context.fill();
        context.fillRect(lockX - 2, lockY, 4, 8);

        // Металлическая накладка замка
        context.fillStyle = colors.accent;
        context.fillRect(lockX - 8, lockY - 8, 16, 16);
        context.strokeStyle = colors.frame;
        context.lineWidth = 2;
        context.strokeRect(lockX - 8, lockY - 8, 16, 16);
    }

    addWarningSymbols(context, colors) {
        // Предупреждающие треугольники
        context.fillStyle = colors.glow;
        const triangleSize = 8;

        // Верхние углы
        this.drawWarningTriangle(context, this.x + 10, this.y + 10, triangleSize);
        this.drawWarningTriangle(context, this.x + this.width - 18, this.y + 10, triangleSize);

        // Нижние углы
        this.drawWarningTriangle(context, this.x + 10, this.y + this.height - 18, triangleSize);
        this.drawWarningTriangle(context, this.x + this.width - 18, this.y + this.height - 18, triangleSize);
    }

    drawWarningTriangle(context, x, y, size) {
        context.beginPath();
        context.moveTo(x + size / 2, y);
        context.lineTo(x, y + size);
        context.lineTo(x + size, y + size);
        context.closePath();
        context.fill();

        // Восклицательный знак
        context.fillStyle = '#000000';
        context.font = 'bold 6px Arial';
        context.textAlign = 'center';
        context.fillText('!', x + size / 2, y + size - 2);
    }

    update() {
        // Двери могут иметь анимацию открытия/закрытия в будущем
    }
}

console.log('DoorObstacle.js создан');

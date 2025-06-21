class InteractiveTree extends GameObject {
    constructor(x, y, size) {
        super(x, y, size, size, ShooterConfig.PLAYER_COLOR);
        this.size = size;
        this.branches = [];
        this.maxDepth = 6;
        this.baseAngle = Math.PI / 2;
        this.angleSpread = Math.PI / 6;
        this.branchShrinkFactor = 0.75;
        this.swayAngle = 0;
        this.swaySpeed = 0.02;
        this.swayAmount = 0.05;
        this.playerProximityThreshold = 300;
        this.maxBendAngle = Math.PI / 8;
        this.currentBendAngle = 0;
        this.bendSpeed = 0.1;
        this.baseSway = 0;
        this.generateTree();
    }

    generateTree() {
        this.branches = this.generateBranches(0, 0, this.size, this.baseAngle, 0);
    }

    generateBranches(startX, startY, length, angle, depth) {
        if (depth >= this.maxDepth) return [];

        const endX = startX + Math.cos(angle) * length;
        const endY = startY - Math.sin(angle) * length;

        const branches = [{
            startX, startY, endX, endY,
            originalAngle: angle,
            length,
            depth
        }];

        if (depth < this.maxDepth - 1) {
            const newLength = length * this.branchShrinkFactor;
            const leftBranches = this.generateBranches(endX, endY, newLength, angle + this.angleSpread, depth + 1);
            const rightBranches = this.generateBranches(endX, endY, newLength, angle - this.angleSpread, depth + 1);
            branches.push(...leftBranches, ...rightBranches);
        }

        return branches;
    }

    update(playerX, playerY) {
        this.swayAngle += this.swaySpeed;
        this.baseSway = Math.sin(this.swayAngle) * this.swayAmount;

        const dx = playerX - this.x;
        const dy = playerY - (this.y + this.size);
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
        const angleToPlayer = Math.atan2(-dy, dx);

        // Плавно изменяем угол наклона
        const targetBendAngle = distanceToPlayer < this.playerProximityThreshold
            ? (angleToPlayer - this.baseAngle) * (1 - distanceToPlayer / this.playerProximityThreshold)
            : 0;

        this.currentBendAngle += (targetBendAngle - this.currentBendAngle) * this.bendSpeed;

        // Ограничиваем максимальный угол наклона
        this.currentBendAngle = Math.max(Math.min(this.currentBendAngle, this.maxBendAngle), -this.maxBendAngle);
    }

    draw(context) {
        // Рисуем марсианское кристаллическое дерево
        this.drawCrystalTree(context);
    }

    drawCrystalTree(context) {
        const centerX = this.x + this.size / 2;
        const centerY = this.y + this.size / 2;
        const radius = this.size / 2;

        // Тень дерева
        context.fillStyle = 'rgba(0, 0, 0, 0.4)';
        context.beginPath();
        context.ellipse(centerX + 3, centerY + radius + 5, radius * 0.9, radius * 0.2, 0, 0, Math.PI * 2);
        context.fill();

        // Кристаллический ствол
        context.fillStyle = '#2F1B69';
        context.strokeStyle = '#8A2BE2';
        context.lineWidth = 2;

        // Основной ствол как кристалл
        context.beginPath();
        context.moveTo(centerX, centerY + radius);
        context.lineTo(centerX - radius * 0.15, centerY + radius * 0.3);
        context.lineTo(centerX - radius * 0.1, centerY - radius * 0.2);
        context.lineTo(centerX + radius * 0.1, centerY - radius * 0.2);
        context.lineTo(centerX + radius * 0.15, centerY + radius * 0.3);
        context.closePath();
        context.fill();
        context.stroke();

        // Кристаллическая крона - основной кристалл
        const glowIntensity = this.isInteracting ? 0.8 : 0.4;
        context.fillStyle = this.isInteracting ? '#DA70D6' : '#9370DB';
        context.shadowColor = '#8A2BE2';
        context.shadowBlur = this.isInteracting ? 15 : 8;

        context.beginPath();
        // Создаем форму кристалла
        const points = 6;
        for (let i = 0; i < points; i++) {
            const angle = (i * Math.PI * 2) / points;
            const variation = 0.7 + Math.sin(this.x + this.y + i) * 0.3;
            const x = centerX + Math.cos(angle) * radius * 0.7 * variation;
            const y = centerY - radius * 0.3 + Math.sin(angle) * radius * 0.6 * variation;

            if (i === 0) {
                context.moveTo(x, y);
            } else {
                context.lineTo(x, y);
            }
        }
        context.closePath();
        context.fill();

        // Убираем тень для следующих элементов
        context.shadowBlur = 0;

        // Кристаллические отростки
        context.strokeStyle = '#9370DB';
        context.lineWidth = 3;
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5 + Math.PI / 10;
            const startX = centerX + Math.cos(angle) * radius * 0.4;
            const startY = centerY - radius * 0.3 + Math.sin(angle) * radius * 0.4;
            const endX = centerX + Math.cos(angle) * radius * 0.8;
            const endY = centerY - radius * 0.3 + Math.sin(angle) * radius * 0.8;

            context.beginPath();
            context.moveTo(startX, startY);
            context.lineTo(endX, endY);
            context.stroke();

            // Маленькие кристаллы на концах
            context.fillStyle = this.isInteracting ? '#FF69B4' : '#DDA0DD';
            context.beginPath();
            context.arc(endX, endY, 3, 0, Math.PI * 2);
            context.fill();
        }

        // Энергетические сферы (марсианские плоды)
        context.fillStyle = this.isInteracting ? '#FF1493' : '#FF6347';
        context.shadowColor = this.isInteracting ? '#FF1493' : '#FF6347';
        context.shadowBlur = this.isInteracting ? 10 : 5;

        for (let i = 0; i < 3; i++) {
            const angle = (i * Math.PI * 2) / 3;
            const orb_x = centerX + Math.cos(angle) * radius * 0.5;
            const orb_y = centerY - radius * 0.3 + Math.sin(angle) * radius * 0.5;

            context.beginPath();
            context.arc(orb_x, orb_y, 5, 0, Math.PI * 2);
            context.fill();
        }

        context.shadowBlur = 0;

        // Эффект взаимодействия - энергетическое поле
        if (this.isInteracting) {
            context.strokeStyle = '#00FFFF';
            context.lineWidth = 2;
            context.setLineDash([8, 4]);

            // Внутреннее кольцо
            context.beginPath();
            context.arc(centerX, centerY - radius * 0.2, radius + 8, 0, Math.PI * 2);
            context.stroke();

            // Внешнее кольцо
            context.beginPath();
            context.arc(centerX, centerY - radius * 0.2, radius + 15, 0, Math.PI * 2);
            context.stroke();

            context.setLineDash([]);

            // Энергетические частицы
            context.fillStyle = '#00FFFF';
            for (let i = 0; i < 8; i++) {
                const angle = (Date.now() * 0.01 + i) % (Math.PI * 2);
                const particleX = centerX + Math.cos(angle) * (radius + 20);
                const particleY = centerY - radius * 0.2 + Math.sin(angle) * (radius + 20);

                context.beginPath();
                context.arc(particleX, particleY, 2, 0, Math.PI * 2);
                context.fill();
            }
        }
    }
}

console.log('InteractiveTree.js loaded');
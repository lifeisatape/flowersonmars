class LevelEditor {
    constructor() {
        this.canvas = document.getElementById('editorCanvas');
        this.context = this.canvas.getContext('2d');
        this.minimap = document.getElementById('minimap');
        this.minimapContext = this.minimap.getContext('2d');

        this.currentTool = 'select';
        this.currentSize = 50;
        this.currentEnemyType = 'normal';
        this.currentRoomType = 'normal';
        this.currentDoorType = 'normal';
        this.snapToGrid = true;

        this.camera = {
            x: 0,
            y: 0,
            zoom: 0.5
        };

        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.selectedObject = null;
        this.selectedRoom = null;

        this.levelData = {
            name: 'Новый уровень',
            obstacles: [],
            trees: [],
            enemies: [],
            rooms: [],
            corridors: [],
            doors: [],
            playerSpawn: { x: ShooterConfig.MAP_WIDTH / 2, y: ShooterConfig.MAP_HEIGHT / 2 }
        };

        this.roomTemplates = {
            small: { width: 400, height: 300 },
            medium: { width: 600, height: 400 },
            large: { width: 800, height: 600 },
            boss: { width: 1000, height: 750 }
        };

        this.setupCanvas();
        this.setupEventListeners();
        this.draw();
    }

    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.minimap.width = 200;
        this.minimap.height = 200;
        this.draw();
    }

    setupEventListeners() {
        // Инструменты
        document.querySelectorAll('.tool-button[data-tool]').forEach(button => {
            button.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentTool = e.target.dataset.tool;
                this.updateInfoPanel();
            });
        });

        // Размер
        const sizeSlider = document.getElementById('sizeSlider');
        sizeSlider.addEventListener('input', (e) => {
            this.currentSize = parseInt(e.target.value);
            document.getElementById('sizeDisplay').textContent = this.currentSize + 'px';
        });

        // Тип врага
        document.getElementById('enemyTypeSelect').addEventListener('change', (e) => {
            this.currentEnemyType = e.target.value;
        });

        // Тип комнаты
        document.getElementById('roomTypeSelect').addEventListener('change', (e) => {
            this.currentRoomType = e.target.value;
        });

        // Тип двери
        document.getElementById('doorTypeSelect').addEventListener('change', (e) => {
            this.currentDoorType = e.target.value;
        });

        // Привязка к сетке
        const snapToGridCheckbox = document.getElementById('snapToGrid');
        if (snapToGridCheckbox) {
            snapToGridCheckbox.addEventListener('change', (e) => {
                this.snapToGrid = e.target.checked;
                console.log('Snap to grid:', this.snapToGrid);
            });
        }

        // Канвас события
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Клавиатура
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    getMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        let x = (e.clientX - rect.left - this.canvas.width / 2) / this.camera.zoom + this.camera.x;
        let y = (e.clientY - rect.top - this.canvas.height / 2) / this.camera.zoom + this.camera.y;

        // Привязка к сетке
        if (this.snapToGrid) {
            x = Math.round(x / ShooterConfig.GRID_SIZE) * ShooterConfig.GRID_SIZE;
            y = Math.round(y / ShooterConfig.GRID_SIZE) * ShooterConfig.GRID_SIZE;
        }

        return { x, y };
    }

    onMouseDown(e) {
        const pos = this.getMousePosition(e);

        if (e.button === 1 || (e.button === 0 && e.ctrlKey)) { // Средняя кнопка или Ctrl+ЛКМ для панорамирования
            this.isDragging = true;
            this.dragStart = { x: e.clientX, y: e.clientY };
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        switch (this.currentTool) {
            case 'select':
                this.selectObject(pos);
                break;
            case 'obstacle':
                this.addObstacle(pos);
                break;
            case 'tree':
                this.addTree(pos);
                break;
            case 'enemy':
                this.addEnemy(pos);
                break;
            case 'room':
                this.addRoom(pos);
                break;
            case 'corridor':
                this.addCorridor(pos);
                break;
            case 'door':
                this.addDoor(pos);
                break;
            case 'spawn':
                this.setPlayerSpawn(pos);
                break;
            case 'erase':
                this.eraseObject(pos);
                break;
        }

        this.draw();
        this.updateStats();
    }

    onMouseMove(e) {
        const pos = this.getMousePosition(e);

        if (this.isDragging) {
            const dx = e.clientX - this.dragStart.x;
            const dy = e.clientY - this.dragStart.y;
            this.camera.x -= dx / this.camera.zoom;
            this.camera.y -= dy / this.camera.zoom;
            this.dragStart = { x: e.clientX, y: e.clientY };
            this.draw();
        }

        // Перемещение выбранного объекта
        if (this.selectedObject && e.buttons === 1 && this.currentTool === 'select') {
            if (this.snapToGrid) {
                // Привязываем к сетке с учетом размера объекта
                const snapX = Math.round((pos.x - this.selectedObject.width / 2) / ShooterConfig.GRID_SIZE) * ShooterConfig.GRID_SIZE;
                const snapY = Math.round((pos.y - this.selectedObject.height / 2) / ShooterConfig.GRID_SIZE) * ShooterConfig.GRID_SIZE;
                this.selectedObject.x = snapX;
                this.selectedObject.y = snapY;
            } else {
                this.selectedObject.x = pos.x - this.selectedObject.width / 2;
                this.selectedObject.y = pos.y - this.selectedObject.height / 2;
            }
            this.draw();
        }

        this.updateInfoPanel(pos);
    }

    onMouseUp(e) {
        this.isDragging = false;
        this.canvas.style.cursor = 'crosshair';
    }

    onWheel(e) {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        this.camera.zoom = Math.max(0.1, Math.min(2, this.camera.zoom * zoomFactor));
        this.draw();
        this.updateInfoPanel();
    }

    onKeyDown(e) {
        if (e.key === 'Delete' && this.selectedObject) {
            this.deleteSelectedObject();
        }
        if (e.key === 'Escape') {
            this.selectedObject = null;
            this.draw();
        }
    }

    selectObject(pos) {
        this.selectedObject = null;
        this.selectedRoom = null;

        // Сначала проверяем маленькие объекты (двери, враги)
        const smallObjects = [
            ...this.levelData.doors,
            ...this.levelData.enemies,
            ...this.levelData.obstacles,
            ...this.levelData.trees
        ];

        for (const obj of smallObjects) {
            if (pos.x >= obj.x && pos.x <= obj.x + obj.width &&
                pos.y >= obj.y && pos.y <= obj.y + obj.height) {
                this.selectedObject = obj;
                return;
            }
        }

        // Затем проверяем коридоры
        for (const corridor of this.levelData.corridors) {
            if (pos.x >= corridor.x && pos.x <= corridor.x + corridor.width &&
                pos.y >= corridor.y && pos.y <= corridor.y + corridor.height) {
                this.selectedObject = corridor;
                return;
            }
        }

        // Наконец проверяем комнаты
        for (const room of this.levelData.rooms) {
            if (pos.x >= room.x && pos.x <= room.x + room.width &&
                pos.y >= room.y && pos.y <= room.y + room.height) {
                this.selectedRoom = room;
                this.selectedObject = room;
                return;
            }
        }

        this.draw();
    }

    addObstacle(pos) {
        const obstacle = {
            type: 'obstacle',
            x: pos.x - this.currentSize / 2,
            y: pos.y - this.currentSize / 2,
            width: this.currentSize,
            height: this.currentSize,
            color: ShooterConfig.OBSTACLE_COLOR
        };
        this.levelData.obstacles.push(obstacle);
    }

    addTree(pos) {
        const tree = {
            type: 'tree',
            x: pos.x - this.currentSize / 2,
            y: pos.y - this.currentSize / 2,
            width: this.currentSize,
            height: this.currentSize,
            size: this.currentSize
        };
        this.levelData.trees.push(tree);
    }

    addEnemy(pos) {
        const enemy = {
            type: 'enemy',
            enemyType: this.currentEnemyType,
            x: pos.x - 25,
            y: pos.y - 25,
            width: 50,
            height: 50,
            color: this.getEnemyColor(this.currentEnemyType)
        };
        this.levelData.enemies.push(enemy);
    }

    addRoom(pos) {
        const template = this.roomTemplates[this.currentRoomType];
        const room = {
            type: 'room',
            roomType: this.currentRoomType,
            x: pos.x - template.width / 2,
            y: pos.y - template.height / 2,
            width: template.width,
            height: template.height,
            color: this.getRoomColor(this.currentRoomType),
            walls: true,
            cleared: false
        };
        this.levelData.rooms.push(room);
    }

    addCorridor(pos) {
        const corridor = {
            type: 'corridor',
            x: pos.x - 50,
            y: pos.y - 50,
            width: 100,
            height: 100,
            color: '#666666',
            direction: 'horizontal' // horizontal or vertical
        };
        this.levelData.corridors.push(corridor);
    }

    addDoor(pos) {
        // Определяем ближайшую стену для размещения двери
        const nearestWall = this.findNearestWall(pos);
        let doorWidth, doorHeight, doorX, doorY;

        if (nearestWall && nearestWall.orientation === 'horizontal') {
            // Горизонтальная стена - дверь вертикальная
            doorWidth = 60;
            doorHeight = 20;
            doorX = pos.x - doorWidth / 2;
            doorY = nearestWall.y - doorHeight / 2;
        } else {
            // Вертикальная стена или по умолчанию - дверь горизонтальная  
            doorWidth = 20;
            doorHeight = 60;
            doorX = nearestWall ? nearestWall.x - doorWidth / 2 : pos.x - doorWidth / 2;
            doorY = pos.y - doorHeight / 2;
        }

        const door = {
            type: 'door',
            doorType: this.currentDoorType,
            x: doorX,
            y: doorY,
            width: doorWidth,
            height: doorHeight,
            color: this.getDoorColor(this.currentDoorType),
            isOpen: false,
            requiresKey: this.currentDoorType === 'locked',
            direction: nearestWall && nearestWall.orientation === 'horizontal' ? 'vertical' : 'horizontal'
        };
        this.levelData.doors.push(door);
    }

    findNearestWall(pos) {
        let nearestWall = null;
        let minDistance = Infinity;

        // Проверяем стены комнат
        this.levelData.rooms.forEach(room => {
            const walls = [
                { x: room.x, y: room.y, width: room.width, height: 20, orientation: 'horizontal' }, // верх
                { x: room.x, y: room.y + room.height - 20, width: room.width, height: 20, orientation: 'horizontal' }, // низ
                { x: room.x, y: room.y, width: 20, height: room.height, orientation: 'vertical' }, // лево
                { x: room.x + room.width - 20, y: room.y, width: 20, height: room.height, orientation: 'vertical' } // право
            ];

            walls.forEach(wall => {
                const distance = Math.sqrt(
                    Math.pow(pos.x - (wall.x + wall.width / 2), 2) + 
                    Math.pow(pos.y - (wall.y + wall.height / 2), 2)
                );
                if (distance < minDistance && distance < 100) { // В радиусе 100 пикселей
                    minDistance = distance;
                    nearestWall = wall;
                }
            });
        });

        // Проверяем стены коридоров
        this.levelData.corridors.forEach(corridor => {
            const isHorizontal = corridor.width > corridor.height;
            const walls = [];

            if (isHorizontal) {
                walls.push(
                    { x: corridor.x, y: corridor.y, width: corridor.width, height: 15, orientation: 'horizontal' },
                    { x: corridor.x, y: corridor.y + corridor.height - 15, width: corridor.width, height: 15, orientation: 'horizontal' }
                );
            } else {
                walls.push(
                    { x: corridor.x, y: corridor.y, width: 15, height: corridor.height, orientation: 'vertical' },
                    { x: corridor.x + corridor.width - 15, y: corridor.y, width: 15, height: corridor.height, orientation: 'vertical' }
                );
            }

            walls.forEach(wall => {
                const distance = Math.sqrt(
                    Math.pow(pos.x - (wall.x + wall.width / 2), 2) + 
                    Math.pow(pos.y - (wall.y + wall.height / 2), 2)
                );
                if (distance < minDistance && distance < 100) {
                    minDistance = distance;
                    nearestWall = wall;
                }
            });
        });

        return nearestWall;
    }

    setPlayerSpawn(pos) {
        this.levelData.playerSpawn = { x: pos.x, y: pos.y };
    }

    eraseObject(pos) {
        // Удаляем объект в указанной позиции
        this.levelData.obstacles = this.levelData.obstacles.filter(obj => 
            !(pos.x >= obj.x && pos.x <= obj.x + obj.width &&
              pos.y >= obj.y && pos.y <= obj.y + obj.height));

        this.levelData.trees = this.levelData.trees.filter(obj => 
            !(pos.x >= obj.x && pos.x <= obj.x + obj.width &&
              pos.y >= obj.y && pos.y <= obj.y + obj.height));

        this.levelData.enemies = this.levelData.enemies.filter(obj => 
            !(pos.x >= obj.x && pos.x <= obj.x + obj.width &&
              pos.y >= obj.y && pos.y <= obj.y + obj.height));
    }

    deleteSelectedObject() {
        if (!this.selectedObject) return;

        if (this.selectedObject.type === 'obstacle') {
            this.levelData.obstacles = this.levelData.obstacles.filter(obj => obj !== this.selectedObject);
        } else if (this.selectedObject.type === 'tree') {
            this.levelData.trees = this.levelData.trees.filter(obj => obj !== this.selectedObject);
        } else if (this.selectedObject.type === 'enemy') {
            this.levelData.enemies = this.levelData.enemies.filter(obj => obj !== this.selectedObject);
        }

        this.selectedObject = null;
        this.draw();
        this.updateStats();
    }

    getEnemyColor(type) {
        const colors = {
            normal: '#FF0000',
            shooting: '#FF6B35',
            charging: '#FF4500',
            explosive: '#FF1493',
            shield: '#4169E1',
            sniper: '#9932CC',
            teleporter: '#00CED1',
            boss: '#8B0000'
        };
        return colors[type] || '#FF0000';
    }

    getRoomColor(type) {
        const colors = {
            small: '#4A5568',
            medium: '#2D3748', 
            large: '#1A202C',
            boss: '#742A2A'
        };
        return colors[type] || '#4A5568';
    }

    getDoorColor(type) {
        const colors = {
            normal: '#8B4513',
            locked: '#DAA520',
            boss: '#B91C1C', 
            secret: '#059669'
        };
        return colors[type] || '#8B4513';
    }

    draw() {
        // Очистка канваса
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Сохранение контекста
        this.context.save();

        // Применение трансформации камеры
        this.context.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.context.scale(this.camera.zoom, this.camera.zoom);
        this.context.translate(-this.camera.x, -this.camera.y);

        // Рисование фона
        this.context.fillStyle = ShooterConfig.BACKGROUND_COLOR;
        this.context.fillRect(0, 0, ShooterConfig.MAP_WIDTH, ShooterConfig.MAP_HEIGHT);

        // Рисование сетки
        this.drawGrid();

        // Рисование границ карты
        this.context.strokeStyle = ShooterConfig.BORDER_COLOR;
        this.context.lineWidth = 4;
        this.context.strokeRect(0, 0, ShooterConfig.MAP_WIDTH, ShooterConfig.MAP_HEIGHT);

        // Рисование объектов
        this.drawObjects();

        // Рисование спавна игрока
        this.drawPlayerSpawn();

        // Восстановление контекста
        this.context.restore();

        // Рисование мини-карты
        this.drawMinimap();
    }

    drawGrid() {
        this.context.strokeStyle = ShooterConfig.GRID_COLOR;
        this.context.lineWidth = 1;

        for (let x = 0; x <= ShooterConfig.MAP_WIDTH; x += ShooterConfig.GRID_SIZE) {
            this.context.beginPath();
            this.context.moveTo(x, 0);
            this.context.lineTo(x, ShooterConfig.MAP_HEIGHT);
            this.context.stroke();
        }

        for (let y = 0; y <= ShooterConfig.MAP_HEIGHT; y += ShooterConfig.GRID_SIZE) {
            this.context.beginPath();
            this.context.moveTo(0, y);
            this.context.lineTo(ShooterConfig.MAP_WIDTH, y);
            this.context.stroke();
        }
    }

    drawObjects() {
        // Комнаты (рисуем первыми, как фон)
        this.levelData.rooms.forEach(room => {
            this.drawRoom(room);
            this.drawPassableArea(room, 'room');
        });

        // Коридоры
        this.levelData.corridors.forEach(corridor => {
            this.drawCorridor(corridor);
            this.drawPassableArea(corridor, 'corridor');
        });

        // Двери
        this.levelData.doors.forEach(door => {
            this.drawDoor(door);
        });

        // Препятствия
        this.levelData.obstacles.forEach(obstacle => {
            this.drawObstacle(obstacle);
        });

        // Деревья
        this.levelData.trees.forEach(tree => {
            this.drawTree(tree);
        });

        // Враги
        this.levelData.enemies.forEach(enemy => {
            this.drawEnemy(enemy);
        });
    }

    drawRoom(room) {
        const roomColors = {
            small: { base: '#4A1F1F', accent: '#8B2635', glow: '#C04050' },
            medium: { base: '#5A2F1F', accent: '#9B3645', glow: '#D05060' }, 
            large: { base: '#6A3F2F', accent: '#AB4655', glow: '#E06070' },
            boss: { base: '#2A0F0F', accent: '#5B1625', glow: '#8B2635' }
        };

        const colors = roomColors[room.roomType];

        // Тень комнаты
        this.context.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.context.fillRect(room.x + 4, room.y + 4, room.width, room.height);

        // Основной фон комнаты
        this.context.fillStyle = colors.base;
        this.context.fillRect(room.x, room.y, room.width, room.height);

        // Марсианская текстура стен
        this.addRoomTexture(room, colors);

        // Декоративные элементы по углам
        this.context.fillStyle = colors.accent;
        const cornerSize = Math.min(room.width, room.height) * 0.1;

        // Угловые украшения
        this.context.fillRect(room.x, room.y, cornerSize, cornerSize);
        this.context.fillRect(room.x + room.width - cornerSize, room.y, cornerSize, cornerSize);
        this.context.fillRect(room.x, room.y + room.height - cornerSize, cornerSize, cornerSize);
        this.context.fillRect(room.x + room.width - cornerSize, room.y + room.height - cornerSize, cornerSize, cornerSize);

        // Внутренняя рамка
        this.context.strokeStyle = colors.accent;
        this.context.lineWidth = 3;
        this.context.strokeRect(room.x + 3, room.y + 3, room.width - 6, room.height - 6);

        // Символы и эффекты для разных типов комнат
        this.context.fillStyle = colors.glow;
        this.context.font = 'bold 18px Arial';
        this.context.textAlign = 'center';

        const roomSymbols = {
            small: '◉',
            medium: '⬟', 
            large: '⬢',
            boss: '👑'
        };

        // Свечение для символа
        if (room.roomType === 'boss') {
            this.context.shadowColor = '#FFD700';
            this.context.shadowBlur = 10;
        }

        this.context.fillText(
            roomSymbols[room.roomType],
            room.x + room.width / 2,
            room.y + room.height / 2 + 6
        );

        this.context.shadowBlur = 0;

        if (room === this.selectedObject) {
            this.context.strokeStyle = '#00FF00';
            this.context.lineWidth = 3;
            this.context.setLineDash([10, 5]);
            this.context.strokeRect(room.x - 3, room.y - 3, room.width + 6, room.height + 6);
            this.context.setLineDash([]);
        }
    }

    addRoomTexture(room, colors) {
        const seed = room.x + room.y;
        const texturePoints = Math.min(30, (room.width * room.height) / 500);

        for (let i = 0; i < texturePoints; i++) {
            const x = room.x + ((seed + i * 73) % 97) / 97 * room.width;
            const y = room.y + ((seed + i * 37) % 97) / 97 * room.height;
            const size = 1 + ((seed + i * 17) % 3);

            this.context.fillStyle = `rgba(100, 50, 50, ${0.2 + ((seed + i) % 30) / 100})`;
            this.context.beginPath();
            this.context.arc(x, y, size, 0, Math.PI * 2);
            this.context.fill();
        }
    }

    drawCorridor(corridor) {
        // Тень коридора
        this.context.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.context.fillRect(corridor.x + 2, corridor.y + 2, corridor.width, corridor.height);

        // Основной цвет коридора - темнее комнат
        this.context.fillStyle = '#2A1515';
        this.context.fillRect(corridor.x, corridor.y, corridor.width, corridor.height);

        // Боковые стены
        this.context.fillStyle = '#3A1F1F';
        if (corridor.width > corridor.height) {
            // Горизонтальный коридор - верхняя и нижняя стены
            this.context.fillRect(corridor.x, corridor.y, corridor.width, 3);
            this.context.fillRect(corridor.x, corridor.y + corridor.height - 3, corridor.width, 3);
        } else {
            // Вертикальный коридор - левая и правая стены
            this.context.fillRect(corridor.x, corridor.y, 3, corridor.height);
            this.context.fillRect(corridor.x + corridor.width - 3, corridor.y, 3, corridor.height);
        }

        // Направляющие линии - энергетические потоки
        this.context.strokeStyle = '#8B2635';
        this.context.lineWidth = 2;
        this.context.setLineDash([8, 4]);

        if (corridor.width > corridor.height) {
            // Горизонтальные направляющие
            this.context.beginPath();
            this.context.moveTo(corridor.x + 5, corridor.y + corridor.height / 2 - 2);
            this.context.lineTo(corridor.x + corridor.width - 5, corridor.y + corridor.height / 2 - 2);
            this.context.stroke();

            this.context.beginPath();
            this.context.moveTo(corridor.x + 5, corridor.y + corridor.height / 2 + 2);
            this.context.lineTo(corridor.x + corridor.width - 5, corridor.y + corridor.height / 2 + 2);
            this.context.stroke();
        } else {
            // Вертикальные направляющие
            this.context.beginPath();
            this.context.moveTo(corridor.x + corridor.width / 2 - 2, corridor.y + 5);
            this.context.lineTo(corridor.x + corridor.width / 2 - 2, corridor.y + corridor.height - 5);
            this.context.stroke();

            this.context.beginPath();
            this.context.moveTo(corridor.x + corridor.width / 2 + 2, corridor.y + 5);
            this.context.lineTo(corridor.x + corridor.width / 2 + 2, corridor.y + corridor.height - 5);
            this.context.stroke();
        }

        this.context.setLineDash([]);

        // Энергетические узлы
        this.context.fillStyle = '#C04050';
        const nodeCount = Math.floor(Math.max(corridor.width, corridor.height) / 40);
        for (let i = 0; i < nodeCount; i++) {
            let nodeX, nodeY;
            if (corridor.width > corridor.height) {
                nodeX = corridor.x + (corridor.width / (nodeCount + 1)) * (i + 1);
                nodeY = corridor.y + corridor.height / 2;
            } else {
                nodeX = corridor.x + corridor.width / 2;
                nodeY = corridor.y + (corridor.height / (nodeCount + 1)) * (i + 1);
            }

            this.context.beginPath();
            this.context.arc(nodeX, nodeY, 3, 0, Math.PI * 2);
            this.context.fill();
        }

        if (corridor === this.selectedObject) {
            this.context.strokeStyle = '#00FF00';
            this.context.lineWidth = 3;
            this.context.setLineDash([8, 4]);
            this.context.strokeRect(corridor.x - 2, corridor.y - 2, corridor.width + 4, corridor.height + 4);
            this.context.setLineDash([]);
        }
    }

    drawDoor(door) {
        const doorColors = {
            normal: { base: '#4A4A4A', frame: '#6A6A6A', accent: '#8A8A8A', glow: '#FFFFFF' },
            locked: { base: '#B8860B', frame: '#DAA520', accent: '#FFD700', glow: '#FFFF00' },
            boss: { base: '#4B0000', frame: '#8B0000', accent: '#FF0000', glow: '#FF4500' },
            secret: { base: '#4B0082', frame: '#6A0DAD', accent: '#9370DB', glow: '#DDA0DD' }
        };

        const colors = doorColors[door.doorType];

        // Тень двери
        this.context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.context.fillRect(door.x + 3, door.y + 3, door.width, door.height);

        // Основная рамка двери
        this.context.fillStyle = colors.frame;
        this.context.fillRect(door.x, door.y, door.width, door.height);

        // Внутренняя часть двери
        this.context.fillStyle = colors.base;
        this.context.fillRect(door.x + 3, door.y + 3, door.width - 6, door.height - 6);

        // Технологические панели
        this.context.fillStyle = colors.accent;
        const panelWidth = door.width * 0.8;
        const panelHeight = door.height * 0.15;

        // Верхняя панель
        this.context.fillRect(
            door.x + (door.width - panelWidth) / 2,
            door.y + door.height * 0.15,
            panelWidth,
            panelHeight
        );

        // Нижняя панель
        this.context.fillRect(
            door.x + (door.width - panelWidth) / 2,
            door.y + door.height * 0.7,
            panelWidth,
            panelHeight
        );

        // Центральный элемент управления
        const centerX = door.x + door.width / 2;
        const centerY = door.y + door.height / 2;
        const centerRadius = Math.min(door.width, door.height) * 0.15;

        this.context.fillStyle = colors.accent;
        this.context.beginPath();
        this.context.arc(centerX, centerY, centerRadius, 0, Math.PI * 2);
        this.context.fill();

        // Внутренний индикатор
        this.context.fillStyle = colors.glow;
        this.context.beginPath();
        this.context.arc(centerX, centerY, centerRadius * 0.6, 0, Math.PI * 2);
        this.context.fill();

        // Символы дверей
        this.context.fillStyle = colors.base;
        this.context.font = 'bold 12px Arial';
        this.context.textAlign = 'center';

        const doorSymbols = {
            normal: '◈',
            locked: '⚿',
            boss: '☠',
            secret: '◊'
        };

        this.context.fillText(
            doorSymbols[door.doorType],
            centerX,
            centerY + 4
        );

        // Энергетические линии для специальных дверей
        if (door.doorType !== 'normal') {
            this.context.strokeStyle = colors.glow;
            this.context.lineWidth = 2;
            this.context.setLineDash([4, 2]);

            // Вертикальные энергетические линии
            for (let i = 0; i < 3; i++) {
                const lineX = door.x + door.width * (0.2 + i * 0.3);
                this.context.beginPath();
                this.context.moveTo(lineX, door.y + 5);
                this.context.lineTo(lineX, door.y + door.height - 5);
                this.context.stroke();
            }

            this.context.setLineDash([]);

            // Эффект свечения
            this.context.shadowColor = colors.glow;
            this.context.shadowBlur = 8;
            this.context.strokeStyle = colors.glow;
            this.context.lineWidth = 1;
            this.context.strokeRect(door.x, door.y, door.width, door.height);
            this.context.shadowBlur = 0;
        }

        if (door === this.selectedObject) {
            this.context.strokeStyle = '#00FF00';
            this.context.lineWidth = 3;
            this.context.setLineDash([8, 4]);
            this.context.strokeRect(door.x - 2, door.y - 2, door.width + 4, door.height + 4);
            this.context.setLineDash([]);
        }
    }

    drawObstacle(obstacle) {
        // Каменная текстура препятствия
        const baseColor = ShooterConfig.OBSTACLE_COLOR;

        // Создаем неровную форму
        this.context.fillStyle = baseColor;
        this.context.beginPath();

        const points = 8;
        const centerX = obstacle.x + obstacle.width / 2;
        const centerY = obstacle.y + obstacle.height / 2;
        const radiusX = obstacle.width / 2;
        const radiusY = obstacle.height / 2;

        for (let i = 0; i < points; i++) {
            const angle = (i * Math.PI * 2) / points;
            const variation = 0.8 + Math.random() * 0.4; // Случайная неровность
            const x = centerX + Math.cos(angle) * radiusX * variation;
            const y = centerY + Math.sin(angle) * radiusY * variation;

            if (i === 0) {
                this.context.moveTo(x, y);
            } else {
                this.context.lineTo(x, y);
            }
        }
        this.context.closePath();
        this.context.fill();

        // Каменная текстура
        this.addStoneTexture(obstacle);

        // Обводка
        this.context.strokeStyle = '#654321';
        this.context.lineWidth = 2;
        this.context.stroke();

        if (obstacle === this.selectedObject) {
            this.context.strokeStyle = '#00FF00';
            this.context.lineWidth = 3;
            this.context.setLineDash([5, 5]);
            this.context.strokeRect(obstacle.x - 2, obstacle.y - 2, obstacle.width + 4, obstacle.height + 4);
            this.context.setLineDash([]);
        }
    }

    addStoneTexture(obstacle) {
        const seed = obstacle.x + obstacle.y;
        this.context.fillStyle = 'rgba(0, 0, 0, 0.3)';

        // Случайные пятна и трещины
        for (let i = 0; i < 10; i++) {
            const x = obstacle.x + ((seed + i * 73) % 97) / 97 * obstacle.width;
            const y = obstacle.y + ((seed + i * 37) % 97) / 97 * obstacle.height;
            const size = 2 + ((seed + i * 17) % 5);

            this.context.beginPath();
            this.context.arc(x, y, size, 0, Math.PI * 2);
            this.context.fill();
        }

        // Добавляем светлые блики
        this.context.fillStyle = 'rgba(255, 255, 255, 0.2)';
        for (let i = 0; i < 5; i++) {
            const x = obstacle.x + ((seed + i * 113) % 97) / 97 * obstacle.width;
            const y = obstacle.y + ((seed + i * 47) % 97) / 97 * obstacle.height;
            const size = 1 + ((seed + i * 29) % 3);

            this.context.beginPath();
            this.context.arc(x, y, size, 0, Math.PI * 2);
            this.context.fill();
        }
    }

    drawTree(tree) {
        const centerX = tree.x + tree.width / 2;
        const centerY = tree.y + tree.height / 2;
        const radius = tree.width / 2;

        // Тень дерева
        this.context.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.context.beginPath();
        this.context.ellipse(centerX + 3, centerY + radius + 5, radius * 0.8, radius * 0.3, 0, 0, Math.PI * 2);
        this.context.fill();

        // Ствол дерева
        const trunkWidth = radius * 0.3;
        const trunkHeight = radius * 0.8;
        this.context.fillStyle = '#8B4513';
        this.context.fillRect(centerX - trunkWidth / 2, centerY + radius * 0.2, trunkWidth, trunkHeight);

        // Текстура ствола
        this.context.fillStyle = 'rgba(0, 0, 0, 0.3)';
        for (let i = 0; i < 3; i++) {
            this.context.fillRect(
                centerX - trunkWidth / 2 + 1, 
                centerY + radius * 0.2 + i * (trunkHeight / 3), 
                trunkWidth - 2, 
                2
            );
        }

        // Крона дерева
        const gradient = this.context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, '#32CD32');
        gradient.addColorStop(0.7, '#228B22');
        gradient.addColorStop(1, '#006400');

        this.context.fillStyle = gradient;
        this.context.beginPath();
        this.context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.context.fill();

        // Листва - случайные круги
        this.context.fillStyle = '#90EE90';
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const leafX = centerX + Math.cos(angle) * radius * 0.6;
            const leafY = centerY + Math.sin(angle) * radius * 0.6;
            this.context.beginPath();
            this.context.arc(leafX, leafY, radius * 0.3, 0, Math.PI * 2);
            this.context.fill();
        }

        // Плоды или цветы
        this.context.fillStyle = '#FF6347';
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI * 2) / 4 + Math.PI / 4;
            const fruitX = centerX + Math.cos(angle) * radius * 0.7;
            const fruitY = centerY + Math.sin(angle) * radius * 0.7;
            this.context.beginPath();
            this.context.arc(fruitX, fruitY, 3, 0, Math.PI * 2);
            this.context.fill();
        }

        if (tree === this.selectedObject) {
            this.context.strokeStyle = '#00FF00';
            this.context.lineWidth = 3;
            this.context.setLineDash([8, 4]);
            this.context.beginPath();
            this.context.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
            this.context.stroke();
            this.context.setLineDash([]);
        }
    }

    drawEnemy(enemy) {
        // Тень врага
        this.context.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.context.beginPath();
        this.context.ellipse(
            enemy.x + enemy.width / 2 + 2, 
            enemy.y + enemy.height + 3, 
            enemy.width / 2, 
            enemy.height / 4, 
            0, 0, Math.PI * 2
        );
        this.context.fill();

        // Основное тело врага
        this.context.fillStyle = enemy.color;

        // Разные формы для разных типов врагов
        switch (enemy.enemyType) {
            case 'normal':
                this.context.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
                break;

            case 'shooting':
                // Тело + пушка
                this.context.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
                this.context.fillStyle = '#333333';
                this.context.fillRect(enemy.x + enemy.width - 5, enemy.y + enemy.height / 2 - 3, 15, 6);
                break;

            case 'charging':
                // Более агрессивная форма
                this.context.beginPath();
                this.context.moveTo(enemy.x + enemy.width, enemy.y + enemy.height / 2);
                this.context.lineTo(enemy.x, enemy.y);
                this.context.lineTo(enemy.x, enemy.y + enemy.height);
                this.context.closePath();
                this.context.fill();
                break;

            case 'explosive':
                // Круглая форма
                this.context.beginPath();
                this.context.arc(
                    enemy.x + enemy.width / 2, 
                    enemy.y + enemy.height / 2, 
                    enemy.width / 2, 
                    0, Math.PI * 2
                );
                this.context.fill();
                // Предохранитель
                this.context.fillStyle = '#FFD700';
                this.context.fillRect(
                    enemy.x + enemy.width / 2 - 2, 
                    enemy.y - 5, 
                    4, 8
                );
                break;

            case 'shield':
                // Тело + щит
                this.context.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
                this.context.fillStyle = '#C0C0C0';
                this.context.beginPath();
                this.context.arc(
                    enemy.x + enemy.width / 2, 
                    enemy.y + enemy.height / 2, 
                    enemy.width / 2 + 5, 
                    0, Math.PI * 2
                );
                this.context.stroke();
                this.context.lineWidth = 3;
                break;

            case 'boss':
                // Большая угрожающая форма
                this.context.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
                // Корона
                this.context.fillStyle = '#FFD700';
                for (let i = 0; i < 5; i++) {
                    this.context.fillRect(
                        enemy.x + (enemy.width / 5) * i + 2, 
                        enemy.y - 8, 
                        6, 10
                    );
                }
                break;

            default:
                this.context.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        }

        // Символ типа врага с улучшенным дизайном
        this.context.fillStyle = '#FFFFFF';
        this.context.font = 'bold 12px Arial';
        this.context.textAlign = 'center';
        this.context.strokeStyle = '#000000';
        this.context.lineWidth = 1;

        const symbol = this.getEnemySymbol(enemy.enemyType);
        this.context.strokeText(symbol, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2 + 4);
        this.context.fillText(symbol, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2 + 4);

        // Индикатор здоровья/силы
        this.context.fillStyle = 'rgba(255, 0, 0, 0.7)';
        const healthBarWidth = enemy.width;
        const healthBarHeight = 3;
        this.context.fillRect(
            enemy.x, 
            enemy.y - 8, 
            healthBarWidth, 
            healthBarHeight
        );

        if (enemy === this.selectedObject) {
            this.context.strokeStyle = '#00FF00';
            this.context.lineWidth = 2;
            this.context.setLineDash([4, 4]);
            this.context.strokeRect(enemy.x - 3, enemy.y - 3, enemy.width + 6, enemy.height + 6);
            this.context.setLineDash([]);
        }
    }

    drawPassableArea(area, type) {
        // Рисуем полупрозрачную зеленую зону, показывающую где игрок может ходить
        this.context.fillStyle = 'rgba(0, 255, 0, 0.1)';

        if (type === 'room') {
            // Внутренняя проходимая область комнаты (без стен)
            const margin = 25;
            this.context.fillRect(
                area.x + margin, 
                area.y + margin, 
                area.width - margin * 2, 
                area.height - margin * 2
            );
        } else if (type === 'corridor') {
            // Внутренняя проходимая область коридора
            const margin = 20;
            this.context.fillRect(
                area.x + margin, 
                area.y + margin, 
                area.width - margin * 2, 
                area.height - margin * 2
            );
        }

        // Добавляем надпись для ясности
        this.context.fillStyle = 'rgba(0, 100, 0, 0.7)';
        this.context.font = '12px Arial';
        this.context.textAlign = 'center';
        const text = type === 'room' ? 'ROOM' : 'CORRIDOR';
        this.context.fillText(
            text, 
            area.x + area.width / 2, 
            area.y + area.height / 2 - 15
        );
    }

    drawPlayerSpawn() {
        const spawn = this.levelData.playerSpawn;
        this.context.fillStyle = '#0096ff';
        this.context.beginPath();
        this.context.arc(spawn.x, spawn.y, 30, 0, Math.PI * 2);
        this.context.fill();

        this.context.fillStyle = '#FFFFFF';
        this.context.font = '16px Arial';
        this.context.textAlign = 'center';
        this.context.fillText('P', spawn.x, spawn.y + 5);
    }

    drawMinimap() {
        this.minimapContext.clearRect(0, 0, 200, 200);

        // Фон мини-карты
        this.minimapContext.fillStyle = ShooterConfig.BACKGROUND_COLOR;
        this.minimapContext.fillRect(0, 0, 200, 200);

        const scaleX = 200 / ShooterConfig.MAP_WIDTH;
        const scaleY = 200 / ShooterConfig.MAP_HEIGHT;

        // Объекты на мини-карте
        this.levelData.obstacles.forEach(obstacle => {
            this.minimapContext.fillStyle = obstacle.color;
            this.minimapContext.fillRect(
                obstacle.x * scaleX,
                obstacle.y * scaleY,
                obstacle.width * scaleX,
                obstacle.height * scaleY
            );
        });

        this.levelData.trees.forEach(tree => {
            this.minimapContext.fillStyle = '#228B22';
            this.minimapContext.fillRect(
                tree.x * scaleX,
                tree.y * scaleY,
                tree.width * scaleX,
                tree.height * scaleY
            );
        });

        this.levelData.enemies.forEach(enemy => {
            this.minimapContext.fillStyle = enemy.color;
            this.minimapContext.fillRect(
                enemy.x * scaleX,
                enemy.y * scaleY,
                enemy.width * scaleX,
                enemy.height * scaleY
            );
        });

        // Спавн игрока
        const spawn = this.levelData.playerSpawn;
        this.minimapContext.fillStyle = '#0096ff';
        this.minimapContext.fillRect(spawn.x * scaleX - 2, spawn.y * scaleY - 2, 4, 4);

        // Область просмотра
        const viewX = (this.camera.x - this.canvas.width / 2 / this.camera.zoom) * scaleX;
        const viewY = (this.camera.y - this.canvas.height / 2 / this.camera.zoom) * scaleY;
        const viewW = (this.canvas.width / this.camera.zoom) * scaleX;
        const viewH = (this.canvas.height / this.camera.zoom) * scaleY;

        this.minimapContext.strokeStyle = '#FFFFFF';
        this.minimapContext.lineWidth = 1;
        this.minimapContext.strokeRect(viewX, viewY, viewW, viewH);
    }

    getEnemySymbol(type) {
        const symbols = {
            normal: 'N',
            shooting: 'S',
            charging: 'C',
            explosive: 'E',
            shield: 'Sh',
            sniper: 'Sn',
            teleporter: 'T',
            boss: 'B'
        };
        return symbols[type] || 'N';
    }

    updateInfoPanel(pos = null) {
        const panel = document.getElementById('infoPanel');
        const posText = pos ? `(${Math.round(pos.x)}, ${Math.round(pos.y)})` : '(0, 0)';
        const zoomText = `${Math.round(this.camera.zoom * 100)}%`;
        const toolText = this.currentTool.charAt(0).toUpperCase() + this.currentTool.slice(1);
        const snapText = this.snapToGrid ? 'ВКЛ' : 'ВЫКЛ';

        panel.innerHTML = `
            Позиция: ${posText}<br>
            Зум: ${zoomText}<br>
            Инструмент: ${toolText}<br>
            Сетка: ${snapText}
        `;
    }

    updateStats() {
        document.getElementById('obstacleCount').textContent = this.levelData.obstacles.length;
        document.getElementById('treeCount').textContent = this.levelData.trees.length;
        document.getElementById('enemyCount').textContent = this.levelData.enemies.length;
        document.getElementById('roomCount').textContent = this.levelData.rooms.length;
        document.getElementById('corridorCount').textContent = this.levelData.corridors.length;
        document.getElementById('doorCount').textContent = this.levelData.doors.length;
    }

    createObstacle(pos) {
        const obstacle = {
            x: pos.x - 25,
            y: pos.y - 25,
            width: 50, // Кратно сетке (100/2)
            height: 50 // Кратно сетке (100/2)
        };

        this.levelData.obstacles.push(obstacle);
        this.draw();
    }

    createTree(pos) {
        const tree = {
            x: pos.x - 25,
            y: pos.y - 25,
            width: 50, // Кратно сетке (100/2)
            height: 50 // Кратно сетке (100/2)
        };

        this.levelData.trees.push(tree);
        this.draw();
    }

    createEnemy(pos) {
        const enemyType = document.getElementById('enemyTypeSelect').value;
        const enemy = {
            x: pos.x - 25,
            y: pos.y - 25,
            width: 50, // Кратно сетке (100/2)
            height: 50, // Кратно сетке (100/2)
            enemyType: enemyType,
            color: this.getEnemyColor(enemyType)
        };

        this.levelData.enemies.push(enemy);
        this.draw();
    }

    createRoom(pos) {
        const roomType = document.getElementById('roomTypeSelect').value;
        const sizes = {
            small: { width: 200, height: 200 }, // Кратно сетке (100*2)
            medium: { width: 300, height: 200 }, // Кратно сетке (100*3, 100*2)
            large: { width: 400, height: 300 }, // Кратно сетке (100*4, 100*3)
            boss: { width: 400, height: 400 } // Кратно сетке (100*4)
        };

        const size = sizes[roomType];
        const room = {
            x: pos.x - size.width / 2,
            y: pos.y - size.height / 2,
            width: size.width,
            height: size.height,
            roomType: roomType
        };

        this.levelData.rooms.push(room);
        this.draw();
    }

    createCorridor(pos) {
        const corridor = {
            x: pos.x - 50,
            y: pos.y - 25,
            width: 100, // Кратно сетке
            height: 50 // Кратно сетке (100/2)
        };

        this.levelData.corridors.push(corridor);
        this.draw();
    }

    createDoor(pos) {
        const doorType = document.getElementById('doorTypeSelect').value;
        const door = {
            x: pos.x - 25,
            y: pos.y - 25,
            width: 50, // Кратно сетке (100/2)
            height: 50, // Кратно сетке (100/2)
            doorType: doorType,
            isOpen: false
        };

        this.levelData.doors.push(door);
        this.draw();
    }
}

// Глобальные функции для кнопок
let editor;

function zoomIn() {
    editor.camera.zoom = Math.min(2, editor.camera.zoom * 1.2);
    editor.draw();
    editor.updateInfoPanel();
}

function zoomOut() {
    editor.camera.zoom = Math.max(0.1, editor.camera.zoom / 1.2);
    editor.draw();
    editor.updateInfoPanel();
}

function resetView() {
    editor.camera.x = ShooterConfig.MAP_WIDTH / 2;
    editor.camera.y = ShooterConfig.MAP_HEIGHT / 2;
    editor.camera.zoom = 0.5;
    editor.draw();
    editor.updateInfoPanel();
}

function saveLevel() {
    const name = document.getElementById('levelName').value || 'Новый уровень';
    editor.levelData.name = name;

    const dataStr = JSON.stringify(editor.levelData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${name}.json`;
    link.click();
}

function loadLevel(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const levelData = JSON.parse(e.target.result);
            editor.levelData = levelData;
            document.getElementById('levelName').value = levelData.name || 'Загруженный уровень';
            editor.draw();
            editor.updateStats();
            console.log('Уровень загружен успешно');
        } catch (error) {
            alert('Ошибка при загрузке файла: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function clearLevel() {
    if (confirm('Вы уверены, что хотите очистить уровень?')) {
        editor.levelData = {
            name: 'Новый уровень',
            obstacles: [],
            trees: [],
            enemies: [],
            rooms: [],
            corridors: [],
            doors: [],
            playerSpawn: { x: ShooterConfig.MAP_WIDTH / 2, y: ShooterConfig.MAP_HEIGHT / 2 }
        };
        editor.selectedObject = null;
        editor.selectedRoom = null;
        document.getElementById('levelName').value = 'Новый уровень';
        editor.draw();
        editor.updateStats();
    }
}

function exportLevel() {
    const gameFormat = {
        obstacles: editor.levelData.obstacles.map(obs => ({
            x: obs.x,
            y: obs.y,
            width: obs.width,
            height: obs.height
        })),
        trees: editor.levelData.trees.map(tree => ({
            x: tree.x,
            y: tree.y,
            size: tree.size
        })),
        enemies: editor.levelData.enemies.map(enemy => ({
            x: enemy.x,
            y: enemy.y,
            type: enemy.enemyType
        })),
        playerSpawn: editor.levelData.playerSpawn
    };

    const dataStr = JSON.stringify(gameFormat, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${editor.levelData.name}_game_format.json`;
    link.click();
}

function testLevel() {
    // Сохраняем уровень во временное хранилище
    localStorage.setItem('editorTestLevel', JSON.stringify(editor.levelData));

    // Открываем игру в новом окне
    const gameWindow = window.open('index.html?testLevel=true', '_blank');
    if (!gameWindow) {
        alert('Не удалось открыть окно для тестирования. Проверьте настройки блокировки всплывающих окон.');
    }
}

// Инициализация редактора
document.addEventListener('DOMContentLoaded', () => {
    editor = new LevelEditor();
    editor.updateStats();
    console.log('Level Editor initialized');
});
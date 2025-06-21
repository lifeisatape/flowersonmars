class LevelManager {
    constructor(config, objectPool) {
        this.config = config;
        this.objectPool = objectPool;
        this.currentLevel = 1;
        this.levels = [];
        this.generator = new LevelGenerator(config, objectPool);
    }

    generateLevel() {
        // Проверяем, есть ли тестовый уровень из редактора
        const testLevel = this.loadTestLevel();
        if (testLevel) {
            const level = {
                number: this.currentLevel,
                data: this.convertEditorLevel(testLevel)
            };
            this.levels.push(level);
            return level;
        }

        const level = {
            number: this.currentLevel,
            data: this.generator.generateLevel(this.config.MAP_WIDTH / 2, this.config.MAP_HEIGHT / 2)
        };
        this.levels.push(level);
        return level;
    }

    loadTestLevel() {
        const testLevelData = localStorage.getItem('editorTestLevel');
        if (testLevelData) {
            try {
                localStorage.removeItem('editorTestLevel'); // Удаляем после использования
                return JSON.parse(testLevelData);
            } catch (error) {
                console.error('Error loading test level:', error);
                return null;
            }
        }
        return null;
    }

    convertEditorLevel(editorLevel) {
        console.log('Converting editor level:', editorLevel);
        this.currentEditorLevel = editorLevel; // Сохраняем для доступа в других методах
        const obstacles = [];
        const enemies = [];
        const passableZones = []; // Зоны где игрок может ходить

        // Конвертируем комнаты - создаем только стены, внутри проходимо
        if (editorLevel.rooms) {
            editorLevel.rooms.forEach(room => {
                console.log('Creating room walls:', room);
                passableZones.push({
                    type: 'room',
                    x: room.x,
                    y: room.y,
                    width: room.width,
                    height: room.height,
                    roomType: room.roomType
                });

                if (room.walls) {
                    const wallThickness = 20;
                    // Создаем стены комнаты, но с разрывами для дверей
                    this.createRoomWallsWithDoorways(obstacles, room, wallThickness, editorLevel.doors || []);
                }
            });
        }

        // Конвертируем коридоры - создаем только стены, внутри проходимо
        if (editorLevel.corridors) {
            editorLevel.corridors.forEach(corridor => {
                console.log('Creating corridor walls:', corridor);
                passableZones.push({
                    type: 'corridor',
                    x: corridor.x,
                    y: corridor.y,
                    width: corridor.width,
                    height: corridor.height
                });

                const wallThickness = 25; // Кратно сетке (100/4)
                const direction = corridor.width > corridor.height ? 'horizontal' : 'vertical';

                // Создаем стены коридора с разрывами для дверей
                this.createCorridorWallsWithDoorways(obstacles, corridor, wallThickness, direction, editorLevel.doors || []);
            });
        }

        // Конвертируем двери - только закрытые становятся препятствиями
        if (editorLevel.doors) {
            editorLevel.doors.forEach(door => {
                console.log('Creating door:', door);
                if (!door.isOpen) {
                    obstacles.push(new DoorObstacle(door.x, door.y, door.width, door.height, door.doorType));
                }
            });
        }

        // Конвертируем препятствия
        if (editorLevel.obstacles) {
            editorLevel.obstacles.forEach(obs => {
                console.log('Creating obstacle:', obs);
                const obstacle = new Obstacle(obs.x, obs.y, obs.width, obs.height);
                obstacles.push(obstacle);
            });
        }

        // Конвертируем деревья как интерактивные деревья
        if (editorLevel.trees) {
            editorLevel.trees.forEach(tree => {
                console.log('Creating tree:', tree);
                const interactiveTree = new InteractiveTree(tree.x, tree.y, tree.size || tree.width);
                obstacles.push(interactiveTree);
            });
        }

        // Конвертируем врагов
        editorLevel.enemies.forEach(enemyData => {
            console.log('Creating enemy:', enemyData);
            const enemy = this.createEnemyByType(enemyData.enemyType);
            enemy.x = enemyData.x;
            enemy.y = enemyData.y;
            enemy.activate();
            enemies.push(enemy);
        });

        console.log('Converted level data:', { obstacles: obstacles.length, enemies: enemies.length, passableZones: passableZones.length });
        return {
            obstacles: obstacles,
            enemies: enemies,
            playerSpawn: editorLevel.playerSpawn,
            passableZones: passableZones
        };
    }

    createRoomWallsWithDoorways(obstacles, room, wallThickness, doors) {
        // Находим двери, которые пересекаются со стенами этой комнаты
        const roomDoors = doors.filter(door => this.isDoorOnRoomWall(door, room));

        // Находим соприкасающиеся области
        const allAreas = [...(this.currentEditorLevel?.rooms || []), ...(this.currentEditorLevel?.corridors || [])];
        const touchingAreas = this.findTouchingAreas(room, allAreas);

        // Верхняя стена - создаем с исключениями для соприкосновений
        this.createWallWithExclusions(
            obstacles, 
            room.x, room.y, room.width, wallThickness, 
            'horizontal', roomDoors, room.roomType, 'room',
            this.getTopTouchingAreas(room, touchingAreas)
        );

        // Нижняя стена
        this.createWallWithExclusions(
            obstacles, 
            room.x, room.y + room.height - wallThickness, room.width, wallThickness, 
            'horizontal', roomDoors, room.roomType, 'room',
            this.getBottomTouchingAreas(room, touchingAreas)
        );

        // Левая стена
        this.createWallWithExclusions(
            obstacles, 
            room.x, room.y, wallThickness, room.height, 
            'vertical', roomDoors, room.roomType, 'room',
            this.getLeftTouchingAreas(room, touchingAreas)
        );

        // Правая стена
        this.createWallWithExclusions(
            obstacles, 
            room.x + room.width - wallThickness, room.y, wallThickness, room.height, 
            'vertical', roomDoors, room.roomType, 'room',
            this.getRightTouchingAreas(room, touchingAreas)
        );
    }

    createCorridorWallsWithDoorways(obstacles, corridor, wallThickness, direction, doors) {
        // Находим двери, которые пересекаются со стенами этого коридора
        const corridorDoors = doors.filter(door => this.isDoorOnCorridorWall(door, corridor));

        // Находим соприкасающиеся области
        const allAreas = [...(this.currentEditorLevel?.rooms || []), ...(this.currentEditorLevel?.corridors || [])];
        const touchingAreas = this.findTouchingAreas(corridor, allAreas);

        if (direction === 'horizontal') {
            // Горизонтальный коридор - стены сверху и снизу
            this.createWallWithExclusions(
                obstacles, 
                corridor.x, corridor.y, corridor.width, wallThickness, 
                'horizontal', corridorDoors, null, 'corridor',
                this.getTopTouchingAreas(corridor, touchingAreas)
            );
            
            this.createWallWithExclusions(
                obstacles, 
                corridor.x, corridor.y + corridor.height - wallThickness, corridor.width, wallThickness, 
                'horizontal', corridorDoors, null, 'corridor',
                this.getBottomTouchingAreas(corridor, touchingAreas)
            );
        } else {
            // Вертикальный коридор - стены слева и справа
            this.createWallWithExclusions(
                obstacles, 
                corridor.x, corridor.y, wallThickness, corridor.height, 
                'vertical', corridorDoors, null, 'corridor',
                this.getLeftTouchingAreas(corridor, touchingAreas)
            );
            
            this.createWallWithExclusions(
                obstacles, 
                corridor.x + corridor.width - wallThickness, corridor.y, wallThickness, corridor.height, 
                'vertical', corridorDoors, null, 'corridor',
                this.getRightTouchingAreas(corridor, touchingAreas)
            );
        }
    }

    createWallSegments(obstacles, x, y, width, height, orientation, doors, roomType, wallType) {
        if (orientation === 'horizontal') {
            // Горизонтальная стена
            let currentX = x;
            const wallY = y;
            const wallHeight = height;
            const wallEndX = x + width;

            // Сортируем двери по X координате
            const relevantDoors = doors.filter(door => 
                door.y <= wallY + wallHeight && door.y + door.height >= wallY &&
                door.x < wallEndX && door.x + door.width > currentX
            ).sort((a, b) => a.x - b.x);

            for (const door of relevantDoors) {
                // Создаем сегмент стены до двери
                if (currentX < door.x) {
                    const segmentWidth = door.x - currentX;
                    if (wallType === 'room') {
                        obstacles.push(new RoomWall(currentX, wallY, segmentWidth, wallHeight, roomType));
                    } else {
                        obstacles.push(new CorridorWall(currentX, wallY, segmentWidth, wallHeight, 'horizontal'));
                    }
                }
                // Пропускаем дверь
                currentX = door.x + door.width;
            }

            // Создаем последний сегмент стены
            if (currentX < wallEndX) {
                const segmentWidth = wallEndX - currentX;
                if (wallType === 'room') {
                    obstacles.push(new RoomWall(currentX, wallY, segmentWidth, wallHeight, roomType));
                } else {
                    obstacles.push(new CorridorWall(currentX, wallY, segmentWidth, wallHeight, 'horizontal'));
                }
            }
        } else {
            // Вертикальная стена
            let currentY = y;
            const wallX = x;
            const wallWidth = width;
            const wallEndY = y + height;

            // Сортируем двери по Y координате
            const relevantDoors = doors.filter(door => 
                door.x <= wallX + wallWidth && door.x + door.width >= wallX &&
                door.y < wallEndY && door.y + door.height > currentY
            ).sort((a, b) => a.y - b.y);

            for (const door of relevantDoors) {
                // Создаем сегмент стены до двери
                if (currentY < door.y) {
                    const segmentHeight = door.y - currentY;
                    if (wallType === 'room') {
                        obstacles.push(new RoomWall(wallX, currentY, wallWidth, segmentHeight, roomType));
                    } else {
                        obstacles.push(new CorridorWall(wallX, currentY, wallWidth, segmentHeight, 'vertical'));
                    }
                }
                // Пропускаем дверь
                currentY = door.y + door.height;
            }

            // Создаем последний сегмент стены
            if (currentY < wallEndY) {
                const segmentHeight = wallEndY - currentY;
                if (wallType === 'room') {
                    obstacles.push(new RoomWall(wallX, currentY, wallWidth, segmentHeight, roomType));
                } else {
                    obstacles.push(new CorridorWall(wallX, currentY, wallWidth, segmentHeight, 'vertical'));
                }
            }
        }
    }

    isDoorOnRoomWall(door, room) {
        const tolerance = 5;
        // Проверяем, находится ли дверь на одной из стен комнаты
        return (
            // На верхней или нижней стене
            ((door.y <= room.y + tolerance && door.y + door.height >= room.y - tolerance) ||
             (door.y <= room.y + room.height + tolerance && door.y + door.height >= room.y + room.height - tolerance)) &&
            door.x >= room.x - tolerance && door.x + door.width <= room.x + room.width + tolerance
        ) || (
            // На левой или правой стене
            ((door.x <= room.x + tolerance && door.x + door.width >= room.x - tolerance) ||
             (door.x <= room.x + room.width + tolerance && door.x + door.width >= room.x + room.width - tolerance)) &&
            door.y >= room.y - tolerance && door.y + door.height <= room.y + room.height + tolerance
        );
    }

    isDoorOnCorridorWall(door, corridor) {
        const tolerance = 5;
        // Проверяем, находится ли дверь на одной из стен коридора
        return (
            // На верхней или нижней стене
            ((door.y <= corridor.y + tolerance && door.y + door.height >= corridor.y - tolerance) ||
             (door.y <= corridor.y + corridor.height + tolerance && door.y + door.height >= corridor.y + corridor.height - tolerance)) &&
            door.x >= corridor.x - tolerance && door.x + door.width <= corridor.x + corridor.width + tolerance
        ) || (
            // На левой или правой стене
            ((door.x <= corridor.x + tolerance && door.x + door.width >= corridor.x - tolerance) ||
             (door.x <= corridor.x + corridor.width + tolerance && door.x + door.width >= corridor.x + corridor.width - tolerance)) &&
            door.y >= corridor.y - tolerance && door.y + door.height <= corridor.y + corridor.height + tolerance
        );
    }

    createEnemyByType(type) {
        if (!this.objectPool) {
            console.error('ObjectPool not initialized in LevelManager');
            return new Enemy(0, 0, this.config.ENEMY_SIZE, this.config.ENEMY_COLOR, this.config.ENEMY_SPEED);
        }

        let enemy;
        switch (type) {
            case 'shooting':
                enemy = this.objectPool.create('shootingEnemy');
                break;
            case 'charging':
                enemy = this.objectPool.create('chargingEnemy');
                break;
            case 'explosive':
                enemy = this.objectPool.create('explosiveEnemy');
                break;
            case 'shield':
                enemy = this.objectPool.create('shieldEnemy');
                break;
            case 'sniper':
                enemy = this.objectPool.create('sniperEnemy');
                break;
            case 'teleporter':
                enemy = this.objectPool.create('teleporterEnemy');
                break;
            case 'boss':
                enemy = this.objectPool.create('boss');
                break;
            default:
                enemy = this.objectPool.create('enemy');
                break;
        }

        enemy.init(0, 0, this.config.ENEMY_SIZE, this.config.ENEMY_COLOR, this.config.ENEMY_SPEED);
        return enemy;
    }

    loadLevel(levelData) {
        const level = {
            number: this.currentLevel,
            data: levelData
        };
        this.levels.push(level);
        return level;
    }

    getCurrentLevel() {
        return this.levels[this.currentLevel - 1];
    }

    nextLevel() {
        this.currentLevel++;
        return this.generateLevel();
    }

    resetLevels() {
        this.currentLevel = 1;
        this.levels = [];
        if (this.objectPool) {
            this.objectPool.releaseAll('enemy');
        } else {
            console.warn('ObjectPool not initialized in LevelManager');
        }
    }

    generatePredefinedLevel(levelNumber) {
        const difficulty = 1 + (levelNumber - 1) * 0.1;

        const levelData = this.generator.generateLevel(this.config.MAP_WIDTH / 2, this.config.MAP_HEIGHT / 2);

        const additionalEnemies = Math.floor((levelNumber - 1) * 2);
        for (let i = 0; i < additionalEnemies; i++) {
            const enemy = this.objectPool.create('enemy');
            enemy.speed *= difficulty;
            enemy.width *= difficulty;
            enemy.height *= difficulty;
            levelData.enemies.push(enemy);
        }

        const additionalObstacles = Math.floor((levelNumber - 1) * 1.5);
        for (let i = 0; i < additionalObstacles; i++) {
            levelData.obstacles.push(this.generator.createObstacle());
        }

        return {
            number: levelNumber,
            data: levelData
        };
    }

    // Методы для определения соприкасающихся областей
    findTouchingAreas(currentArea, allAreas) {
        const tolerance = 5; // Допуск для определения соприкосновения
        return allAreas.filter(area => {
            if (area === currentArea) return false;
            
            // Проверяем, соприкасаются ли области
            return this.areAreasTouching(currentArea, area, tolerance);
        });
    }

    areAreasTouching(area1, area2, tolerance = 5) {
        // Проверяем горизонтальное соприкосновение (стена слева/справа)
        const horizontalTouch = (
            Math.abs(area1.x + area1.width - area2.x) <= tolerance || // area1 справа от area2
            Math.abs(area2.x + area2.width - area1.x) <= tolerance    // area2 справа от area1
        ) && (
            area1.y < area2.y + area2.height + tolerance &&
            area2.y < area1.y + area1.height + tolerance
        );

        // Проверяем вертикальное соприкосновение (стена сверху/снизу)
        const verticalTouch = (
            Math.abs(area1.y + area1.height - area2.y) <= tolerance || // area1 снизу от area2
            Math.abs(area2.y + area2.height - area1.y) <= tolerance    // area2 снизу от area1
        ) && (
            area1.x < area2.x + area2.width + tolerance &&
            area2.x < area1.x + area1.width + tolerance
        );

        return horizontalTouch || verticalTouch;
    }

    hasAreaAbove(currentArea, touchingAreas) {
        const tolerance = 5;
        return touchingAreas.some(area => 
            Math.abs(area.y + area.height - currentArea.y) <= tolerance &&
            area.x < currentArea.x + currentArea.width + tolerance &&
            currentArea.x < area.x + area.width + tolerance
        );
    }

    hasAreaBelow(currentArea, touchingAreas) {
        const tolerance = 5;
        return touchingAreas.some(area => 
            Math.abs(currentArea.y + currentArea.height - area.y) <= tolerance &&
            area.x < currentArea.x + currentArea.width + tolerance &&
            currentArea.x < area.x + area.width + tolerance
        );
    }

    hasAreaLeft(currentArea, touchingAreas) {
        const tolerance = 5;
        return touchingAreas.some(area => 
            Math.abs(area.x + area.width - currentArea.x) <= tolerance &&
            area.y < currentArea.y + currentArea.height + tolerance &&
            currentArea.y < area.y + area.height + tolerance
        );
    }

    hasAreaRight(currentArea, touchingAreas) {
        const tolerance = 5;
        return touchingAreas.some(area => 
            Math.abs(currentArea.x + currentArea.width - area.x) <= tolerance &&
            area.y < currentArea.y + currentArea.height + tolerance &&
            currentArea.y < area.y + area.height + tolerance
        );
    }

    // Новые методы для получения соприкасающихся областей по сторонам
    getTopTouchingAreas(currentArea, touchingAreas) {
        const tolerance = 5;
        return touchingAreas.filter(area => 
            Math.abs(area.y + area.height - currentArea.y) <= tolerance &&
            area.x < currentArea.x + currentArea.width + tolerance &&
            currentArea.x < area.x + area.width + tolerance
        );
    }

    getBottomTouchingAreas(currentArea, touchingAreas) {
        const tolerance = 5;
        return touchingAreas.filter(area => 
            Math.abs(currentArea.y + currentArea.height - area.y) <= tolerance &&
            area.x < currentArea.x + currentArea.width + tolerance &&
            currentArea.x < area.x + area.width + tolerance
        );
    }

    getLeftTouchingAreas(currentArea, touchingAreas) {
        const tolerance = 5;
        return touchingAreas.filter(area => 
            Math.abs(area.x + area.width - currentArea.x) <= tolerance &&
            area.y < currentArea.y + currentArea.height + tolerance &&
            currentArea.y < area.y + area.height + tolerance
        );
    }

    getRightTouchingAreas(currentArea, touchingAreas) {
        const tolerance = 5;
        return touchingAreas.filter(area => 
            Math.abs(currentArea.x + currentArea.width - area.x) <= tolerance &&
            area.y < currentArea.y + currentArea.height + tolerance &&
            currentArea.y < area.y + area.height + tolerance
        );
    }

    // Новый метод для создания стен с исключениями
    createWallWithExclusions(obstacles, x, y, width, height, orientation, doors, roomType, wallType, touchingAreas) {
        if (orientation === 'horizontal') {
            // Горизонтальная стена
            let currentX = x;
            const wallY = y;
            const wallHeight = height;
            const wallEndX = x + width;

            // Собираем все исключения (двери + соприкосновения)
            const exclusions = [...doors];
            
            // Добавляем соприкосновения как исключения
            touchingAreas.forEach(area => {
                const intersectionStart = Math.max(currentX, area.x);
                const intersectionEnd = Math.min(wallEndX, area.x + area.width);
                
                if (intersectionStart < intersectionEnd) {
                    exclusions.push({
                        x: intersectionStart,
                        y: wallY,
                        width: intersectionEnd - intersectionStart,
                        height: wallHeight
                    });
                }
            });

            // Фильтруем релевантные исключения и сортируем по X
            const relevantExclusions = exclusions.filter(exclusion => 
                exclusion.y <= wallY + wallHeight && exclusion.y + exclusion.height >= wallY &&
                exclusion.x < wallEndX && exclusion.x + exclusion.width > currentX
            ).sort((a, b) => a.x - b.x);

            // Создаем сегменты стены между исключениями
            for (const exclusion of relevantExclusions) {
                if (currentX < exclusion.x) {
                    const segmentWidth = exclusion.x - currentX;
                    if (wallType === 'room') {
                        obstacles.push(new RoomWall(currentX, wallY, segmentWidth, wallHeight, roomType));
                    } else {
                        obstacles.push(new CorridorWall(currentX, wallY, segmentWidth, wallHeight, 'horizontal'));
                    }
                }
                currentX = exclusion.x + exclusion.width;
            }

            // Создаем последний сегмент
            if (currentX < wallEndX) {
                const segmentWidth = wallEndX - currentX;
                if (wallType === 'room') {
                    obstacles.push(new RoomWall(currentX, wallY, segmentWidth, wallHeight, roomType));
                } else {
                    obstacles.push(new CorridorWall(currentX, wallY, segmentWidth, wallHeight, 'horizontal'));
                }
            }
        } else {
            // Вертикальная стена
            let currentY = y;
            const wallX = x;
            const wallWidth = width;
            const wallEndY = y + height;

            // Собираем все исключения (двери + соприкосновения)
            const exclusions = [...doors];
            
            // Добавляем соприкосновения как исключения
            touchingAreas.forEach(area => {
                const intersectionStart = Math.max(currentY, area.y);
                const intersectionEnd = Math.min(wallEndY, area.y + area.height);
                
                if (intersectionStart < intersectionEnd) {
                    exclusions.push({
                        x: wallX,
                        y: intersectionStart,
                        width: wallWidth,
                        height: intersectionEnd - intersectionStart
                    });
                }
            });

            // Фильтруем релевантные исключения и сортируем по Y
            const relevantExclusions = exclusions.filter(exclusion => 
                exclusion.x <= wallX + wallWidth && exclusion.x + exclusion.width >= wallX &&
                exclusion.y < wallEndY && exclusion.y + exclusion.height > currentY
            ).sort((a, b) => a.y - b.y);

            // Создаем сегменты стены между исключениями
            for (const exclusion of relevantExclusions) {
                if (currentY < exclusion.y) {
                    const segmentHeight = exclusion.y - currentY;
                    if (wallType === 'room') {
                        obstacles.push(new RoomWall(wallX, currentY, wallWidth, segmentHeight, roomType));
                    } else {
                        obstacles.push(new CorridorWall(wallX, currentY, wallWidth, segmentHeight, 'vertical'));
                    }
                }
                currentY = exclusion.y + exclusion.height;
            }

            // Создаем последний сегмент
            if (currentY < wallEndY) {
                const segmentHeight = wallEndY - currentY;
                if (wallType === 'room') {
                    obstacles.push(new RoomWall(wallX, currentY, wallWidth, segmentHeight, roomType));
                } else {
                    obstacles.push(new CorridorWall(wallX, currentY, wallWidth, segmentHeight, 'vertical'));
                }
            }
        }
    }

    saveProgress() {
        const progress = {
            currentLevel: this.currentLevel,
            levels: this.levels
        };
        localStorage.setItem('levelProgress', JSON.stringify(progress));
    }

    loadProgress() {
        const progress = JSON.parse(localStorage.getItem('levelProgress'));
        if (progress) {
            this.currentLevel = progress.currentLevel;
            this.levels = progress.levels;
        }
    }
}

console.log('Complete updated LevelManager.js loaded');
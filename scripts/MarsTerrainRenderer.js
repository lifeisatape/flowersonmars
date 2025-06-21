class MarsTerrainRenderer {
    constructor() {
        this.tileSize = 200; // Размер одного тайла
        this.tileVariations = 3; // Количество вариаций текстуры
        this.tiles = [];
        this.tilesCache = new Map();
        this.createTileTextures();
    }

    createTileTextures() {
        // Создаем 3 варианта тайлов поверхности Марса
        for (let i = 0; i < this.tileVariations; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = this.tileSize;
            canvas.height = this.tileSize;
            const ctx = canvas.getContext('2d');

            this.drawMarsTile(ctx, i);
            this.tiles.push(canvas);
        }
    }

    drawMarsTile(ctx, variation) {
        const size = this.tileSize;

        // Базовый марсианский цвет
        const baseColor = '#8B2635';

        // Заливаем базовым цветом
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, size, size);

        // Добавляем текстуру песка
        this.addSandTexture(ctx, variation);
        
        // Добавляем небольшие камни
        this.addSmallRocks(ctx, variation);
    }

    addSandTexture(ctx, variation) {
        const size = this.tileSize;
        
        // Создаем детерминированную случайность для текстуры песка
        const seed = variation * 1000;
        
        // Добавляем мелкие песчинки
        const sandGrainCount = 80 + variation * 20;
        for (let i = 0; i < sandGrainCount; i++) {
            // Используем seed для детерминированной случайности
            const x = ((seed + i * 73) % 9973) / 9973 * size;
            const y = ((seed + i * 37) % 9973) / 9973 * size;
            
            // Вариации цвета песка
            const brightness = 0.9 + (((seed + i * 17) % 100) / 100) * 0.2;
            const alpha = 0.1 + (((seed + i * 53) % 100) / 100) * 0.1;
            
            ctx.fillStyle = `rgba(139, 38, 53, ${alpha * brightness})`;
            ctx.fillRect(x, y, 1, 1);
        }
    }

    addSmallRocks(ctx, variation) {
        const size = this.tileSize;
        
        // Создаем детерминированную случайность для камней
        const seed = variation * 2000;
        
        // Добавляем небольшие камни
        const rockCount = 1 + variation * 2;
        for (let i = 0; i < rockCount; i++) {
            const x = ((seed + i * 97) % 73) / 73 * size;
            const y = ((seed + i * 61) % 73) / 73 * size;
            const rockSize = 2 + (((seed + i * 29) % 100) / 100) * 4;
            
            // Цвет камня - немного темнее основного
            ctx.fillStyle = '#5A1A21';
            ctx.beginPath();
            ctx.arc(x, y, rockSize, 0, Math.PI * 2);
            ctx.fill();
            
            // Добавляем небольшое светлое пятно для объема
            ctx.fillStyle = 'rgba(139, 38, 53, 0.3)';
            ctx.beginPath();
            ctx.arc(x - rockSize * 0.3, y - rockSize * 0.3, rockSize * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    

    getTileForPosition(x, y) {
        const tileX = Math.floor(x / this.tileSize);
        const tileY = Math.floor(y / this.tileSize);
        const key = `${tileX},${tileY}`;

        if (!this.tilesCache.has(key)) {
            // Используем детерминированную случайность для выбора тайла
            const seed = Math.abs((tileX * 73 + tileY * 37)) % this.tileVariations;
            const selectedTile = this.tiles[seed];

            // Убеждаемся что тайл существует
            if (selectedTile && selectedTile instanceof HTMLCanvasElement) {
                this.tilesCache.set(key, selectedTile);
            } else {
                // Fallback на первый тайл если что-то пошло не так
                this.tilesCache.set(key, this.tiles[0]);
            }
        }

        return this.tilesCache.get(key);
    }

    drawTerrain(ctx, camera) {
        // Небольшой буфер для плавной подгрузки тайлов
        const bufferTiles = 2; // Уменьшаем буфер до 1 тайла

        // Корректно вычисляем видимую область с учетом зума
        const viewWidth = camera.width / camera.zoom;
        const viewHeight = camera.height / camera.zoom;

        const startTileX = Math.floor((camera.x - bufferTiles * this.tileSize) / this.tileSize);
        const startTileY = Math.floor((camera.y - bufferTiles * this.tileSize) / this.tileSize);
        const endTileX = Math.ceil((camera.x + viewWidth + bufferTiles * this.tileSize) / this.tileSize);
        const endTileY = Math.ceil((camera.y + viewHeight + bufferTiles * this.tileSize) / this.tileSize);

        // Отключаем сглаживание для четкой пиксельной графики
        ctx.imageSmoothingEnabled = false;

        for (let tileX = startTileX; tileX <= endTileX; tileX++) {
            for (let tileY = startTileY; tileY <= endTileY; tileY++) {
                const tile = this.getTileForPosition(tileX * this.tileSize, tileY * this.tileSize);
                
                // Используем Math.floor для точного позиционирования
                const drawX = Math.floor(tileX * this.tileSize);
                const drawY = Math.floor(tileY * this.tileSize);

                // Проверяем, что тайл существует и является валидным canvas элементом
                if (tile && tile instanceof HTMLCanvasElement) {
                    // Добавляем небольшое перекрытие (1 пиксель) чтобы убрать зазоры
                    ctx.drawImage(tile, 
                        0, 0, this.tileSize, this.tileSize,  // source
                        drawX, drawY, this.tileSize + 4, this.tileSize + 4  // destination с перекрытием
                    );
                }
            }
        }

        // Возвращаем сглаживание обратно для других элементов
        ctx.imageSmoothingEnabled = true;
    }

    // Очистка кэша для оптимизации памяти
    clearCache() {
        this.tilesCache.clear();
    }
}

console.log('MarsTerrainRenderer.js загружен');
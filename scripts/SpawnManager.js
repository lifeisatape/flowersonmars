class SpawnManager {
  constructor(config, objectPool, levelGenerator) {
      this.config = config;
      this.objectPool = objectPool;
      this.levelGenerator = levelGenerator;
      this.totalEnemies = 0;
      this.killedEnemies = 0;
      this.obstacles = [];
      this.player = null;
      this.bossKilled = false; // Флаг для отслеживания убийства босса
  }

  initializeLevel(level, player) {
      this.obstacles = level.data.obstacles;
      this.totalEnemies = this.config.ENEMIES_PER_LEVEL;
      this.killedEnemies = 0;
      this.player = player;
      this.bossKilled = false; // Сбрасываем флаг босса для нового уровня
  }

  spawnInitialEnemies() {
      const initialSpawn = Math.min(this.config.INITIAL_ENEMIES, this.totalEnemies);
      for (let i = 0; i < initialSpawn; i++) {
          this.spawnEnemy();
      }
  }

  spawnEnemy() {
      const activeEnemies = this.objectPool.getActiveObjects('enemy').length + 
                             this.objectPool.getActiveObjects('shootingEnemy').length +
                             this.objectPool.getActiveObjects('chargingEnemy').length +
                             this.objectPool.getActiveObjects('explosiveEnemy').length +
                             this.objectPool.getActiveObjects('shieldEnemy').length +
                             this.objectPool.getActiveObjects('sniperEnemy').length +
                             this.objectPool.getActiveObjects('teleporterEnemy').length;
      const activeBosses = this.objectPool.getActiveObjects('boss').length;
      const totalActiveEnemies = activeEnemies + activeBosses;

      if (totalActiveEnemies < this.config.MAX_ACTIVE_ENEMIES) {
          const enemy = this.createEnemy();
          if (enemy) { // Проверяем что враг был создан
              const position = this.findSafeEnemyPosition(enemy);
              enemy.x = position.x;
              enemy.y = position.y;
              
              // Активируем врага - это должно правильно установить цвета
              enemy.activate();
              
              console.log(`Создан враг типа ${enemy.constructor.name} в позиции (${position.x}, ${position.y}) с цветом тела: ${enemy.body.color}`);
          }
      }
  }

  createEnemy() {
      // Подсчитываем всех активных врагов
      const activeEnemies = this.objectPool.getActiveObjects('enemy').length + 
                             this.objectPool.getActiveObjects('shootingEnemy').length +
                             this.objectPool.getActiveObjects('chargingEnemy').length +
                             this.objectPool.getActiveObjects('explosiveEnemy').length +
                             this.objectPool.getActiveObjects('shieldEnemy').length +
                             this.objectPool.getActiveObjects('sniperEnemy').length +
                             this.objectPool.getActiveObjects('teleporterEnemy').length;
      const activeBosses = this.objectPool.getActiveObjects('boss').length;

      // Спавним босса если убили всех обычных врагов, босса еще нет и он еще не был убит
      if (this.killedEnemies >= this.totalEnemies - 1 && activeBosses === 0 && !this.bossKilled) {
          console.log(`Спавним босса! killedEnemies: ${this.killedEnemies}, totalEnemies: ${this.totalEnemies}, activeBosses: ${activeBosses}`);
          const boss = this.objectPool.create('boss');
          boss.init(0, 0, ShooterConfig.ENEMY_SIZE * 3, '#FF0000', ShooterConfig.ENEMY_SPEED * 0.5);
          console.log('Босс создан и инициализирован:', boss);
          return boss;
      }

      // Обычные враги спавнятся только если мы еще не достигли лимита обычных врагов
      if (this.killedEnemies + activeEnemies < this.totalEnemies - 1) {
          const enemyTypes = [
              { type: 'enemy', weight: 30 },              // Обычные враги
              { type: 'shootingEnemy', weight: 25 },      // Стреляющие враги
              { type: 'chargingEnemy', weight: 15 },      // Берсерки
              { type: 'explosiveEnemy', weight: 10 },     // Взрывчатые
              { type: 'shieldEnemy', weight: 10 },        // Со щитом
              { type: 'sniperEnemy', weight: 5 },         // Снайперы
              { type: 'teleporterEnemy', weight: 5 }      // Телепортеры
          ];

          // Выбираем тип врага на основе весов
          const totalWeight = enemyTypes.reduce((sum, type) => sum + type.weight, 0);
          let random = Math.random() * totalWeight;
          let selectedType = 'enemy';

          for (const enemyType of enemyTypes) {
              random -= enemyType.weight;
              if (random <= 0) {
                  selectedType = enemyType.type;
                  break;
              }
          }

          const enemy = this.objectPool.create(selectedType);
          
          // Специфичная инициализация для каждого типа врага
          switch(selectedType) {
              case 'chargingEnemy':
                  enemy.init(0, 0, this.config.ENEMY_SIZE, '#FF4500', this.config.ENEMY_SPEED);
                  break;
              case 'explosiveEnemy':
                  enemy.init(0, 0, this.config.ENEMY_SIZE, '#8B0000', this.config.ENEMY_SPEED * 0.8);
                  break;
              case 'shieldEnemy':
                  enemy.init(0, 0, this.config.ENEMY_SIZE, '#4169E1', this.config.ENEMY_SPEED * 0.7);
                  break;
              case 'sniperEnemy':
                  enemy.init(0, 0, this.config.ENEMY_SIZE * 0.8, '#2F4F4F', this.config.ENEMY_SPEED * 0.5);
                  break;
              case 'teleporterEnemy':
                  enemy.init(0, 0, this.config.ENEMY_SIZE, '#9400D3', this.config.ENEMY_SPEED);
                  break;
              case 'shootingEnemy':
                  enemy.init(0, 0, this.config.ENEMY_SIZE, '#FF6347', this.config.ENEMY_SPEED);
                  break;
              default:
                  enemy.init(0, 0, this.config.ENEMY_SIZE, this.config.ENEMY_COLOR, this.config.ENEMY_SPEED);
          }
          return enemy;
      }

      return null; // Не спавним ничего
  }

  findSafeEnemyPosition(enemy) {
      let position;
      const safeRadius = this.config.PLAYER_SAFE_RADIUS * 2;
      let attempts = 0;
      const maxAttempts = 100;

      do {
          // Создаем позицию с учетом размера врага
          position = {
              x: Math.random() * (this.config.MAP_WIDTH - enemy.width),
              y: Math.random() * (this.config.MAP_HEIGHT - enemy.height),
              width: enemy.width,
              height: enemy.height
          };
          attempts++;
          if (attempts > maxAttempts) {
              console.log("Не удалось найти подходящую позицию для врага после " + maxAttempts + " попыток");
              return position;
          }
      } while (
          this.levelGenerator.intersectsAnyObstacle(position, this.obstacles) ||
          this.levelGenerator.isNearPlayer(position, this.player.x, this.player.y, safeRadius)
      );

      return position;
  }

  enemyKilled() {
      this.killedEnemies++;
  }

  bossKilledThisLevel() {
      this.bossKilled = true;
      this.killedEnemies++; // Босс тоже засчитывается как убитый враг
  }

  allEnemiesKilled() {
      const activeEnemies = this.objectPool.getActiveObjects('enemy').length + 
                             this.objectPool.getActiveObjects('shootingEnemy').length +
                             this.objectPool.getActiveObjects('chargingEnemy').length +
                             this.objectPool.getActiveObjects('explosiveEnemy').length +
                             this.objectPool.getActiveObjects('shieldEnemy').length +
                             this.objectPool.getActiveObjects('sniperEnemy').length +
                             this.objectPool.getActiveObjects('teleporterEnemy').length;
      const activeBosses = this.objectPool.getActiveObjects('boss').length;

      // Уровень завершен когда убиты все обычные враги И босс
      return this.killedEnemies >= this.totalEnemies && activeBosses === 0;
  }
}

console.log('SpawnManager.js создан и загружен');
const ShooterConfig = {
  // Настройки игрока
  PLAYER_SIZE: 50, // Кратно сетке (100/2)
  PLAYER_SPEED: 5,
  PLAYER_COLOR: '#0096ff',
  PLAYER_ACCELERATION: 0.7,
  PLAYER_DECELERATION: 0.90,
  PLAYER_SAFE_RADIUS: 200, // Кратно сетке (100*2)
  PLAYER_MAX_HEALTH: 20,
  PLAYER_MAX_SHIELD: 20,
  PLAYER_SHIELD_REGEN_RATE: 1, // HP в секунду
  PLAYER_SHIELD_REGEN_DELAY: 1000, // 10 секунд в миллисекундах
  PLAYER_KNOCKBACK_DISTANCE: 0,

  DRONE_SKIN: 'drone.png',
  DRONE_SIZE: 25, // Кратно сетке (100/4)

  WEAPON_SKIN: 'weapon.png',
  WEAPON_SIZE: 100, // Кратно сетке

  // Параметры тени игрока
  PLAYER_SHADOW_SIZE: 50, // Кратно сетке
  PLAYER_SHADOW_COLOR: 'rgba(0, 0, 0, 0.5)',

  // Настройки пуль
  BULLET_SIZE: 6,
  BULLET_SPEED: 25,
  BULLET_COLOR: '#efefef',
  BULLET_LIFESPAN: 30,
  INITIAL_BULLET_POOL_SIZE: 10,
  SHOOT_COOLDOWN: 300,

  // Настройки врагов
  ENEMY_SIZE: 25, // Кратно сетке (100/4)
  ENEMY_SPEED: 2,
  ENEMY_COLOR: '#FF0000', // Красный цвет для обычных врагов
  INITIAL_ENEMY_POOL_SIZE: 15,
  MAX_ENEMIES: 15,

  ENEMY_WEAPON_SKIN: 'enemy-weapon.png', // Путь к изображению оружия врага
  ENEMY_WEAPON_SIZE: 100, // Размер оружия врага, кратно сетке
  ENEMY_HEAD_SIZE_RATIO: 2.5 , // голова врага 
  ENEMY_HEAD_OFFSET_Y_RATIO: -1.2 , // Новый параметр: вертикальное смещение головы относительно размера врага
  ENEMY_SHADOW_SIZE_RATIO: 2.5 , // Новый параметр: размер тени относительно размера врага
  ENEMY_SHADOW_OFFSET_Y_RATIO: 1 , // Новый параметр: вертикальное смещение тени относительно размера врага

  // Новые настройки для управления врагами
  ENEMIES_PER_LEVEL: 20,
  INITIAL_ENEMIES: 5,
  MAX_ACTIVE_ENEMIES: 20,
  ENEMY_SPAWN_DELAY: 10000,

  SHOOTING_ENEMY_RATE: 0.3, // 30% шанс появления стреляющего врага
  ENEMY_BULLET_SPEED: 2,
  ENEMY_BULLET_DAMAGE: 5,
  DRONE_BULLET_SPEED: 30,
  DRONE_BULLET_DAMAGE: 15,

  // Настройки карты
  MAP_WIDTH: 4000,
  MAP_HEIGHT: 4000,
  GRID_SIZE: 100,

  // Настройки отрисовки
  BACKGROUND_COLOR: '#951212',
  GRID_COLOR: 'rgba(255, 69, 0, 0.2)',
  BORDER_COLOR: 'rgba(255, 69, 0, 0.5)',
  TEXT_COLOR: '#0096ff',

  // Настройки физики
  FRICTION: 0.98,

  // Настройки игры
  SCORE_PER_ENEMY: 1,
  MAX_LEVELS: 5,

  // Настройки препятствий
  OBSTACLE_COUNT: 20,
  OBSTACLE_MIN_SIZE: 50, // Кратно сетке (100/2)
  OBSTACLE_MAX_SIZE: 200, // Кратно сетке (100*2)
  OBSTACLE_COLOR: '#A0522D',

  // Настройки интерактивных деревьев
  INTERACTIVE_TREE_COUNT: 6,
  TREE_MIN_SIZE: 25, // Кратно сетке (100/4)
  TREE_MAX_SIZE: 50, // Кратно сетке (100/2)

  // Настройки частиц
  PARTICLE_SIZE: 3,
  PARTICLE_SPEED: 5,
  PARTICLE_LIFESPAN: 60,
  INITIAL_PARTICLE_POOL_SIZE: 500,

  // Настройки эффектов
  EXPLOSION_PARTICLE_COUNT: 15,
  EXPLOSION_PARTICLE_SPEED: 10,
  EXPLOSION_PARTICLE_LIFESPAN: 40,
  SPARK_PARTICLE_COUNT: 10,
  SPARK_PARTICLE_SPEED: 10,
  SPARK_PARTICLE_LIFESPAN: 20,
  MUZZLE_FLASH_PARTICLE_COUNT: 5,
  MUZZLE_FLASH_PARTICLE_LIFESPAN: 10,

  // Настройки звука
  SOUNDS: {
    SHOOT: 'sounds/shoot.mp3',
    ENEMY_HIT: 'sounds/enemy-hit.mp3',
    PLAYER_HIT: 'sounds/player-hit.mp3',
    GAME_OVER: 'sounds/game-over.mp3',
    GAME_WIN: 'sounds/game-win.mp3'
  },
  MUSIC: 'sounds/background-music.mp3',

  // Настройки скинов игрока
  PLAYER_SKINS: [
    'mfers/skin1.png',
    'mfers/skin2.png',
    'mfers/skin3.png',
    'mfers/skin4.png',
    'mfers/skin5.png',
    'mfers/skin6.png',
    'mfers/skin7.png',
    'mfers/skin8.png',
    'mfers/skin9.png',
    'mfers/skin10.png',
    'mfers/skin11.png',
    'mfers/skin12.png',
    'mfers/skin13.png',
    'mfers/skin14.png',
    'mfers/skin15.png',
    'mfers/skin16.png',
    'mfers/skin17.png',
    'mfers/skin18.png',
    'mfers/skin19.png',
    'mfers/skin20.png',
    'mfers/skin21.png',
    'mfers/skin22.png',
    'mfers/skin23.png',
    'mfers/skin24.png',
    'mfers/skin25.png',
    'mfers/skin26.png',
  ],
  DEFAULT_SKIN: 'mfers/skin1.png',

  // Настройки камеры
  CAMERA: {
    DEFAULT_ZOOM: 0.7,
    MAX_ZOOM: 0.6,
    ZOOM_SPEED: 0.4,
    MOVEMENT_THRESHOLD: 0.1,
  },
};

console.log('ShooterConfig.js полностью обновлен');
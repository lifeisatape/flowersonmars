class GameStateManager {
    constructor(game) {
        this.game = game;
        this.currentState = 'menu';
        this.states = {
            menu: this.menuState.bind(this),
            playing: this.playingState.bind(this),
            paused: this.pausedState.bind(this),
            playerDying: this.playerDyingState.bind(this),
            gameOver: this.gameOverState.bind(this),
            gameWon: this.gameWonState.bind(this),
            levelComplete: this.levelCompleteState.bind(this)
        };
    }

    setState(newState) {
        if (this.states[newState]) {
            this.currentState = newState;
            console.log(`Игровое состояние изменено на: ${newState}`);
        } else {
            console.error(`Состояние ${newState} не существует`);
        }
    }

    update(deltaTime) {
        this.states[this.currentState](deltaTime);
    }

    draw(context) {
        // Общая отрисовка для всех состояний
        this.game.draw();
    }

    menuState(deltaTime) {
        // Логика обновления для состояния меню
    }

    playingState(deltaTime) {
        // Логика обновления для игрового процесса
        // В основном, эта логика уже обрабатывается в методе update класса ShooterGame
    }

    pausedState(deltaTime) {
        // Логика обновления для состояния паузы
    }

    playerDyingState(deltaTime) {
        // Логика обновления для состояния смерти игрока
        // Обновляем только анимацию смерти игрока
    }

    gameOverState(deltaTime) {
        // Логика обновления для состояния окончания игры
    }

    gameWonState(deltaTime) {
        // Логика обновления для состояния победы в игре
    }

    levelCompleteState(deltaTime) {
        // Логика обновления для состояния завершения уровня
    }
}

console.log('GameStateManager.js полностью обновлен и загружен');
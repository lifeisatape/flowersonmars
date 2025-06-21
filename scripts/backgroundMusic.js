document.addEventListener('DOMContentLoaded', function() {
    const backgroundMusic = document.getElementById('alfatapes0');
    const startGameButton = document.getElementById('start-game');
    const mainContent = document.getElementById('main-content');
    const gameContainer = document.getElementById('game-container');

    if (!backgroundMusic) {
        console.error('Background music element not found');
        return;
    }

    function playBackgroundMusic() {
        if (backgroundMusic.paused) {
            backgroundMusic.play().catch(error => {
                console.log('Autoplay prevented:', error);
            });
        }
    }

    function stopBackgroundMusic() {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
    }

    // Воспроизведение музыки при клике на страницу
    document.body.addEventListener('click', playBackgroundMusic, { once: true });

    if (startGameButton) {
        startGameButton.addEventListener('click', function() {
            stopBackgroundMusic();
            mainContent.style.display = 'none';
            gameContainer.style.display = 'block';
        });
    } else {
        console.error('Start game button not found');
    }

    // Остановка музыки при уходе со страницы
    window.addEventListener('beforeunload', stopBackgroundMusic);

    // Остановка музыки при переходе на другую страницу (если используется HTML5 History API)
    window.addEventListener('popstate', stopBackgroundMusic);

    // Воспроизведение музыки при возврате на главную страницу
    function checkVisibility() {
        if (mainContent.style.display !== 'none' && gameContainer.style.display === 'none') {
            playBackgroundMusic();
        } else {
            stopBackgroundMusic();
        }
    }

    // Проверка видимости главной страницы каждую секунду
    setInterval(checkVisibility, 1000);

    console.log('Background music script loaded and initialized');
});
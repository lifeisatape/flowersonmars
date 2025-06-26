document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM загружен, инициализация игры');

    const canvas = document.getElementById('gameCanvas');
    const shootButton = document.getElementById('shootButton');
    const joystickArea = document.getElementById('joystick-area');
    const shootJoystickArea = document.getElementById('shoot-joystick-area');
    const loadingScreen = document.getElementById('loading-screen');
    const mainContent = document.getElementById('main-content');
    const gameContainer = document.getElementById('game-container');
    const skinSelection = document.getElementById('skin-selection');

    // Check if required elements exist
    if (!canvas || !shootButton || !joystickArea || !shootJoystickArea) {
        console.error('Required game elements not found');
        return;
    }

    let selectedSkin = ShooterConfig.DEFAULT_SKIN;
    let game;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        console.log(`Canvas изменен: ${canvas.width}x${canvas.height}`);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const soundManager = new SoundManager();

    await soundManager.loadAllSounds();

    // Only add skin selection if the element exists
    if (skinSelection) {
        ShooterConfig.PLAYER_SKINS.forEach((skin, index) => {
            const skinOption = document.createElement('img');
            skinOption.src = skin;
            skinOption.classList.add('skin-option');
            if (index === 0) {
                skinOption.classList.add('selected');
            }
            skinOption.addEventListener('click', () => selectSkin(skin, skinOption));
            skinSelection.appendChild(skinOption);
        });

        skinSelection.addEventListener('touchmove', function(e) {
            e.stopPropagation();
        }, { passive: true });
    }

    function selectSkin(skin, element) {
        selectedSkin = skin;
        document.querySelectorAll('.skin-option').forEach(option => option.classList.remove('selected'));
        element.classList.add('selected');
    }

    async function showMainContent() {
        // Скрыть экран загрузки и показать основной контент
        loadingScreen.style.display = 'none';
        mainContent.style.display = 'block';

        // Инициализация Farcaster интеграции
        if (window.farcasterIntegration && window.isMiniApp) {
            try {
                // Если SDK уже загружен, инициализируем сразу
                if (window.sdk) {
                    window.farcasterIntegration.sdk = window.sdk;
                    await window.farcasterIntegration.init();
                } else {
                    // Иначе ждем загрузки
                    await window.farcasterIntegration.init();
                }

                console.log('Farcaster integration initialized');
                console.log('Is in Mini App:', window.farcasterIntegration.isInMiniApp);
                console.log('SDK available:', !!window.farcasterIntegration.sdk);

                if (window.farcasterIntegration.isInMiniApp) {
                    const userInfo = window.farcasterIntegration.getUserInfo();
                    console.log('User info:', userInfo);

                    // Уведомляем Farcaster что приложение готово
                    await window.farcasterIntegration.notifyAppReady();
                }
            } catch (error) {
                console.error('Error initializing Farcaster integration:', error);
            }
        } else {
            console.log('Farcaster integration not available or not in Mini App');
        }
    }

    showMainContent();

    // Initialize leaderboard
    if (window.leaderboard) {
        // Show leaderboard button
        const leaderboardButton = document.getElementById('show-leaderboard');
        if (leaderboardButton) {
            leaderboardButton.style.display = 'block';
        }
        
        // Initialize leaderboard system
        // For Farcaster users, try to update name from Farcaster
        setTimeout(() => {
            if (window.farcasterIntegration && window.farcasterIntegration.isInMiniApp) {
                leaderboard.updateFromFarcaster();
            } else {
                leaderboard.promptPlayerName();
            }
        }, 1000); // Give time for Farcaster to initialize
        
        leaderboard.loadLeaderboard();
        leaderboard.startAutoRefresh(30);
    }

    gameContainer.addEventListener('touchmove', function(e) {
        e.preventDefault();
    }, { passive: false });

    function isInsideGameContainer(element) {
        let current = element;
        while (current != null) {
            if (current === gameContainer) {
                return true;
            }
            current = current.parentElement;
        }
        return false;
    }

    document.addEventListener('selectstart', (e) => {
        if (isInsideGameContainer(e.target)) {
            e.preventDefault();
        }
    });

    function initGame() {
        game = new ShooterGame(canvas, soundManager, selectedSkin);

        const keys = {};
        window.addEventListener('keydown', (e) => {
            keys[e.key] = true;
            updatePlayerMovement();
        });

        window.addEventListener('keyup', (e) => {
            keys[e.key] = false;
            updatePlayerMovement();
        });

        function updatePlayerMovement() {
            let dx = 0, dy = 0;
            if (keys['ArrowUp'] || keys['w'] || keys['W']) dy -= 1;
            if (keys['ArrowDown'] || keys['s'] || keys['S']) dy += 1;
            if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= 1;
            if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;

            if (dx !== 0 && dy !== 0) {
                const length = Math.sqrt(dx * dx + dy * dy);
                dx /= length;
                dy /= length;
            }

            game.setPlayerMovement(dx, dy);
        }

        canvas.addEventListener('mousedown', startAudio);
        shootButton.addEventListener('touchstart', startAudio);
        joystickArea.addEventListener('touchstart', startAudio);
        shootJoystickArea.addEventListener('touchstart', startAudio);

        function startAudio() {
            soundManager.audioContext.resume().then(() => {
                canvas.removeEventListener('mousedown', startAudio);
                shootButton.removeEventListener('touchstart', startAudio);
                joystickArea.removeEventListener('touchstart', startAudio);
                shootJoystickArea.removeEventListener('touchstart', startAudio);
            });
        }

        canvas.addEventListener('mousedown', () => game.startShooting());
        canvas.addEventListener('mouseup', () => game.stopShooting());
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left - canvas.width / 2;
            const y = e.clientY - rect.top - canvas.height / 2;
            const direction = Math.atan2(y, x);
            game.player.direction = direction;
        });

        let joystickTouch = null;
        joystickArea.addEventListener('touchstart', (e) => {
            if (!joystickTouch) {
                joystickTouch = e.changedTouches[0];
                updateJoystickMovement(e);
            }
        });

        joystickArea.addEventListener('touchmove', (e) => {
            if (joystickTouch) {
                updateJoystickMovement(e);
            }
        });

        joystickArea.addEventListener('touchend', (e) => {
            if (joystickTouch && joystickTouch.identifier === e.changedTouches[0].identifier) {
                joystickTouch = null;
                game.setPlayerMovement(0, 0);
            }
        });

        function updateJoystickMovement(e) {
            const touch = Array.from(e.touches).find(t => t.identifier === joystickTouch.identifier);
            if (touch) {
                const joystickRect = joystickArea.getBoundingClientRect();
                const centerX = joystickRect.left + joystickRect.width / 2;
                const centerY = joystickRect.top + joystickRect.height / 2;
                let dx = (touch.clientX - centerX) / (joystickRect.width / 2);
                let dy = (touch.clientY - centerY) / (joystickRect.height / 2);

                const length = Math.sqrt(dx * dx + dy * dy);
                if (length > 1) {
                    dx /= length;
                    dy /= length;
                }

                game.setPlayerMovement(dx, dy);
            }
        }

        shootButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            game.startShooting();
        });

        shootButton.addEventListener('touchend', () => {
            game.stopShooting();
        });

        let shootJoystickTouch = null;
        shootJoystickArea.addEventListener('touchstart', (e) => {
            if (!shootJoystickTouch) {
                shootJoystickTouch = e.changedTouches[0];
                updateShootJoystickMovement(e);
            }
        });

        shootJoystickArea.addEventListener('touchmove', (e) => {
            if (shootJoystickTouch) {
                updateShootJoystickMovement(e);
            }
        });

        shootJoystickArea.addEventListener('touchend', (e) => {
            if (shootJoystickTouch && shootJoystickTouch.identifier === e.changedTouches[0].identifier) {
                shootJoystickTouch = null;
                game.setPlayerShootingDirection(0, 0);
                game.stopShooting();
            }
        });

        function updateShootJoystickMovement(e) {
            const touch = Array.from(e.touches).find(t => t.identifier === shootJoystickTouch.identifier);
            if (touch) {
                const joystickRect = shootJoystickArea.getBoundingClientRect();
                const centerX = joystickRect.left + joystickRect.width / 2;
                const centerY = joystickRect.top + joystickRect.height / 2;
                let dx = (touch.clientX - centerX) / (joystickRect.width / 2);
                let dy = (touch.clientY - centerY) / (joystickRect.height / 2);

                const length = Math.sqrt(dx * dx + dy * dy);
                if (length > 1) {
                    dx /= length;
                    dy /= length;
                }

                game.setPlayerShootingDirection(dx, dy);
                game.startShooting();
            }
        }
    }

    // Helper function to get a random skin
    function getRandomSkin() {
        const randomIndex = Math.floor(Math.random() * ShooterConfig.PLAYER_SKINS.length);
        return ShooterConfig.PLAYER_SKINS[randomIndex];
    }

    function startGame() {
        mainContent.style.display = 'none';
        gameContainer.style.display = 'block';
        if (!game) {
            initGame();
        }
        game.start();
    }

    // Обработчик для кнопки Play Demo
    const playButton = document.getElementById('play-demo');
    const shareButton = document.getElementById('share-game');

    if (playButton) {
        playButton.addEventListener('click', () => {
            selectedSkin = getRandomSkin(); // Выбираем случайный скин
            console.log('Начинаем демо игру со случайным скином:', selectedSkin);
            startGame();
        });
    }

    // Обработчик кнопки "Share"
    if (shareButton) {
        shareButton.addEventListener('click', async () => {
            try {
                const shareText = "🚀 Check out Flowers on Mars - an epic space shooter game! Battle aliens on Mars with incredible effects! 👽💥";
                const url = window.location.href;

                if (window.farcasterIntegration && window.farcasterIntegration.isInMiniApp && window.farcasterIntegration.sdk && window.farcasterIntegration.sdk.actions) {
                    await window.farcasterIntegration.sdk.actions.composeCast({
                        text: shareText,
                        embeds: [url]
                    });
                    console.log('Game shared to Farcaster');
                } else if (navigator.share) {
                    await navigator.share({
                        title: 'Flowers on Mars',
                        text: shareText,
                        url: url
                    });
                } else {
                    // Fallback - copy to clipboard
                    const fullText = `${shareText} ${url}`;
                    if (navigator.clipboard) {
                        await navigator.clipboard.writeText(fullText);
                        console.log('Link copied to clipboard');
                    }
                }
            } catch (error) {
                console.log('Error sharing game:', error);
            }
        });
    }

    // Обработчик кнопки "Donate"
    const donateButton = document.getElementById('donate-button');
    if (donateButton) {
        donateButton.addEventListener('click', async () => {
            try {
                if (window.farcasterIntegration && window.farcasterIntegration.isInMiniApp) {
                    const result = await window.farcasterIntegration.sendDonation('1000000'); // 1 USDC
                    if (result.success) {
                        console.log('Donation successful!');
                        // Можно добавить уведомление пользователю
                    } else {
                        console.log('Donation failed:', result.reason);
                        // Fallback - показать адрес для ручного перевода
                        alert('Please send USDC to: 0x7Ea45b01EECaE066f37500c92B10421937571f75');
                    }
                } else {
                    // Fallback для не-Farcaster окружения
                    const address = '0x7Ea45b01EECaE066f37500c92B10421937571f75';
                    if (navigator.clipboard) {
                        await navigator.clipboard.writeText(address);
                        alert(`Wallet address copied to clipboard:\n${address}\n\nPlease send USDC (Base network)`);
                    } else {
                        alert(`Please send USDC to this address (Base network):\n${address}`);
                    }
                }
            } catch (error) {
                console.error('Error processing donation:', error);
                // Fallback
                alert('Please send USDC to: 0x7Ea45b01EECaE066f37500c92B10421937571f75');
            }
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
});

console.log('main.js обновлен');

class UIManager {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.game = game;
        this.buttonArea = { x: 0, y: 0, width: 0, height: 0 };
    }

    drawUI() {
        this.drawGameInfo();
        this.updateMobileControlsVisibility();

        switch (this.game.stateManager.currentState) {
            case 'playing':
                break;
            case 'levelComplete':
                this.drawLevelComplete();
                break;
            case 'gameOver':
            case 'gameWon':
                this.drawGameEnd();
                break;
            case 'paused':
                this.drawPaused();
                break;
        }
    }

    updateMobileControlsVisibility() {
        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) {
            const shouldHide = ['gameOver', 'gameWon', 'levelComplete', 'playerDying'].includes(this.game.stateManager.currentState);
            mobileControls.style.display = shouldHide ? 'none' : 'flex';
        }
    }

    drawGameInfo() {
        // Get remaining enemies until level victory (including boss)
        const totalEnemiesThisLevel = this.game.spawnManager.totalEnemies;
        const killedEnemies = this.game.spawnManager.killedEnemies;
        const activeBosses = this.game.objectPool.getActiveObjects('boss').length;
        const activeEnemies = this.game.objectPool.getActiveObjects('enemy').length + 
                             this.game.objectPool.getActiveObjects('shootingEnemy').length;
        
        // Оставшиеся враги = всего врагов - убитые + активные боссы (босс считается как +1 к оставшимся)
        let remainingEnemies = Math.max(0, totalEnemiesThisLevel - killedEnemies + activeBosses);
        
        // Display only remaining enemies count as black number at center top
        this.context.fillStyle = 'black';
        this.context.font = 'bold 24px Arial';
        this.context.textAlign = 'center';
        this.context.fillText(remainingEnemies, this.canvas.width / 2, 30);
        
        // Reset text alignment
        this.context.textAlign = 'left';
    }

    drawLevelComplete() {
        this.drawEndScreen('Level Complete!', 'Next Level');
    }

    drawGameEnd() {
        const message = this.game.stateManager.currentState === 'gameOver' ? 'Game Over' : 'You Won!';
        const buttonText = 'New Game';
        this.drawEndScreen(message, buttonText);
    }

    drawPaused() {
        this.drawEndScreen('Paused', 'Continue');
    }

    drawEndScreen(message, buttonText) {
        // Простой тёмный градиентный фон как на лендинге
        const gradient = this.context.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, 'rgba(26, 0, 0, 0.95)');
        gradient.addColorStop(0.5, 'rgba(74, 0, 0, 0.98)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.99)');
        
        this.context.fillStyle = gradient;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Основное сообщение - простой и чистый стиль
        this.context.fillStyle = '#FF4500';
        this.context.font = 'bold 42px Arial';
        this.context.textAlign = 'center';
        this.context.fillText(message, this.canvas.width / 2, this.canvas.height / 2 - 60);

        // Score - cleaner style
        this.context.fillStyle = '#FFD700';
        this.context.font = '28px Arial';
        this.context.fillText(`Score: ${this.game.score}`, this.canvas.width / 2, this.canvas.height / 2 - 10);

        // Level
        this.context.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.context.font = '20px Arial';
        this.context.fillText(`Level: ${this.game.levelManager.currentLevel}`, this.canvas.width / 2, this.canvas.height / 2 + 20);

        if (buttonText) {
            this.drawMinimalButton(buttonText);
        }

        // Добавляем кнопку Share для экранов окончания игры
        if (this.game.stateManager.currentState === 'gameOver' || this.game.stateManager.currentState === 'gameWon') {
            this.drawShareButton();
        }

        // Сброс выравнивания текста
        this.context.textAlign = 'left';
    }

    

    drawMinimalButton(buttonText) {
        this.buttonArea = {
            x: this.canvas.width / 2 - 120,
            y: this.canvas.height / 2 + 70,
            width: 240,
            height: 50
        };

        // Простой градиент как на лендинге
        const buttonGradient = this.context.createLinearGradient(
            this.buttonArea.x, this.buttonArea.y,
            this.buttonArea.x, this.buttonArea.y + this.buttonArea.height
        );
        buttonGradient.addColorStop(0, '#FF4500');
        buttonGradient.addColorStop(1, '#FF8C00');

        // Основа кнопки
        this.context.fillStyle = buttonGradient;
        this.context.fillRect(this.buttonArea.x, this.buttonArea.y, this.buttonArea.width, this.buttonArea.height);

        // Простая рамка
        this.context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.context.lineWidth = 1;
        this.context.strokeRect(this.buttonArea.x, this.buttonArea.y, this.buttonArea.width, this.buttonArea.height);

        // Текст кнопки - чистый и простой
        this.context.fillStyle = 'white';
        this.context.font = 'bold 20px Arial';
        this.context.textAlign = 'center';
        this.context.fillText(buttonText.toUpperCase(), this.buttonArea.x + this.buttonArea.width / 2, this.buttonArea.y + this.buttonArea.height / 2 + 6);
    }

    drawShareButton() {
        this.shareButtonArea = {
            x: this.canvas.width / 2 - 120,
            y: this.canvas.height / 2 + 135,
            width: 240,
            height: 50
        };

        // Градиент для кнопки Share
        const shareGradient = this.context.createLinearGradient(
            this.shareButtonArea.x, this.shareButtonArea.y,
            this.shareButtonArea.x, this.shareButtonArea.y + this.shareButtonArea.height
        );
        shareGradient.addColorStop(0, '#0096ff');
        shareGradient.addColorStop(1, '#00d4ff');

        // Основа кнопки
        this.context.fillStyle = shareGradient;
        this.context.fillRect(this.shareButtonArea.x, this.shareButtonArea.y, this.shareButtonArea.width, this.shareButtonArea.height);

        // Простая рамка
        this.context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.context.lineWidth = 1;
        this.context.strokeRect(this.shareButtonArea.x, this.shareButtonArea.y, this.shareButtonArea.width, this.shareButtonArea.height);

        // Текст кнопки
        this.context.fillStyle = 'white';
        this.context.font = 'bold 20px Arial';
        this.context.textAlign = 'center';
        this.context.fillText('📤 SHARE', this.shareButtonArea.x + this.shareButtonArea.width / 2, this.shareButtonArea.y + this.shareButtonArea.height / 2 + 6);
    }

    handleClick(x, y) {
        // Проверка клика по основной кнопке
        if (x >= this.buttonArea.x && x <= this.buttonArea.x + this.buttonArea.width &&
            y >= this.buttonArea.y && y <= this.buttonArea.y + this.buttonArea.height) {
            switch (this.game.stateManager.currentState) {
                case 'levelComplete':
                    this.game.startNextLevel();
                    break;
                case 'gameOver':
                case 'gameWon':
                    this.game.resetGame();
                    this.game.start();
                    break;
                case 'paused':
                    this.game.togglePause();
                    break;
            }
        }

        // Проверка клика по кнопке Share (только на экранах окончания игры)
        if (this.shareButtonArea && 
            (this.game.stateManager.currentState === 'gameOver' || this.game.stateManager.currentState === 'gameWon') &&
            x >= this.shareButtonArea.x && x <= this.shareButtonArea.x + this.shareButtonArea.width &&
            y >= this.shareButtonArea.y && y <= this.shareButtonArea.y + this.shareButtonArea.height) {
            this.shareGameResult();
        }
    }

    async shareGameResult() {
        const score = this.game.score;
        const level = this.game.levelManager.currentLevel;
        const isWon = this.game.stateManager.currentState === 'gameWon';
        
        let shareText;
        if (isWon) {
            shareText = `🚀 I beat Flowers on Mars! Scored ${score} points and reached level ${level}! 🏆👽 Try to beat my record!`;
        } else {
            shareText = `💥 I battled on Mars in Flowers on Mars! Scored ${score} points and reached level ${level}! 🚀👽 Can you do better?`;
        }

        // Проверяем наличие Farcaster интеграции
        if (window.farcasterIntegration && window.farcasterIntegration.isInMiniApp) {
            try {
                await window.farcasterIntegration.sdk.actions.composeCast({
                    text: shareText,
                    embeds: [window.location.href]
                });
                console.log('Game result published to Farcaster');
            } catch (error) {
                console.error('Error publishing to Farcaster:', error);
                this.fallbackShare(shareText);
            }
        } else {
            this.fallbackShare(shareText);
        }
    }

    fallbackShare(text) {
        const url = window.location.href;
        const fullText = `${text} ${url}`;

        if (navigator.share) {
            navigator.share({
                title: 'Flowers on Mars',
                text: text,
                url: url
            }).catch(error => {
                console.log('Error using Web Share API:', error);
                this.copyToClipboard(fullText);
            });
        } else {
            this.copyToClipboard(fullText);
        }
    }

    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                console.log('Result copied to clipboard');
            }).catch(() => {
                console.log('Failed to copy to clipboard');
            });
        }
    }
}
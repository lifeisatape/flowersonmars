class FlowersOnMarsLeaderboard {
    constructor() {
        this.apiUrl = 'https://fomscore.replit.app';
        this.playerName = this.getFarcasterUsername() || localStorage.getItem('playerName') || 'Anonymous';
        this.isSubmitting = false;
    }

    /**
     * Get username from Farcaster
     */
    getFarcasterUsername() {
        if (window.farcasterIntegration && window.farcasterIntegration.isInMiniApp) {
            const userInfo = window.farcasterIntegration.getUserInfo();
            if (userInfo && userInfo.displayName) {
                console.log(`Using Farcaster displayName: ${userInfo.displayName}`);
                return userInfo.displayName;
            } else if (userInfo && userInfo.username) {
                console.log(`Using Farcaster username: ${userInfo.username}`);
                return userInfo.username;
            }
        }
        return null;
    }

    /**
     * Set player name
     */
    setPlayerName(name) {
        this.playerName = name;
        localStorage.setItem('playerName', name);
    }

    /**
     * Submit score to server
     */
    async submitScore(score, customName = null) {
        if (this.isSubmitting) {
            console.log('Score submission already in progress...');
            return { success: false, message: 'Submission in progress' };
        }

        this.isSubmitting = true;
        const nameToUse = customName || this.playerName;

        try {
            console.log(`Submitting score: ${score} for player: ${nameToUse}`);
            
            const response = await fetch(`${this.apiUrl}/api/score`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playerName: nameToUse,
                    score: score
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log(`Score submitted successfully: ${result.message}`);
                this.showNotification(result.message, 'success');
                
                // Update leaderboard display
                await this.loadLeaderboard();
                
                // Show celebration for top 3
                if (result.newRank <= 3) {
                    this.showRankCelebration(result.newRank);
                }
            } else {
                console.log(`Score not improved: ${result.message}`);
                this.showNotification(result.message, 'info');
            }

            return result;
        } catch (error) {
            console.error('Error submitting score:', error);
            this.showNotification('Network error. Check connection.', 'error');
            return { success: false, message: 'Network error' };
        } finally {
            this.isSubmitting = false;
        }
    }

    /**
     * Load leaderboard
     */
    async loadLeaderboard() {
        try {
            const response = await fetch(`${this.apiUrl}/api/leaderboard`);
            const data = await response.json();

            if (data.success) {
                this.displayLeaderboard(data);
                return data;
            } else {
                console.error('Failed to load leaderboard:', data.message);
                return null;
            }
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            this.showNotification('Error loading leaderboard', 'error');
            return null;
        }
    }

    /**
     * Get player stats
     */
    async getPlayerStats(playerName) {
        try {
            const encodedName = encodeURIComponent(playerName);
            const response = await fetch(`${this.apiUrl}/api/player/${encodedName}`);
            
            if (response.status === 404) {
                return { success: false, message: 'Player not found' };
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error getting player stats:', error);
            return { success: false, message: 'Network error' };
        }
    }

    /**
     * Display leaderboard in HTML
     */
    displayLeaderboard(data) {
        const container = document.getElementById('leaderboard');
        if (!container) {
            console.warn('Leaderboard container not found');
            return;
        }

        let html = `
            <div class="leaderboard-header">
                <h3>🏆 Galactic Leaderboard</h3>
                <p>Top Flowers on Mars Commanders</p>
            </div>
            <div class="leaderboard-stats">
                <span>Total players: ${data.totalPlayers}</span>
                <span class="live-indicator">🟢 Live</span>
            </div>
            <div class="leaderboard-list">
        `;

        data.leaderboard.forEach((player, index) => {
            const rank = index + 1;
            const rankIcon = this.getRankIcon(rank);
            const rankClass = rank <= 3 ? 'top-player' : '';
            const isCurrentPlayer = player.playerName === this.playerName ? 'current-player' : '';
            
            html += `
                <div class="player-row ${rankClass} ${isCurrentPlayer}">
                    <div class="rank">${rankIcon}</div>
                    <div class="player-info">
                        <div class="player-name">${player.playerName}</div>
                    </div>
                    <div class="score">${this.formatScore(player.bestScore)}</div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Display current player stats
     */
    async displayPlayerStats() {
        const stats = await this.getPlayerStats(this.playerName);
        const container = document.getElementById('player-stats');
        
        if (!container) return;

        if (stats.success) {
            const player = stats.player;
            container.innerHTML = `
                <div class="player-stats">
                    <h4>Your Statistics</h4>
                    <div class="stat-item">
                        <span>Rank:</span>
                        <span class="rank-value">#${player.rank}</span>
                    </div>
                    <div class="stat-item">
                        <span>Best Score:</span>
                        <span class="score-value">${this.formatScore(player.bestScore)}</span>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="player-stats">
                    <p>Play the game to see your statistics!</p>
                </div>
            `;
        }
    }

    /**
     * Format score numbers
     */
    formatScore(score) {
        return score.toLocaleString('en-US');
    }

    /**
     * Get rank icon
     */
    getRankIcon(rank) {
        switch (rank) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return `#${rank}`;
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                ${this.getNotificationIcon(type)}
                <span>${message}</span>
            </div>
        `;

        // Add to DOM
        document.body.appendChild(notification);

        // Show with animation
        setTimeout(() => notification.classList.add('show'), 100);

        // Remove after 4 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 4000);
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'info': return 'ℹ️';
            default: return 'ℹ️';
        }
    }

    /**
     * Show rank celebration
     */
    showRankCelebration(rank) {
        let message, icon;
        
        switch (rank) {
            case 1:
                message = 'Congratulations! You are the galactic leader!';
                icon = '🎉👑';
                break;
            case 2:
                message = 'Excellent result! You are in second place!';
                icon = '🥈✨';
                break;
            case 3:
                message = 'Great! You are in the top three!';
                icon = '🥉⭐';
                break;
        }

        // Create celebration modal
        const modal = document.createElement('div');
        modal.className = 'celebration-modal';
        modal.innerHTML = `
            <div class="celebration-content">
                <div class="celebration-icon">${icon}</div>
                <h2>New Record!</h2>
                <p>${message}</p>
                <button onclick="this.parentElement.parentElement.remove()">Continue</button>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    /**
     * Auto refresh leaderboard
     */
    startAutoRefresh(intervalSeconds = 30) {
        console.log(`Starting auto-refresh every ${intervalSeconds} seconds`);
        
        this.refreshInterval = setInterval(() => {
            this.loadLeaderboard();
        }, intervalSeconds * 1000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Prompt for player name
     */
    promptPlayerName() {
        const name = prompt('Enter your name for leaderboard:', this.playerName);
        if (name && name.trim()) {
            this.setPlayerName(name.trim());
            return name.trim();
        }
        return this.playerName;
    }
}

// Global instance for use in game
window.leaderboard = new FlowersOnMarsLeaderboard();

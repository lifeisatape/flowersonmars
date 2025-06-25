class FarcasterIntegration {
    constructor() {
        this.sdk = null;
        this.context = null;
        this.isInMiniApp = false;
        this.isFarcasterApp = false;
    }

    async init() {
        // Проверяем, работаем ли мы в Mini App
        if (!window.isMiniApp) {
            console.log('⏭️ Not in Mini App environment, skipping Farcaster initialization');
            return;
        }

        try {
            console.log('🔄 Initializing Farcaster integration...');

            // Ждем загрузки SDK
            const sdk = await this.waitForSDK();
            this.sdk = sdk;

            // Проверяем окружение
            let isInMiniAppEnv = true;
            try {
                if (typeof sdk.isInMiniApp === 'function') {
                    isInMiniAppEnv = await sdk.isInMiniApp();
                    console.log('🔍 SDK environment check:', isInMiniAppEnv);
                }
            } catch (error) {
                console.log('⚠️ Could not verify environment with SDK:', error);
            }

            if (isInMiniAppEnv) {
                this.isInMiniApp = true;
                this.isFarcasterApp = true;
                console.log('✅ Farcaster SDK initialized successfully');

                // Получаем контекст приложения
                try {
                    this.context = await sdk.context;
                    console.log('📋 Farcaster context received');

                    // Безопасное получение данных пользователя
                    try {
                        const user = this.context.user;
                        console.log('👤 User info:', {
                            fid: user?.fid,
                            username: user?.username,
                            displayName: user?.displayName
                        });
                    } catch (userError) {
                        console.log('ℹ️ User data not immediately available');
                    }
                } catch (error) {
                    console.log('⚠️ Could not get context:', error.message);
                }

                await this.setupMiniAppFeatures();
            } else {
                console.log('⚠️ SDK reports not in Mini App environment');
            }
        } catch (error) {
            console.error('❌ Error initializing Farcaster SDK:', error);
            this.isInMiniApp = false;
        }
    }

    async waitForSDK() {
        let attempts = 0;
        const maxAttempts = 50; // 5 секунд

        while (attempts < maxAttempts) {
            if (window.sdk && typeof window.sdk.actions === 'object') {
                return window.sdk;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        throw new Error('SDK not loaded within timeout');
    }

    async setupMiniAppFeatures() {
        try {
            // Ждем готовности UI перед вызовом ready()
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    setTimeout(resolve, 500); // Даем время на рендеринг
                });
            });
            console.log('🎉 Mini App features setup complete');
        } catch (error) {
            console.error('Error setting up Mini App features:', error);
        }
    }

    // Вызываем ready когда игра полностью загружена
    async notifyAppReady() {
        if (this.isInMiniApp && this.sdk && this.sdk.actions && this.sdk.actions.ready) {
            try {
                await this.sdk.actions.ready({
                    disableNativeGestures: false
                });
                console.log('🎉 Farcaster splash screen dismissed');
            } catch (error) {
                console.error('❌ Failed to dismiss splash screen:', error);
            }
        }
    }

    // Метод для шаринга результата игры
    async shareScore(score, level) {
        if (!this.isFarcasterApp || !this.sdk || !this.sdk.actions || !this.sdk.actions.composeCast) return;

        try {
            const text = `🚀 I just scored ${score || 0} points and reached level ${level || 1} in Flowers on Mars! Can you beat that? 👽💥`;
            const url = window.location.origin;

            await this.sdk.actions.composeCast({
                text: text,
                embeds: [url]
            });
        } catch (error) {
            console.error('Error sharing score:', error);
        }
    }

    // Получение информации о пользователе
    getUserInfo() {
        if (this.isFarcasterApp && this.context && this.context.user) {
            const user = this.context.user;
            return {
                fid: user.fid || null,
                username: user.username || null,
                displayName: user.displayName || null,
                pfpUrl: user.pfpUrl || null
            };
        }
        return null;
    }

    // Метод для доната через sendToken
    async sendDonation(amount = '1000000') { // По умолчанию 1 USDC
        if (!this.isFarcasterApp || !this.sdk || !this.sdk.actions || !this.sdk.actions.sendToken) {
            console.log('Farcaster SDK недоступен для доната');
            return { success: false, reason: 'sdk_unavailable' };
        }

        try {
            const result = await this.sdk.actions.sendToken({
                token: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
                amount: amount, // 1 USDC = 1000000 (6 decimals)
                recipientAddress: '0x7Ea45b01EECaE066f37500c92B10421937571f75'
            });

            if (result.success) {
                console.log('Донат успешно отправлен:', result.send.transaction);
                return result;
            } else {
                console.log('Ошибка при донате:', result.error);
                return result;
            }
        } catch (error) {
            console.error('Ошибка при отправке доната:', error);
            return { success: false, reason: 'send_failed', error: error.message };
        }
    }
}

// Глобальная инициализация
window.farcasterIntegration = new FarcasterIntegration();

console.log('FarcasterIntegration.js loaded');

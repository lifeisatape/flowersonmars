class ParticleManager {
    constructor(objectPool) {
        this.objectPool = objectPool;
    }

    createExplosion(x, y, config) {
        for (let i = 0; i < config.EXPLOSION_PARTICLE_COUNT; i++) {
            const particle = this.objectPool.create('particle');
            particle.x = x;
            particle.y = y;
            particle.velocityX = (Math.random() - 0.5) * config.EXPLOSION_PARTICLE_SPEED;
            particle.velocityY = (Math.random() - 0.5) * config.EXPLOSION_PARTICLE_SPEED;
            particle.color = `hsl(${Math.random() * 60 + 15}, 100%, 50%)`;
            particle.size = Math.random() * 5 + 2;
            particle.lifespan = config.EXPLOSION_PARTICLE_LIFESPAN;
        }
    }

    createSparks(x, y, config) {
        for (let i = 0; i < config.SPARK_PARTICLE_COUNT; i++) {
            const particle = this.objectPool.create('particle');
            particle.x = x;
            particle.y = y;
            particle.velocityX = (Math.random() - 0.5) * config.SPARK_PARTICLE_SPEED;
            particle.velocityY = (Math.random() - 0.5) * config.SPARK_PARTICLE_SPEED;
            particle.color = 'white';
            particle.size = Math.random() * 3 + 1;
            particle.lifespan = config.SPARK_PARTICLE_LIFESPAN;
        }
    }

    createMuzzleFlash(x, y, direction, config) {
        for (let i = 0; i < config.MUZZLE_FLASH_PARTICLE_COUNT; i++) {
            const particle = this.objectPool.create('particle');
            particle.x = x;
            particle.y = y;
            const speed = Math.random() * 2 + 1;
            particle.velocityX = Math.cos(direction) * speed;
            particle.velocityY = Math.sin(direction) * speed;
            particle.color = 'yellow';
            particle.size = Math.random() * 4 + 2;
            particle.lifespan = config.MUZZLE_FLASH_PARTICLE_LIFESPAN;
        }
    }

    createExplosiveEnemyExplosion(x, y, config) {
        // Создаем основной взрыв
        for (let i = 0; i < config.EXPLOSION_PARTICLE_COUNT * 2; i++) {
            const particle = this.objectPool.create('particle');
            particle.x = x;
            particle.y = y;
            const speed = Math.random() * config.EXPLOSION_PARTICLE_SPEED * 2;
            const angle = Math.random() * Math.PI * 2;
            particle.velocityX = Math.cos(angle) * speed;
            particle.velocityY = Math.sin(angle) * speed;
            particle.color = `hsl(${Math.random() * 60 + 15}, 100%, ${50 + Math.random() * 30}%)`;
            particle.size = Math.random() * 8 + 3;
            particle.lifespan = config.EXPLOSION_PARTICLE_LIFESPAN * 1.5;
        }

        // Создаем осколки
        this.createShrapnel(x, y, config);
        
        // Создаем дым
        this.createSmoke(x, y, config);
        
        // Создаем искры
        this.createExplosionSparks(x, y, config);
    }

    createShrapnel(x, y, config) {
        const shrapnelCount = 12;
        for (let i = 0; i < shrapnelCount; i++) {
            const particle = this.objectPool.create('particle');
            particle.x = x;
            particle.y = y;
            const angle = (i / shrapnelCount) * Math.PI * 2 + Math.random() * 0.5;
            const speed = Math.random() * 15 + 10;
            particle.velocityX = Math.cos(angle) * speed;
            particle.velocityY = Math.sin(angle) * speed;
            particle.color = '#444444';
            particle.size = Math.random() * 6 + 2;
            particle.lifespan = config.EXPLOSION_PARTICLE_LIFESPAN * 2;
            particle.gravity = 0.3; // Добавляем гравитацию для осколков
        }
    }

    createSmoke(x, y, config) {
        const smokeCount = 8;
        for (let i = 0; i < smokeCount; i++) {
            const particle = this.objectPool.create('particle');
            particle.x = x + (Math.random() - 0.5) * 20;
            particle.y = y + (Math.random() - 0.5) * 20;
            const speed = Math.random() * 3 + 1;
            const angle = Math.random() * Math.PI * 2;
            particle.velocityX = Math.cos(angle) * speed;
            particle.velocityY = Math.sin(angle) * speed - Math.random() * 2; // Дым поднимается вверх
            particle.color = `rgba(80, 80, 80, ${0.6 + Math.random() * 0.4})`;
            particle.size = Math.random() * 12 + 8;
            particle.lifespan = config.EXPLOSION_PARTICLE_LIFESPAN * 3;
            particle.expandRate = 0.1; // Дым расширяется
        }
    }

    createExplosionSparks(x, y, config) {
        const sparkCount = 20;
        for (let i = 0; i < sparkCount; i++) {
            const particle = this.objectPool.create('particle');
            particle.x = x;
            particle.y = y;
            const speed = Math.random() * 20 + 5;
            const angle = Math.random() * Math.PI * 2;
            particle.velocityX = Math.cos(angle) * speed;
            particle.velocityY = Math.sin(angle) * speed;
            particle.color = Math.random() > 0.5 ? '#FFD700' : '#FFA500';
            particle.size = Math.random() * 3 + 1;
            particle.lifespan = config.EXPLOSION_PARTICLE_LIFESPAN * 0.8;
        }
    }

    update(deltaTime) {
        const particles = this.objectPool.getActiveObjects('particle');
        for (const particle of particles) {
            particle.update(deltaTime);
            if (!particle.isActive()) {
                this.objectPool.release('particle', particle);
            }
        }
    }

    draw(context, camera) {
        const particles = this.objectPool.getActiveObjects('particle');
        for (const particle of particles) {
            if (camera.inView(particle)) {
                particle.draw(context);
            }
        }
    }
}

console.log('Updated ParticleManager.js loaded');
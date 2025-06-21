class ObjectPool {
    constructor() {
        this.pools = new Map();
        this.objectTypes = new Map();
    }

    registerType(typeName, classConstructor, initialPoolSize = 0) {
        this.objectTypes.set(typeName, classConstructor);
        this.pools.set(typeName, {
            active: new Set(),
            inactive: []
        });

        for (let i = 0; i < initialPoolSize; i++) {
            this.pools.get(typeName).inactive.push(new classConstructor());
        }
    }

    create(typeName, ...args) {
        if (!this.objectTypes.has(typeName)) {
            throw new Error(`Unregistered object type: ${typeName}`);
        }

        const pool = this.pools.get(typeName);
        let object;

        if (pool.inactive.length > 0) {
            object = pool.inactive.pop();
            if (typeof object.init === 'function') {
                object.init(...args);
            }
        } else {
            const Constructor = this.objectTypes.get(typeName);
            object = new Constructor(...args);
        }

        pool.active.add(object);
        return object;
    }

    release(typeName, object) {
        const pool = this.pools.get(typeName);
        if (!pool) {
            throw new Error(`No pool for object type: ${typeName}`);
        }

        pool.active.delete(object);
        if (typeof object.reset === 'function') {
            object.reset();
        }
        pool.inactive.push(object);
    }

    releaseAll(typeName) {
        const pool = this.pools.get(typeName);
        if (!pool) {
            console.warn(`No pool for object type: ${typeName}`);
            return;
        }

        pool.active.forEach(object => {
            if (typeof object.reset === 'function') {
                object.reset();
            }
            pool.inactive.push(object);
        });
        pool.active.clear();
    }

    getActiveObjects(typeName) {
        const pool = this.pools.get(typeName);
        return pool ? Array.from(pool.active) : [];
    }

    clear(typeName) {
        if (typeName) {
            this.pools.delete(typeName);
            this.objectTypes.delete(typeName);
        } else {
            this.pools.clear();
            this.objectTypes.clear();
        }
    }
}

console.log('Updated and fixed ObjectPool.js loaded');
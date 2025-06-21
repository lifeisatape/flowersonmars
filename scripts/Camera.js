class Camera {
    constructor(width, height, mapWidth, mapHeight) {
        this.width = width;
        this.height = height;
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.x = 0;
        this.y = 0;
        this.zoom = ShooterConfig.CAMERA.DEFAULT_ZOOM;
        this.targetZoom = ShooterConfig.CAMERA.DEFAULT_ZOOM;
    }

    follow(target, deltaTime) {
        const targetX = target.x - this.width / (2 * this.zoom);
        const targetY = target.y - this.height / (2 * this.zoom);

        this.x += (targetX - this.x) * 0.1;
        this.y += (targetY - this.y) * 0.1;

        const playerSpeed = Math.sqrt(target.velocityX ** 2 + target.velocityY ** 2);

        if (playerSpeed > ShooterConfig.CAMERA.MOVEMENT_THRESHOLD) {
            this.targetZoom = ShooterConfig.CAMERA.MAX_ZOOM;
        } else {
            this.targetZoom = ShooterConfig.CAMERA.DEFAULT_ZOOM;
        }

        this.zoom += (this.targetZoom - this.zoom) * ShooterConfig.CAMERA.ZOOM_SPEED * deltaTime;

        this.clampToMap();
    }

    clampToMap() {
        const zoomedWidth = this.width / this.zoom;
        const zoomedHeight = this.height / this.zoom;

        this.x = Math.max(0, Math.min(this.x, this.mapWidth - zoomedWidth));
        this.y = Math.max(0, Math.min(this.y, this.mapHeight - zoomedHeight));
    }

    inView(object) {
        const zoomedWidth = this.width / this.zoom;
        const zoomedHeight = this.height / this.zoom;

        return (
            object.x + object.width >= this.x &&
            object.x <= this.x + zoomedWidth &&
            object.y + object.height >= this.y &&
            object.y <= this.y + zoomedHeight
        );
    }

    applyToContext(context) {
        context.save();
        context.scale(this.zoom, this.zoom);
        context.translate(-this.x, -this.y);
    }

    restoreContext(context) {
        context.restore();
    }
}

console.log('Camera.js обновлен с новой функциональностью зума');
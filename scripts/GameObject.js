class GameObject {
    constructor(x, y, width, height, color) {
        this.x = x || 0;
        this.y = y || 0;
        this.width = width || 0;
        this.height = height || 0;
        this.color = color || 'white';
        this.velocityX = 0;
        this.velocityY = 0;
        this.active = true;
    }

    draw(context) {
        context.fillStyle = this.color;
        context.fillRect(this.x, this.y, this.width, this.height);
    }

    update() {
        this.x += this.velocityX;
        this.y += this.velocityY;
    }

    isActive() {
        return this.active;
    }

    reset() {
        this.active = true;
        this.velocityX = 0;
        this.velocityY = 0;
    }

    collidesWith(otherObject) {
        return (
            this.x < otherObject.x + otherObject.width &&
            this.x + this.width > otherObject.x &&
            this.y < otherObject.y + otherObject.height &&
            this.y + this.height > otherObject.y
        );
    }
}

console.log('GameObject.js загружен');
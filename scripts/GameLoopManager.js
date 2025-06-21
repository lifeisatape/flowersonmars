class GameLoopManager {
  constructor(game, targetFPS = 120) {
      this.game = game;
      this.targetFPS = targetFPS;
      this.frameInterval = 1000 / this.targetFPS;
      this.lastFrameTime = 0;
      this.accumulatedTime = 0;
      this.lastFpsUpdateTime = 0;
      this.framesThisSecond = 0;
      this.currentFPS = 0;
      this.animationFrameId = null;
      this.isRunning = false;
  }

  start() {
      if (!this.isRunning) {
          this.isRunning = true;
          this.lastFrameTime = performance.now();
          this.gameLoop(this.lastFrameTime);
      }
  }

  stop() {
      this.isRunning = false;
      if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
          this.animationFrameId = null;
      }
  }

  gameLoop(currentTime) {
      if (!this.isRunning) return;

      this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));

      const deltaTime = currentTime - this.lastFrameTime;
      this.accumulatedTime += deltaTime;

      while (this.accumulatedTime >= this.frameInterval) {
          this.game.update(this.frameInterval / 1000);
          this.accumulatedTime -= this.frameInterval;
      }

      this.game.draw();

      this.lastFrameTime = currentTime;

      // FPS calculation
      this.framesThisSecond++;
      if (currentTime > this.lastFpsUpdateTime + 1000) {
          this.currentFPS = this.framesThisSecond;
          this.framesThisSecond = 0;
          this.lastFpsUpdateTime = currentTime;
      }
  }

  setTargetFPS(fps) {
      this.targetFPS = fps;
      this.frameInterval = 1000 / this.targetFPS;
  }

  getCurrentFPS() {
      return this.currentFPS;
  }
}

console.log('GameLoopManager.js loaded');
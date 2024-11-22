import { stageItems, variables } from ".";
import { renderBeautifulScoreDisplay } from "./beautiful-score-display";
import { Enemy, getEnemyFromCache } from "./enemies";
import { SlidingText } from "./sliding-text";
import { millisecondsToTime } from "./utilities";

/**
 * Renders the game data according to cached data from client-side.
 * This should be overwritten by server data.
 */
function render(elapsedMilliseconds: number) {
  /**
   * Updates the shown client-side `Enemy`s.
   */
  function renderEnemies() {
    // enemies
    let enemiesDrawn = Enemy.enemiesDrawn;
    for (let enemyID of enemiesDrawn) {
      let enemy = getEnemyFromCache(enemyID);
      if (typeof enemy !== "undefined") {
        let age = Date.now() - enemy.creationTime;
        const speed = variables.currentGameClientSide.enemySpeedCoefficient;
        enemy.reposition(1 - enemy.speed * speed * (age / 1000));
      }
    }
  }

  /**
   * Updates the shown client-side statistics.
   */
  function renderStatistics() {
    variables.currentGameClientSide.totalElapsedMilliseconds +=
      elapsedMilliseconds;
    variables.currentGameClientSide.timeSinceLastEnemyKill +=
      elapsedMilliseconds;
    // time elapsed
    stageItems.textSprites.elapsedTimeText.text = millisecondsToTime(
      variables.currentGameClientSide.totalElapsedMilliseconds
    );
    // base health
    stageItems.textSprites.baseHealthText.text = `♥️ ${variables.currentGameClientSide.baseHealth.toFixed(
      3
    )}`;
    // enemies killed (per second)
    stageItems.textSprites.enemiesText.text = `Enemy Kills: ${variables.currentGameClientSide.enemiesKilled.toLocaleString(
      "en-US"
    )} ≈ ${(
      (variables.currentGameClientSide.enemiesKilled /
        variables.currentGameClientSide.totalElapsedMilliseconds) *
      1000
    ).toFixed(3)}/s`;
    // combo text fading
    stageItems.textSprites.comboText.alpha = Math.max(
      0,
      1 -
        variables.currentGameClientSide.timeSinceLastEnemyKill /
          variables.currentGameClientSide.comboTime
    );
    // input
    stageItems.textSprites.inputText.text =
      variables.currentGameClientSide.currentInput.replaceAll("-", "−");
  }

  /**
   * Updates the rendering of the `SlidingText`s.
   */
  function renderSlidingTexts() {
    const slidingTexts = SlidingText.slidingTexts.filter(
      (element) => element.rendering
    );
    for (const slidingText of slidingTexts) {
      slidingText.timeSinceFirstRender += elapsedMilliseconds;
      const point = slidingText.slideBezier.calculatePoint(
        slidingText.timeSinceFirstRender
      );
      const opacity = slidingText.fadeBezier.calculatePoint(
        slidingText.timeSinceFirstRender
      ).y;
      slidingText.textSprite.x = point.x;
      slidingText.textSprite.y = point.y;
      slidingText.textSprite.alpha = opacity;
      if (slidingText.duration < slidingText.timeSinceFirstRender) {
        slidingText.delete();
      }
    }
  }

  renderEnemies();
  renderSlidingTexts();
  renderStatistics();

  // beautiful score display
  if (variables.settings.beautifulScore === "on") {
    variables.currentGameClientSide.beautifulScoreDisplayProgress +=
      elapsedMilliseconds;
    renderBeautifulScoreDisplay();
  } else {
    const score = variables.currentGameClientSide.shownScore;
    stageItems.textSprites.scoreText.text =
      parseInt(score).toLocaleString("en-US") || "0";
  }
}

/**
 * Resets the `variables`' client-side data.
 */
function resetClientSideVariables() {
  variables.currentGameClientSide.totalElapsedMilliseconds = 0;
  variables.currentGameClientSide.baseHealth = 100;
  variables.currentGameClientSide.enemiesKilled = 0;
  variables.currentGameClientSide.enemySpeedCoefficient = 1;
  variables.currentGameClientSide.shownScore = 0;
  variables.currentGameClientSide.beautifulScoreDisplayGoal = 0;
  variables.currentGameClientSide.beautifulScoreDisplayProgress = 0;
  variables.currentGameClientSide.beautifulScoreDisplayPrevious = 0;
}

/**
 * Sets client side rendering.
 * TODO: Change this to a loop w/ allowed values
 */
function setClientSideRendering(data: { [key: string]: any }) {
  if (data.baseHealth) {
    variables.currentGameClientSide.baseHealth = parseFloat(data.baseHealth);
  }
}

export { render, resetClientSideVariables, setClientSideRendering };

import {
  stage,
  stageItems,
  app,
  ExtendedSprite,
  ExtendedText,
  socket
} from "./index";
import * as enemies from "./enemies";
import { POLICY, Size, getScaledRect } from "adaptive-scale/lib-esm";
import { Sprite, Texture } from "pixi.js";

// TODO: Might change later
const OPTIMAL_SCREEN_WIDTH: number = window.screen.width;
const OPTIMAL_SCREEN_HEIGHT: number = window.screen.height;
const OPTIMAL_SCREEN_RATIO: number =
  OPTIMAL_SCREEN_WIDTH / OPTIMAL_SCREEN_HEIGHT;

// TODO: Change `any` to something else.
function renderGameData(data: { [key: string]: any }) {
  // clear screen first

  for (let enemy of data.enemies) {
    enemies.rerenderEnemy(enemy.id, enemy.sPosition);
  }
}

function redrawStage() {
  let scaleOptions = {
    container: new Size(window.innerWidth, window.innerHeight),
    target: new Size(app.stage.width, app.stage.height),
    policy: POLICY.ShowAll
  };
  let newPosition = getScaledRect(scaleOptions);

  app.stage.x = newPosition.x;
  app.stage.y = newPosition.y;
  app.stage.width = newPosition.width;
  app.stage.height = newPosition.height;
}

function repositionStageItems() {
  for (let item in stageItems) {
  }
}

window.onresize = () => {
  redrawStage();
};

export { renderGameData };

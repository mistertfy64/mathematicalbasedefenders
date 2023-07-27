import * as universal from "../universal";
import { log } from "./log";
import { Room } from "../game/Room";
import { User, UserInterface } from "../models/User";
import _ from "lodash";
// Highest comes first
const RANK_ORDER = [
  ["Developer", "isDeveloper"],
  ["Administrator", "isAdministrator"],
  ["Moderator", "isModerator"],
  ["Contributor", "isContributor"],
  ["Tester", "isTester"],
  ["Donator", "isDonator"]
];

const SINGLEPLAYER_CUSTOM_SETTINGS_BOUNDARIES: { [key: string]: any } = {
  baseHealth: {
    type: "number",
    minimum: 1,
    maximum: 10000 * 10
  },
  comboTime: {
    type: "number",
    minimum: 0,
    maximum: 60 * 60 * 1000
  },
  enemySpeedCoefficient: {
    type: "number",
    minimum: 1,
    maximum: 50
  },
  enemySpawnTime: {
    type: "number",
    minimum: 0,
    maximum: 60 * 1000
  },
  enemySpawnChance: {
    type: "number",
    minimum: 0,
    maximum: 1
  },
  forcedEnemySpawnTime: {
    type: "number",
    minimum: 0,
    maximum: 60 * 1000
  }
};

function checkIfPropertyWithValueExists(
  dataset: unknown,
  targetProperty: string,
  targetValue: string
) {
  if (Array.isArray(dataset)) {
    for (let i = 0; i < dataset.length; i++) {
      try {
        if (dataset[i][targetProperty] === targetValue) {
          return true;
        }
        // TODO: this is temporary failsafe
      } catch (error: any) {
        log.error(error.stack);
        return false;
      }
    }
  }
  return false;
}

function findGameDataWithConnectionID(connectionID: string, room?: Room) {
  // if room is defined, function jumps to finding game data from that room.
  if (!room) {
    log.warn(
      "Finding game data for a connection ID with an unknown room is not supported yet."
    );
    return null;
  }
  for (let gameData of room.gameData) {
    if (gameData.ownerConnectionID === connectionID) {
      return gameData;
    }
  }
  return null;
}

function generateRankingText(rankingData: Array<any>) {
  let reversed = rankingData.reverse();
  let result = "";
  for (let record of reversed) {
    result += `#${record.placement} ${record.name} ${record.time}ms ${record.sent}S/${record.received}R`;
    result += `<br>`;
  }
  return result;
}

function findRoomWithConnectionID(
  connectionID: string | undefined,
  countSpectatorsToo?: boolean
) {
  if (typeof connectionID === "undefined") {
    return null;
  }
  for (let room in universal.rooms) {
    if (countSpectatorsToo) {
      if (
        universal.rooms[room].memberConnectionIDs.indexOf(connectionID) > -1 ||
        universal.rooms[room].spectatorConnectionIDs.indexOf(connectionID) > -1
      ) {
        return universal.rooms[room];
      }
    } else {
      if (
        universal.rooms[room].memberConnectionIDs.indexOf(connectionID) > -1
      ) {
        return universal.rooms[room];
      }
    }
  }
  return null;
}
function millisecondsToTime(milliseconds: number) {
  let m = Math.floor(milliseconds / 60000);
  let s = Math.floor((milliseconds % 60000) / 1000)
    .toString()
    .padStart(2, "0");
  let ms = Math.floor((milliseconds % 60000) % 1000)
    .toString()
    .padStart(3, "0");
  return `${m}:${s}.${ms}`;
}

function getRank(data: UserInterface | string | undefined) {
  if (typeof data === "undefined") {
    return { title: "", color: "#ffffff" };
  }
  if (typeof data === "string") {
    // ...
    return "";
  }
  // TODO: Refactor this stupid thing already
  if (data.membership.isDeveloper) {
    return { title: "Developer", color: "#ff0000" };
  }
  if (data.membership.isAdministrator) {
    return { title: "Administrator", color: "#da1717" };
  }
  if (data.membership.isModerator) {
    return { title: "Moderator", color: "#ff7f00" };
  }
  if (data.membership.isContributor) {
    return { title: "Contributor", color: "#01acff" };
  }
  if (data.membership.isTester) {
    return { title: "Tester", color: "#5bb1e0" };
  }
  if (data.membership.isDonator) {
    return { title: "Donator", color: "#26e02c" };
  }
  // No rank
  return { title: "", color: "#ffffff" };
}

// adapted from https://stackoverflow.com/a/56294043/11855065
function mutatedArrayFilter(array: Array<unknown>, callback: Function) {
  for (let i = array.length - 1; i >= 0; i -= 1) {
    if (!callback(array[i])) array.splice(i, 1);
  }
}

function generatePlayerListText(connections: Array<string>) {
  let text = "";
  for (let connection of connections) {
    let socket = universal.getSocketFromConnectionID(connection);
    let color = socket?.playerRank?.color || "#ffffff";
    let name = universal.getNameFromConnectionID(connection);
    text += `<span style="color:${color};">${name}</span>`;
    text += "<br>";
  }
  return text;
}

function validateCustomGameSettings(
  mode: string,
  settings: { [key: string]: string }
) {
  if (mode !== "singleplayer") {
    return {
      success: false,
      reason: `Unknown mode: ${mode}`
    };
  }
  let ok = true;
  let errors = [];
  for (let key in settings) {
    let restriction = SINGLEPLAYER_CUSTOM_SETTINGS_BOUNDARIES[key];
    // FIXME: as any unsafe
    let parsedValue = !isNaN(settings[key] as any)
      ? parseFloat(settings[key])
      : settings[key];
    if (typeof parsedValue !== restriction.type) {
      errors.push(
        `Wrong type in ${key}: got ${typeof parsedValue}, but expected ${
          restriction.type
        }`
      );
      ok = false;
      continue;
    }
    // check numbers
    if (restriction.type === "number") {
      if (
        !(
          parsedValue >= restriction.minimum &&
          parsedValue <= restriction.maximum
        )
      ) {
        errors.push(
          `Value too high or too low in ${key}: got ${parsedValue}, but only allowed a number between ${restriction.minimum} and ${restriction.maximum}, inclusive.`
        );
        ok = false;
        continue;
      }
    }
  }
  if (!ok) {
    log.warn(
      `Unable to start custom singleplayer game for a socket: ${errors.join(
        " "
      )}`
    );
    return {
      success: false,
      reason: `Error: ${errors.join(" ")}`
    };
  }
  return {
    success: ok
  };
}

function minifySelfGameData(gameData: { [key: string]: any }) {
  // delete unnecessary keys
  delete gameData.clocks.enemySpawn;
  delete gameData.clocks.forcedEnemySpawn;
  delete gameData.enemySpawnThreshold;
  delete gameData.enemySpeedCoefficient;
  delete gameData.totalEnemiesReceived;
  delete gameData.totalEnemiesSent;
  // minify enemies
  for (let enemy in gameData.enemies) {
    // delete unnecessary keys
    delete gameData.enemies[enemy].requestedValue;
    // round off values
    gameData.enemies[enemy].xPosition = parseFloat(
      gameData.enemies[enemy].xPosition.toFixed(3)
    );
    gameData.enemies[enemy].sPosition = parseFloat(
      gameData.enemies[enemy].sPosition.toFixed(3)
    );
  }
}

export {
  checkIfPropertyWithValueExists,
  findRoomWithConnectionID,
  findGameDataWithConnectionID,
  millisecondsToTime,
  getRank,
  generateRankingText,
  mutatedArrayFilter,
  generatePlayerListText,
  validateCustomGameSettings,
  minifySelfGameData
};

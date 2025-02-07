import { log } from "./log";
import * as universal from "../universal";
import { findRoomWithConnectionID } from "./utilities";
import { Room } from "../game/Room";
//
const createDOMPurify = require("dompurify");
const { JSDOM } = require("jsdom");
const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);
//
const badMessageObject = {
  message: "changeText",
  selector: "#chat-tray-error",
  value: "Message not sent: Bad chat validation."
};
const clearBadMessageObject = {
  message: "changeText",
  selector: "#chat-tray-error",
  value: ""
};
/**
 * Attempts to send a chat message to a room.
 * @param {string} scope the scope/visibility of the message
 * @param {string} message the message
 * @param {universal.GameSocket} socket the socket of the message sender.
 */
function attemptToSendChatMessage(
  scope: string,
  message: string,
  socket: universal.GameSocket
) {
  const connectionID = socket.connectionID;
  if (!connectionID) {
    log.warn(`Socket has no ID.`);
    return;
  }
  const playerName = universal.getNameFromConnectionID(connectionID);
  switch (scope) {
    case "room": {
      const roomID = findRoomWithConnectionID(connectionID, true)?.id;
      if (typeof roomID === "undefined") {
        log.warn(
          `Room Undefined found for Socket ID ${connectionID} (${playerName}) when validating chat message.`
        );
        return;
      }
      const roomIndex = universal.rooms.findIndex(
        (element) => element.id === roomID
      );
      if (roomIndex === -1) {
        log.warn(
          `Room doesn't exist for Socket ID ${connectionID} (${playerName}) when validating chat message.`
        );
        return;
      }
      if (!validateMessage(message, connectionID)) {
        log.warn(`Bad chat validation for ${connectionID} (${playerName})`);
        return;
      }
      const room = findRoomWithConnectionID(connectionID, true) as Room;
      room.addChatMessage(message, playerName || "");
      log.info(
        `Socket ID ${connectionID} (${playerName}) sent message ${message} to Room ID ${room.id}`
      );
      break;
    }
    case "global": {
      if (!validateMessage(message, connectionID)) {
        log.warn(`Bad chat validation for ${connectionID} (${playerName})`);
        socket.send(JSON.stringify(badMessageObject));
        return;
      }
      const messageObject = createGlobalMessageObject(
        message,
        connectionID,
        socket?.playerRank?.color
      );
      socket.publish("game", JSON.stringify(messageObject));
      socket.send(JSON.stringify(messageObject));
      socket.send(JSON.stringify(clearBadMessageObject));
      log.info(
        `Socket ID ${connectionID} (${playerName}) sent message ${message} to global chat.`
      );
      break;
    }
    default: {
      log.warn(
        `Unknown chat message scope: ${scope} from Socket ID ${connectionID} (${playerName})`
      );
      break;
    }
  }
}

/**
 * Validates a chat message whether its safe or the room it is meant to be send to exists.
 * @param {string} message The message to validate.
 * @param {string} connectionID The connectionID socket of the sender.
 * @returns `true` if the message passed validation, false if not.
 */
function validateMessage(message: string, connectionID: string) {
  const playerName = universal.getNameFromConnectionID(connectionID);
  const notEmpty = message !== "";
  const notJustBlank = message.replace(/\s/g, "").length > 0;
  const notTooLong = message.length <= 256;
  const notDangerous = DOMPurify.sanitize(message) === message;
  if (!(notEmpty && notJustBlank && notTooLong && notDangerous)) {
    log.warn(
      `Chat message of Socket ID ${connectionID} (${playerName}) failed validation.`
    );
    return false;
  }
  return true;
}

function createGlobalMessageObject(
  message: string,
  connectionID: string,
  senderColor: string | undefined,
  attribute?: string
) {
  const playerName = universal.getNameFromConnectionID(connectionID);
  const toReturn = {
    message: "addChatMessage",
    data: {
      sender: playerName,
      message: {
        sender: playerName,
        message: message
      },
      attribute: attribute ?? "",
      location: "#chat-tray-message-container",
      senderColor: senderColor ?? "#ffffff"
    }
  };
  return toReturn;
}
export { attemptToSendChatMessage };

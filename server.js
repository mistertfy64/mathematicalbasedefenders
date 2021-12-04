
const http = require("http");
const util = require("util");
// express.js
const express = require("express");
const app = express();
app.use(express.static("public"));

// socket.io
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// mongoose
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// bcrypt
const bcrypt = require("bcrypt");

// lzstring
const LZString = require("lz-string");

// anti xss
const xss = require("xss");

// other files
const credentials = require("./credentials/credentials.js");
const game = require("./server/game.js");
const utilities = require("./server/utilities.js");

const schemas = require("./server/core/schemas.js");

const tile = require("./server/game/tile.js");

// other stuff
const PORT = 8000;
const DESIRED_UPDATES_PER_SECOND = 60;
const LOOP_INTERVAL = 1000 / DESIRED_UPDATES_PER_SECOND;

const LOG_DATA_SENT = false;

// variables
var sockets = [];
var rooms = {};

var roomIDOfDefaultMultiplayerRoom = "";

const roomTypes = {
	SINGLEPLAYER: "singleplayer",
	DEFAULT_MULTIPLAYER: "defaultMultiplayer",
	MULTIPLAYER: "multiplayer",
};

const modes = {
	SINGLEPLAYER: "singleplayer",
	DEFAULT_MULTIPLAYER: "defaultMultiplayer",
	MULTIPLAYER: "multiplayer",
};

const playerRanks = {
	GAME_MASTER: "gameMaster",
	DEVELOPER: "developer",
	ADMINISTRATOR: "administrator",
	MODERATOR: "moderator",
	CONTRIBUTOR: "contributor",
	TESTER: "tester",
	DONATOR: "donator",
};

// Loop variables
var currentTime = Date.now();
var deltaTime = Date.now();
var lastUpdateTime = Date.now();

mongoose.connect(credentials.getMongooseURI(), { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false });

mongoose.connection.on("connected", () => {
	console.log("Successfully connected to mongoose.");
});

app.get("/", (request, response) => {
	response.sendFile(__dirname + "/index.html");
});

var timeSinceLastTimeStatsPrintedInMilliseconds = 0;
var dataSentWithoutCompression = 0;
var dataSentWithCompression = 0;

var usersCurrentlyAttemptingToLogIn = [];
var guests = [];

function update(deltaTime) {
	timeSinceLastTimeStatsPrintedInMilliseconds += deltaTime;
	var activeRoomIDs = Object.keys(rooms);
	// console.log("Rooms: " + activeRoomIDs.length);
	if (LOG_DATA_SENT && timeSinceLastTimeStatsPrintedInMilliseconds >= 1000) {
		console.log(dataSentWithCompression + " bytes sent (" + dataSentWithoutCompression + " bytes sent without compression)");
		timeSinceLastTimeStatsPrintedInMilliseconds -= 1000;
		dataSentWithCompression = 0;
		dataSentWithoutCompression = 0;
	}
	for (var roomID of activeRoomIDs) {
		if (roomID.length == 8) {
			// room is default multiplayer room
			if (roomID == roomIDOfDefaultMultiplayerRoom) {
				if (!rooms[roomID].playing && !rooms[roomIDOfDefaultMultiplayerRoom].readyToStart && Object.keys(rooms[roomIDOfDefaultMultiplayerRoom].playersInRoom).length >= 2) {
					rooms[roomIDOfDefaultMultiplayerRoom].readyToStart = true;
					rooms[roomIDOfDefaultMultiplayerRoom].timeToStart = new Date(Date.now() + 30000);
				} else if (!rooms[roomID].playing && rooms[roomIDOfDefaultMultiplayerRoom].readyToStart && Object.keys(rooms[roomIDOfDefaultMultiplayerRoom].playersInRoom).length <= 1) {
					rooms[roomIDOfDefaultMultiplayerRoom].readyToStart = false;
					rooms[roomIDOfDefaultMultiplayerRoom].timeToStart = "";
				}

				if (rooms[roomIDOfDefaultMultiplayerRoom].readyToStart && !rooms[roomID].playing) {
					let timeLeft = rooms[roomIDOfDefaultMultiplayerRoom].timeToStart - Date.now();
					if (timeLeft <= 0) {
						rooms[roomIDOfDefaultMultiplayerRoom].readyToStart = false;
						startDefaultMultiplayerGame();
					} else {
						io.to(roomIDOfDefaultMultiplayerRoom).emit("defaultMultiplayerRoomAction", "updateStatusText", ["Game starting in " + Math.floor(timeLeft / 1000).toString() + " seconds."]);
					}
				} else {
					io.to(roomIDOfDefaultMultiplayerRoom).emit("defaultMultiplayerRoomAction", "updateStatusText", [rooms[roomID].playing ? "Game in progress." : "Waiting for 2 or more players."]);
				}
			}

			// room is playing
			if (rooms[roomID].playing) {
				// dataSentWithoutCompression += new TextEncoder().encode(JSON.stringify(rooms[roomID].data)).length;
				// dataSentWithCompression += new TextEncoder().encode(LZString.compressToUTF16(JSON.stringify(rooms[roomID].data))).length;

				if (rooms[roomID].type == "singleplayer") {
					game.computeUpdate(rooms[roomID], deltaTime);
					io.to(roomID).emit("currentGameData", LZString.compressToUTF16(JSON.stringify(rooms[roomID].data)));
					// why?
					for (let enemy in rooms[roomID].data.currentGame.enemiesOnField) {
						if (rooms[roomID].data.currentGame.enemiesOnField[enemy].toDestroy) {
							delete rooms[roomID].data.currentGame.enemiesOnField[enemy];
						}
					}
				} else if (rooms[roomID].type == "defaultMultiplayer") {
					game.computeUpdate(rooms[roomID], deltaTime);
					let connections = io.sockets.adapter.rooms.get(roomID);
					if (connections) {
						for (let client of connections) {
							// why?
							let connection = io.sockets.sockets.get(client);
							if (rooms[roomID].data.currentGame.players[connection.id]) {
								if (connection.ownerOfSocketIsPlaying) {
									if (!rooms[roomID].data.currentGame.players[connection.id].currentGame.dead) {
										connection.emit("currentGameData", LZString.compressToUTF16(JSON.stringify(constructDefaultMultiplayerGameDataObjectToSend(connection))));
									} else {
										let data = constructDefaultMultiplayerGameDataObjectToSend(connection);
										data.currentGame.rank = rooms[roomID].data.currentGame.playersAlive.length;
										connection.emit("currentGameData", LZString.compressToUTF16(JSON.stringify(data)));
										connection.ownerOfSocketIsPlaying = false;
										rooms[roomID].data.currentGame.playersAlive.splice(rooms[roomID].data.currentGame.playersAlive.indexOf(connection.id), 1);
									}
								}

								for (let enemy in rooms[roomID].data.currentGame.players[connection.id].currentGame.enemiesOnField) {
									if (rooms[roomID].data.currentGame.players[connection.id].currentGame.enemiesOnField[enemy].toDestroy) {
										delete rooms[roomID].data.currentGame.players[connection.id].currentGame.enemiesOnField[enemy];
									}
								}

								if (rooms[roomID].data.currentGame.playersAlive.length <= 1) {
									if (rooms[roomID].data.currentGame.playersAlive.length == 1) {
										let winnerSocket = io.sockets.sockets.get(rooms[roomID].data.currentGame.playersAlive[0]);
										let data = constructDefaultMultiplayerGameDataObjectToSend(winnerSocket);
										data.currentGame.rank = rooms[roomID].data.currentGame.playersAlive.length;
										data.currentGame.dead = true;
										winnerSocket.emit("currentGameData", LZString.compressToUTF16(JSON.stringify(data)));
										winnerSocket.ownerOfSocketIsPlaying = false;
										rooms[roomID].data.currentGame.playersAlive = [];
									}
									rooms[roomIDOfDefaultMultiplayerRoom].readyToStart = true;
									rooms[roomIDOfDefaultMultiplayerRoom].timeToStart = new Date(Date.now() + 30000);
									rooms[roomIDOfDefaultMultiplayerRoom].playing = false;

									let connections = io.sockets.adapter.rooms.get(roomID);
									for (client in connections) {
										let connection = io.sockets.sockets.get(client);
										connection.ownerOfSocketIsPlaying = false;
									}
								}
							}
						}
					}
				}
			}
		}
		let connections = io.sockets.adapter.rooms.get(roomID);
		if (!connections) {
			if (roomID == roomIDOfDefaultMultiplayerRoom) {
				roomIDOfDefaultMultiplayerRoom = "";
			}
			delete rooms[roomID];
		}
	}
}

var loop = setInterval(() => {
	currentTime = Date.now();
	deltaTime = currentTime - lastUpdateTime;
	update(deltaTime);
	lastUpdateTime = Date.now();
}, LOOP_INTERVAL);

io.on("connection", (socket) => {
	sockets.push(socket);

	console.log("New connection! There are now " + sockets.length + " connections.");

	socket.playerDataOfSocketOwner; // use this

	socket.currentRoomSocketIsIn = "";
	socket.ownerOfSocketIsPlaying = false;
	socket.socketIsHostOfRoomItIsIn = false;
	socket.playerRank = "";
	socket.usernameOfSocketOwner;
	socket.userIDOfSocketOwner;
	socket.loggedIn = false;

	let toBeGuestName = utilities.generateGuestName();
	while (toBeGuestName in guests) {
		toBeGuestName = utilities.generateGuestName();
	}
	socket.guestNameOfSocketOwner = toBeGuestName;

	socket.playerData; // dont use this

	// disconnect
	socket.on("disconnect", () => {
		let roomToLeave = socket.currentRoomSocketIsIn;


		socket.leave(socket.currentRoomSocketIsIn);
		socket.currentRoomSocketIsIn = "";

		if (roomToLeave != undefined && roomToLeave == roomIDOfDefaultMultiplayerRoom && rooms[roomToLeave] !== undefined) {
			delete rooms[roomToLeave].playersInRoom[socket.id];

			io.to(roomToLeave).emit("defaultMultiplayerRoomAction", "updatePlayerList", [
				Object.keys(rooms[roomIDOfDefaultMultiplayerRoom].playersInRoom).map((player) => {
					if (rooms[roomIDOfDefaultMultiplayerRoom].playersInRoom[player].loggedIn) {
						return rooms[roomIDOfDefaultMultiplayerRoom].playersInRoom[player].usernameOfSocketOwner;
					} else {
						return rooms[roomIDOfDefaultMultiplayerRoom].playersInRoom[player].guestNameOfSocketOwner;
					}
				}),
			]);

			if (rooms[roomToLeave].playing) {
				rooms[roomToLeave].data.currentGame.players[socket.id].currentGame.dead = true;
			}
		}

		sockets.splice(sockets.indexOf(socket), 1);
		guests.splice(guests.indexOf(socket.guestNameOfSocketOwner), 1);
	});

	// input
	socket.on("keypress", async (code, playerTileKeybinds) => {
		if (socket.currentRoomSocketIsIn != "") {
			if (socket.ownerOfSocketIsPlaying) {
				if (code != "Escape") {
					switch (rooms[socket.currentRoomSocketIsIn].type) {
						case modes.SINGLEPLAYER: {
							if (socket.currentRoomSocketIsIn != "" && socket.socketIsHostOfRoomItIsIn) {
								game.forceSelectTileWithTermID(game.convertPressedKeyToTermID(code, playerTileKeybinds, rooms[socket.currentRoomSocketIsIn], socket), rooms[socket.currentRoomSocketIsIn], socket);
							}
							break;
						}
						case modes.DEFAULT_MULTIPLAYER: {
							if (socket.currentRoomSocketIsIn != "" && socket.ownerOfSocketIsPlaying) {
								game.forceSelectTileWithTermID(game.convertPressedKeyToTermID(code, playerTileKeybinds, rooms[socket.currentRoomSocketIsIn], socket), rooms[socket.currentRoomSocketIsIn], socket);
							}
							break;
						}
					}
				} else {
					// Escape
					socket.leave(socket.currentRoomSocketIsIn);
					socket.currentRoomSocketIsIn = "";
					socket.ownerOfSocketIsPlaying = false;
				}
			}
		}
	});

	// functions: main

	/**
	 * Authenticates the user.
	 */
	socket.on("authenticate", async (username, encodedPassword) => {
		username = xss(username);
		console.log("Log in attempt from " + username);

		if (!usersCurrentlyAttemptingToLogIn.includes(username)) {
			if (/^[a-zA-Z0-9]*$/g.test(username)) {
				decodedPassword = new Buffer.from(new Buffer.from(new Buffer.from(new Buffer.from(encodedPassword, "base64").toString(), "base64").toString(), "base64").toString(), "base64").toString();
				decodedPassword = xss(decodedPassword);
				socket.playerData = await schemas.getUserModel().findOne({ username: username });

				if (socket.playerData) {
					bcrypt.compare(decodedPassword, socket.playerData.hashedPassword, (passwordError, passwordResult) => {
						if (passwordError) {
							console.error(passwordError.stack);
							socket.emit("loginResult", username, false);
							usersCurrentlyAttemptingToLogIn.splice(usersCurrentlyAttemptingToLogIn.indexOf(username), 1);
						} else {
							if (passwordResult) {
								// Correct Password
								console.log("Correct password for " + username + "!");
								socket.usernameOfSocketOwner = socket.playerData.username;
								socket.userIDOfSocketOwner = socket.playerData["_id"];
								socket.emit("loginResult", username, true);
								usersCurrentlyAttemptingToLogIn.splice(usersCurrentlyAttemptingToLogIn.indexOf(username), 1);
								socket.loggedIn = true;
								socket.playerRank = getPlayerRank(socket.playerData);
							} else {
								console.log("Incorrect password for " + username + "!");
								socket.emit("loginResult", username, false);
								usersCurrentlyAttemptingToLogIn.splice(usersCurrentlyAttemptingToLogIn.indexOf(username), 1);
							}
						}
					});
				} else {
					console.log("User " + username + " not found!");
					socket.emit("loginResult", username, false);
					usersCurrentlyAttemptingToLogIn.splice(usersCurrentlyAttemptingToLogIn.indexOf(username), 1);
				}
			} else {
				console.log("User " + username + " not found!");
				socket.emit("loginResult", username, false);
				usersCurrentlyAttemptingToLogIn.splice(usersCurrentlyAttemptingToLogIn.indexOf(username), 1);
			}
		} else {
			console.log("User " + username + " is already trying to log in!");
			socket.emit("loginResult", username, false);
		}
	});

	/**
	 * Creates a singleplayer room.
	 */
	socket.on("createAndJoinSingleplayerRoom", async () => {
		if (socket.currentRoomSocketIsIn == "") {
			let roomID = undefined;
			while (roomID === undefined || roomID in rooms) {
				roomID = utilities.generateRoomID();
			}

			socket.currentRoomSocketIsIn = roomID;
			socket.socketIsHostOfRoomItIsIn = true;

			rooms[roomID] = {
				id: roomID,
				type: roomTypes.SINGLEPLAYER,
				host: socket,
				userIDOfHost: socket.userIDOfSocketOwner,
				playing: false,
				data: game.createNewSingleplayerGameData(modes.SINGLEPLAYER, roomID),
			};

			socket.join(roomID);
			initializeSingleplayerGame(rooms[socket.currentRoomSocketIsIn]);
			socket.ownerOfSocketIsPlaying = true;
			rooms[socket.currentRoomSocketIsIn].playing = true;
		} else {
			console.log("Socket is already in a room!");
		}
	});

	/**
	 * Creates or joins the default multiplayer room.
	 */
	socket.on("joinOrCreateDefaultMultiplayerRoom", async () => {
		if (socket.currentRoomSocketIsIn == "") {
			if (roomIDOfDefaultMultiplayerRoom == "") {
				let roomID = undefined;
				while (roomID === undefined || roomID in rooms) {
					roomID = utilities.generateRoomID();
				}

				socket.currentRoomSocketIsIn = roomID;
				roomIDOfDefaultMultiplayerRoom = roomID;
				socket.socketIsHostOfRoomItIsIn = false;

				rooms[roomID] = {
					id: roomID,
					type: roomTypes.DEFAULT_MULTIPLAYER,
					playing: false,
					data: {},
					readyToStart: false,
					timeToStart: "",

					playersInRoom: {},
				};

				socket.join(roomID);

				rooms[roomID].playersInRoom[socket.id] = socket;

				if (socket.usernameOfSocketOwner) {
					console.log(socket.usernameOfSocketOwner + " has joined the default multiplayer room! There are now " + Object.keys(rooms[roomIDOfDefaultMultiplayerRoom].playersInRoom).length + " players in the default room.");
				} else {
					console.log(socket.guestNameOfSocketOwner + " has joined the default multiplayer room! There are now " + Object.keys(rooms[roomIDOfDefaultMultiplayerRoom].playersInRoom).length + " players in the default room.");
				}

				io.to(roomIDOfDefaultMultiplayerRoom).emit("defaultMultiplayerRoomAction", "updatePlayerList", [
					Object.keys(rooms[roomIDOfDefaultMultiplayerRoom].playersInRoom).map((player) => {
						if (rooms[roomIDOfDefaultMultiplayerRoom].playersInRoom[player].loggedIn) {
							return rooms[roomIDOfDefaultMultiplayerRoom].playersInRoom[player].usernameOfSocketOwner;
						} else {
							return rooms[roomIDOfDefaultMultiplayerRoom].playersInRoom[player].guestNameOfSocketOwner;
						}
					}),
				]);
			} else {
				socket.currentRoomSocketIsIn = roomIDOfDefaultMultiplayerRoom;

				socket.join(roomIDOfDefaultMultiplayerRoom);
				rooms[roomIDOfDefaultMultiplayerRoom].playersInRoom[socket.id] = socket;

				if (socket.usernameOfSocketOwner) {
					console.log(socket.usernameOfSocketOwner + " has joined the default multiplayer room! There are now " + Object.keys(rooms[roomIDOfDefaultMultiplayerRoom].playersInRoom).length + " players in the default room.");
				} else {
					console.log(socket.guestNameOfSocketOwner + " has joined the default multiplayer room! There are now " + Object.keys(rooms[roomIDOfDefaultMultiplayerRoom].playersInRoom).length + " players in the default room.");
				}

				io.to(roomIDOfDefaultMultiplayerRoom).emit("defaultMultiplayerRoomAction", "updatePlayerList", [
					Object.keys(rooms[roomIDOfDefaultMultiplayerRoom].playersInRoom).map((player) => {
						if (rooms[roomIDOfDefaultMultiplayerRoom].playersInRoom[player].loggedIn) {
							return rooms[roomIDOfDefaultMultiplayerRoom].playersInRoom[player].usernameOfSocketOwner;
						} else {
							return rooms[roomIDOfDefaultMultiplayerRoom].playersInRoom[player].guestNameOfSocketOwner;
						}
					}),
				]);
			}
		} else {
			console.log("Socket is already in a room!");
		}
	});

	socket.on("leaveRoom", async () => {
		let roomToLeave = socket.currentRoomSocketIsIn;

		socket.leave(socket.currentRoomSocketIsIn);
		socket.currentRoomSocketIsIn = "";



		if (roomToLeave != undefined && roomToLeave == roomIDOfDefaultMultiplayerRoom && rooms[roomToLeave] !== undefined) {
			delete rooms[roomToLeave].playersInRoom[socket.id];
			io.to(roomToLeave).emit("defaultMultiplayerRoomAction", "updatePlayerList", [
				Object.keys(rooms[roomIDOfDefaultMultiplayerRoom].playersInRoom).map((player) => {
					if (rooms[roomIDOfDefaultMultiplayerRoom].playersInRoom[player].loggedIn) {
						return rooms[roomIDOfDefaultMultiplayerRoom].playersInRoom[player].usernameOfSocketOwner;
					} else {
						return rooms[roomIDOfDefaultMultiplayerRoom].playersInRoom[player].guestNameOfSocketOwner;
					}
				}),
			]);
			if (rooms[roomToLeave].playing) {
				rooms[roomToLeave].data.currentGame.players[socket.id].currentGame.dead = true;
			}
		
		}
	});

	socket.on("defaultMultiplayerRoomChatMessage", async (message) => {
		message = xss(message);
		if (socket.currentRoomSocketIsIn == roomIDOfDefaultMultiplayerRoom && message.replace(/\s/g, "").length) {
			io.to(roomIDOfDefaultMultiplayerRoom).emit("defaultMultiplayerRoomAction", "updateChatBox", [
				socket.loggedIn ? socket.usernameOfSocketOwner : socket.guestNameOfSocketOwner,
				message,
				formatPlayerName(socket.playerRank, socket.usernameOfSocketOwner),
			]);
		}
	});

	// functions: game

	/**
	 * Processes an action.
	 */
	socket.on("action", () => {
		if (socket.currentRoomSocketIsIn != "" && socket.socketIsHostOfRoomItIsIn) {
			rooms[socket.currentRoomSocketIsIn].data.currentGame.actionsPerformed++;
		}
	});

	/**
	 *
	 */
	socket.on("tileClick", (slot) => {
		if (slot % 1 == 0 && slot >= 0 && slot <= 48) {
			game.processTileClick(slot, rooms[socket.currentRoomSocketIsIn], socket);
		}
	});

	socket.on("sendProblem", () => {
		game.checkProblem(rooms[socket.currentRoomSocketIsIn], socket);
	});
});

function getPlayerRank(playerData) {
	if (playerData.username == "mistertfy64") {
		return playerRanks.GAME_MASTER;
	} else if (playerData.membership.isDeveloper) {
		return playerRanks.DEVELOPER;
	} else if (playerData.membership.isAdministrator) {
		return playerRanks.ADMINISTRATOR;
	} else if (playerData.membership.isModerator) {
		return playerRanks.MODERATOR;
	} else if (playerData.membership.isContributor) {
		return playerRanks.CONTRIBUTOR;
	} else if (playerData.membership.isTester) {
		return playerRanks.TESTER;
	} else if (playerData.membership.isDonator) {
		return playerRanks.DONATOR;
	}
}

function formatPlayerName(rank, username) {
	if (username === undefined || username == null) {
		return "#000000";
	}
	if (username == "mistertfy64") {
		return "special";
	} else if (rank == playerRanks.DEVELOPER) {
		return "#ff0000";
	} else if (rank == playerRanks.ADMINISTRATOR) {
		return "#ff0000";
	} else if (rank == playerRanks.MODERATOR) {
		return "#ff7f00";
	} else if (rank == playerRanks.CONTRIBUTOR) {
		return "#4070ff";
	} else if (rank == playerRanks.TESTER) {
		return "0194ff";
	} else if (rank == playerRanks.DONATOR) {
		return "#1dc444";
	}
	return "#000000";
}

function initializeSingleplayerGame(room) {
	for (let i = 0; i < 49; i++) {
		room.data.currentGame.tilesOnBoard[i] = new tile.Tile(game.generateRandomTileTermID(room), i, false, room.data.currentGame.tilesCreated + 1);
		room.data.currentGame.tilesCreated++;
	}
}

async function startDefaultMultiplayerGame(roomID) {
	let connections = io.sockets.adapter.rooms.get(roomIDOfDefaultMultiplayerRoom);

	rooms[roomIDOfDefaultMultiplayerRoom].data = {
		currentGame: {
			currentInGameTimeInMilliseconds: 0,
			enemyGenerationElapsedTimeCounterInMilliseconds: 0,
			globalEnemiesCreated: 0,
			timeElapsedSinceLastEnemyKillInMilliseconds: 0,
			framesRenderedSinceGameStart: 0,
			players: {},
			globalTileQueues: [],
			globalBagQuantities: [4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2],
			globalAvailableTermsIndexes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
		},
	};
	rooms[roomIDOfDefaultMultiplayerRoom].data.currentGame.globalTileQueues.push(game.generateMultiplayerTileQueue());
	rooms[roomIDOfDefaultMultiplayerRoom].data.currentGame.globalTileQueues.push(game.generateMultiplayerTileQueue());

	let playersAlive = [];

	for (let connection of connections) {
		io.sockets.sockets.get(connection).ownerOfSocketIsPlaying = true;

		let socket = io.sockets.sockets.get(connection);

		rooms[roomIDOfDefaultMultiplayerRoom].data.currentGame.players[connection] = {};
		rooms[roomIDOfDefaultMultiplayerRoom].data.currentGame.players[connection].currentGame = game.createNewDefaultMultiplayerRoomPlayerObject(socket);

		rooms[roomIDOfDefaultMultiplayerRoom].data.currentGame.players[connection].currentGame.mode = "defaultMultiplayer";
		rooms[roomIDOfDefaultMultiplayerRoom].data.currentGame.players[connection].currentGame.tilesCreated = 0;
		for (let i = 0; i < 49; i++) {
			rooms[roomIDOfDefaultMultiplayerRoom].data.currentGame.players[connection].currentGame.tilesOnBoard[i] = new tile.Tile(
				rooms[roomIDOfDefaultMultiplayerRoom].data.currentGame.globalTileQueues[0][i],
				i,
				false,
				rooms[roomIDOfDefaultMultiplayerRoom].data.currentGame.players[connection].currentGame.tilesCreated + 1
			);
			rooms[roomIDOfDefaultMultiplayerRoom].data.currentGame.players[connection].currentGame.tilesCreated++;
		}
		rooms[roomIDOfDefaultMultiplayerRoom].data.currentGame.players[connection].currentGame.tileQueue = [];
		rooms[roomIDOfDefaultMultiplayerRoom].data.currentGame.players[connection].currentGame.tileQueue[0] = [];
		rooms[roomIDOfDefaultMultiplayerRoom].data.currentGame.players[connection].currentGame.tileQueue[1] = JSON.parse(JSON.stringify(rooms[roomIDOfDefaultMultiplayerRoom].data.currentGame.globalTileQueues[1]));
		playersAlive.push(connection);
	}
	rooms[roomIDOfDefaultMultiplayerRoom].data.currentGame.playersAlive = playersAlive;

	io.to(roomIDOfDefaultMultiplayerRoom).emit("defaultMultiplayerRoomAction", "switchToGameContainer");
	rooms[roomIDOfDefaultMultiplayerRoom].playing = true;
}

function constructDefaultMultiplayerGameDataObjectToSend(connection) {
	let data = rooms[roomIDOfDefaultMultiplayerRoom].data.currentGame.players[connection.id];
	data.currentGame.currentInGameTimeInMilliseconds = rooms[roomIDOfDefaultMultiplayerRoom].data.currentGame.currentInGameTimeInMilliseconds;
	return data;
}

server.listen(PORT, () => {
	console.log(`Listening at localhost:${PORT}`);
});

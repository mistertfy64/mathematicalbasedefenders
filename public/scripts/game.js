// ======================================================================================== START OF INITIALIZATION =====================================================================

// Initialization

// Variables that for some reason need to be loaded first
var initializationFinished = false;

var computerModernUnicodeSerifFont = new FontFaceObserver("Computer Modern Unicode Serif");
var computerModernMathItalicFont = new FontFaceObserver("Computer Modern Math Italic");

Promise.all([computerModernUnicodeSerifFont.load(), computerModernMathItalicFont.load()]).then(function () {
	console.log("Loaded fonts!");
});

var socket = io();

// socket.io functions
socket.on("connect", () => {
	// either with send()
	console.log("Connected to server!");
});

const screens = {
	MAIN_MENU_SCREEN: "mainMenuScreen",
	INFORMATION_SCREEN: "informationScreen",
	SINGLEPLAYER_GAME_SCREEN: "singleplayerGameScreen",
	SETTINGS_SCREEN: "settingsScreen",
	GAME_OVER_SCREEN: "gameOverScreen",
};

const settingsScreens = {
	VIDEO_SETTINGS_SCREEN: "videoSettingsScreen",
	AUDIO_SETTINGS_SCREEN: "audioSettingsScreen",
	INPUT_SETTINGS_SCREEN: "inputSettingsScreen",
	ONLINE_SETTINGS_SCREEN: "onlineSettingsScreen",
};

var pixiCanvas = document.getElementById("pixi-canvas");
document.getElementById("pixi-canvas").style.display = "none";
// IMPORTANT VARIABLES
var currentScreen = screens.MAIN_MENU_SCREEN;
var settings = {};

restoreSettings();

// "Logical" Variables

var framesRenderedSinceLaunch = 0.0;
var initialWindowWidth = window.innerWidth;
var initialWindowHeight = window.innerHeight;
var initialRatio = initialWindowWidth / initialWindowHeight;

var enemyGenerationElapsedFramesCounter = 0;

// Game Variables
var game = {
	renderedEnemiesOnField: [],
	spritesOfRenderedEnemiesOnField: [],
	enemiesRenderedLastUpdate: [],
	enemyRenderStatus: {
		"-1": {
			sprite: "???",
			textSprite: "???",
			rendered: true,
			destroyed: "killed", // or "reachedBase" or false
		}, // there is NO #-1 enemy
	},
	tilesOnBoard: [],
};

var finalGameData;

// Constants

const TERMS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "-", "*", "/", "=", "a", "b", "c", "d", "n", "x", "y", "z"];
const TERMS_AS_BEAUTIFUL_STRINGS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "\u2013", "×", "÷", "=", "a", "b", "c", "d", "n", "x", "y", "z"];

// PIXI Variables
var app = new PIXI.Application({
	width: screen.width,
	height: screen.height,
	backgroundColor: 0xeeeeee,
	autoResize: true,
	resizeTo: window,
	resolution: devicePixelRatio,
	view: pixiCanvas,
});

renderer = PIXI.autoDetectRenderer(initialWindowWidth, initialWindowHeight);

document.body.appendChild(app.renderer.view);

var mainMenuScreenContainer = new PIXI.Container();
var singleplayerScreenContainer = new PIXI.Container();

app.stage.addChild(mainMenuScreenContainer);
mainMenuScreenContainer.visible = false; // for now
app.stage.addChild(singleplayerScreenContainer);
singleplayerScreenContainer.visible = false; // for now

switch (currentScreen) {
	case screens.MAIN_MENU_SCREEN: {
		console.log("hit!");
		// mainMenuScreenContainer.visible = true; // for now
		break;
	}
	case screens.SINGLEPLAYER_GAME_SCREEN: {
		document.getElementById("pixi-canvas").style.display = "block";
		singleplayerScreenContainer.visible = true; // for now
		break;
	}
}

// Constants so this is easier

var textStyles = {
	SIZE_24_FONT: new PIXI.TextStyle({ fontFamily: "Computer Modern Unicode Serif", fontSize: 24 }),
	SIZE_32_FONT: new PIXI.TextStyle({ fontFamily: "Computer Modern Unicode Serif", fontSize: 32 }),
	SIZE_40_FONT: new PIXI.TextStyle({ fontFamily: "Computer Modern Unicode Serif", fontSize: 40 }),
	SIZE_64_FONT: new PIXI.TextStyle({ fontFamily: "Computer Modern Unicode Serif", fontSize: 64 }),
	SIZE_72_FONT: new PIXI.TextStyle({ fontFamily: "Computer Modern Unicode Serif", fontSize: 72 }),

	SIZE_32_MATH_FONT: new PIXI.TextStyle({ fontFamily: '"Computer Modern Math Italic", Computer Modern Unicode Serif', fontSize: 32 }),
	SIZE_72_MATH_FONT: new PIXI.TextStyle({ fontFamily: '"Computer Modern Math Italic", Computer Modern Unicode Serif', fontSize: 72 }),
};

// =============== START OF SINGLEPLAYER SCREEN ITEMS ====================

// Sprites
var mbdLogoTexture = PIXI.Texture.from("assets/images/singleplayer-screen/mathematicalbasedefenderslogo.png");
var mbdLogoSprite = new PIXI.Sprite(mbdLogoTexture);

var sendButtonTexture = PIXI.Texture.from("assets/images/singleplayer-screen/sendbutton.png");
var sendButtonSprite = new PIXI.Sprite(sendButtonTexture);
sendButtonSprite.x = initialWindowWidth / 2 + 64 * -4 + 16;
sendButtonSprite.y = initialWindowHeight / 2 + 64 * 3 + 176;
sendButtonSprite.interactive = true;
sendButtonSprite.on("click", function () {
	sendProblem();
});

// Text

var currentProblemText = new PIXI.Text("", textStyles.SIZE_72_MATH_FONT);
currentProblemText.style.align = "center";
currentProblemText.tint = 0x000000;
currentProblemText.y = initialWindowHeight / 2 - 200;

var scoreLabelerText = new PIXI.Text("Score", textStyles.SIZE_24_FONT);
scoreLabelerText.x = initialWindowWidth / 2 + 64 * 2 + 96;
scoreLabelerText.y = initialWindowHeight / 2 - 100;

var currentScoreText = new PIXI.Text("0", textStyles.SIZE_64_FONT);
currentScoreText.x = initialWindowWidth / 2 + 64 * 2 + 96;
currentScoreText.y = initialWindowHeight / 2 - 80;

var timeLabelerText = new PIXI.Text("Time", textStyles.SIZE_24_FONT);
timeLabelerText.x = initialWindowWidth / 2 + 64 * 2 + 96;
timeLabelerText.y = initialWindowHeight / 2 - 10;

var currentTimeText = new PIXI.Text("0:00.000", textStyles.SIZE_40_FONT);
currentTimeText.x = initialWindowWidth / 2 + 64 * 2 + 96;
currentTimeText.y = initialWindowHeight / 2 + 10;

var baseHealthText = new PIXI.Text("Base Health: 10/10", textStyles.SIZE_24_FONT);
baseHealthText.x = initialWindowWidth / 2 + 64 * 2 + 96;
baseHealthText.y = initialWindowHeight / 2 + 60;

var enemiesText = new PIXI.Text("Enemies: 0/0", textStyles.SIZE_24_FONT);
enemiesText.x = initialWindowWidth / 2 + 64 * 2 + 96;
enemiesText.y = initialWindowHeight / 2 + 90;

var valueOfVariableAText = new PIXI.Text("a = ?", textStyles.SIZE_32_MATH_FONT);
valueOfVariableAText.x = initialWindowWidth / 2 + 64 * 2 + 96;
valueOfVariableAText.y = initialWindowHeight / 2 + 120;

var valueOfVariableBText = new PIXI.Text("b = ?", textStyles.SIZE_32_MATH_FONT);
valueOfVariableBText.x = initialWindowWidth / 2 + 64 * 2 + 96;
valueOfVariableBText.y = initialWindowHeight / 2 + 150;

var valueOfVariableCText = new PIXI.Text("c = ?", textStyles.SIZE_32_MATH_FONT);
valueOfVariableCText.x = initialWindowWidth / 2 + 64 * 2 + 96;
valueOfVariableCText.y = initialWindowHeight / 2 + 180;

var valueOfVariableDText = new PIXI.Text("d = ?", textStyles.SIZE_32_MATH_FONT);
valueOfVariableDText.x = initialWindowWidth / 2 + 64 * 2 + 96;
valueOfVariableDText.y = initialWindowHeight / 2 + 210;

// Left of grid

var actionsPerMinuteLabelerText = new PIXI.Text("Actions Per Minute", textStyles.SIZE_24_FONT);
actionsPerMinuteLabelerText.x = initialWindowWidth / 2 - 465;
actionsPerMinuteLabelerText.y = initialWindowHeight / 2 - 10;

var actionsPerMinuteText = new PIXI.Text("0.000", textStyles.SIZE_40_FONT);
actionsPerMinuteText.x = initialWindowWidth / 2 - 450;
actionsPerMinuteText.y = initialWindowHeight / 2 + 10;

var currentComboText = new PIXI.Text("", textStyles.SIZE_40_FONT);
currentComboText.x = initialWindowWidth / 2 - 450;
currentComboText.y = initialWindowHeight / 2 - 80;

var tileTextures = [[], []];

for (i = 0; i < 2; i++) {
	for (j = 0; j < 24; j++) {
		var s1 = i == 1 ? "selected" : "";
		var tile = PIXI.Texture.from("assets/images/singleplayer-screen/tile" + j.toString() + s1 + ".png");
		tileTextures[i][j] = tile;
	}
}

// =============== END OF SINGLEPLAYER SCREEN ITEMS ====================

// Input

/*
document.addEventListener(
	"keyup",
	(event) => {
		processKeypress(event);
	},
	false
);
*/

$(document).keydown(function(event) {
    if (event.keyCode == 9) {  
        event.preventDefault(); 
    }
	processKeypress(event);

});

// Initialization Finished
initializationFinished = true;

// ======================================================================================== END OF INITIALIZATION =====================================================================
console.log("Initialization finished!");
var game = JSON.parse(JSON.stringify(game));
setPropertiesAndChangeScreen(currentScreen);
addThingsToScreen();

let resize = function resize() {
	var ratio = Math.min(window.innerWidth / initialWindowWidth, window.innerHeight / initialWindowHeight);

	mainMenuScreenContainer.scale.x = mainMenuScreenContainer.scale.y = ratio;
	singleplayerScreenContainer.scale.x = singleplayerScreenContainer.scale.y = ratio;

	renderer.resize(Math.ceil(initialWindowWidth * ratio), Math.ceil(initialWindowHeight * ratio));
};

window.addEventListener("resize", resize);

// Rendering Loop

app.ticker.add((delta) => {
	// delta = frames "skipped" (1 frame = 1/60 seconds)

	switch (currentScreen) {
		case screens.SINGLEPLAYER_GAME_SCREEN: {
			// Update Text Positions
			currentProblemText.x = (initialWindowWidth - PIXI.TextMetrics.measureText(currentProblemText.text === undefined ? "" : currentProblemText.text.toString(), textStyles.SIZE_72_MATH_FONT).width) / 2;
			actionsPerMinuteText.x = initialWindowWidth / 2 - 260 - PIXI.TextMetrics.measureText(actionsPerMinuteText.text, textStyles.SIZE_40_FONT).width;
			currentComboText.x = initialWindowWidth / 2 - 260 - PIXI.TextMetrics.measureText(currentComboText.text, textStyles.SIZE_40_FONT).width;
			break;
		}
	}
});

// Functions

// Important Functions

/**
 * Changes the screen. (i.e. changes the container shown)
 * @param {*} newScreen
 */
function setPropertiesAndChangeScreen(newScreen) {
	document.getElementById("hub-container").style.display = "none";

	document.getElementById("main-menu-screen-container").style.display = "none";
	document.getElementById("information-screen-container").style.display = "none";
	document.getElementById("settings-screen-container").style.display = "none";
	document.getElementById("game-over-screen-container").style.display = "none";

	document.getElementById("bottom-user-interface-container").style.display = "none";

	document.getElementById("pixi-canvas").style.display = "none";
	currentScreen = newScreen; // might remove later
	// mainMenuScreenContainer.visible = false;
	singleplayerScreenContainer.visible = false;

	switch (newScreen) {
		case screens.MAIN_MENU_SCREEN: {
			// set properties
			removeAllRenderedEnemies();
			// mainMenuScreenContainer.visible = true;
			document.body.style.overflow = "visible";
			document.getElementById("hub-container").style.display = "block";
			document.getElementById("main-menu-screen-container").style.display = "block";
			document.getElementById("bottom-user-interface-container").style.display = "block";

			break;
		}
		case screens.INFORMATION_SCREEN: {
			// set properties
			document.getElementById("hub-container").style.display = "block";
			document.getElementById("information-screen-container").style.display = "block";
			break;
		}
		case screens.SINGLEPLAYER_GAME_SCREEN: {
			// set properties
			document.body.style.overflow = "hidden";
			document.getElementById("pixi-canvas").style.display = "block";
			singleplayerScreenContainer.visible = true; // for now
			break;
		}
		case screens.SETTINGS_SCREEN: {
			// set properties
			document.getElementById("enemy-color-setting-drop-down-menu").value = settings.video.enemyColor;
			document.getElementById("multiplication-sign-form-setting-drop-down-menu").value = settings.video.multiplicationSignForm;

			document.body.style.overflow = "visible";
			document.getElementById("hub-container").style.display = "block";
			document.getElementById("settings-screen-container").style.display = "block";
			break;
		}
		case screens.GAME_OVER_SCREEN: {
			// set properties
			document.body.style.overflow = "hidden";
			document.getElementById("hub-container").style.display = "block";
			document.getElementById("game-over-screen-container").style.display = "block";
			break;
		}
	}
}

function setPropertiesAndChangeSettingsScreen(newSettingsScreen) {
	document.getElementById("video-settings-screen-container").style.display = "none";
	// document.getElementById("audio-settings-screen-container").style.display = "none";
	// document.getElementById("input-settings-screen-container").style.display = "none";
	document.getElementById("online-settings-screen-container").style.display = "none";
	switch (newSettingsScreen) {
		case settingsScreens.VIDEO_SETTINGS_SCREEN: {
			document.getElementById("video-settings-screen-container").style.display = "block";
			break;
		}
		case settingsScreens.AUDIO_SETTINGS_SCREEN: {
			document.getElementById("audio-settings-screen-container").style.display = "block";
			break;
		}
		case settingsScreens.INPUT_SETTINGS_SCREEN: {
			document.getElementById("input-settings-screen-container").style.display = "block";
			break;
		}
		case settingsScreens.ONLINE_SETTINGS_SCREEN: {
			document.getElementById("online-settings-screen-container").style.display = "block";
			break;
		}
		default: {
			break;
		}
	}
}

socket.on("roomData", (compressedStringifiedJSONRoomData) => {
	var roomData = JSON.parse(LZString.decompress(compressedStringifiedJSONRoomData));
	// delta = frames "skipped" (1 frame = 1/60 seconds)
	// console.log(stringifiedJSONRoomData);
	switch (roomData.mode) {
		case "singleplayer":
			{
				if (roomData.currentGame.gameIsOver && !roomData.currentGame.gameOverScreenShown){
					console.log("Game over!");
					console.log(roomData.currentGame);
					setPropertiesAndChangeScreen(screens.GAME_OVER_SCREEN);
					$("#final-score").text(roomData.currentGame.currentScore);
					$("#final-time").text(turnMillisecondsToTime(roomData.currentGame.currentInGameTimeInMilliseconds));
					$("#final-enemies").text(roomData.currentGame.enemiesKilled + "/" + roomData.currentGame.enemiesCreated);
					$("#final-actions-per-minute").text(((roomData.currentGame.actionsPerformed / (roomData.currentGame.currentInGameTimeInMilliseconds / 1000)) * 60).toFixed(3).toString());
				} else {
				// text
				currentScoreText.text = roomData.currentGame.currentScore;
				currentProblemText.text = settings.video.multiplicationSignForm == "dot" ? roomData.currentGame.currentProblemAsBeautifulText.replaceAll("×", "·") : roomData.currentGame.currentProblemAsBeautifulText;
				baseHealthText.text = "Base Health: " + roomData.currentGame.baseHealth + "/10";
				enemiesText.text = "Enemies: " + roomData.currentGame.enemiesKilled + "/" + roomData.currentGame.enemiesCreated;
				actionsPerMinuteText.text = ((roomData.currentGame.actionsPerformed / (roomData.currentGame.currentInGameTimeInMilliseconds / 1000)) * 60).toFixed(3).toString();
				currentComboText.text = roomData.currentGame.currentCombo < 1 ? "" : roomData.currentGame.currentCombo + " Combo";
				valueOfVariableAText.text = roomData.currentGame.valueOfVariableA === undefined ? "a = ?" : "a = " + roomData.currentGame.valueOfVariableA;
				valueOfVariableBText.text = roomData.currentGame.valueOfVariableB === undefined ? "b = ?" : "b = " + roomData.currentGame.valueOfVariableB;
				valueOfVariableCText.text = roomData.currentGame.valueOfVariableC === undefined ? "c = ?" : "c = " + roomData.currentGame.valueOfVariableC;
				valueOfVariableDText.text = roomData.currentGame.valueOfVariableD === undefined ? "d = ?" : "d = " + roomData.currentGame.valueOfVariableD;

				currentTimeText.text = turnMillisecondsToTime(roomData.currentGame.currentInGameTimeInMilliseconds);
				// tiles
				for (let i = 0; i < 49; i++) {
					// why?
					if (roomData.currentGame.tilesOnBoard[i]) {
						let t = new Tile(roomData.currentGame.tilesOnBoard[i].termID, i, roomData.currentGame.tilesOnBoard[i].selected, roomData.currentGame.tilesOnBoard[i].tileID);

						if (!game.tilesOnBoard[i] || game.tilesOnBoard[i].tileID != t.tileID) {
							game.tilesOnBoard[i] = t;
							game.tilesOnBoard[i].identifier = Math.random();
							game.tilesOnBoard[i].sprite.on("click", function () {
								processTileClick(i);
							});
						}
						game.tilesOnBoard[i].sprite.texture = tileTextures[roomData.currentGame.tilesOnBoard[i].selected ? 1 : 0][roomData.currentGame.tilesOnBoard[i].termID == 12 && settings.video.multiplicationSignForm == "dot" ? 23 : roomData.currentGame.tilesOnBoard[i].termID];
						singleplayerScreenContainer.addChild(game.tilesOnBoard[i].sprite);
					}
				}

				// enemies
				let renderedEnemiesOnFieldToDelete = [];
				for (let i = 0; i < roomData.currentGame.enemiesOnField.length; i++) {
					let enemy = roomData.currentGame.enemiesOnField[i];
					if ((enemy !== undefined || enemy !== null) && !enemy.toDestroy) {
						if (game.enemyRenderStatus[enemy.enemyNumber.toString()] === undefined) {
							// add enemy to array
							if (!game.renderedEnemiesOnField.includes(enemy.enemyNumber.toString())) {
								game.renderedEnemiesOnField.push(enemy.enemyNumber.toString());
							}

							// create object
							game.enemyRenderStatus[enemy.enemyNumber.toString()] = {};

							// create sprite
							let enemySprite = new PIXI.Sprite(PIXI.Texture.WHITE);
							enemySprite.width = enemy.width;
							enemySprite.height = enemy.height;

							let enemyColor = createEnemyColor();
							let red = (enemyColor & 0xff0000) >> 16;
							let green = (enemyColor & 0x00ff00) >> 8;
							let blue = enemyColor & 0x0000ff;
							let minimum = Math.min(Math.min(red, green), blue) / 255;
							let maximum = Math.max(Math.max(red, green), blue) / 255;
							enemySprite.tint = enemyColor;
							// create text sprite
							let textStyleToUse = new PIXI.TextStyle({
								fontFamily: '"Computer Modern Math Italic", Computer Modern Unicode Serif',
								fill: settings.video.enemyColor == "blind" ? "#eeeeee" : (maximum + minimum) / 2 >= 0.5 ? "#000000" : "#ffffff",
								fontSize: 32,
							});
							let textSprite = new PIXI.Text(enemy.requestedValue.toString().replace("-", "\u2013"), textStyleToUse);
							let textMetrics = PIXI.TextMetrics.measureText(enemy.requestedValue.toString(), textStyleToUse);
							textSprite.x = enemy.xPosition + (enemy.width - textMetrics.width) / 2;
							textSprite.y = enemy.yPosition + (enemy.height - textMetrics.height) / 2;
							textSprite.color = enemyColor == "blind" ? "#eeeeee" : (maximum + minimum) / 2 >= 0.5 ? "#000000" : "#ffffff";
							// add to render

							game.enemyRenderStatus[enemy.enemyNumber.toString()]["enemySprite"] = enemySprite;
							game.enemyRenderStatus[enemy.enemyNumber.toString()]["enemySprite"].enemyNumber = enemy.enemyNumber.toString();
							game.enemyRenderStatus[enemy.enemyNumber.toString()]["textSprite"] = textSprite;
							game.enemyRenderStatus[enemy.enemyNumber.toString()]["textMetrics"] = textMetrics;
							game.enemyRenderStatus[enemy.enemyNumber.toString()]["rendered"] = true;
							game.spritesOfRenderedEnemiesOnField.push(enemySprite);
							singleplayerScreenContainer.addChild(game.enemyRenderStatus[enemy.enemyNumber.toString()]["enemySprite"]);
							singleplayerScreenContainer.addChild(game.enemyRenderStatus[enemy.enemyNumber.toString()]["textSprite"]);
						}
						game.enemyRenderStatus[enemy.enemyNumber.toString()]["enemySprite"].x = (enemy.sPosition / 10) * 800 + 550;
						game.enemyRenderStatus[enemy.enemyNumber.toString()]["enemySprite"].y = enemy.yPosition;
						game.enemyRenderStatus[enemy.enemyNumber.toString()]["textSprite"].x = (enemy.sPosition / 10) * 800 + 550 + (enemy.width - game.enemyRenderStatus[enemy.enemyNumber.toString()]["textMetrics"].width) / 2;
						game.enemyRenderStatus[enemy.enemyNumber.toString()]["textSprite"].y = enemy.yPosition + (enemy.height - game.enemyRenderStatus[enemy.enemyNumber.toString()]["textMetrics"].height) / 2;
						if (enemy.reachedBase || enemy.destroyed) {
							game.enemyRenderStatus[enemy.enemyNumber.toString()].toDestroy = true;
							// game.enemyRenderStatus[enemy.enemyNumber.toString()]["textSprite"].toDestroy = true;
							// renderedEnemiesOnFieldToDelete.push(enemy.enemyNumber.toString());
						}
					} else {
						renderedEnemiesOnFieldToDelete.push(enemy.enemyNumber.toString());
					}
				}

				for (let enemy in game.enemyRenderStatus) {
					// console.log(game.enemyRenderStatus[enemy]);
					if (game.enemyRenderStatus[enemy].toDestroy) {
						// console.log("Removing Enemy #" + enemy);
						singleplayerScreenContainer.removeChild(game.enemyRenderStatus[enemy].enemySprite);
						singleplayerScreenContainer.removeChild(game.enemyRenderStatus[enemy].textSprite);
					}
				}

				for (let enemySprite of game.spritesOfRenderedEnemiesOnField) {
					if (!game.enemyRenderStatus.hasOwnProperty(enemySprite.enemyNumber.toString())) {
						renderedEnemiesOnFieldToDelete.push(enemySprite.enemyNumber.toString());
					}
				}

				for (let numberToRemoveAsString of renderedEnemiesOnFieldToDelete) {
					game.enemyRenderStatus[numberToRemoveAsString.toString()] === undefined || singleplayerScreenContainer.removeChild(game.enemyRenderStatus[numberToRemoveAsString.toString()]["enemySprite"]);
					game.enemyRenderStatus[numberToRemoveAsString.toString()] === undefined || singleplayerScreenContainer.removeChild(game.enemyRenderStatus[numberToRemoveAsString.toString()]["textSprite"]);
					delete game.enemyRenderStatus[numberToRemoveAsString.toString()];
					game.renderedEnemiesOnField.splice(game.renderedEnemiesOnField.indexOf(numberToRemoveAsString), 1);
					game.spritesOfRenderedEnemiesOnField.splice(game.spritesOfRenderedEnemiesOnField.indexOf(numberToRemoveAsString), 1);
				}
			}
		}
			break;
	}

	switch (currentScreen) {
		case screens.SINGLEPLAYER_GAME_SCREEN: {
			/*
			// Counters
			framesRenderedSinceLaunch += delta;
			enemyGenerationElapsedFramesCounter += delta;
			currentGame.framesElapsedSinceLastEnemyKill += delta;

			// Logic

			// If Base Health <= 0, Game over (obviously)
			if (currentGame.baseHealth <= 0) {
				endSingleplayerGame();
			}

			// If 300 frames (5 seconds) has passed since last enemy kill, reset combo
			if (currentGame.framesElapsedSinceLastEnemyKill >= 300 && currentGame.currentCombo != -1) {
				currentGame.currentCombo = -1;
			}

			// Move all enemies - defaultSpeed / 2.25 pixels per frame
			for (i = 0; i < currentGame.enemiesOnField.length; i++) {
				if (currentGame.enemiesOnField[i] !== undefined) {
					currentGame.enemiesOnField[i].move((delta * currentGame.enemiesOnField[i].defaultSpeed) / 2.25);
				}
			}

			// Create new enemy if Math.random() > x every y frames
			if (enemyGenerationElapsedFramesCounter > 3 && Math.random() > 0.99) {
				currentGame.enemiesOnField[currentGame.enemiesCreated] = new Enemy(1350, 120, 100, 100, generateRandomEnemyTerm(), Math.floor(Math.random() * 5) + 1, 1, 1, createEnemyColor());
				singleplayerScreenContainer.addChild(currentGame.enemiesOnField[currentGame.enemiesCreated].sprite);
				singleplayerScreenContainer.addChild(currentGame.enemiesOnField[currentGame.enemiesCreated].textSprite);
				currentGame.enemiesCreated++;
				enemyGenerationElapsedFramesCounter -= 3;
			}

			// Update variables
			currentGame.currentInGameTimeInMilliseconds += ((delta * 1) / 60) * 1000;

			// Update Text
			currentScoreText.text = currentGame.currentScore;
			currentProblemText.text = currentGame.currentProblemAsBeautifulText;
			baseHealthText.text = "Base Health: " + currentGame.baseHealth + "/10";
			enemiesText.text = "Enemies: " + currentGame.enemiesKilled + "/" + currentGame.enemiesCreated;
			actionsPerMinuteText.text = ((currentGame.actionsPerformed / (currentGame.currentInGameTimeInMilliseconds / 1000)) * 60).toFixed(3).toString();
			currentComboText.text = currentGame.currentCombo < 1 ? "" : currentGame.currentCombo + " Combo";

			// Update Text Positions
			currentProblemText.x = (initialWindowWidth - PIXI.TextMetrics.measureText(currentProblemText.text === undefined ? "" : currentProblemText.text.toString(), textStyles.FONT_SIZE_72_WITH_MATH_FONT).width) / 2;
			actionsPerMinuteText.x = initialWindowWidth / 2 - 260 - PIXI.TextMetrics.measureText(actionsPerMinuteText.text, textStyles.FONT_SIZE_40).width;
			currentComboText.x = initialWindowWidth / 2 - 260 - PIXI.TextMetrics.measureText(currentComboText.text, textStyles.FONT_SIZE_40).width;

			valueOfVariableAText.text = currentGame.valueOfVariableA === undefined ? "a = ?" : "a = " + currentGame.valueOfVariableA;
			valueOfVariableBText.text = currentGame.valueOfVariableB === undefined ? "b = ?" : "b = " + currentGame.valueOfVariableB;
			valueOfVariableCText.text = currentGame.valueOfVariableC === undefined ? "c = ?" : "c = " + currentGame.valueOfVariableC;
			valueOfVariableDText.text = currentGame.valueOfVariableD === undefined ? "d = ?" : "d = " + currentGame.valueOfVariableD;
*/
		}
	}
});
socket.on("finalRanks", (personalBestBroken, finalGlobalRank, finalGlobalRankSaved) => {
	finalGameData.personalBestBroken = personalBestBroken;
	finalGameData.finalGlobalRank = finalGlobalRank;
	finalGameData.finalGlobalRankSaved = finalGlobalRankSaved;
	$("#personal-best").text(personalBestBroken ? "New Personal Best!" : "");
	$("#final-global-rank").text(calculateMessageForGlobalRank(finalGameData.finalGlobalRank, finalGameData.finalGlobalRankSaved));
});

// Logical Functions

function endSingleplayerGame() {
	finalGameData = {
		score: game.currentScore,
		inGameTimeInMilliseconds: game.currentInGameTimeInMilliseconds,
		enemiesKilled: game.enemiesKilled,
		enemiesCreated: game.enemiesCreated,
		actionsPerformed: game.actionsPerformed,
	};

	socket.emit("scoreSubmission", finalGameData);

	setPropertiesAndChangeScreen(screens.GAME_OVER_SCREEN);

	
}

function processKeypress(event) {
	// console.log(event);
	socket.emit("keypress", event.keyCode, event.location);
	switch (currentScreen) {
		case screens.MAIN_MENU_SCREEN: {
			break;
		}
		case screens.SINGLEPLAYER_GAME_SCREEN: {
			// check if input is from numpad
			if (event.key != "Escape") {
			} else {
				setPropertiesAndChangeScreen(screens.MAIN_MENU_SCREEN);
				socket.emit("leaveRoom");
			}
		}
		case screens.SETTINGS_SCREEN: {
			switch (event.key) {
				case "Escape": {
					setPropertiesAndChangeScreen(screens.MAIN_MENU_SCREEN);
				}
			}
		}
	}
}

function startSingleplayerGame() {
	socket.emit("createAndJoinRoom");
	socket.emit("startSingleplayerGame");
	setPropertiesAndChangeScreen(screens.SINGLEPLAYER_GAME_SCREEN);
}

function processAction() {
	game.actionsPerformed++;
}

function forceSelectTileWithTermID(termIDToSelect) {
	for (i = 0; i < 49; i++) {
		if (game.tilesOnBoard[i].termID == termIDToSelect && game.tilesOnBoard[i].selected == false) {
			processTileClick(game.tilesOnBoard[i]);
			return; // break
		}
	}
	// None found
}

function deleteLastSelectedTerm() {
	if (game.tilesInCurrentProblem.length > 0) {
		processTileClick(game.tilesInCurrentProblem[game.tilesInCurrentProblem.length - 1]);
	}
}

function sendProblem() {
	socket.emit("action");
	socket.emit("sendProblem");
}

// Random Generators

function addThingsToScreen() {
	singleplayerScreenContainer.addChild(currentProblemText);

	singleplayerScreenContainer.addChild(scoreLabelerText);
	singleplayerScreenContainer.addChild(currentScoreText);
	singleplayerScreenContainer.addChild(timeLabelerText);
	singleplayerScreenContainer.addChild(currentTimeText);
	singleplayerScreenContainer.addChild(baseHealthText);
	singleplayerScreenContainer.addChild(enemiesText);
	singleplayerScreenContainer.addChild(actionsPerMinuteLabelerText);
	singleplayerScreenContainer.addChild(actionsPerMinuteText);
	singleplayerScreenContainer.addChild(currentComboText);

	singleplayerScreenContainer.addChild(valueOfVariableAText);
	singleplayerScreenContainer.addChild(valueOfVariableBText);
	singleplayerScreenContainer.addChild(valueOfVariableCText);
	singleplayerScreenContainer.addChild(valueOfVariableDText);

	singleplayerScreenContainer.addChild(sendButtonSprite);
}

function generateRandomColor() {
	return parseInt("0x" + Math.floor(Math.random() * 16777215).toString(16));
}

// Rendering Helpers
function removeAllRenderedEnemies(){
	for (let enemy in game.enemyRenderStatus) {
		if (game.enemyRenderStatus.hasOwnProperty(enemy)){
			game.enemyRenderStatus[enemy] === undefined || singleplayerScreenContainer.removeChild(game.enemyRenderStatus[enemy]["enemySprite"]);
		game.enemyRenderStatus[enemy] === undefined || singleplayerScreenContainer.removeChild(game.enemyRenderStatus[enemy]["textSprite"]);
		delete game.enemyRenderStatus[enemy];
		game.renderedEnemiesOnField = [];
		game.spritesOfRenderedEnemiesOnField = [];
		}
		
	}
}

// "Predetermined" Generators

// Converters




function convertTermIDToBeautifulString(id) {
	return id == 12 && settings.video.multiplicationSignForm == "dot" ? "·" : TERMS_AS_BEAUTIFUL_STRINGS[id];
}

function turnMillisecondsToTime(milliseconds) {
	let h = Math.floor(milliseconds / (60 * 60 * 1000));
	let dm = milliseconds % (60 * 60 * 1000);
	let m = Math.floor(dm / (60 * 1000));
	let ds = dm % (60 * 1000);
	let s = Math.floor(ds / 1000);

	let hh = h < 10 ? "0" + h : h;
	let mm = m < 10 ? "0" + m : m;
	let ss = s < 10 ? "0" + s : s;
	let ms = String(Math.floor(ds % 1000)).padStart(3, "0");

	if (h >= 1) {
		return hh + ":" + mm + ":" + ss + "." + ms;
	} else {
		return mm + ":" + ss + "." + ms;
	}
}

function calculateMessageForGlobalRank(rank, saved) {
	let message = "";
	if (rank == 1) {
		message = "New World Record!";
	} else if (rank <= 50) {
		message = "Global Rank #" + rank;
	} else {
		return "";
	}
	return message + (saved ? "" : " (Not Saved) ");
}

function createEnemyColor() {
	switch (settings.video.enemyColor) {
		case "randomForEach": {
			return generateRandomColor();
		}
		case "random": {
			if (typeof fixedEnemyColor === "undefined") {
				fixedEnemyColor = generateRandomColor();
			}
			return fixedEnemyColor;
		}
		case "red": {
			return 0xff0000;
		}
		case "orange": {
			return 0xff8800;
		}
		case "yellow": {
			return 0xffd900;
		}
		case "green": {
			return 0x00ff00;
		}
		case "blue": {
			return 0x0000ff;
		}
		case "purple": {
			return 0xa600ff;
		}
		case "white": {
			return 0xffffff;
		}
		case "gray": {
			return 0x3c3c3c;
		}
		case "black": {
			return 0x000000;
		}
		case "backgroundColor": {
			return 0xeeeeee;
		}
		case "blind": {
			return 0xeeeeee;
		}
	}
}

// io

function restoreSettings() {
	settings = localStorage.getItem("settings");
	settings = JSON.parse(settings);

	// video

	if (settings.video === undefined) {
		settings.video = {
			whatEvenIsThis: "What even is this?",
		};
	}

	if (settings.video.enemyColor === undefined) settings.video.enemyColor = "random";
	if (settings.video.multiplicationSignForm === undefined) settings.video.multiplicationSignForm = "cross";
}

function saveSettings() {
	localStorage.setItem("settings", JSON.stringify(settings));
}

// DEBUG
socket.on("debugData", (what) => {
	console.log(what);
});

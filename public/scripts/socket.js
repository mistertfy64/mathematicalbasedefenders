socket.on("currentGameData", (gameData) => {
	let currentGameData = JSON.parse(gameData);
	// delta = frames "skipped" (1 frame = 1/60 seconds)
	switch (currentGameData.currentGame.mode) {
		case "singleplayer": {
			if (currentGameData.currentGame.gameIsOver) {
				setPropertiesAndChangeScreen(screens.GAME_OVER_SCREEN);
				$("#final-score").text(currentGameData.currentGame.currentScore);
				$("#final-time").text(turnMillisecondsToTime(currentGameData.currentGame.currentInGameTimeInMilliseconds));
				$("#final-enemies").text(currentGameData.currentGame.enemiesKilled + "/" + currentGameData.currentGame.enemiesCreated);
				$("#final-actions-per-minute").text(((currentGameData.currentGame.actionsPerformed / (currentGameData.currentGame.currentInGameTimeInMilliseconds / 1000)) * 60).toFixed(3).toString());
			} else {
				// text

				// interface
				singleplayerScreenContainerItems.currentScoreText.text = currentGameData.currentGame.currentScore;
				singleplayerScreenContainerItems.currentProblemText.text =
					settings.video.multiplicationSignForm == "dot" ? currentGameData.currentGame.currentProblemAsBeautifulText.replaceAll("×", "·") : currentGameData.currentGame.currentProblemAsBeautifulText;
				singleplayerScreenContainerItems.baseHealthText.text = "Base Health: " + currentGameData.currentGame.baseHealth + "/10";
				singleplayerScreenContainerItems.enemiesText.text = "Enemies: " + currentGameData.currentGame.enemiesKilled + "/" + currentGameData.currentGame.enemiesCreated;
				singleplayerScreenContainerItems.actionsPerMinuteText.text = ((currentGameData.currentGame.actionsPerformed / (currentGameData.currentGame.currentInGameTimeInMilliseconds / 1000)) * 60).toFixed(3).toString();
				singleplayerScreenContainerItems.currentComboText.text = currentGameData.currentGame.currentCombo < 1 ? "" : currentGameData.currentGame.currentCombo + " Combo";
				singleplayerScreenContainerItems.valueOfVariableAText.text = currentGameData.currentGame.valueOfVariableA === undefined ? "a = ?" : "a = " + currentGameData.currentGame.valueOfVariableA;
				singleplayerScreenContainerItems.valueOfVariableBText.text = currentGameData.currentGame.valueOfVariableB === undefined ? "b = ?" : "b = " + currentGameData.currentGame.valueOfVariableB;
				singleplayerScreenContainerItems.valueOfVariableCText.text = currentGameData.currentGame.valueOfVariableC === undefined ? "c = ?" : "c = " + currentGameData.currentGame.valueOfVariableC;
				singleplayerScreenContainerItems.valueOfVariableDText.text = currentGameData.currentGame.valueOfVariableD === undefined ? "d = ?" : "d = " + currentGameData.currentGame.valueOfVariableD;
				singleplayerScreenContainerItems.currentTimeText.text = turnMillisecondsToTime(currentGameData.currentGame.currentInGameTimeInMilliseconds);
				singleplayerScreenContainerItems.currentComboTimeLeftText.text =
					currentGameData.currentGame.currentCombo < 1 || currentGameData.currentGame.timeElapsedSinceLastEnemyKillInMilliseconds > 5000
						? ""
						: turnMillisecondsToTime(5000 - currentGameData.currentGame.timeElapsedSinceLastEnemyKillInMilliseconds);

				// tiles
				for (let i = 0; i < 49; i++) {
					// why?
					if (currentGameData.currentGame.tilesOnBoard[i]) {
						let t = new Tile(currentGameData.currentGame.tilesOnBoard[i].termID, i, currentGameData.currentGame.tilesOnBoard[i].selected, currentGameData.currentGame.tilesOnBoard[i].tileID);

						if (!game.tilesOnBoard[i] || game.tilesOnBoard[i].tileID != t.tileID) {
							game.tilesOnBoard[i] = t;
							game.tilesOnBoard[i].sprite.on("pointerdown", function () {
								processTileClick(i);
							});
						}
						game.tilesOnBoard[i].sprite.texture =
							tileTextures[currentGameData.currentGame.tilesOnBoard[i].selected ? 1 : 0][
								currentGameData.currentGame.tilesOnBoard[i].termID == 12 && settings.video.multiplicationSignForm == "dot" ? 23 : currentGameData.currentGame.tilesOnBoard[i].termID
							];
						singleplayerScreenContainer.addChild(game.tilesOnBoard[i].sprite);
					}
				}

				// enemies
				let renderedEnemiesOnFieldToDelete = [];
				for (let i = 0; i < currentGameData.currentGame.enemiesOnField.length; i++) {
					let enemy = currentGameData.currentGame.enemiesOnField[i];
					if (enemy !== undefined && enemy !== null && !enemy.toDestroy) {
						if (game.enemyRenderStatus[enemy.enemyNumber.toString()] === undefined) {
							// add enemy to array
							if (!game.renderedEnemiesOnField.includes(enemy.enemyNumber.toString())) {
								game.renderedEnemiesOnField.push(enemy.enemyNumber.toString());
							}

							game.enemyRenderStatus[enemy.enemyNumber.toString()] = {};

							let enemyObject = new Enemy(enemy.xPosition, enemy.yPosition, enemy.sPosition, enemy.width, enemy.height, enemy.requestedValue, enemy.enemyNumber, "");

							game.enemyRenderStatus[enemy.enemyNumber.toString()]["enemySprite"] = enemyObject.enemySprite;
							game.enemyRenderStatus[enemy.enemyNumber.toString()]["enemySprite"].enemyNumber = enemyObject.enemyNumber.toString();
							game.enemyRenderStatus[enemy.enemyNumber.toString()]["requestedValueTextSprite"] = enemyObject.requestedValueTextSprite;
							game.enemyRenderStatus[enemy.enemyNumber.toString()]["requestedValueTextMetrics"] = enemyObject.requestedValueTextMetrics;
							game.enemyRenderStatus[enemy.enemyNumber.toString()]["rendered"] = true;
							game.spritesOfRenderedEnemiesOnField.push(enemyObject.enemySprite);
							singleplayerScreenContainer.addChild(game.enemyRenderStatus[enemy.enemyNumber.toString()]["enemySprite"]);
							singleplayerScreenContainer.addChild(game.enemyRenderStatus[enemy.enemyNumber.toString()]["requestedValueTextSprite"]);
						}
						// render
						game.enemyRenderStatus[enemy.enemyNumber.toString()]["enemySprite"].x = initialWindowWidth / 2 + 80 * (enemy.sPosition - 5); // (enemy.sPosition / 10) * 800 + 560;

						game.enemyRenderStatus[enemy.enemyNumber.toString()]["enemySprite"].y = enemy.yPosition;
						game.enemyRenderStatus[enemy.enemyNumber.toString()]["requestedValueTextSprite"].x =
							initialWindowWidth / 2 + 80 * (enemy.sPosition - 5) + (enemy.width - game.enemyRenderStatus[enemy.enemyNumber.toString()]["requestedValueTextMetrics"].width) / 2;
						game.enemyRenderStatus[enemy.enemyNumber.toString()]["requestedValueTextSprite"].y = enemy.yPosition + (enemy.height - game.enemyRenderStatus[enemy.enemyNumber.toString()]["requestedValueTextMetrics"].height) / 2;
						if (enemy.reachedBase || enemy.destroyed) {
							game.enemyRenderStatus[enemy.enemyNumber.toString()].toDestroy = true;
						}
					} else {
						renderedEnemiesOnFieldToDelete.push(enemy.enemyNumber.toString());
					}
				}

				for (let enemy in game.enemyRenderStatus) {
					if (game.enemyRenderStatus[enemy].toDestroy) {
						singleplayerScreenContainer.removeChild(game.enemyRenderStatus[enemy].enemySprite);
						singleplayerScreenContainer.removeChild(game.enemyRenderStatus[enemy].requestedValueTextSprite);
					}
				}

				for (let enemySprite of game.spritesOfRenderedEnemiesOnField) {
					if (!game.enemyRenderStatus.hasOwnProperty(enemySprite.enemyNumber.toString())) {
						renderedEnemiesOnFieldToDelete.push(enemySprite.enemyNumber.toString());
					}
				}

				// score indicators
				let scoreGainIndicatorsToDelete = [];
				for (let i = 0; i < currentGameData.currentGame.scoreGainIndicators.length; i++) {
					let indicator = currentGameData.currentGame.scoreGainIndicators[i];
					if (indicator !== undefined && indicator !== null && indicator.ageInMilliseconds < 500) {
						if (game.scoreGainIndicatorRenderStatus[indicator.number.toString()] === undefined) {
							// ???
							// create object
							game.scoreGainIndicatorRenderStatus[indicator.number.toString()] = {};
							// create the indicator
							let scoreGainIndicator = new PIXI.Text(currentGameData.currentGame.scoreGainIndicators[i].content, textStyles.SIZE_24_FONT);
							scoreGainIndicator.x = initialWindowWidth / 2 + 80 * (currentGameData.currentGame.scoreGainIndicators[i].sPosition - 5);
							scoreGainIndicator.y = 60 * (currentGameData.currentGame.scoreGainIndicators[i].age / 600 - 5) * -1 + 300;
							// add to render

							game.scoreGainIndicatorRenderStatus[indicator.number.toString()]["requestedValueTextSprite"] = scoreGainIndicator;
							game.scoreGainIndicatorRenderStatus[indicator.number.toString()]["rendered"] = true;
							// game.spritesOfRenderedEnemiesOnField.push(enemySprite);
							singleplayerScreenContainer.addChild(game.scoreGainIndicatorRenderStatus[indicator.number.toString()]["requestedValueTextSprite"]);
						}
						game.scoreGainIndicatorRenderStatus[indicator.number.toString()]["requestedValueTextSprite"].y = -24 * (currentGameData.currentGame.scoreGainIndicators[i].ageInMilliseconds / 100 - 5) + 50;
					} else {
						scoreGainIndicatorsToDelete.push(indicator.number.toString());
					}
				}

				// delete
				for (let numberToRemoveAsString of renderedEnemiesOnFieldToDelete) {
					game.enemyRenderStatus[numberToRemoveAsString.toString()] === undefined || singleplayerScreenContainer.removeChild(game.enemyRenderStatus[numberToRemoveAsString.toString()]["enemySprite"]);
					game.enemyRenderStatus[numberToRemoveAsString.toString()] === undefined || singleplayerScreenContainer.removeChild(game.enemyRenderStatus[numberToRemoveAsString.toString()]["requestedValueTextSprite"]);
					delete game.enemyRenderStatus[numberToRemoveAsString.toString()];
					game.renderedEnemiesOnField.splice(game.renderedEnemiesOnField.indexOf(numberToRemoveAsString), 1);
					game.spritesOfRenderedEnemiesOnField.splice(game.spritesOfRenderedEnemiesOnField.indexOf(numberToRemoveAsString), 1);
				}
				for (let numberToRemoveAsString of scoreGainIndicatorsToDelete) {
					game.scoreGainIndicatorRenderStatus[numberToRemoveAsString.toString()] === undefined || singleplayerScreenContainer.removeChild(game.scoreGainIndicatorRenderStatus[numberToRemoveAsString.toString()]["requestedValueTextSprite"]);
					delete game.scoreGainIndicatorRenderStatus[numberToRemoveAsString.toString()];
				}
			}
			break;
		}
		case "defaultMultiplayer": {
			{
				if (currentGameData.currentGame.dead) {
					setPropertiesAndChangeScreen(screens.DEFAULT_MULTIPLAYER_ROOM_LOBBY_SCREEN);
					$("#last-game-rank").text("Last game you ranked #" + currentGameData.currentGame.rank + " surviving for " + currentGameData.currentGame.currentInGameTimeInMilliseconds + "ms.");
				} else {
					// text

					// interface
					multiplayerScreenContainerItems.numberOfPendingEnemiesText.text = currentGameData.currentGame.enemiesPending;
					multiplayerScreenContainerItems.currentEnemiesSentText.text = currentGameData.currentGame.enemiesSent;
					multiplayerScreenContainerItems.currentProblemText.text =
						settings.video.multiplicationSignForm == "dot" ? currentGameData.currentGame.currentProblemAsBeautifulText.replaceAll("×", "·") : currentGameData.currentGame.currentProblemAsBeautifulText;
					multiplayerScreenContainerItems.baseHealthText.text = "Base Health: " + currentGameData.currentGame.baseHealth + "/10";
					multiplayerScreenContainerItems.enemiesText.text = "Enemies: " + currentGameData.currentGame.enemiesKilled + "/" + currentGameData.currentGame.enemiesCreated;
					multiplayerScreenContainerItems.actionsPerMinuteText.text = ((currentGameData.currentGame.actionsPerformed / (currentGameData.currentGame.currentInGameTimeInMilliseconds / 1000)) * 60).toFixed(3).toString();
					multiplayerScreenContainerItems.currentComboText.text = currentGameData.currentGame.currentCombo < 1 ? "" : currentGameData.currentGame.currentCombo + " Combo";
					multiplayerScreenContainerItems.valueOfVariableAText.text = currentGameData.currentGame.valueOfVariableA === undefined ? "a = ?" : "a = " + currentGameData.currentGame.valueOfVariableA;
					multiplayerScreenContainerItems.valueOfVariableBText.text = currentGameData.currentGame.valueOfVariableB === undefined ? "b = ?" : "b = " + currentGameData.currentGame.valueOfVariableB;
					multiplayerScreenContainerItems.valueOfVariableCText.text = currentGameData.currentGame.valueOfVariableC === undefined ? "c = ?" : "c = " + currentGameData.currentGame.valueOfVariableC;
					multiplayerScreenContainerItems.valueOfVariableDText.text = currentGameData.currentGame.valueOfVariableD === undefined ? "d = ?" : "d = " + currentGameData.currentGame.valueOfVariableD;
					multiplayerScreenContainerItems.currentTimeText.text = turnMillisecondsToTime(currentGameData.currentGame.currentInGameTimeInMilliseconds);
					multiplayerScreenContainerItems.currentComboTimeLeftText.text =
						currentGameData.currentGame.currentCombo < 1 || currentGameData.currentGame.timeElapsedSinceLastEnemyKillInMilliseconds > 5000
							? ""
							: turnMillisecondsToTime(5000 - currentGameData.currentGame.timeElapsedSinceLastEnemyKillInMilliseconds);
					multiplayerScreenContainerItems.currentPlayersRemainingText.text = "Players Remaining: " + currentGameData.currentGame.playersRemaining;
					// tiles
					for (let i = 0; i < 49; i++) {
						// why?
						if (currentGameData.currentGame.tilesOnBoard[i]) {
							let t = new Tile(currentGameData.currentGame.tilesOnBoard[i].termID, i, currentGameData.currentGame.tilesOnBoard[i].selected, currentGameData.currentGame.tilesOnBoard[i].tileID);

							if (!game.tilesOnBoard[i] || game.tilesOnBoard[i].tileID != t.tileID) {
								game.tilesOnBoard[i] = t;
								game.tilesOnBoard[i].sprite.on("pointerdown", function () {
									processTileClick(i);
								});
							}
							game.tilesOnBoard[i].sprite.texture =
								tileTextures[currentGameData.currentGame.tilesOnBoard[i].selected ? 1 : 0][
									currentGameData.currentGame.tilesOnBoard[i].termID == 12 && settings.video.multiplicationSignForm == "dot" ? 23 : currentGameData.currentGame.tilesOnBoard[i].termID
								];
							multiplayerScreenContainer.addChild(game.tilesOnBoard[i].sprite);
						}
					}

					// enemies
					let renderedEnemiesOnFieldToDelete = [];

					for (let i = 0; i < currentGameData.currentGame.enemiesOnField.length; i++) {
						let enemy = currentGameData.currentGame.enemiesOnField[i];
						if (enemy !== undefined && enemy !== null && !enemy.toDestroy) {
							if (game.enemyRenderStatus[enemy.enemyNumber.toString()] === undefined) {
								// add enemy to array
								if (!game.renderedEnemiesOnField.includes(enemy.enemyNumber.toString())) {
									game.renderedEnemiesOnField.push(enemy.enemyNumber.toString());
								}

								// create object
								game.enemyRenderStatus[enemy.enemyNumber.toString()] = {};

								enemyObject = new Enemy(enemy.xPosition, enemy.yPosition, enemy.sPosition, enemy.width, enemy.height, enemy.requestedValue, enemy.enemyNumber, enemy.senderName);

								game.enemyRenderStatus[enemy.enemyNumber.toString()]["enemySprite"] = enemyObject.enemySprite;
								game.enemyRenderStatus[enemy.enemyNumber.toString()]["enemySprite"].enemyNumber = enemyObject.enemyNumber.toString();
								game.enemyRenderStatus[enemy.enemyNumber.toString()]["requestedValueTextSprite"] = enemyObject.requestedValueTextSprite;
								game.enemyRenderStatus[enemy.enemyNumber.toString()]["requestedValueTextMetrics"] = enemyObject.requestedValueTextMetrics;
								game.enemyRenderStatus[enemy.enemyNumber.toString()]["senderNameTextSprite"] = enemyObject.senderNameTextSprite;
								game.enemyRenderStatus[enemy.enemyNumber.toString()]["senderNameTextMetrics"] = enemyObject.senderNameTextMetrics;
								game.enemyRenderStatus[enemy.enemyNumber.toString()]["rendered"] = true;

								multiplayerScreenContainer.addChild(game.enemyRenderStatus[enemy.enemyNumber.toString()]["enemySprite"]);
								multiplayerScreenContainer.addChild(game.enemyRenderStatus[enemy.enemyNumber.toString()]["requestedValueTextSprite"]);
								multiplayerScreenContainer.addChild(game.enemyRenderStatus[enemy.enemyNumber.toString()]["senderNameTextSprite"]);
							}
							if (enemy.reachedBase || enemy.destroyed) {
								game.enemyRenderStatus[enemy.enemyNumber.toString()].toDestroy = true;
							}
							game.enemyRenderStatus[enemy.enemyNumber.toString()]["enemySprite"].x = initialWindowWidth / 2 + 80 * (enemy.sPosition - 5); // (enemyObject.sPosition / 10) * 800 + 560;
							game.enemyRenderStatus[enemy.enemyNumber.toString()]["enemySprite"].y = enemy.yPosition;
							game.enemyRenderStatus[enemy.enemyNumber.toString()]["requestedValueTextSprite"].x =
								initialWindowWidth / 2 + 80 * (enemy.sPosition - 5) + (enemy.width - game.enemyRenderStatus[enemy.enemyNumber.toString()]["requestedValueTextMetrics"].width) / 2;
							game.enemyRenderStatus[enemy.enemyNumber.toString()]["requestedValueTextSprite"].y = enemy.yPosition + (enemy.height - game.enemyRenderStatus[enemy.enemyNumber.toString()]["requestedValueTextMetrics"].height) / 2;
							game.enemyRenderStatus[enemy.enemyNumber.toString()]["senderNameTextSprite"].x =
								initialWindowWidth / 2 + 80 * (enemy.sPosition - 5) + (enemy.width - game.enemyRenderStatus[enemy.enemyNumber.toString()]["senderNameTextMetrics"].width) / 2;
							game.enemyRenderStatus[enemy.enemyNumber.toString()]["senderNameTextSprite"].y = enemy.yPosition - (enemy.height - game.enemyRenderStatus[enemy.enemyNumber.toString()]["senderNameTextMetrics"].height) / 2 + 50;
						} else {
							renderedEnemiesOnFieldToDelete.push(enemy.enemyNumber.toString());
						}
					}

					for (let enemy in game.enemyRenderStatus) {
						if (game.enemyRenderStatus[enemy].toDestroy) {
							multiplayerScreenContainer.removeChild(game.enemyRenderStatus[enemy].enemySprite);
							multiplayerScreenContainer.removeChild(game.enemyRenderStatus[enemy].requestedValueTextSprite);
						}
					}

					for (let enemySprite of game.spritesOfRenderedEnemiesOnField) {
						if (!game.enemyRenderStatus.hasOwnProperty(enemySprite.enemyNumber.toString())) {
							renderedEnemiesOnFieldToDelete.push(enemySprite.enemyNumber.toString());
						}
					}

					// enemy sent indicators
					let enemiesSentIndicatorsToDelete = [];
					for (let i = 0; i < currentGameData.currentGame.enemiesSentIndicators.length; i++) {
						let indicator = currentGameData.currentGame.enemiesSentIndicators[i];
						if (indicator !== undefined && indicator !== null && indicator.ageInMilliseconds < 500) {
							if (game.enemiesSentIndicatorRenderStatus[indicator.number.toString()] === undefined) {
								// ???
								// create object
								game.enemiesSentIndicatorRenderStatus[indicator.number.toString()] = {};
								// create the indicator
								let enemiesSentIndicator = new PIXI.Text(currentGameData.currentGame.enemiesSentIndicators[i].content == "0" ? "" : currentGameData.currentGame.enemiesSentIndicators[i].content, textStyles.SIZE_64_FONT);
								enemiesSentIndicator.x = initialWindowWidth / 2 + 80 * (currentGameData.currentGame.enemiesSentIndicators[i].sPosition - 5);
								enemiesSentIndicator.y = 60 * (currentGameData.currentGame.enemiesSentIndicators[i].age / 600 - 5) * -1 + 300;
								// add to render

								game.enemiesSentIndicatorRenderStatus[indicator.number.toString()]["requestedValueTextSprite"] = enemiesSentIndicator;
								game.enemiesSentIndicatorRenderStatus[indicator.number.toString()]["rendered"] = true;
								// game.spritesOfRenderedEnemiesOnField.push(enemySprite);
								multiplayerScreenContainer.addChild(game.enemiesSentIndicatorRenderStatus[indicator.number.toString()]["requestedValueTextSprite"]);
							}
							game.enemiesSentIndicatorRenderStatus[indicator.number.toString()]["requestedValueTextSprite"].y = -24 * (currentGameData.currentGame.enemiesSentIndicators[i].ageInMilliseconds / 100 - 5) + 50;
						} else {
							enemiesSentIndicatorsToDelete.push(indicator.number.toString());
						}
					}

					// delete
					for (let numberToRemoveAsString of renderedEnemiesOnFieldToDelete) {
						game.enemyRenderStatus[numberToRemoveAsString.toString()] === undefined || multiplayerScreenContainer.removeChild(game.enemyRenderStatus[numberToRemoveAsString.toString()]["enemySprite"]);
						game.enemyRenderStatus[numberToRemoveAsString.toString()] === undefined || multiplayerScreenContainer.removeChild(game.enemyRenderStatus[numberToRemoveAsString.toString()]["requestedValueTextSprite"]);
						delete game.enemyRenderStatus[numberToRemoveAsString.toString()];
						game.renderedEnemiesOnField.splice(game.renderedEnemiesOnField.indexOf(numberToRemoveAsString), 1);
						game.spritesOfRenderedEnemiesOnField.splice(game.spritesOfRenderedEnemiesOnField.indexOf(numberToRemoveAsString), 1);
					}
					for (let numberToRemoveAsString of enemiesSentIndicatorsToDelete) {
						game.enemiesSentIndicatorRenderStatus[numberToRemoveAsString.toString()] === undefined ||
							multiplayerScreenContainer.removeChild(game.enemiesSentIndicatorRenderStatus[numberToRemoveAsString.toString()]["requestedValueTextSprite"]);
						delete game.enemiesSentIndicatorRenderStatus[numberToRemoveAsString.toString()];
					}
				}
				break;
			}
		}
	}
});
socket.on("finalRanks", (personalBestBroken, finalGlobalRank, scoreSaved) => {
	console.log(scoreSaved ? "Score saved!" : "Score not saved!");
	if (scoreSaved) {
		$("#personal-best-broken").text(personalBestBroken ? "New Personal Best!" : "");
		$("#final-global-rank").text(calculateMessageForGlobalRank(finalGlobalRank));
	} else {
		$("#personal-best-broken").text("Score not saved! Register for an account to save your scores!");
	}
});

socket.on("loginResult", (username, success) => {
	alert(success ? "Successfully logged in as " + username + "!" : " Failed to log in as" + " " + username + "!");
	$("#login-button").removeClass("disabled-button").text("Login");
	if (success) {
		$("#login-button").hide();
	}
});

socket.on("defaultMultiplayerRoomAction", (action, parameters) => {
	switch (action) {
		// used when someone joins or leaves
		case "updatePlayerList": {
			let formattedPlayers = "";
			for (let i = 0; i < parameters[0].length; i++) {
				formattedPlayers += parameters[0][i];
				if (i != parameters[0].length - 1) {
					formattedPlayers += "<br>";
				}
			}
			$("#default-multiplayer-room-player-list").html(formattedPlayers);
			break;
		}
		case "updateStatusText": {
			$("#default-multiplayer-room-status-text").text(parameters[0]);
			break;
		}
		case "switchToGameContainer": {
			$("#pixi-canvas").show(0);
			$("#default-multiplayer-room-lobby-screen-container").hide(0);
			currentScreen = "multiplayerGameScreen";
			setPropertiesAndChangeScreen(screens.MULTIPLAYER_GAME_SCREEN);
			multiplayerScreenContainer.visible = true;
			break;
		}
		case "updateChatBox": {
			let name = document.createElement("span");
			name.appendChild(document.createTextNode(parameters[0].toString()));
			if (parameters[2] == "special") {
				name.classList.add("rainbow-letters");
			} else {
				name.style.color = parameters[2];
			}

			name.append(": ");
			let name2 = document.createElement("span");
			name2.append(parameters[1].toString());
			name2.style.color = "#000000";
			name.append(name2);
			$(".multiplayer-room-chat-box").prepend(name);

			break;
		}
		case "updateRanks": {
			$("#last-game-ranks-content").html("");
			for (let i = 0; i < parameters[0].length; i++) {
				$("#last-game-ranks-content").prepend(`#${parameters[0][i][0][0]} ${parameters[0][i][0][1]} ${turnMillisecondsToTime(parameters[0][i][0][2])}`);
				$("#last-game-ranks-content").prepend(`<br>`);
			}
		}
	}
});

socket.on("updateText", (selector, text) => {
	$(selector).text(text);
});

// important
socket.on("disconnect", (reason) => {
	alert("Disconnected from server. Click OK to refresh page. Technical Stuff: " + reason);
	location.reload();
});
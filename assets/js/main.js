async function indexDBCheck() {
	await IDB.initDB().then(async (res) => {
		if (res === 'DBEXISTS') {
			startGame();
		} else {
			$(() => {
				$('#titleScreen').css({ "display": "flex" });
				if (options?.title) {
					$('#titleHeader').html(options.title.toUpperCase());
				}
				if (options?.author) {
					$('#titleAuthor').html(options.author.toUpperCase());
				}
				if (options?.tagline) {
					$('#titleTag').html(options.tagline.toUpperCase());
				}
				$(window).on("click", () => {
					startDatabase();
				});

				$(window).on("keydown", (e) => {
					const key = (!e.which ? e.keyCode : e.which);
					if (key) {
						startDatabase();
					}
				});
			});
		}
	}).catch(() => alert((options.test_mode) ? "ERROR: MAIN_INDEXDBCHECK_CATCH" : engineError));
};

function startDatabase() {
	$(window).off("click");
	$(window).off("keydown");

	$('#titleScreen').fadeOut(async () => {
		$('#loading').css({ "display": "flex" });
		const dbSize = await IDB.dbSize();
		if (confirm(options.title + " WILL NEED TO SAVE " + dbSize + " OF GAME DATA TO YOUR WEB BROWSER.") === true) {
			await IDB.populateDB().then(() => {
				startGame();
			}).catch((error) => $('#loadingPara').html(error));
		} else {
			$('#loadingPara').html("SORRY, YOU WON'T BE ABLE TO PLAY WITHOUT SAVING THE GAME DATA. REFRESH THE PAGE IF YOU WOULD LIKE TO DO SO.");
		}
	});
}

async function startGame() {
	$(window).off("click");
	$(window).off("keydown");

	//DOUBLE CHECK DATABASE EXISTS
	const sceneCheck = await IDB.getByStore('scenes');
	if (!sceneCheck || sceneCheck.length === 0) {
		startDatabase();
	} else {
		//LOAD ADDITIONAL ASSETS
		await loadAssets().then(() => {
			if (player.end === 1) {
				endGame();
			} else {
				$('#loading').fadeOut(async () => {
					$('#wrapper').css({ "display": "flex" });
					//START GAME ACTIONS
					//CURSOR OPTIONS
					$('#commandInput').on("focusin", () => {
						$('#cursor').css({ visibility: 'visible' });
					})

					$('#commandInput').on("focusout", () => {
						$('#cursor').css({ visibility: 'hidden' });
					})

					$(window).on("click", () => {
						$('#commandInput').trigger("focus");
					});

					//DON'T ALLOW ARROW KEYS
					$(window).on("keydown", (e) => {
						const key = (!e.which ? e.keyCode : e.which);
						//37 = LEFT ARROW, 38 = UP ARROW, 39 = RIGHT ARROW, 40 = DOWN ARROW
						if (key == 37 || key == 38 || key == 39 || key == 40) {
							return false;
						} else {
							$('#commandInput').trigger("focus");
						}
					});

					$('#commandInput').on("keyup", async function (e) {
						const key = (!e.which ? e.keyCode : e.which);
						$('#commandDisplay').html($(this).val().toUpperCase());

						//32 = SPACE
						if (key == 32) {
							$('#cursor').css({ marginLeft: "20px" });
						} else {
							$('#cursor').css({ marginLeft: "0px" });
						}

						//13 = ENTER
						if (key == 13 && $('#commandDisplay').html() != '') { //SANITIZE INPUT
							let playerInput = $('#commandDisplay').html().trim().toUpperCase().replace(/\s+/g, ' ');
							let playerPunct = playerInput[playerInput.length - 1];

							//REMOVE ENDING PUNCTUATION
							if (playerPunct === '!'
								|| playerPunct === '.'
								|| playerPunct === '?'
								|| playerPunct === ','
								|| playerPunct === ';'
							) {
								playerInput = playerInput.substring(0, playerInput.length - 1);
							} else {
								playerPunct = '';
							};

							const safeCMD = await CMD.removeProfanity(playerInput);
							await writeToScreen(['>' + safeCMD + playerPunct]);
							const cmdRes = await CMD.command(safeCMD); //SEND COMMAND AND PRINT RESULT

							//IF CMD RESPONSE
							if (cmdRes) {
								if (cmdRes.error) {
									showError(cmdRes.error);
								} else {
									if (player.hasOwnProperty('moves') && !cmdRes.noMovement) {
										await updateMoves();
									}
									$('#currentScore > h4').html((player.hasOwnProperty('score')) ? 'SCORE: ' + player.score : '');

									//IF END GAME
									if (cmdRes.end_game) {
										endGame(cmdRes);
									} else {
										if (cmdRes.sceneTitle) {
											$('#currentScene > h4').html(cmdRes.sceneTitle);
										}

										inventoryToggle();
										writeToInventory();

										if (cmdRes?.response) {
											writeToScreen(cmdRes.response);
										}

										if (cmdRes.setCommand) {
											writeToCommand(cmdRes.setCommand);
										}

										if (cmdRes.fx) {
											window[cmdRes.fx]();
										}
									}
								}
							} else {
								showError("STARTGAME_CMDRES_NO");
							}
						}
					});

					$('.ACTIONITEM, .ACTIONDIRECTION, .ACTIONCHARACTER, .ACTIONDOOR').off("click");
					$('.ACTIONITEM, .ACTIONDIRECTION, .ACTIONCHARACTER, .ACTIONDOOR').on("click", function () {
						writeToCommand($(this).text());
					});

					$('#commandInput').trigger("focus");
					$('#commandInput').val('');

					//GET SCENE FOR INITIAL PAGE LOAD
					const setPlayer = await CMD.command('SETPLAYER ' + player.scene, 1);
					if (setPlayer.error) {
						showError(setPlayer.error);
					} else {
						//SET CURRENT SCENE HEADER AND WRITE SCENE RESPONSE
						$('#currentScene > h4').html((setPlayer?.sceneTitle || ''));
						$('#moveCounter > h4').html((player.hasOwnProperty('moves')) ? 'MOVES: ' + player.moves : '');
						$('#currentScore > h4').html((player.hasOwnProperty('score')) ? 'SCORE: ' + player.score : '');

						//WRITE TO INVENTORY
						inventoryToggle();
						writeToInventory();

						await writeToScreen(setPlayer.response);
					}
				});
			}
		}).catch((error) => $('#loadingPara').html(error));
	}
}

function loadAssets() {
	//LOAD GAME ASSET FILES 
	//CAPITALIZE ALL STRING VALUES FOR FULL COMPATABILITY
	//PARSE INT ALL NUMBER VALUES
	//PROFANITY
	return new Promise(async (resolve, reject) => {
		try {
			scenes = await IDB.getByStore('scenes').catch(() => { return reject((options.test_mode) ? 'ERROR: MAIN_LOADASSETS_SCENES' : engineError) }) || [];
			items = await IDB.getByStore('items').catch(() => { return reject((options.test_mode) ? 'ERROR: MAIN_LOADASSETS_ITEMS' : engineError) }) || [];
			doors = await IDB.getByStore('doors').catch(() => { return reject((options.test_mode) ? 'ERROR: MAIN_LOADASSETS_DOORS' : engineError) }) || [];
			characters = await IDB.getByStore('characters').catch(() => { return reject((options.test_mode) ? 'ERROR: MAIN_LOADASSETS_CHARACTERS' : engineError) }) || [];
			events = await IDB.getByStore('events').catch(() => { return reject((options.test_mode) ? 'ERROR: MAIN_LOADASSETS_EVENTS' : engineError) }) || [];
			player = await IDB.getByStoreWithKeys('player').catch(() => { return reject((options.test_mode) ? 'ERROR: MAIN_LOADASSETS_OPTIONS' : engineError) }) || [];

			$.getJSON("assets/json/profanity.json", (prof) => {
				profanity = prof;
				if (profanity?.profanity && profanity.profanity.length > 0) {
					for (let i = 0; i < profanity.profanity.length; i++) {
						profanity.profanity[i] = profanity.profanity[i].toUpperCase();
					}
				}
				if (profanity?.safewords && profanity.safewords.length > 0) {
					for (let ii = 0; ii < profanity.safewords.length; ii++) {
						profanity.safewords[ii] = profanity.safewords[ii].toUpperCase();
					}
				}
			}).then(() => {
				//ACTIONS
				$.getJSON("assets/json/actions.json", async (a) => {
					actions = a.actions;
					if (actions && actions.length > 0) {
						for (let i = 0; i < actions.length; i++) {
							actions[i] = await normalize(actions[i]);
						}
					}
				}).then(() => {
					import('./modules/command.js')
						.then(cmdmodule => {
							CMD = cmdmodule;
							return resolve();
						})
						.catch(() => reject((options.test_mode) ? 'ERROR: MAIN_LOADASSETS_COMMAND' : engineError));
				}).fail(() => {
					return reject((options.test_mode) ? 'ERROR: MAIN_LOADASSETS_ACTIONS' : engineError);
				});
			}).fail(() => {
				return reject((options.test_mode) ? 'ERROR: MAIN_LOADASSETS_PROFANITY' : engineError);
			});
		} catch (e) {
			return reject((options.test_mode) ? 'ERROR: MAIN_LOADASSETS_CATCH' : engineError);
		}
	})
}

//LOOP THROUGH ALL MESSAGES
async function writeToScreen(messages) {
	$(window).off("keyup click");
	//CLEAR AND DISABLE PLAYER INPUT WHILE PRINTING
	$('#commandInput').val('');
	$('#commandDisplay').html('');
	$('#cursor').css({ visibility: 'hidden' });
	$('#commandInput').prop("disabled", true);

	for (let x = 0; x < messages.length; x++) {
		//CHECK FOR MESSAGE PAUSE
		if (messages[x] === '---' || messages[x] === '@@@') {
			const fullClear = (messages[x] === '---') ? 1 : 0;
			messages.splice(x, 1);
			writeToScreen(["===PLEASE_PUSH_ANY_KEY_TO_CONTINUE."]);
			$(window).on("keyup click", () => {
				if (fullClear) {
					$('#storybook').html('');
				} else {
					$("#storybook > p:last-child").remove();
				}
				writeToScreen(messages);
			});
			break;
		}

		$('#storybook').append('<p class="monologuist textStyle"></p>');
		await typewriter(messages[x])
			.then(() => {
				if (x === messages.length - 1) {
					//WHEN FINAL MESSAGE COMPLETE REANABLE PLAYER INPUT
					$('#cursor').css({ visibility: 'visible' });
					$('#commandInput').prop("disabled", false);
				}
			});
		messages.splice(x, 1);
		x--;
	}
	$('.ACTIONITEM, .ACTIONDIRECTION, .ACTIONCHARACTER, .ACTIONDOOR').off("click");
	$('.ACTIONITEM, .ACTIONDIRECTION, .ACTIONCHARACTER, .ACTIONDOOR').on("click", function () {
		writeToCommand($(this).text());
	});
}

//LOOP THROUGH AND PRINT MESSAGE WORD BY WORD
async function typewriter(message, endGame) {
	return new Promise(async (resolve, reject) => {
		message = message.split(' ');

		let i = 0;
		const write = () => {
			let printMsg = message[i];
			//CHECK FOR SPECIAL WORDS
			const wordDecoration = message[i].slice(0, 3);
			//CHECK FOR PUNCTUATION
			let punctCheck = message[i].slice(-1);
			let sliced = message[i].slice(3).replaceAll('_', ' ');

			if (punctCheck === '.' || punctCheck === ',' || punctCheck === '?' || punctCheck === '!' || punctCheck === ';' || punctCheck === ':' || punctCheck === '-') {
				sliced = sliced.slice(0, -1);
			} else {
				punctCheck = '';
			};

			//SET SPECIAL WORDS
			if (wordDecoration === '^^^') {//DIRECTIONS && SCENES
				let printName = sliced;
				const sceneToPrint = scenes.filter((scene) => {
					return sliced === scene.name;
				})[0];
				if (sceneToPrint) {
					printName = (!sceneToPrint.title) ? sceneToPrint.name : sceneToPrint.title;
				}
				printMsg = '<span class="ACTIONWRAP">' + ((options.show_image === 0 || player.show_image === 0) ? '' : '<span class="DIRECTIONIMAGE"><img src="assets/images/arrows.png"></span>') + ((options.show_decoration === 0 || player.show_decoration === 0) ? '<span>' : '<span class="ACTIONDIRECTION">') + printName + '</span></span>' + punctCheck;
			} else if (wordDecoration === '|||') {//ITEMS
				//GET ITEM SET RESPONSE
				const itemToPrint = items.filter((item) => {
					return sliced === item.name;
				})[0];
				printMsg = '<span class="ACTIONWRAP">' + ((options.show_image === 0 || player.show_image === 0) ? '' : '<span class="IMAGESIZE">' + ((itemToPrint.image) ? itemToPrint.image : '') + '</span>') + ((options.show_decoration === 0 || player.show_decoration === 0) ? '<span>' : '<span class="ACTIONITEM">') + ((!itemToPrint.title) ? itemToPrint.name : itemToPrint.title) + '</span></span>' + punctCheck;
			} else if (wordDecoration === '+++') {//SCENE TITLE
				const sceneToPrint = scenes.filter((scene) => {
					return sliced === scene.name;
				})[0];
				printMsg = '<span class="ACTIONWRAP">' + ((options.show_image === 0 || player.show_image === 0) ? '' : '<span class="IMAGESIZE">' + ((sceneToPrint.image) ? sceneToPrint.image : '') + '</span>') + '<span class="UNDERLINED">' + ((!sceneToPrint.title) ? sceneToPrint.name : sceneToPrint.title) + '</span></span>' + punctCheck;
			} else if (wordDecoration === '***') {//DOORS
				const doorToPrint = doors.filter((door) => {
					return sliced === door.name;
				})[0];
				printMsg = '<span class="ACTIONWRAP">' + ((options.show_image === 0 || player.show_image === 0) ? '' : '<span class="IMAGESIZE">' + ((doorToPrint.image) ? doorToPrint.image : '') + '</span>') + ((options.show_decoration === 0 || player.show_decoration === 0) ? '<span>' : '<span class="ACTIONDOOR">') + ((!doorToPrint.title) ? doorToPrint.name : doorToPrint.title) + '</span></span>' + punctCheck;
			} else if (wordDecoration === '###') {//CHARACTERS
				const characterToPrint = characters.filter((character) => {
					return sliced === character.name;
				})[0];
				printMsg = '<span class="ACTIONWRAP">' + ((options.show_image === 0 || player.show_image === 0) ? '' : '<span class="IMAGESIZE">' + ((characterToPrint.image) ? characterToPrint.image : '') + '</span>') + ((options.show_decoration === 0 || player.show_decoration === 0) ? '<span>' : '<span class="ACTIONCHARACTER">') + ((!characterToPrint.title) ? characterToPrint.name : characterToPrint.title) + '</span></span>' + punctCheck;
			} else if (wordDecoration === '___') {///UNDERLINE
				printMsg = '<span class="UNDERLINED">' + sliced + '</span>' + punctCheck;
			} else if (wordDecoration === '///') {//ITALICS
				printMsg = '<span class="ITALICIZED">' + sliced + '</span>' + punctCheck;
			} else if (wordDecoration === '%%%') {//IMAGE
				printMsg = '<span class="IMAGESIZE">' + sliced + '</span>' + punctCheck;
			} else if (wordDecoration === '>>>') {//LINE BREAKS
				printMsg = '</br>';
			} else if (wordDecoration === '~~~') {//CENTER
				printMsg = '<span class="MONOLOGUISTCENTER">' + sliced + punctCheck + '</span>';
			} else if (wordDecoration === "===") {
				printMsg = '<span class="MONOLOGUIST TEXTBLINK">' + sliced + punctCheck + '</span>';
			} else if (wordDecoration === 'C64') {//FONT LINK
				printMsg = '<span class="MONOLOGUISTCENTER">FONT - <a class="textStyle" href="http://style64.org/c64-truetype" target="_blank">C64 PRO</a></span>';
			} else if (wordDecoration === "CPR") {//COPYRIGHT : THIS IS REQUIRED TO CONFORM WITH THE LICENSE REQUIREMENTS OF THIS PROGRAM, DO NOT REMOVE!!!!
				printMsg = '<span class="MONOLOGUISTCENTER">LOSTKEY TEXT PARSER VERSION 1.0 IS LICENSED UNDER <a class="textStyle" href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank">CC BY-NC-SA 4.0.</a> AND IS A TRADEMARK OF <a class="textStyle" href="http://www.vanderloski.com" target="_blank">JOSEPH VANDERLOSKI</a> ©' + romanticize(new Date().getFullYear()) + ' ALL RIGHTS RESERVED</span>';
			}

			if (wordDecoration === "CPR") {
				$("#storybook > p:last-child").append(printMsg + " ");
			} else {
				if (endGame === 1) {
					$("#storybook_end > p:last-child").append(printMsg.toUpperCase() + " ");
				} else {
					$("#storybook > p:last-child").append(printMsg.toUpperCase() + " ");
				}
			}

			$("#storybook").scrollTop($("#storybook")[0].scrollHeight);

			if (i < message.length - 1) {
				i += 1;
				setTimeout(() => write(), 10);
			} else {
				resolve();
			}
		};
		write();
	});
};

async function writeToInventory() {
	$('#inventoryList').html('');
	const setInv = await CMD.command('LISTINVENTORY', 1);
	if (setInv?.inventory) {
		for (let i = 0; i < setInv.inventory.length; i++) {
			$('#inventoryList').prepend("<li class='textStyle'>" + ((options.show_image === 0 || player.show_image === 0) ? "" : "<span class='IMAGESIZE ITEMIMAGE'>" + (setInv.inventory[i].image || '') + "</span>") + ((options.show_decoration === 0 || player.show_decoration === 0) ? "<span class='ITEMNAME textStyle'>" : "<span class='ITEMNAME ACTIONITEM textStyle'>") + setInv.inventory[i].item.toUpperCase() + ((setInv.inventory[i].owner) ? " [" + setInv.inventory[i].owner + "]" : "") + "</span></li>");
		}
	}
}

function writeToCommand(command) {
	const curCommand = $('#commandInput').val();
	const spaceCheck = curCommand.slice(-1);

	if (spaceCheck === ' ' || !spaceCheck) {
		command = curCommand + command;
	} else {
		command = curCommand + " " + command;
	}

	$('#commandInput').val(command.toUpperCase());
	$('#commandDisplay').html(command.toUpperCase());
	$('#cursor').css({ marginLeft: "0px" });
}

async function updateMoves() {
	//UPDATE MOVES COUNTER DISPLAY
	player.moves = player.moves + 1;
	const updateMoves = await IDB.setValue('player', player.moves, 'moves').catch(() => { return { error: "MAIN_MOVES_IDB_ERROR" } });
	if (updateMoves?.error) {
		return showError("MAIN_MOVES_UPDATE_ERROR");
	}
	$('#moveCounter > h4').html('MOVES: ' + player.moves);
}

async function endGame(cmdRes) {
	//IF NO RESPONSE MAKE SURE IT EXISTS
	let endResp = cmdRes?.response;
	const checkResp = events.filter((e) => {
		return e.name === "END_GAME";
	})[0];

	if (!endResp && checkResp?.effect) {
		endResp = [checkResp?.effect?.response];
	}

	$('#commandInput').attr('disabled', 'true');
	if (!player.end) {
		player.end = 1;
		const updateEnd = await IDB.setValue('player', player.end, 'end').catch(() => { return { error: "MAIN_END_IDB_ERROR" } });
		if (updateEnd?.error) {
			return showError("MAIN_END_UPDATE_ERROR");
		}
	}

	var fadeTimer = 500; // 1 second
	$('#banner').addClass('bannerHide');
	$('#wrapper').addClass('wrapperHide');

	setTimeout(async () => {
		$('#wrapper').hide();
		$('#endScreen').css("display", "block");

		if (endResp) {
			endResp.push("===PLEASE_PUSH_ANY_KEY_TO_CONTINUE.")
			for (let x = 0; x < endResp.length; x++) {
				$('#storybook_end').append('<p class="monologuist textStyle"></p>');
				await typewriter(endResp[x], 1);
				endResp.splice(x, 1);
				x--;
			}

			$(window).on("keyup click", () => {
				$(window).off("keyup click");
				$('#storybook_end').addClass('wrapperHide');
				setTimeout(async () => {
					$('#storybook_end').hide();
					$('#creditsWrapper').css("display", "flex");
					$('#creditsButtons_Left').show();
					$('#creditsButtons_Right').css({
						"width": "50%",
						"display": "flex",
						"textAlign": "right",
						"justifyContent": "right"
					});
					$('#creditsHeader').html(options.credits_title);
					if (options?.credits) {
						for (let c = 0; c < options.credits.length; c++) {
							$('#credits').append('<p class="textStyle">' + options.credits[c] + '</p>');
						}
					}
					if (options.score === 1) {
						$('#credits').append('<p class="textStyle">YOU SCORED ' + player.score + ((options.score_total) ? ' OUT OF ' + options.score_total : '') + ' POINTS.</p>');
					}
					if (options.moves === 1) {
						$('#credits').append('<p class="textStyle">YOU MADE ' + player.moves + ' MOVES.</p>');
					}

					$('#creditsButtons_Left_Button').on("click", () => {
						$('#creditsButtons_Left_Button').off("click");
						location.reload();
					});

					$('#creditsButtons_Right_Button').on("click", () => {
						if (IDB.deleteDB()) {
							location.reload();
						};
					});
				}, fadeTimer);
			});
		} else {
			$('#storybook_end').hide();
			$('#creditsWrapper').css("display", "flex");
			$('#creditsHeader').html(options.credits_title);
			if (options?.credits) {
				for (let c = 0; c < options.credits.length; c++) {
					$('#credits').append('<p class="textStyle">' + options.credits[c] + '</p>');
				}
			}
			if (options.score === 1) {
				$('#credits').append('<p class="textStyle">YOU SCORED ' + player.score + ((options.score_total) ? ' OUT OF ' + options.score_total : '') + ' POINTS.</p>');
			}
			if (options.moves === 1) {
				$('#credits').append('<p class="textStyle">YOU MADE ' + player.moves + ' MOVES.</p>');
			}

			$('#creditsButtons_Right_Button').on("click", () => {
				if (IDB.deleteDB()) {
					location.reload();
				};
			});
		}
	}, fadeTimer);
}
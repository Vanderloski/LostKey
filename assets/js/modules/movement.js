//MODULE FOR PLAYER MOVEMENT AND PLACEMENT
export const movement = async (command) => {
	if (command.action?.action) {
		if (command.action?.type === "SETPLAYER") {
			return await setScene(command);
		} else if (command.action.type === "MOVEPLAYER" || command.action.type === "MOVEPLAYERACTION" || command.action.type === "MOVEPLAYERSCENE") {
			return await movePlayer(command);
		} else if (command.action?.type === "ENTEREXIT") {
			return await enterExit(command);
		} else {
			return false;
		}
	} else {
		return { error: 'MOVEMENT_NO_ACTION' };
	}
}

async function setScene(command) {
	const respArr = [];
	const scene = command.object;
	let sceneDesc = scene.description;

	//CHECK IF FIRST PLAY AND OPENING IS NEEDED
	if (player?.first !== 1) {
		//SET LICENSE INFO
		respArr.push(((options?.title) ? "~~~" + options.title.replaceAll(" ", "_") : "") + ((options?.author) ? " ~~~A_PARTICIPATIVE_NARRATIVE_BY_" + options.author.replaceAll(" ", "_") + "_©" + romanticize(new Date().getFullYear()) : ""));
		
		//THIS IS REQUIRED TO CONFORM WITH THE LICENSE REQUIREMENTS OF THIS PROGRAM, DO NOT REMOVE!!!!
		respArr.push("CPR C64 >>> >>> ~~~YOU_CAN_TYPE_HELP_AT_ANYTIME_FOR_HINTS_ON_HOW_TO_PLAY. >>> >>>");
		//////////////////

		const openScene = scenes.filter((s) => {
			return s.name === "INTRODUCTION";
		})[0];

		if (openScene) {
			respArr.push(openScene.description);
		}

		player.first = 1;
	}

	//CHECK LIGHT OF CURRENT SCENE
	const curIsLight = sceneLight(scene);
	if (!curIsLight) {
		sceneDesc = "IT'S TOO DARK TO SEE ANYTHING.";
	}
	respArr.push('+++' + scene.name.replaceAll(' ', '_'), sceneDesc);
	player.scene = scene.name;

	const updateScene = await IDB.setValue('player', scene.name, 'scene').catch(() => { return { error: "SETSCENE_UPDATE_SCENE_IDB_ERROR" } });
	const updateFirst = await IDB.setValue('player', player.first, 'first').catch(() => { return { error: "SETSCENE_UPDATE_FIRST_ERROR" } });
	if (!updateScene?.error && !updateFirst?.error) {
		return {
			response: respArr,
			sceneTitle: (!scene.title) ? scene.name : scene.title,
			noMovement: 1
		};
	} else {
		return { error: "SETSCENE_UPDATE_ERROR" };
	}
}

async function movePlayer(command) {
	const action = command?.action;
	const object = command?.object;
	const respArr = [];
	let isExit;
	if (action.type === "MOVEPLAYERACTION" && !object) {
		return {
			response: ["WHERE WOULD YOU LIKE TO " + action.originalAction + "?"],
			noMovement: 1
		};
	}

	if (action.originalAction === "DRIVE") {
		const isVeh = items.filter((it) => {
			return it.name === player.owner;
		})[0];
		if (!player.owner && isVeh?.container !== "V") {
			return {
				response: ["YOU ARE NOT CURRENTLY INSIDE A VEHICLE."],
				noMovement: 1
			}
		}
	}

	//SET MOVEMENT, IF NO OBJECT ACTION IS MOVEMENT
	const move = object?.name || action.action;

	//GET CURRENT SCENE OBJECT
	const sceneObj = scenes.filter((s) => {
		return s.name === player.scene;
	})[0];

	if (sceneObj) {
		//CHECK LIGHT OF CURRENT SCENE
		const curIsLight = sceneLight(sceneObj);
		if (!curIsLight) {
			return {
				response: ["IT'S TOO DARK TO KNOW WHICH WAY THAT IS."],
				noMovement: 1
			}
		}

		//CHECK EXITS
		if (sceneObj?.exits) {
			//CHECK BY DIRECTION
			isExit = sceneObj.exits.filter((exit) => {
				return exit.direction === move;
			})[0];
			//IF NO EXIT CHECK BY SCENE
			if (!isExit) {
				isExit = sceneObj.exits.filter((exit) => {
					const nameNoThe = removeThe(exit.scene);
					return nameNoThe === move;
				})[0];
			}
		}

		//IF STILL NO EXIT FOUND, SEND RESPONSE
		if (!isExit || isExit.length === 0) {
			return {
				response: ["YOU CAN'T GO THAT WAY."],
				noMovement: 1
			};
		} else {
			//CHECK IF PASSABLE
			if (isExit?.impassable) {
				return {
					response: [isExit.impassable_message || "YOU CAN'T GO THAT WAY."],
					noMovement: 1
				};
			}

			//GET ITEM OWNER
			const owner = items.filter((it) => {
				return it.name === player.owner;
			})[0];

			if (isExit?.vehicle_required) {
				if (!owner || owner?.container !== "V") {
					return {
						response: [isExit.vehicle_message || "THAT WAY IS UNTRAVERSABLE WITHOUT A VEHICLE."],
						noMovement: 1
					}
				}
			}

			const newSceneObj = scenes.filter((s) => {
				return s.name === isExit.scene;
			})[0];
			if (newSceneObj) {
				//IF OWNER AND EXIT DOESNT REQUIRE VEHICLE
				if (owner && isExit.vehicle_required !== 1) {
					//EXIT THE CONTAINER
					respArr.push("///YOU_EXIT_" + addThe(owner) + ".");
					player.owner = "";
					const newOwner = await IDB.setValue('player', player.owner, 'owner').catch(() => { return { error: "MOVEPLAYER_OWNER_IDB_ERROR" } });
					if (newOwner?.error) {
						return newOwner;
					}
				}

				//CHECK FOR DOORS BETWEEN SCENES
				const hasDoor = doors.filter((d) => {
					if (d.scene === sceneObj.name || d.scene === newSceneObj.name) {
						if (d?.paths && d.paths.length > 0) {
							return d.paths.filter((dp) => {
								return dp.scene === sceneObj.name || dp.scene === newSceneObj.name;
							})[0];
						} else {
							return false;
						}
					} else {
						return false;
					}
				})[0];

				//CHECK IF LOCKED AND RETURN MESSAGE IF IT IS
				if (hasDoor?.locked === 1) {
					let lockMsg = hasDoor.locked_message;
					if (hasDoor.scene !== player.scene) {
						const sceneDoor = hasDoor.paths.filter((p) => {
							return p.scene === player.scene;
						})[0];
						lockMsg = sceneDoor.locked_message;
					}
					respArr.push(lockMsg || "YOU CANNOT GO THAT WAY, THE DOOR IS LOCKED.");
					return {
						response: respArr,
						noMovement: 1
					}
				} else {
					//CHECK IF DOOR IS CLOSED, OPEN AUTOMATICALLY
					if (hasDoor && hasDoor.open !== 1) {
						respArr.push("///YOU_OPEN_" + addThe(hasDoor) + ".");

						hasDoor.open = 1;
						const doorOpen = await IDB.setValue('doors', hasDoor).catch(() => { return { error: "MOVEPLAYER_DOOR_IDB_ERROR" } });
						if (doorOpen?.error) {
							return doorOpen;
						}
					}

					//CHECK LIGHT OF NEW SCENE
					const isLight = sceneLight(newSceneObj);
					//CHECK IF PLAYER IS HOLDING A LIGHT SOURCE
					const equipLight = items.filter((it) => {
						return it.owner === "PLAYER" && it.light_source === 1 && it.on === 1;
					})[0];
					if (!isLight || !equipLight) {
						return {
							response: ["IT'S TOO DARK TO GO THAT WAY."],
							noMovement: 1
						}
					}

					//UPDATE CURRENT SCENE TO NEW SCENE
					player.scene = newSceneObj.name;
					const updateCurScene = await IDB.setValue('player', player.scene, 'scene').catch(() => { return { error: "MOVEPLAYER_CURSCENE_IDB_ERROR" } });
					if (!updateCurScene?.error) {
						//IF OWNER MOVE CONTAINER TO NEW SCENE WITH PLAYER
						if (player.owner) {
							owner.scene = newSceneObj.name;
							const updateOwnerScene = await IDB.setValue('items', owner).catch(() => { return { error: "MOVEPLAYER_ITEM_OWNER_IDB_ERROR" } });
							if (updateOwnerScene?.error) {
								return updateOwnerScene;
							}
						}
						//GET SCENE INFO
						const title = '+++' + newSceneObj.name.replaceAll(' ', '_');
						const printTitle = (!newSceneObj.title) ? newSceneObj.name : newSceneObj.title;
						const description = newSceneObj.description;
						//PUSH TITLE
						respArr.push(title);
						//CHECK IF FIRST TIME VISITING SCENE & SCENE HAS INTRODUCTION
						if (!newSceneObj.visited && newSceneObj?.introduction) {
							respArr.push(newSceneObj.introduction);
						} else {
							respArr.push(description);
						}

						//CHECK IF ANY FOLLOWERS
						const followers = await checkFollowers();
						if (followers?.error) {
							return followers;
						}

						return {
							response: respArr,
							sceneTitle: printTitle
						};
					} else {
						return updateCurScene;
					}
				}
			} else {
				return { error: "MOVEPLAYER_NEWSCENE_NOTFOUND" };
			}
		}
	} else {
		return { error: "MOVEPLAYER_CURRENTSCENE_NOTFOUND" };
	}
}

async function enterExit(command) {
	const action = command?.action;
	const object = command?.object;
	const prep = command?.action?.preposition;
	const rspMsg = [];

	if (!object) {
		return {
			response: ["WHAT WOULD YOU LIKE TO " + action.originalAction + "?"],
			setCommand: action.originalAction + " ",
			noMovement: 1
		};
	}

	if (object.scene !== player.scene) {
		return {
			response: ["YOU CANNOT CURRENTLY SEE THAT."],
			noMovement: 1
		}
	} else if ((action.originalAction === "ENTER" || prep[0] === "INTO" || prep[0] === "IN") && object.name === player.owner) {
		return {
			response: ["YOU ARE ALREADY INSIDE " + addThe(object) + "."],
			noMovement: 1
		}
	} else if ((action.originalAction === "EXIT" || prep[0] === "OUT") && !player.owner) {
		return {
			response: ["YOU ARE ALREADY OUTSIDE " + addThe(object) + "."],
			noMovement: 1
		}
	} else if ((action.originalAction === "EXIT" || prep[0] === "OUT") && player.owner !== object.name) {
		return {
			response: ["YOU ARE NOT CURRENTLY INSIDE " + addThe(object) + "."],
			noMovement: 1
		}
	} else if (object.container !== "V" && object.container_allow_player !== 1) {
		return {
			response: ["YOU CANNOT " + action.originalAction + " THAT."],
			noMovement: 1
		}
	} else {
		if (action.originalAction === "ENTER" || prep[0] === "INTO" || prep[0] === "IN") {
			if (player.owner) {
				const curOwner = items.filter((it) => {
					return it.name === player.owner;
				})[0];
				rspMsg.push("YOU EXIT " + addThe(curOwner) + ".");
			}
			player.owner = object.name;
		} else {
			player.owner = "";
		}

		const newOwner = await IDB.setValue('player', player.owner, 'owner').catch(() => { return { error: "ENTEREXIT_OWNER_IDB_ERROR" }; });
		if (newOwner?.error) {
			return newOwner;
		}

		//CHECK IF ANY FOLLOWERS
		const followers = await checkFollowers();
		if (followers?.error) {
			return followers;
		}

		const respAction = action.originalAction + ((prep[0]) ? " " + prep[0] : "") + ((prep[1]) ? " " + prep[1] : "");
		rspMsg.push("YOU " + respAction + " " + addThe(object) + ".");
		return { response: rspMsg };
	}
}

async function checkFollowers() {
	//CHECK FOR FOLLOWERS
	const followers = characters.filter((c) => {
		return c.follow;
	});

	if (followers && followers.length > 0) {
		for (let i = 0; i < followers.length; i++) {
			let fScene = player.scene;
			let fOwner = player.owner;
			if (followers[i].follow !== "PLAYER") {
				const leader = characters.filter((l) => {
					return l.name === followers[i].follow;
				})[0];
				fScene = leader.scene;
				fOwner = leader.owner;
			}
			followers[i].scene = fScene;
			followers[i].owner = fOwner;
			const updateFollow = await IDB.setValue('characters', followers[i]).catch(() => { return { error: "MOVEPLAYER_FOLLOWER_IDB_ERROR" } });
			if (updateFollow?.error) {
				return updateFollow;
			}
		}
	}
}
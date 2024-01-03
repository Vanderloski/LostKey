//MODULE FOR PLAYER MOVEMENT AND PLACEMENT
export const movement = async (command) => {
	if (command.action?.action) {
		if (command.action?.type === "SETPLAYER") {
			return await setScene(command);
		} else if (command.action.type === "MOVEPLAYER" || command.action.type === "MOVEPLAYERACTION" || command.action.type === "MOVEPLAYERSCENE") {
			return await movePlayer(command);
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

	//CHECK IF FIRST PLAY AND OPENING IS NEEDED
	if (player?.first !== 1) {
		const openScene = scenes.filter((s) => {
			return s.name === "INTRODUCTION";
		})[0];

		if (openScene) {
			respArr.push(openScene.description);
		}

		player.first = 1;
	}

	respArr.push('+++' + scene.name.replaceAll(' ', '_'), scene.description);
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

	//SET MOVEMENT, IF NO OBJECT ACTION IS MOVEMENT
	const move = object?.name || action.action;

	//GET CURRENT SCENE OBJECT
	const sceneObj = scenes.filter((s) => {
		return s.name === player.scene;
	})[0];

	if (sceneObj) {
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

						return {
							response: respArr,
							sceneTitle: printTitle
						};
					} else {
						return { error: "MOVEPLAYER_UPDATE_ERROR" };
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
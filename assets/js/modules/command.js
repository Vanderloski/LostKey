//CLASSES
let MC, ITEM, DOOR, CHARACTER, SYSTEM, EVENT;

await import('./movement.js')
	.then(module => {
		MC = module;
	})
	.catch(() => showError('COMMAND_CLASS_MOVEMENT'));

await import('./item.js')
	.then(module => {
		ITEM = module;
	})
	.catch(() => showError('COMMAND_CLASS_ITEM'));

await import('./door.js')
	.then(module => {
		DOOR = module;
	})
	.catch(() => showError('COMMAND_CLASS_DOOR'));

await import('./character.js')
	.then(module => {
		CHARACTER = module;
	})

await import('./system.js')
	.then(module => {
		SYSTEM = module;
	})
	.catch(() => showError('COMMAND_CLASS_SYSTEM'));

await import('./event.js')
	.then(module => {
		EVENT = module;
	})

//CHECK FOR PROFANITY
export const removeProfanity = (command) => {
	//PROFANITY FILTER
	const commandArr = command.split(' ');
	let hasProfanity;

	$.each(commandArr, (key, val) => {
		if (profanity?.profanity) {
			hasProfanity = profanity.profanity.filter(badWord => {
				return badWord === val;
			});
		}
		if (hasProfanity && hasProfanity.length > 0) {
			commandArr[key] = profanity.safewords[rng(0, profanity.safewords.length - 1)];
		}
	});

	return commandArr.join(" ");
}

//COMMAND FUNCTION TAKES PLAYER COMMAND AND CURRENT SCENE NAME
export const command = async (command, devAction) => {
	let evtRes;
	let evtResAfter;
	let cmdRes;
	let syntaxFix = [];
	const commandObj = await parseCommand(command);

	//console.log(commandObj);

	//IF NOT A SKIP EVENT ACTION
	if (commandObj?.action?.skip_events !== 1) {
		evtRes = await EVENT.event(commandObj, 1);
	}

	if (commandObj && evtRes?.event_only !== 1) {
		if (commandObj.response) {
			cmdRes = commandObj;
		} else if (commandObj.object && ((commandObj.object.encountered !== 1 && (commandObj.object.character || commandObj.object.item)) || commandObj.object.invalid === 1)) {//IF A NON SCENE NON MOVEMENT OBJECT THAT IS NOT ENCOUNTERED
			cmdRes = {
				response: ["I DON'T KNOW WHAT THAT IS."],
				noMovement: 1
			};
		} else if (commandObj.indirectObject && ((commandObj.indirectObject.encountered !== 1 && (commandObj.indirectObject.character || commandObj.indirectObject.item)) || commandObj.indirectObject.invalid === 1)) {//IF A NON SCENE NON MOVEMENT OBJECT THAT IS NOT ENCOUNTERED
			cmdRes = {
				response: ["I DON'T KNOW WHAT THAT IS."],
				noMovement: 1
			};
		} else if (!(commandObj.action.dev_action === 1 && devAction !== 1)) {
			if (commandObj.action.class === "MOVEMENT") {
				cmdRes = await MC.movement(commandObj);
			} else if (commandObj.action.class === "ITEM") {
				cmdRes = await ITEM.item(commandObj);
			} else if (commandObj.action.class === "DOOR") {
				cmdRes = await DOOR.door(commandObj);
			} else if (commandObj.action.class === "CHARACTER") {
				cmdRes = await CHARACTER.character(commandObj);
			} else if (commandObj.action.class === "SYSTEM") {
				cmdRes = await SYSTEM.system(commandObj);
			}
		}
	}

	//SET CHARACTERS, ITEMS AND SCENES TO ENCOUNTERED/VISITED
	const encountered = await setEncountered();
	if (encountered?.error) {
		return encountered;
	}

	//IF NOT A SKIP EVENT ACTION
	if (commandObj?.action?.skip_events !== 1) {
		evtResAfter = await EVENT.event(commandObj);
	}

	//ADD EVENTS TO RESPONSE
	if (evtRes?.response && evtRes.response.length > 0) {
		if (cmdRes) {
			cmdRes.response.push(...evtRes.response);
		} else {
			cmdRes = evtRes;
		}
	}
	if (evtRes?.fx) {
		if (cmdRes) {
			cmdRes.fx = evtRes.fx;
		} else {
			cmdRes = evtRes;
		}
	}

	//ADD ENCOUNTERED TO RESPONSE
	if (encountered?.response && encountered.response.length > 0) {
		if (cmdRes) {
			cmdRes.response.push(...encountered.response);
		} else {
			cmdRes = encountered;
		}
	}

	//ADD AFTER EVENTS TO RESPONSE
	if (evtResAfter?.response && evtResAfter.response.length > 0) {
		if (cmdRes) {
			cmdRes.response.push(...evtResAfter.response);
		} else {
			cmdRes = evtResAfter;
		}
	}
	if (evtResAfter?.fx) {
		if (cmdRes) {
			cmdRes.fx = evtResAfter.fx;
		} else {
			cmdRes = evtResAfter;
		}
	}

	let noResultRsp = "I DON'T UNDERSTAND";
	//IF VALID ACTION AND OBJECT
	if (commandObj?.action && commandObj?.object && !commandObj?.object?.invalid) {
		noResultRsp = "NOTHING HAPPENS.";
	}

	if (cmdRes && !cmdRes?.response) {
		cmdRes.response = noResultRsp;
	}
	cmdRes = (cmdRes) ? cmdRes : { response: [noResultRsp], noMovement: 1 };

	return cmdRes;
}

async function parseCommand(command) {
	const commandArr = command.split(" ");
	const prepArr = [];
	const indirectPrepArr = [];

	let objArr = [];
	let indirectObjArr = [];

	let firstPrep = 0, firstObj = 0, secondPrep;
	let object;
	let indirectObject;

	//SEPERATE ARTICLES AND PREPOSITIONS
	for (let i = 0; i < commandArr.length; i++) {
		if (i !== 0) {
			if (articles.includes(commandArr[i])) {
				commandArr.splice(i, 1);
				i--;
			} else if (prepositions.includes(commandArr[i]) && firstPrep === 0 && firstObj === 0) {
				prepArr.push(commandArr[i]);
				commandArr.splice(i, 1);
				firstPrep = 1;
				i--;
			} else if (prepositions.includes(commandArr[i]) && firstPrep === 0 && firstObj === 1) {
				prepArr.push(commandArr[i]);
				commandArr.splice(i, 1);
				firstPrep = 1;
				secondPrep = 1;
				i--;
			} else if (prepositions.includes(commandArr[i]) && firstPrep === 1 && firstObj === 0) {
				prepArr.push(commandArr[i]);
				commandArr.splice(i, 1);
				i--;
			} else if (prepositions.includes(commandArr[i]) && firstPrep === 1 && firstObj === 1) {
				indirectPrepArr.push(commandArr[i]);
				commandArr.splice(i, 1);
				secondPrep = 1;
				i--;
			} else if (!prepositions.includes(commandArr[i]) && secondPrep !== 1) {
				objArr.push(commandArr[i]);
				commandArr.splice(i, 1);
				firstObj = 1;
				i--;
			} else if (!prepositions.includes(commandArr[i]) && firstObj === 1 && secondPrep === 1) {
				indirectObjArr.push(commandArr[i]);
				commandArr.splice(i, 1);
				i--;
			}
		}
	}

	//console.log('commandArr: ', commandArr);
	//console.log('prep: ', prepArr);
	//console.log('obj: ', obj);
	//console.log('indirectPrep: ', indirectPrepArr);
	//console.log('indirectobj: ', indirectObj);

	//GET ACTION AND IF EXIST OBJECT
	let action = await getAction(commandArr[0], prepArr[0], command);
	if (objArr.length > 0) {
		object = await getObject(objArr.join(" "), command);
	}

	if (indirectObjArr.length > 0) {
		indirectObject = await getObject(indirectObjArr.join(" "));
	}

	//IF OBJARR LENGTH AND NO OBJECT RETURNED NEED TO CHECK FOR 'GIVE CHARACTER ITEM' SENTENCE
	//NEED TO CHECK PREP CORRECTION AROUND HERE, IS REQUIRED, IS OBJECT REQUIRED WITH PREP, ETC.

	//console.log(action, object, indirectObject);

	let filterAction = action;
	let filterObject = object;
	if (action.length === 1 && (!object || object.length <= 1) && (!indirectObject || indirectObject.length <= 1)) {
		action[0].originalAction = commandArr[0];
		action[0].preposition = prepArr;
		action[0].inPreposition = indirectPrepArr;
		return {
			action: action[0],
			object: (object) ? object[0] : undefined,
			indirectObject: (indirectObject) ? indirectObject[0] : undefined
		}
	} else if (action.length > 1 && (object && object.length === 1)) { //IF MULTIPLE ACTIONS BUT ONE OBJECT
		//TRY AND FIND ACTION BY TYPE FROM FOUND OBJECT
		object = object[0];
		if (object?.item) {
			filterAction = action.filter((a) => {
				return a.class === "ITEM";
			});
		} else if (object?.door) {
			filterAction = action.filter((a) => {
				return a.class === "DOOR";
			});
		} else if (object?.character) {
			filterAction = action.filter((a) => {
				return a.class === "PERSON";
			});
		} else if (object?.scene) {
			filterAction = action.filter((a) => {
				return a.class === "MOVEMENT";
			});
		}

		//IF STILL MULTIPLE ACTIONS TRY AND FIND BY INDIRECT OBJECT IF EXISTS
		if (filterAction.length !== 1 && (indirectObject && indirectObject.length === 1)) {
			const filterIndirect = indirectObject[0];
			filterAction = action;
			if (filterIndirect?.item) {
				filterAction = action.filter((a) => {
					return a.class === "ITEM";
				});
			} else if (filterIndirect?.door) {
				filterAction = action.filter((a) => {
					return a.class === "DOOR";
				});
			} else if (filterIndirect?.character) {
				filterAction = action.filter((a) => {
					return a.class === "PERSON";
				});
			} else if (filterIndirect?.scene) {
				filterAction = action.filter((a) => {
					return a.class === "MOVEMENT";
				})
			}
		}

		//IF ONE ACTION FOUND RETURN
		if (filterAction.length === 1) {
			filterAction[0].originalAction = commandArr[0];
			filterAction[0].preposition = prepArr;
			filterAction[0].inPreposition = indirectPrepArr;
			return {
				action: filterAction[0],
				object: object,
				indirectObject: (indirectObject) ? indirectObject[0] : undefined
			}
		} else {
			return false;
		}
	} else if (action.length === 1 && (object && object.length > 1)) {//IF ON ACTION BUT MULTIPLE OBJECTS
		//TRY AND FIND OBJECT BY ACTION TYPE
		action = action[0];
		if (action.class === "MOVEMENT") {
			filterObject = object.filter((o) => {
				return o.scene === 1
			});
		} else if (action.class === "ITEM") {
			filterObject = object.filter((o) => {
				return o.item === 1;
			});
		} else if (action.class === "DOOR") {
			filterObject = object.filter((o) => {
				return o.door === 1;
			});
		} else if (action.class === "CHARACTER") {
			filterObject = object.filter((o) => {
				return o.character === 1;
			});
		}

		if (filterObject.length > 1 && action.inclusive !== 1) {
			filterObject = object.filter((o) => {
				const owner = getOwner(o);
				if (o.scene === player.scene || owner?.name === "PLAYER" || (owner && owner?.scene === player.scene)) {
					return true;
				} else if (o?.paths) {
					const doorScene = o.paths.filter((p) => {
						return p.scene === player.scene;
					})[0];
					if (doorScene) {
						return true;
					} else {
						return false;
					}
				} else {
					return false;
				}
			});
		}

		if (filterObject.length === 1) {
			action.originalAction = commandArr[0];
			action.preposition = prepArr;
			action.inPreposition = indirectPrepArr;
			return {
				action: action,
				object: filterObject[0],
				indirectObject: (indirectObject) ? indirectObject[0] : undefined
			}
		}
	} else {
		return false;
	}
}

/*async function parseCommand(command) {
	const commandArr = command.split(" ");
	const objectArr = command.split(" ");
	objectArr.shift();

	let object = objectArr.join(" ");
	let originalObject = objectArr.join(" ");
	let objectCheck = [];
	let preposition = '';
	let indirectPrep, indirect;

	//CHECK FOR PREPOSITIONS
	const prepCheck = prepositions.filter((prep) => {
		return prep === commandArr[1];
	})[0];

	if (prepCheck) {
		preposition = commandArr[1];
		objectArr.shift();
		object = objectArr.join(" ");
		originalObject = objectArr.join(" ");
	}

	//CHECK FOR INDIRECT SUBJECT
	if (object) {
		for (let i = 0; i < prepositions.length; i++) {
			const lookBehind = new RegExp('.*(?= ' + prepositions[i] + ' )');
			const lookAhead = new RegExp('\\b' + prepositions[i] + '\\b .*');

			const before = object.match(lookBehind);
			let after = object.match(lookAhead);

			if (before && after && before.length > 0 && after.length > 0) {
				after = after[0].split(" ");
				indirectPrep = after[0];
				after.shift();
				object = before[0];
				originalObject = before[0];
				indirect = after.join(" ");
			} else if (objectArr[objectArr.length - 1] === prepositions[i]) {
				indirectPrep = prepositions[i];
				objectArr.pop();
				object = objectArr.join(" ");
				originalObject = objectArr.join(" ");
			};
		}
	}

	//GET ACTION AND IF EXIST OBJECT
	let action = await getAction(commandArr[0], preposition, command);
	if (object) {
		objectCheck = await getObject(object);
	}

	//IF MORE THAN 1 OBJECT FOUND
	if (objectCheck.length > 1) {
		//NARROW DOWN BY ACTION
		if (action.length === 1) {
			if (action[0].class === "ITEM") {
				objectCheck = objectCheck.filter((o) => {
					return o?.item_name;
				})
			}
			if (action[0].class === "PERSON") {
				objectCheck = objectCheck.filter((o) => {
					return o?.person_name;
				});
			}
			if (action[0].class === "DOOR") {
				objectCheck = objectCheck.filter((o) => {
					return o?.door_name;
				});
			}

			//IF STILL MULTIPLE OBJECTS
			if (objectCheck.length > 1) {
				//NARROW DOWN BY NAME WITHOUT ALIAS
				objectCheck = objectCheck.filter((o) => {
					const objectNoThe = removeThe(object);
					const nameNoThe = removeThe(o.name);
					const titleNoThe = removeThe(o.title);
					return nameNoThe === objectNoThe || titleNoThe === objectNoThe;
				});
				if (objectCheck.length > 1) {
					//IF STILL MULTIPLE OBJECTS AS PLAYER TO CONFIRM
					let multiResp = '';
					for (let i = 0; i < objectCheck.length; i++) {
						let wordDec = (objectCheck[i].person_name) ? '###' : (objectCheck[i].door_name) ? '***' : '|||';
						const respName = wordDec + objectCheck[i].name.replaceAll(' ', '_');

						if (i === 0) {
							multiResp += respName;
						} else if (i === objectCheck.length - 1) {
							multiResp += ', OR ' + respName;
						} else {
							multiResp += ', ' + respName;
						}
					}

					return {
						response: ["WHICH ONE " + multiResp + "?"],
						setCommand: commandArr[0] + " " + ((preposition) ? preposition + " " : ""),
						needClarification: 1
					};
				} else if (objectCheck.length === 1) {
					object = objectCheck[0];
				}
			} else {
				object = objectCheck[0];
			}
		} else {
			return {
				response: ["THERE MIGHT BE TOO MANY OPTIONS FOR ME TO DETERMINE. COULD YOU CLARIFY YOUR ACTION FOR ME?"],
				syntaxError: 1
			}
		}
	} else if (objectCheck.length === 1) {
		object = objectCheck[0];
	}

	//IF NO ACTION FOUND
	if (!action || action.length === 0) {
		return {
			action: {
				action: commandArr[0],
				preposition: preposition || '',
				eventOnly: 1
			},
			object: {
				object: (action.type === 'SCENENAME') ? command : ((object.name) ? object.name : object),
				originalObject: originalObject,
				indirectPrep: indirectPrep || '',
				indirect: indirect || '',
				scene: object.scene
			}
		};
	} else if (action.length === 1) {
		//CHECK IF PREPOSITION MATCHES
		if (action[0].preposition && preposition && preposition !== action[0].preposition) {
			return {
				response: ["I DON'T UNDERSTAND."],
				syntaxError: 1
			};
		} else {
			//action = { ...action[0], ...{ originalAction: commandArr[0] + ' ' + action[0].preposition, syntaxFix: ((action[0].preposition && !preposition) ? 1 : 0) } };
			action = { ...action[0], ...{ originalAction: commandArr[0], preposition: preposition || '' } };
			return {
				action,
				object: {
					object: (action.type === 'SCENENAME') ? command : ((object.name) ? object.name : object),
					originalObject: originalObject,
					indirectPrep: indirectPrep || '',
					indirect: indirect || '',
					scene: object.scene
				}
			}
		}
	} else if (action.length > 1) {
		//IF MULTIPLE ACTIONS FOUND SEE IF WE CAN NARROW IT DOWN BY OBJECT TYPE
		//NEED TO CHECK IF WE GOT MORE THAN 1 OBJECT TYPE
		if (objectCheck?.item_name) {
			action = action.filter((a) => {
				return a.class === "ITEM";
			});
		} else if (objectCheck?.door_name) {
			action = action.filter((a) => {
				return a.class === "DOOR";
			});
		} else if (objectCheck?.person_name) {
			action = action.filter((a) => {
				return a.class === "PERSON";
			});
		} else {
			//IF ACTION CAN BE DETERMINED JUST EMPTY FOR NOW
			action = [];
		}

		if (action[0].preposition && preposition && preposition !== action[0].preposition) {
			return {
				response: ["I DON'T UNDERSTAND."],
				syntaxError: 1
			};
		} else {
			//action = { ...action[0], ...{ originalAction: commandArr[0] + ' ' + action[0].preposition, syntaxFix: ((action[0].preposition && !preposition) ? 1 : 0) } };
			action = { ...action[0], ...{ originalAction: commandArr[0] } };
			return {
				action: action,
				object: {
					object: (action.type === 'SCENENAME') ? command : ((object.name) ? object.name : object),
					originalObject: originalObject,
					indirectPrep: indirectPrep || '',
					indirect: indirect || '',
					scene: object.scene
				}
			}
		}
	}
}*/

async function getAction(actionCheck, preposition, command) {//FILTER ACTIONS
	let sceneCheck = [];
	let action = actions.filter((act) => {
		if (act.action === actionCheck) {
			if (act.preposition_required === 1 && preposition) {
				return true;
			} else if (act.preposition_required !== 1) {
				return true;
			} else {
				return false;
			}
		} else if (act?.alias) {
			for (let i = 0; i < act.alias.length; i++) {
				if (act.alias[i] === actionCheck) {
					if (act.preposition_required === 1 && preposition) {
						return true;
					} else if (act.preposition_required !== 1) {
						return true;
					} else {
						return false;
					}
				}
			}
		} else {
			return false;
		}
	}).map(obj => ({ ...obj }));

	//IF NO ACTION CHECK FOR SCENE NAME
	if (!action || action.length === 0) {
		sceneCheck = scenes.filter((s) => {
			s.scene = 1;
			const nameNoThe = removeThe(s.name);
			const titleNoThe = removeThe(s.title);

			if (nameNoThe === command || titleNoThe === command) {
				return true;
			} else if (s?.alias) {
				for (let i = 0; i < s.alias.length; i++) {
					const aliasNoThe = removeThe(s.alias[i]);
					if (aliasNoThe === command) {
						return true;
					}
				}
			} else {
				return false;
			}
		}).map(sceneObj => ({ ...sceneObj }));


		//MAY NEED TO FIX FOR MULTIPLE OF THE SAME NAME, I.E. STREET
		if (sceneCheck.length > 0) {
			action = [{
				action: sceneCheck[0].name,
				class: "MOVEMENT",
				type: "MOVEPLAYERSCENE"
			}]
		}
	}

	return action;
}

//GET ALL OBJECTS BY NAME AND ALIAS FROM PLAYER INPUT
async function getObject(obj, command) {
	let itemCheck;
	let doorCheck;
	let characterCheck;
	let sceneCheck;
	let directionCheck;

	//LOOP THROUGH THIS TO GET MULTIPLE OBJECTS AT ONCE
	//const separators = [', AND ', ' AND ', ', ',];
	//const numbers = objectNoThe.split(new RegExp(separators.join('|'), ''));

	//GET ALL OBJECTS BY NAME
	//ITEMS
	itemCheck = items.filter((it) => {
		it.item = 1;
		const nameNoThe = removeThe(it.name);
		const titleNoThe = removeThe(it.title);

		if (nameNoThe === obj || titleNoThe === obj) {
			return true;
		} else if (it?.alias) {
			for (let i = 0; i < it.alias.length; i++) {
				const aliasNoThe = removeThe(it.alias[i]);
				if (aliasNoThe === obj) {
					return true;
				}
			}
		} else {
			return false;
		}
	}).map(itemObj => ({ ...itemObj }));

	//DOORS
	doorCheck = doors.filter((d) => {
		d.door = 1;
		const nameNoThe = removeThe(d.name);
		const titleNoThe = removeThe(d.title);

		if (obj === "DOOR") {
			return true;
		} else if (nameNoThe === obj || titleNoThe === obj) {
			return true;
		} else {
			return false;
		}
	}).map(doorObj => ({ ...doorObj }));

	//CHARACTERS
	characterCheck = characters.filter((c) => {
		c.character = 1;
		const nameNoThe = removeThe(c.name);
		const titleNoThe = removeThe(c.title);

		if (nameNoThe === obj || titleNoThe === obj) {
			return true;
		} else if (c?.alias) {
			for (let i = 0; i < c.alias.length; i++) {
				const aliasNoThe = removeThe(c.alias[i]);
				if (aliasNoThe === obj) {
					return true;
				}
			}
		} else {
			return false;
		}
	}).map(characterObj => ({ ...characterObj }));

	//SCENES
	sceneCheck = scenes.filter((s) => {
		s.scene = 1;
		const nameNoThe = removeThe(s.name);
		const titleNoThe = removeThe(s.title);

		if (nameNoThe === obj || titleNoThe === obj || nameNoThe === command || titleNoThe === command) {
			return true;
		} else if (s?.alias) {
			for (let i = 0; i < s.alias.length; i++) {
				const aliasNoThe = removeThe(s.alias[i]);
				if (aliasNoThe === obj || aliasNoThe === command) {
					return true;
				}
			}
		} else {
			return false;
		}
	}).map(sceneObj => ({ ...sceneObj }));

	//DIRECTIONS
	directionCheck = actions.filter((a) => {
		const actionNothe = removeThe(a.action);

		if (actionNothe === obj) {
			a.direction = 1;
			a.name = a.action;
			return true;
		} else if (a?.alias) {
			for (let i = 0; i < a.alias.length; i++) {
				const aliasNoThe = removeThe(a.alias[i]);
				if (aliasNoThe === obj) {
					a.direction = 1;
					a.name = a.action;
					return true;
				}
			}
		} else {
			return false;
		}
	}).map(directionObj => ({ ...directionObj }));

	let foundItems = [...itemCheck, ...doorCheck, ...characterCheck, ...sceneCheck, ...directionCheck];
	if (foundItems.length === 0) {
		foundItems = [{ name: obj, invalid: 1 }]
	}

	return foundItems;
}

/*
//GET ALL OBJECTS BY NAME AND ALIAS FROM PLAYER INPUT
async function getObject(objectCheck) {
	const objectNoThe = removeThe(objectCheck);
	let itemCheck;
	let doorCheck;
	let personCheck;

	//LOOP THROUGH THIS TO GET MULTIPLE OBJECTS AT ONCE
	const separators = [', AND ', ' AND ', ', ',];
	const numbers = objectNoThe.split(new RegExp(separators.join('|'), ''));
*/

async function setEncountered() {
	const resp = [];
	const error = [];

	//GET CURRENT SCENE AND ALL CHARACTERS AND ITEMS IN CURRENT SCENE
	const currentScene = scenes.filter((s) => {
		return s.name === player.scene;
	})[0];
	const sceneCharacters = characters.filter((c) => {
		return c.scene === player.scene && c.encountered !== 1;
	});
	const sceneItems = items.filter((it) => {
		if (it.encountered !== 1) {
			const itOwner = getOwner(it);
			if (itOwner) {
				if (itOwner?.scene === player.scene) {
					let subCheck = itOwner;
					while (subCheck.subordinate) {
						if (subCheck.container) {
							if (subCheck.transparent !== 1 && subCheck.container !== "O" && subCheck.container !== "E") {
								return false;
							} else if (subCheck.container === "O" && subCheck.open !== 1) {
								return false;
							}
						}
						subCheck = subCheck.subordinate;
					}
					return true;
				} else {
					return false;
				};
			} else {
				return it?.scene === player.scene;
			}
		}
	});

	const sceneDoors = doors.filter((d) => {
		if (d.encountered !== 1) {
			if (d.scene === player.scene) {
				return true;
			} else {
				return d.paths.filter((dp) => {
					return dp.scene === player.scene;
				})[0];
			};
		} else {
			return false;
		}
	});

	//SET CURRENT SCENE TO VISITED
	if (!currentScene.visited) {
		currentScene.visited = 1;
		const updateVisited = await IDB.setValue('scenes', currentScene).catch(() => { return { error: "SETSCENE_VISITED_IDB_ERROR" } });
		if (updateVisited?.error) {
			error.push(updateVisited.error);
		}
	}

	//SET CHARACTERS IN CURRENT SCENE TO ENCOUNTERED
	for (let i = 0; i < sceneCharacters.length; i++) {
		if (sceneCharacters[i].encountered !== 1) {
			sceneCharacters[i].encountered = 1;
			const characterEncountered = await IDB.setValue('characters', sceneCharacters[i]).catch(() => { return { error: "SETCHARACTER_ENCOUNTER_IDB_ERROR" } });
			if (characterEncountered?.error) {
				error.push(characterEncountered.error);
			}
			if (sceneCharacters[i]?.introduction) {
				resp.push(sceneCharacters[i].introduction);
			}
		}
	}

	//SET ITEMS IN CURRENT SCENE TO ENCOUNTERED
	for (let ii = 0; ii < sceneItems.length; ii++) {
		if (sceneItems[ii].encountered !== 1) {
			sceneItems[ii].encountered = 1;
			const itemEncountered = await IDB.setValue('items', sceneItems[ii]).catch(() => { return { error: "SETITEM_ENCOUNTER_IDB_ERROR" } });
			if (itemEncountered?.error) {
				error.push(itemEncountered.error);
			}
			if (sceneItems[ii]?.introduction) {
				resp.push(sceneItems[ii].introduction);
			}
		}
	}

	//SET DOORS IN CURRENT SCENE TO ENCOUNTERED
	for (let iii = 0; iii < sceneDoors.length; iii++) {
		if (sceneDoors[iii].encountered !== 1) {
			sceneDoors[iii].encountered = 1;
			const doorEncountered = await IDB.setValue('doors', sceneDoors[iii]).catch(() => { return { error: "SETDOOR_ENCOUNTER_IDB_ERROR" } });
			if (doorEncountered?.error) {
				error.push(doorEncountered.error);
			}
		}
	}

	if (error.length > 0) {
		return { error: error };
	} else {
		return { response: resp };
	}
}
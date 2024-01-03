//MODULE FOR ITEM MANIPULATION
export const item = async (command) => {
	if (command.action?.action) {
		if (command.action?.type === "LISTINVENTORY") {
			return await listInventory();
		} else if (command.action?.type === "GETITEM" || command.action?.type === "DROPITEM") {
			return await getDropItem(command);
		} else if (command.action?.type === "GIVEITEMCHARACTER") {
			return await giveItemCharacter(command);
		} else if (command.action?.type === "GIVEITEM") {
			return await giveItem(command);
		} else if (command.action?.type === "ENTEREXIT") {
			return await enterExit(command);
		} else if (command.action?.type === "OPENCLOSEITEM") {
			return await openCloseItem(command);
		} else if (command.action?.type === "ACTIVATEITEM") {
			return await activateItem(command);
		} else {
			return false;
		}
	} else {
		return { error: 'ITEM_NO_ACTION' };
	}
}

//GET ALL ITEMS IN INVENTORY
async function listInventory() {
	const inventoryArr = items.filter((it) => {
		const owner = getOwner(it);
		return it.encountered === 1 && (it.owner === "PLAYER" || owner?.name === "PLAYER" || (owner?.character && owner?.scene === player.scene && owner?.affinity === "F"));
	});

	const curInventory = [];
	for (let i = 0; i < inventoryArr.length; i++) {
		let itemName = (!inventoryArr[i].title) ? inventoryArr[i].name : inventoryArr[i].title;
		curInventory.push({ item: itemName, image: inventoryArr[i].image, order: inventoryArr[i].order || 0, owner: (inventoryArr[i].owner !== "PLAYER") ? inventoryArr[i].owner : "", ownerOrder: (inventoryArr[i].owner === "PLAYER") ? "Z" : inventoryArr[i].owner || "A" });
	}
	//SORT INVENTORY
	curInventory.sort((a, b) => (a.order > b.order) ? 1 : ((b.order > a.order) ? -1 : 0));
	curInventory.sort((a, b) => a.ownerOrder.localeCompare(b.ownerOrder));
	return { inventory: curInventory };
}

async function getDropItem(command) {
	const action = command?.action;
	const object = command?.object;
	let updateItem = 0;
	let subMsg = [];
	let rspMsg = [];

	//IF NO OBJECT
	if (!object) {
		return {
			response: ["WHAT WOULD YOU LIKE TO " + action.originalAction + "?"],
			noMovement: 1
		};
	}

	//GET OWNER IF EXISTS
	const owner = getOwner(object);

	if (action.type === "GETITEM" && object.owner === "PLAYER") { //CHECK IF GETTING ENCOUNTERED ITEM ALREADY IN INVENTORY
		return {
			response: ["YOU'RE ALREADY CARRYING THAT."],
			noMovement: 1
		};
	} else if (action.type === "DROPITEM" && object.owner !== "PLAYER" && owner.name !== "PLAYER") { //CHECK IF DROPPING ENCOUNTERED ITEM NOT IN INVENTORY
		return {
			response: ["YOU ARE NOT CURRENTLY CARRYING THAT."],
			noMovement: 1
		}
	} else if (object.scene === player.scene || object.owner === "PLAYER") {//IF GET/DROP VALID ENCOUNTERED ITEM
		updateItem = 1;
	} else if (owner && (owner?.scene === player.scene || owner.name === "PLAYER")) {
		if (owner.character && action.type === "DROPITEM") {
			return {
				response: ["YOU ARE NOT CURRENTLY CARRYING THAT."],
				noMovement: 1
			};
		} else {
			if (owner.character && owner.affinity === "F" && object.ownerType === "CHARACTER") {
				updateItem = 1;
			} else if (owner.item || owner.name === "PLAYER" || object.ownerType !== "CHARACTER") {
				let subCheck = (owner.name === "PLAYER" || owner.character) ? owner.subordinate : owner;
				while (subCheck.subordinate) {
					if (subCheck.container !== "O" && subCheck.container !== "E") {
						subMsg.push(addThe(subCheck) + " CANNOT BE OPENED.");
						return {
							response: subMsg
						}
					} else if (subCheck.container === "O" && subCheck.open !== 1) {
						subMsg.push("///YOU_OPEN_" + addThe(subCheck) + ".");
						const itemToUpdate = items.filter((it) => {
							return it.name === subCheck.name;
						})[0];
						if (itemToUpdate) {
							itemToUpdate.open = 1;
							const subItemUpdate = IDB.setValue("items", itemToUpdate).catch(() => { return { error: "GETDROPITEM_UPDATE_SUBITEM_ERROR" }; });
							if (subItemUpdate?.error) {
								return subItemUpdate;
							}
						}
					}
					subCheck = subCheck.subordinate;
				}
				rspMsg = subMsg;
				updateItem = 1;
			} else {
				return {
					response: ["###" + owner.name.replaceAll() + " WON'T GIVE THAT TO YOU."],
					noMovement: 1
				}
			}
		}
	} else {
		return {
			response: ["YOU CANNOT CURRENTLY SEE THAT."],
			noMovement: 1
		};
	}

	if (updateItem) {
		//CHECK IF ITEM IS UNOBTAINABLE
		if (action.type === "GETITEM" && object.unobtainable === 1) {
			return {
				response: [object.unobtainable_message || "YOU CAN'T " + action.originalAction + " THAT."],
				noMovement: 1
			};
		} else {
			const invItemsLength = items.filter((it) => {
				return it.owner === "PLAYER";
			});
			const itemToMove = items.filter((it) => {
				return it.name === object.name;
			})[0];

			let itemMsg = "YOU " + action.originalAction + " " + addThe(itemToMove) + ".";
			itemToMove.scene = player.scene;
			itemToMove.owner = "";
			itemToMove.ownerType = "";

			if (action.type === "GETITEM") {
				itemToMove.scene = "";
				itemToMove.owner = "PLAYER";
				itemToMove.order = invItemsLength.length + 1;
				if (!itemToMove.taken || itemToMove.taken === 0) {
					itemToMove.taken = 1;
					if (itemToMove.taken_message) {
						itemMsg = itemToMove.taken_message;
					}
				}
			}

			const itemUpdate = await IDB.setValue('items', itemToMove).catch(() => { return { error: "GETDROPITEM_UPDATE_IDB_ERROR" }; });
			if (!itemUpdate?.error) {
				//IF DROP ACTION REORDER INVENTORY
				if (action.type === "DROPITEM") {
					let newInv = items.filter((it) => {
						it.ownerOrder = (it.owner === "PLAYER") ? "A" : it.owner || "Z";
						return it.owner === "PLAYER";
					}).map(obj => ({ ...obj }));
					//SORT INVENTORY
					newInv.sort((a, b) => (a.order > b.order) ? 1 : ((b.order > a.order) ? -1 : 0));
					newInv.sort((a, b) => a.ownerOrder.localeCompare(b.ownerOrder));
					for (let i = 0; i < newInv.length; i++) {
						newInv[i].order = i + 1;
						const itemResp = await IDB.setValue('items', newInv[i]).catch(() => { return { error: "MOVEITEMUPDATE_SORT_IDB_ERROR" }; });
						if (itemResp?.error) {
							return itemResp;
						}
					};
				}

				rspMsg.push(itemMsg);
				return { response: rspMsg };
			} else {
				return itemUpdate;
			}
		}
	}
}

async function giveItemCharacter(command) {
	const action = command?.action;
	const object = command?.object;
	const indirect = command?.indirectObject;

	//CHECK FOR OBJECT AND INDIRECT OBJECT
	if (!object) {
		return {
			response: ["WHAT WOULD YOU LIKE TO " + action.originalAction + "?"],
			noMovement: 1
		};
	}

	if (!indirect) {
		return {
			response: ["WHO WOULD YOU LIKE TO " + action.originalAction + " " + addThe(object) + " TO?"],
			noMovement: 1
		}
	}

	if (object.owner !== "PLAYER") {
		return {
			response: ["YOU'RE NOT CURRENTLY CARRYING THAT."],
			noMovement: 1
		}
	} else {
		if (!indirect.character) {
			return {
				response: ["I DON'T KNOW WHO THAT IS."],
				noMovement: 1
			}
		} else if (indirect.affinity !== "F") {
			return {
				response: ["THEY DON'T SEEM INTERESTED."]
			}
		} else if (indirect.scene !== player.scene) {
			if (indirect.encountered === 1) {
				return {
					response: ["THEY AREN'T HERE."],
					noMovement: 1
				}
			} else {
				return {
					response: ["I DON'T KNOW WHO THAT IS."],
					noMovement: 1
				}
			}
		} else {
			const itemToMove = items.filter((it) => {
				return it.name === object.name;
			})[0];

			let rspMsg = "YOU " + action.originalAction + " " + addThe(itemToMove) + " TO ###" + indirect.name + ".";
			itemToMove.scene = "";
			itemToMove.owner = indirect.name;
			itemToMove.ownerType = "CHARACTER";

			const itemUpdate = await IDB.setValue('items', itemToMove).catch(() => { return { error: "GIVEITEMCHARACTER_UPDATE_IDB_ERROR" }; });
			if (!itemUpdate?.error) {
				let newInv = items.filter((it) => {
					it.ownerOrder = (it.owner === "PLAYER") ? "A" : it.owner || "Z";
					return it.owner === "PLAYER";
				}).map(obj => ({ ...obj }));
				//SORT INVENTORY
				newInv.sort((a, b) => (a.order > b.order) ? 1 : ((b.order > a.order) ? -1 : 0));
				newInv.sort((a, b) => a.ownerOrder.localeCompare(b.ownerOrder));
				for (let i = 0; i < newInv.length; i++) {
					newInv[i].order = i + 1;
					const itemResp = await IDB.setValue('items', newInv[i]).catch(() => { return { error: "MOVEITEMUPDATE_SORT_IDB_ERROR" }; });
					if (itemResp?.error) {
						return itemResp;
					}
				};

				return { response: [rspMsg] };
			} else {
				return itemUpdate;
			}
		}
	};
}

async function giveItem(command) {
	const action = command?.action;
	const object = command?.object;
	const indirect = command?.indirectObject;
	const respArr = [];

	if (!object) {
		return {
			response: ["WHAT WOULD YOU LIKE TO " + action.originalAction + "?"],
			noMovement: 1
		}
	}

	if (!indirect) {
		return {
			response: ["WHAT WOULD YOU LIKE TO " + action.originalAction + " " + addThe(object) + " " + action.preposition[0] + "?"],
			noMovement: 1
		}
	}

	const owner = getOwner(object);
	const inOwner = getOwner(indirect);

	if ((object.scene !== player.scene && owner?.scene !== player.scene && object.owner !== "PLAYER") || (indirect.scene !== player.scene && inOwner?.scene !== player.scene && indirect.owner !== "PLAYER")) {
		return {
			response: ["YOU CANNOT CURRENTLY SEE THAT."],
			noMovement: 1
		}
	} else if (owner?.character === 1 && owner?.affinity !== "F") {
		return {
			response: ["###" + owner?.name.replaceAll() + " WON'T LET YOU DO THAT."],
			noMovement: 1
		}
	} else if (!indirect?.container) {
		return {
			response: ["YOU CANNOT " + action.originalAction + " ITEMS " + action.preposition[0] + " " + addThe(indirect)],
			noMovement: 1
		}
	} else if (indirect.container === "S" || ((indirect.container === "V" || indirect.container === "O") && indirect.locked === 1 && indirect.open !== 1)) {
		return {
			response: [addThe(indirect) + ((indirect.locked === 1) ? " IS CURRENTLY LOCKED AND CANNOT BE OPENED." : " CANNOT BE OPENED.")],
			noMovement: 1
		}
	} else {
		const curItem = items.filter((it) => {
			return it.name === object.name;
		})[0];
		const curOwner = items.filter((ito) => {
			return ito.name === indirect.name;
		})[0];
		curItem.owner = indirect.name;
		curItem.scene = "";
		if (indirect.open !== 1) {
			curOwner.open = 1;
			respArr.push("///YOU_OPEN_" + addThe(curOwner) + ".");
			const itemOwnerUpdate = IDB.setValue('items', curOwner).catch(() => { return { error: "GIVEITEM_OWNER_UPDATE_ERROR"}; }); 
			if (itemOwnerUpdate?.error) {
				return itemOwnerUpdate;
			}
		}
		const itemUpdate = IDB.setValue('items', curItem).catch(() => { return { error: "GIVEITEM_ITEM_IDB_ERROR" }; });
		if (!itemUpdate?.error) {
			respArr.push("YOU " + action.originalAction + " " + addThe(object) + " " + action.preposition[0] + " " + addThe(indirect) + ".");
			return {
				response: respArr
			}
		} else {
			return itemUpdate;
		}
	}
}

async function enterExit(command) {
	const action = command?.action;
	const object = command?.object;
	const rspMsg = [];

	if (!object) {
		return {
			response: ["WHAT WOULD YOU LIKE TO " + action.originalAction + "?"],
			noMovement: 1
		};
	}

	if (object.scene !== player.scene) {
		return {
			response: ["YOU CANNOT CURRENTLY SEE THAT."],
			noMovement: 1
		}
	} else if (action.originalAction === "ENTER" && object.name === player.owner) {
		return {
			response: ["YOU ARE ALREADY INSIDE " + addThe(object) + "."],
			noMovement: 1
		}
	} else if (action.originalAction !== "ENTER" && !player.owner) {
		return {
			response: ["YOU ARE ALREADY OUTSIDE " + addThe(object) + "."],
			noMovement: 1
		}
	} else if (action.originalAction !== "ENTER" && player.owner !== object.name) {
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
		if (action.originalAction === "ENTER") {
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

		rspMsg.push("YOU " + action.originalAction + " " + addThe(object) + ".");
		return { response: rspMsg };
	}
}

async function openCloseItem(command) {
	const action = command?.action;
	const object = command?.object;

	//IF NO OBJECT
	if (!object) {
		return {
			response: ["WHAT WOULD YOU LIKE TO " + action.originalAction + "?"],
			noMovement: 1
		}
	}

	const owner = getOwner(object);
	//IF CURRENT SCENE OR PLAYER INVENTORY
	if (object.scene === player.scene || owner?.name === "PLAYER") {
		if (object.container !== "O") {
			return {
				response: ["THAT ISN'T POSSIBLE."],
				noMovement: 1
			}
		} else if (action.originalAction === "OPEN" && object.open === 1) { //IF OPEN BUT ALREADY OPENED
			return {
				response: [addThe(object) + " IS ALREADY OPENED."],
				noMovement: 1
			}
		} else if ((action.originalAction === "CLOSE" || action.originalAction === "SHUT") && object.open !== 1) {//IF CLOSE BUT ALREADY CLOSED
			return {
				response: [addThe(object) + " IS ALREADY CLOSED."],
				noMovement: 1
			}
		} else {
			const curItem = items.filter((it) => {
				return it.name === object.name;
			})[0];
			curItem.open = (action.originalAction === "OPEN") ? 1 : 0;
			const itemUpdate = await IDB.setValue('items', curItem).catch(() => { return { error: "OPENCLOSEITEM_UPDATE_IDB_ERROR" }; });
			if (!itemUpdate?.error) {
				return { response: [(action.originalAction === "OPEN" && object.description_open) ? object.description_open : "YOU " + action.originalAction + " " + addThe(object) + "."] };
			} else {
				return itemUpdate;
			}
		}
	} else if (owner?.scene === player.scene) { //IF OWNER IS IN CURRENT SCENE
		return {
			response: ["YOU ARE NOT CURRENTLY CARRYING THAT."],
			noMovement: 1
		}
	} else {
		return {
			response: ["YOU CANNOT CURRENTLY SEE THAT."],
			noMovement: 1
		}
	}
}

async function activateItem(command) {
	const action = command?.action;
	const object = command?.object;
	const prep = command?.action?.preposition[0];
	const origAction = action.originalAction + ((prep) ? " " + prep : "");

	if (!object) {
		return {
			response: ["WHAT WOULD YOU LIKE TO " + origAction + "?"],
			noMovement: 1
		}
	}

	const owner = getOwner(object);
	//IF CURRENT SCENE OR PLAYER INVENTORY
	if (object.scene === player.scene || owner?.name === "PLAYER" || (owner?.scene === player.scene && owner?.affinity === "F")) {
		if (object?.activate !== 1) {
			return {
				response: ["THAT ISN'T POSSIBLE."],
				noMovement: 1
			}
		} else if ((action.originalAction === "ACTIVATE" || prep === "ON") && object.on === 1) {
			return {
				response: [addThe(object) + " IS ALREADY ON."],
				noMovement: 1
			}
		} else if ((action.originalAction === "DEACTIVATE" || prep === "OFF") && object.on !== 1) {
			return {
				response: [addThe(object) + " IS ALREADY OFF."],
				noMovement: 1
			}
		} else {
			const curItem = items.filter((it) => {
				return it.name === object.name;
			})[0];
			curItem.on = (action.originalAction === "ACTIVATE" || prep === "ON") ? 1 : 0;
			const itemUpdate = await IDB.setValue('items', curItem).catch(() => { return { error: "ACTIVATEITEM_UPDATE_IDB_ERROR" }; });
			if (!itemUpdate?.error) {
				return { response: ["YOU " + origAction + " " + addThe(object) + "."] }
			} else {
				return itemUpdate;
			}
		}
	} else {
		return {
			response: ["YOU CANNOT CURRENTLY SEE THAT."],
			noMovement: 1
		}
	}
}
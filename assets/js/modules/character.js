//MODULE FOR CHARACTER MANIPULATION (DON'T TRY THAT AT HOME)
export const character = async (command) => {
	if (command.action?.action) {
		if (command.action?.type === 'CONVERSE') {
			return await converse(command);
		} else {
			return false;
		}
	} else {
		return { error: 'CHARACTER_NO_ACTION' };
	}
}

async function converse(command) {
	const action = command?.action;
	const object = command?.object;
	const indirectObject = command?.indirectObject;

	if (!object || !object.character) {
		return {
			response: ["WHO WOULD YOU LIKE TO " + action.originalAction + ((action.action === "ASK") ? "?" : " WITH?")],
			noMovement: 1
		};
	} else if (object.scene !== player.scene) {
		return {
			response: ["THEY ARE NOT HERE."],
			noMovement: 1
		};
	} else if (!indirectObject && action.action !== "ASK") {
		let charResp = "THEY DON'T SEEM TO HAVE ANYTHING PARTICULAR TO SAY.";
		if (object.responses && object.responses.length > 0) {
			charResp = object.responses[rng(0, object.responses.length - 1)];
		}
		return {
			response: [charResp]
		};
	} else if (indirectObject) {
		if (indirectObject.name === "HELP" && action.action === "ASK") {
			let charResp = "THEY DON'T SEEM INTERESTED.";
			if (object.help && object.help.length > 0) {
				charResp = object.help[rng(0, object.help.length - 1)];
			}
			return {
				response: [charResp]
			};
		} else {
			let charResp = "THEY DON'T SEEM TO HAVE ANYTHING PARTICULAR TO SAY ABOUT THAT.";
			if (indirectObject.converse && indirectObject.converse.length > 0) {
				const objResp = indirectObject.converse.filter((r) => {
					return r.character === object.name;
				})[0]?.responses;
				if (objResp && objResp.length > 0) {
					charResp = objResp[rng(0, objResp.length - 1)];
				}
			}
			return {
				response: [charResp]
			}
		}
	} else {
		return {
			response: ["WHAT WOULD YOU LIKE TO " + action.originalAction + " ABOUT?"],
			noMovement: 1
		};
	}
}
//MODULE FOR SYSTEM ACTIONS
export const system = async (command) => {
    if (command.action?.action) {
        if (command.action?.type === "INVENTORY") {
            return await inventory();
        } else if (command.action?.type === "EXAMINE") {
            return await examine(command);
        } else if (command.action?.type === "DELETEDATABASE") {
            return await deleteDatabase(command);
        } else if (command.action?.type === "HELP") {
            return await help(command);
        } else if (command.action?.type === "OPTIONS") {
            return await optionsChange(command);
        } else {
            return false;
        }
    } else {
        return { error: 'SYSTEM_NO_ACTION' };
    }
}

//SHOW-HIDE INVENTORY
async function inventory() {
    if (options.show_inventory === 0 || player.show_inventory === 0) {
        //GET CURRENT INVENTORY ITEMS
        let invItemResponse = "";
        const invItems = items.filter((it) => {
            const charOwner = characters.filter((c) => {
                return c.name === it.owner;
            })[0];
            const itemOwner = items.filter((io) => {
                return io.name === it.owner;
            })[0];
            it.ownerOrder = (it.owner === "PLAYER") ? "A" : it.owner || "Z";
            return it.encountered === 1 && (it.owner === "PLAYER" || (charOwner?.scene === player.scene && charOwner?.affinity === "F") || (itemOwner?.owner === "PLAYER"));
        }).map(obj => ({ ...obj }));

        invItems.sort((a, b) => (a.order > b.order) ? 1 : ((b.order > a.order) ? -1 : 0));
        invItems.sort((a, b) => a.ownerOrder.localeCompare(b.ownerOrder));

        //LOOP THROUGH ITEMS AND CREATE LIST
        if (invItems.length > 0) {
            for (let i = 0; i < invItems.length; i++) {
                const respName = '|||' + invItems[i].name.replaceAll(' ', '_') + ((invItems[i].owner !== "PLAYER") ? " [" + invItems[i].owner + "]" : "");

                if (i === 0) {
                    invItemResponse += ("YOU ARE CARRYING: " + respName);
                } else if (i + 1 === invItems.length) {
                    invItemResponse += (', AND ' + respName);
                } else {
                    invItemResponse += (', ' + respName);
                }
            }
            return { response: [invItemResponse + "."], noMovement: 1 };
        }
    } else {
        const isVisible = (player.inventory === 1) ? 0 : 1;
        const updateInventoryToggle = await IDB.setValue('player', isVisible, 'inventory').catch(() => { return { error: "INVENTORY_TOGGLE_IDB_ERROR" } });
        if (!updateInventoryToggle?.error) {
            player.inventory = isVisible;
            inventoryToggle();
            return { noMovement: 1 };
        } else {
            return updateInventoryToggle;
        }
    }
}

//EXAMINE PEOPLE, PLACES AND THINGS
async function examine(command) {
    const action = command?.action;
    const cmdObj = command?.object;
    const charResp = [];
    const charRespIn = [];
    let respArr = [];
    //GET CURRENT SCENE
    const sceneObj = scenes.filter((s) => {
        return s.name === player.scene;
    })[0];

    //CHECK LIGHT OF CURRENT SCENE
    const curIsLight = sceneLight(sceneObj);
    if (!curIsLight) {
        return {
            response: ["IT'S TOO DARK TO SEE ANYTHING."],
            noMovement: 1
        }
    }

    //IF NO OBJECT, GIVE SCENE DESCRIPTION ELSE GIVE OBJECT DESCRIPTION
    if (!cmdObj) {
        if (action.action === "TOUCH") {
            return {
                response: ["WHAT DO YOU WANT TO " + action.originalAction + "?"],
                noMovement: 1
            }
        } else if (action.action === "SMELL") {
            return {
                response: [sceneObj.smell || "YOU DON'T SMELL ANYTHING IN PARTICULAR."]
            }
        } else {
            //GET CURRENT SCENE ITEMS
            let sceneItemResponse = "";
            let sceneItemResponseIn = "";
            const sceneItems = items.filter((s) => {
                return s.scene === player.scene && s.exclude !== 1 && s.name !== player.owner;
            });
            const sceneInItems = items.filter((s2) => {
                return s2.owner === player.owner;
            });

            //LOOP THROUGH SCENE ITEMS AND CREATE LIST
            if (sceneItems.length > 0) {
                for (let i = 0; i < sceneItems.length; i++) {
                    const respName = '|||' + sceneItems[i].name.replaceAll(' ', '_');
                    if (i === 0) {
                        sceneItemResponse += (respName);
                    } else if (i + 1 === sceneItems.length) {
                        sceneItemResponse += (', AND ' + respName);
                    } else {
                        sceneItemResponse += (', ' + respName);
                    }
                }
            }

            //LOOP THROUGH INSIDE ITEMS AND CREATE LIST
            if (sceneInItems.length > 0) {
                for (let ii = 0; ii < sceneInItems.length; ii++) {
                    const respNameIn = '|||' + sceneInItems[ii].name.replaceAll(' ', '_');
                    if (ii === 0) {
                        sceneItemResponseIn += (respNameIn);
                    } else if (ii + 1 === sceneInItems.length) {
                        sceneItemResponseIn += (', AND ' + respNameIn);
                    } else {
                        sceneItemResponseIn += (', ' + respNameIn);
                    }
                }
            }

            //LOOP THROUGH CHARACTERS AND CREATE LIST
            const sceneCharacters = characters.filter((c) => {
                return (c.scene === player.scene || c.owner === player.owner) && c.exclude !== 1;
            });

            if (sceneCharacters.length > 0) {
                for (let i = 0; i < sceneCharacters.length; i++) {
                    if (sceneCharacters[i]?.description && !sceneCharacters[i].owner) {
                        charResp.push(sceneCharacters[i].description);
                    } else if (sceneCharacters[i]?.description && sceneCharacters[i].owner === player.owner) {
                        charRespIn.push(sceneCharacters[i].description);
                    }
                }
            }

            //IF PLAYER OWNER
            if (player.owner) {
                const pOwner = items.filter((it) => {
                    return it.name === player.owner;
                })[0];
                const ownerThe = addThe(pOwner);
                (pOwner.interior) ? respArr.push("INSIDE YOU SEE " + pOwner.interior) : respArr.push("YOU ARE INSIDE " + ownerThe + ".");
                (sceneItemResponseIn) ? respArr.push("YOU ALSO SEE INSIDE: " + sceneItemResponseIn + ".") : null;
                (charRespIn && charRespIn.length > 0) ? respArr = [...respArr, ...charRespIn] : null;

                //CHECK LIGHT TRANSMISSION
                if (pOwner.light_transmission === "T") {
                    //IF TRANSPARENT ADD SCENE DESC AND ITEMS
                    (sceneObj.description) ? respArr.push("OUTSIDE YOU SEE " + sceneObj.description) : null;
                    (sceneItemResponse) ? respArr.push("YOU ALSO SEE OUTSIDE: " + sceneItemResponse + ".") : null;
                    (charResp && charResp.length > 0) ? respArr = [...respArr, ...charResp] : null;
                }
            } else {
                (sceneObj?.description) ? respArr.push(sceneObj.description) : null;
                (sceneItemResponse) ? respArr.push("YOU ALSO SEE: " + sceneItemResponse + ".") : null;
                (charResp && charResp.length > 0) ? respArr = [...respArr, ...charResp] : null;
            }

            return { response: respArr }
        }
    } else {
        const object = command.object;

        //IF DOOR
        if (object.door) {
            let paths = object?.paths;
            paths = paths.filter((p) => {
                return p.scene === player.scene;
            })[0];

            if (object.scene === player.scene || paths) {
                let doorRsp = ((paths?.description) ? paths.description : ((object.description) ? object.description : "THERE IS NOTHING DISCERNIBLE ABOUT THE DOOR.")) + " THE DOOR IS CURRENTLY " + ((object.open === 1) ? "OPEN" : "CLOSED") + ".";
                if (action.action === "SMELL") {
                    doorRsp = object.smell || "YOU DON'T SMELL ANYTHING IN PARTICULAR.";
                }
                if (action.action === "TOUCH") {
                    doorRsp = object.touch || "YOU DON'T FEEL ANYTHING OF NOTE.";
                }
                return {
                    response: [doorRsp]
                }
            } else {
                return {
                    response: ["THERE'S NO SUCH DOOR HERE."],
                    noMovement: 1
                }
            }
        } else if (object.character) { //IF CHARACTER
            if (object.scene === player.scene) {
                let charRsp = (object.description) ? object.description : "THERE IS NOTHING DISCERNIBLE ABOUT THEM.";
                if (action.action === "SMELL") {
                    charRsp = object.smell || "YOU DON'T SMELL ANYTHING IN PARTICULAR.";
                }
                if (action.action === "TOUCH") {
                    charRsp = object.touch || "IT'S RUDE TO TOUCH OTHERS WITHOUT THEIR CONSENT.";
                }

                //IF ADD ITEM ON SEARCH
                if (object.search && object.search.length > 0 && object.affinity === "F") {
                    await addSearchItems(object, 1);
                }
                return {
                    response: [charRsp]
                }
            } else {
                return {
                    response: ["YOU CANNOT CURRENTLY SEE THEM."],
                    noMovement: 1
                }
            }
        } else {
            let descReturn = false;
            //CHECK ITEM EXISTS IN CURRENT SCENE OR INVENTORY
            //GET CHARACTER LOCATION
            const owner = getOwner(object);

            if (object.scene === player.scene || (owner?.name === "PLAYER")) {
                if (object.search && object.search.length > 0) {
                    await addSearchItems(object, 0);
                }
                descReturn = true;
            } else if ((owner?.character && owner?.scene !== player.scene) || (owner?.item && owner?.scene !== player.scene)) {
                return {
                    response: ["YOU CANNOT CURRENTLY SEE THAT."],
                    noMovement: 1
                };
            } else if (owner?.scene === player.scene) { //CHECK ITEMS HELD BY CHARACTERS AND CONTAINERS
                if (owner?.character && owner.affinity === "F") {
                    descReturn = true;
                } else if (owner?.item) {
                    if (owner?.container === "E" || (owner?.container === "O" && owner?.open === 1) || owner?.light_transmission === "T") {
                        descReturn = true;
                    } else {
                        return {
                            response: ["YOU CANNOT CURRENTLY SEE THAT."],
                            noMovement: 1
                        }
                    }
                } else {
                    return {
                        response: ["###" + owner.name.replaceAll() + " WON'T SHOW THAT TO YOU."],
                        noMovement: 1
                    };
                }
            } else {
                return {
                    response: ["YOU CANNOT CURRENTLY SEE THAT."],
                    noMovement: 1
                };
            }

            if (descReturn) {
                let interiorItemsResp = "";
                const interiorCharResp = [];
                let itemRsp = [(((object?.open === 1) ? ((object?.description_open) ? object?.description_open : object?.description) : object.description) || 'THERE IS NOTHING DISCERNIBLE ABOUT ' + addThe(object) + '.')
                    + ((object.container === "O") ? " IT IS CURRENTLY " + ((object.open === 1) ? "OPEN." : "CLOSED.") : "")
                    + ((object.operable === 1) ? " IT IS CURRENTLY " + ((object.on === 1) ? "ON." : "OFF.") : "")];
                if (action.action === "SMELL") {
                    itemRsp = [object.smell || "YOU DON'T SMELL ANYTHING IN PARTICULAR."];
                }
                if (action.action === "TOUCH") {
                    itemRsp = [object.touch || "YOU DON'T FEEL ANYTHING OF NOTE."];
                }

                //IF OBJECT IS TRANSPARENT OR TRANSLUCENT
                if (object.light_transmission === "T" || object.light_transmission === "L") {
                    //GET ANY ITEMS AND CHARACTERS INSIDE THE OBJECT
                    const interiorItems = items.filter((i) => {
                        return i.owner === object.name;
                    });
                    const interiorCharacters = characters.filter((c) => {
                        return c.owner === object.name;
                    });

                    if (interiorItems.length > 0) {
                        for (let i = 0; i < interiorItems.length; i++) {
                            const respNameIn = '|||' + interiorItems[i].name.replaceAll(' ', '_');
                            if (i === 0) {
                                interiorItemsResp += (respNameIn);
                            } else if (i + 1 === interiorItems.length) {
                                interiorItemsResp += (', AND ' + respNameIn);
                            } else {
                                interiorItemsResp += (', ' + respNameIn);
                            }
                        }
                    }

                    if (interiorCharacters.length > 0) {
                        for (let ii = 0; ii < interiorCharacters.length; ii++) {
                            if (interiorCharacters[ii]?.description) {
                                interiorCharResp.push(interiorCharacters[ii].description);
                            } else {
                                interiorCharResp.push("YOU SEE ###" + interiorCharacters[ii].name.replaceAll(' ', '_') + " INSIDE.");
                            }
                        }
                    }

                    if (object.light_transmission === "T") {
                        (interiorItemsResp) ? itemRsp.push("INSIDE YOU SEE " + interiorItemsResp + ".") : null;
                        (interiorCharResp && interiorCharResp.length > 0) ? itemRsp = [...itemRsp, ...interiorCharResp] : null;
                    } else {
                        if (interiorItems.length + interiorCharacters.length > 1) {
                            itemRsp.push("YOU CAN SEE VAGUE SHAPES INSIDE.");
                        } else if (interiorItems.length + interiorCharacters.length > 0) {
                            itemRsp.push("YOU CAN MAKE OUT A VAGUE SHAPE INSIDE.");
                        }
                    }
                }
                return {
                    response: itemRsp
                };
            } else {
                return {
                    response: ["I DON'T UNDERSTAND."],
                    noMovement: 1
                }
            }
        }
    }
}

//HANDLE DATABASE DELETION
async function deleteDatabase(command) {
    if (command.object.name === "DATABASE" || command.object.name === "GAME" || command.object.name === "SAVE") {
        //IF RESPONSE FROM USER GIVEN
        if (command.player_input_response) {
            if (command.player_input_response === "YES") {
                if (IDB.deleteDB()) {
                    location.reload();
                };
            } else {
                return {
                    response: ["OK."],
                    noMovement: 1
                }
            }
        } else {
            return {
                response: ["ARE YOU SURE YOU WANT TO DELETE THE DATABASE?"],
                noMovement: 1
            }
        }
    } else {
        return {
            response: ["I CAN'T DELETE THAT. I CAN ONLY DELETE YOUR \"SAVE\"."],
            noMovement: 1,
            player_input: 0
        }
    }
}

//HELP
async function help(command) {
    const action = command.action;
    const object = command.object;

    if (!object) {
        return {
            response: [
                "THE LOSTKEY TEXT PARSER ALLOWS YOU TO PLAY TEXT ADVENTURE GAMES RIGHT IN YOUR BROWSER! YOU CAN PLAY LOSTKEY GAMES SIMILIAR TO ANY OTHER TEXT BASED GAMES YOU MIGHT HAVE PLAYED. THE PARSER TAKES COMMANDS ONE AT A TIME IN THE FORM OF SENTENCES SUCH AS \"GET LAMP\", \"GO TO THE NORTH\", \"GIVE KEY TO MONSTER\", ETC.. THE PARSER ALSO SUPPORTS THE ABILITY TO USE COMMON SHORTHAND FOUND IN MOST TEXT GAMES SUCH AS \"N\" FOR NORTH OR \"X\" FOR EXAMINE AND MANY MORE. IF YOU WANT MORE INFORMATION YOU CAN TYPE HELP PLUS ANY ACTION TO GET MORE DETAILED INFORMATION.",
                (options.show_decoration !== 0) ? "THE LOSTKEY PARSER WILL HIGHLIGHT CERTAIN WORDS TO HELP YOU FIND THE THINGS OF INTEREST IN THE WORLD. YOU CAN ALSO CLICK ON THESE WORDS AND THEY WILL BE COPIED INTO THE INPUT AT THE BOTTOM OF THE SCREEN. YOU CAN TURN THIS ON OR OFF AT ANYTIME BY TYPING \"OPTIONS DECORATION OFF\" OR \"OPTIONS DECORATION ON\"." : "",
                "MOST TEXT GAMES WILL ALLOW YOU TO CARRY CERTAIN ITEMS AROUND ON YOUR PERSON. THIS IS KNOWN AS YOUR INVENTORY. " + ((options.show_inventory !== 0) ? "YOUR INVENTORY IS DISPLAYED AS A LIST ON THE RIGHT OF THE SCREEN. YOU CAN SHOW OR HIDE THIS LIST AT ANYTIME BY ENTERING THE \"INVENTORY\" COMMAND OR \"I\" FOR SHORT." : "YOU CAN VIEW YOUR CURRENT INVENTORY AT ANYTIME BY ENTERING THE \"INVENTORY\" COMMAND OR \"I\" FOR SHORT."),
                (options.help) ? options.help : ""],
            noMovement: 1
        }
    } else {
        const actHelp = actions.filter((a) => {
            if (a.action === object.name) {
                return true;
            } else if (a?.alias) {
                for (let i = 0; i < a.alias.length; i++) {
                    if (a.alias[i] === object.name) {
                        return true;
                    }
                }
            } else {
                return false;
            }
        });

        if (!actHelp || actHelp.length === 0) {
            return {
                response: ["SORRY, I DON'T HAVE ANY INFORMATION ON THAT."],
                noMovement: 1
            }
        } else if (actHelp.length > 1) {
            let resp = "DID YOU MEAN ";
            for (let i = 0; i < actHelp.length; i++) {
                if (i === 0) {
                    resp += actHelp[i].action;
                } else if (i === actHelp.length - 1) {
                    resp += ", OR " + actHelp[i].action;
                } else {
                    resp += ", " + actHelp[i].action;
                }
            }
            resp += "?";
            return {
                response: [resp],
                noMovement: 1
            }
        } else {
            return {
                response: [actHelp[0].help || "SORRY, I DON'T HAVE ANY INFORMATION ON THAT."],
                noMovement: 1
            }
        }
    }
}

async function optionsChange(command) {
    const action = command.action;
    const object = command.object;
    let resp = "OPTIONS CHANGED SUCCESSFULLY!";
    let error;

    if (!object) {
        return {
            response: ["WHAT OPTION WOULD YOU LIKE?"],
            noMovement: 1
        }
    }

    if (object.name === "DECORATION" || object.name === "DECORATIONS" || object.name === "COLOR" || object.name === "COLORS") {
        player.show_decoration = (action.preposition[0] === "ON") ? 1 : 0;
        error = await IDB.setValue('player', player.show_decoration, 'show_decoration').catch(() => { return { error: "OPTIONS_UPDATE_DECORATION_IDB_ERROR" } });
    } else if (object.name === "IMAGE" || object.name === "IMAGES" || object.name === "PICTURE" || object.name === "PICTURES") {
        player.show_image = (action.preposition[0] === "ON") ? 1 : 0;
        error = await IDB.setValue('player', player.show_image, 'show_image').catch(() => { return { error: "OPTIONS_UPDATE_IMAGE_IDB_ERROR" } });
    } else if (object.name === "INVENTORY" || object.name === "I") {
        player.show_inventory = (action.preposition[0] === "ON") ? 1 : 0;
        error = await IDB.setValue('player', player.show_inventory, 'show_inventory').catch(() => { return { error: "OPTIONS_UPDATE_INVENTORY_IDB_ERROR" } });
    } else {
        resp = "SORRY, I DON'T KNOW THAT OPTION.";
    }

    if (!error) {
        return {
            response: [resp],
            noMovement: 1
        }
    } else {
        return error;
    }

}

//IF ITEM FOUND ON SEARCH UPDATE NEW ITEM TO SEARCHED OWNER
async function addSearchItems(search, isChar) {
    for (let i = 0; i < search.search.length; i++) {
        if (isChar === 1) {
            const searchToUpdate = characters.filter((c) => {
                return c.name === search.search[i];
            })[0];
            if (searchToUpdate) {
                searchToUpdate.owner = search.name;
                searchToUpdate.ownerType = "CHARACTER";
                const searchUpdate = IDB.setValue("characters", searchToUpdate).catch(() => { return { error: "EXAMINE_SEARCH_CHARACTER_IDB_ERROR" } });
                if (searchUpdate?.error) {
                    return searchUpdate;
                }
            }
        } else {
            const searchToUpdate = items.filter((it) => {
                return it.name === search.search[i];
            })[0];
            if (searchToUpdate) {
                searchToUpdate.owner = search.name;
                searchToUpdate.ownerType = "ITEM";
                const searchUpdate = IDB.setValue("items", searchToUpdate).catch(() => { return { error: "EXAMINE_SEARCH_ITEM_IDB_ERROR" } });
                if (searchUpdate?.error) {
                    return searchUpdate;
                }
            }
        }
    }
}
//MODULE FOR SYSTEM ACTIONS
export const system = async (command) => {
    if (command.action?.action) {
        if (command.action?.type === "INVENTORY") {
            return await inventory();
        } else if (command.action?.type === "EXAMINE") {
            return await examine(command);
        } else {
            return false;
        }
    } else {
        return { error: 'SYSTEM_NO_ACTION' };
    }
}

//SHOW-HIDE INVENTORY
async function inventory() {
    if (options.show_inventory === 0) {
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
            return { error: "INVENTORY_TOGGLE_UPDATE_ERROR" };
        }
    }
}

//EXAMINE PEOPLE, PLACES AND THINGS
async function examine(command) {
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
    if (!command?.object) {
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
            return c.scene === player.scene && c.exclude !== 1;
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
    } else {
        const object = command.object;

        //IF DOOR
        if (object.door) {
            let paths = object?.paths;
            paths = paths.filter((p) => {
                return p.scene === player.scene;
            })[0];

            if (object.scene === player.scene || paths) {
                return {
                    response: [((paths?.description) ? paths.description : ((object.description) ? object.description : "THERE IS NOTHING DISCERNIBLE ABOUT THE DOOR.")) + " THE DOOR IS CURRENTLY " + ((object.open === 1) ? "OPEN" : "CLOSED") + "."]
                }
            } else {
                return {
                    response: ["THERE'S NO SUCH DOOR HERE."],
                    noMovement: 1
                }
            }
        } else if (object.character) { //IF CHARACTER
            if (object.scene === player.scene) {
                if (object.search && object.search.length > 0 && object.affinity === "F") {
                    await addSearchItems(object, 1);
                }
                return {
                    response: [(object.description) ? object.description : "THERE IS NOTHING DISCERNIBLE ABOUT THEM."]
                }
            } else {
                return {
                    response: ["YOU CANNOT CURRENTLY SEE THEM."],
                    noMovement: 1
                }
            }
        } else {
            //CHECK ITEM EXISTS IN CURRENT SCENE OR INVENTORY
            //GET CHARACTER LOCATION
            const owner = getOwner(object);

            if (object.scene === player.scene || (owner?.name === "PLAYER")) {
                if (object.search && object.search.length > 0) {
                    await addSearchItems(object, 0);
                }
                return {
                    response: [
                        (((object?.open === 1) ? ((object?.description_open) ? object?.description_open : object?.description) : object.description) || 'THERE IS NOTHING DISCERNIBLE ABOUT ' + addThe(object) + '.')
                        + ((object.container === "O") ? " IT IS CURRENTLY " + ((object.open === 1) ? "OPEN." : "CLOSED.") : "")
                        + ((object.activate === 1) ? " IT IS CURRENTLY " + ((object.on === 1) ? "ON." : "OFF.") : "")
                    ]
                };
            } else if ((owner?.character && owner?.scene !== player.scene) || (owner?.item && owner?.scene !== player.scene)) {
                return {
                    response: ["YOU CANNOT CURRENTLY SEE THAT."],
                    noMovement: 1
                };
            } else if (owner?.scene === player.scene) { //CHECK ITEMS HELD BY CHARACTERS AND CONTAINERS
                if (owner?.character && owner.affinity === "F") {
                    return {
                        response: [
                            (((object?.open === 1) ? ((object?.description_open) ? object?.description_open : object?.description) : object.description) || 'THERE IS NOTHING DISCERNIBLE ABOUT ' + addThe(object) + '.')
                            + ((object.container === "O") ? " IT IS CURRENTLY " + ((object.open === 1) ? "OPEN." : "CLOSED.") : "")
                            + ((object.activate === 1) ? " IT IS CURRENTLY " + ((object.on === 1) ? "ON." : "OFF.") : "")
                        ]
                    };
                } else if (owner?.item) {
                    if (owner?.container === "E" || (owner?.container === "O" && owner?.open === 1) || owner?.light_transmission === "T") {
                        return {
                            response: [
                                (((object?.open === 1) ? ((object?.description_open) ? object?.description_open : object?.description) : object.description) || 'THERE IS NOTHING DISCERNIBLE ABOUT ' + addThe(object) + '.')
                                + ((object.container === "O") ? " IT IS CURRENTLY " + ((object.open === 1) ? "OPEN." : "CLOSED.") : "")
                                + ((object.activate === 1) ? " IT IS CURRENTLY " + ((object.on === 1) ? "ON." : "OFF.") : "")
                            ]
                        };
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
        }
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
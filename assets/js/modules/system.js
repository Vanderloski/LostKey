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
    let respArr = [];
    //GET CURRENT SCENE
    const sceneObj = scenes.filter((s) => {
        return s.name === player.scene;
    })[0];

    /*DARKNESS RULES
    //CHECK FOR LIT ITEM
    const litItem = items.filter((it) => {
        return it.emittable === 1 && it.on === 1;
    })[0];
    if (sceneObj?.light === "DARK" && !litItem) {
        return { response: ["IT'S TOO DARK TO SEE ANYTHING."] };
    } else {
        
    }*/

    //IF NO OBJECT, GIVE SCENE DESCRIPTION ELSE GIVE OBJECT DESCRIPTION
    if (!command?.object) {
        if (sceneObj?.description) {
            respArr.push(sceneObj.description);
        }

        //GET CURRENT SCENE ITEMS
        let sceneItemResponse = "";
        const sceneItems = items.filter((s) => {
            return s.scene === player.scene && s.exclude !== 1;
        });

        //LOOP THROUGH ITEMS AND CREATE LIST
        if (sceneItems.length > 0) {
            for (let i = 0; i < sceneItems.length; i++) {
                const respName = '|||' + sceneItems[i].name.replaceAll(' ', '_');

                if (i === 0) {
                    sceneItemResponse += ("YOU ALSO SEE: " + respName);
                } else if (i + 1 === sceneItems.length) {
                    sceneItemResponse += (', AND ' + respName);
                } else {
                    sceneItemResponse += (', ' + respName);
                }
            }
            respArr.push(sceneItemResponse + ".");
        }

        //LOOP THROUGH CHARACTERS AND CREATE LIST
        const sceneCharacters = characters.filter((c) => {
            return c.scene === player.scene && c.exclude !== 1;
        });

        if (sceneCharacters.length > 0) {
            for (let i = 0; i < sceneCharacters.length; i++) {
                if (sceneCharacters[i]?.description) {
                    respArr.push(sceneCharacters[i].description);
                }
            }
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
                    await addSearchItems(object);
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
                    await addSearchItems(object);
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
                    if (owner?.container === "E" || (owner?.container === "O" && owner?.open === 1) || owner?.transparent === 1) {
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

async function addSearchItems(search) {
    for (let i = 0; i < search.search.length; i++) {
        const searchToUpdate = items.filter((it) => {
            return it.name === search.search[i];
        })[0];
        if (searchToUpdate) {
            searchToUpdate.owner = search.name;
            const searchUpdate = IDB.setValue("items", searchToUpdate).catch(() => { return { error: "EXAMINE_SEARCH_IDB_ERROR" } });
            if (searchUpdate?.error) {
                return searchUpdate;
            }
        }
    }
}
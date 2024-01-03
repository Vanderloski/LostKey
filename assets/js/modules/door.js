//MODULE FOR DOOR ACTIONS
export const door = async (command) => {
    if (command.action?.action) {
        if (command.action?.type === "OPENCLOSEDOOR") {
            return await openCloseDoor(command);
        } else if (command.action?.type === "LOCKDOOR") {
            return await lockDoor(command);
        } else {
            return false;
        }
    } else {
        return { error: 'DOOR_NO_ACTION' };
    }
}

//FUNCTION TO OPEN OR CLOSE DOOR
async function openCloseDoor(command) {
    const action = command?.action;
    const object = command?.object;
    const respArr = [];

    //IF NO DOOR GIVEN
    if (!object) {
        return {
            response: ["WHAT WOULD YOU LIKE TO " + action.originalAction + "?"],
            noMovement: 1
        };
    }

    //IF IN CONTAINER, EXIT THE CONTAINER
    if (player.owner) {
        //GET ITEM OWNER
        const owner = items.filter((it) => {
            return it.name === player.owner;
        })[0];
        respArr.push("///YOU_EXIT_" + addThe(owner) + ".");
        player.owner = "";
        const newOwner = await IDB.setValue('player', player.owner, 'owner').catch(() => { return { error: "OPENCLOSEDOOR_OWNER_IDB_ERROR" } });
        if (newOwner?.error) {
            return newOwner;
        }
    }

    //GET COUNT OF DOORS IN CURRENT SCENE
    const doorCount = doors.filter((d) => {
        if (d.scene === player.scene) {
            return true;
        } else {
            return d.paths.filter((dp) => {
                return dp.scene === player.scene;
            })[0];
        };
    });

    let paths = object?.paths;
    paths = paths.filter((p) => {
        return p.scene === player.scene;
    })[0];

    if (object.scene === player.scene || paths) {
        if (action.originalAction === "OPEN" && object.open === 1) {
            respArr.push("THE DOOR IS ALREADY OPEN.");
            return {
                response: respArr,
                noMovement: 1
            }
        } else if ((action.originalAction === "CLOSE" || action.originalAction === "SHUT") && object.open !== 1) {
            respArr.push("THE DOOR IS ALREADY CLOSED.");
            return {
                response: respArr,
                noMovement: 1
            }
        } else if (action.originalAction === "OPEN" && object.locked === 1) {
            respArr.push("THE DOOR IS CURRENTLY LOCKED AND CANNOT BE OPENED.");
            return {
                response: respArr,
                noMovement: 1
            }
        } else {
            const curDoor = doors.filter((d) => {
                return d.name === object.name;
            })[0];
            curDoor.open = (action.originalAction === "OPEN") ? 1 : 0;

            const updateDoor = await IDB.setValue('doors', curDoor).catch(() => { return { error: "OPENCLOSEDOOR_UPDATE_IDB_ERROR" } });
            if (!updateDoor?.error) {
                respArr.push("YOU " + action.originalAction + " THE DOOR.");
                return { response: respArr };
            } else {
                return updateDoor;
            }
        }
    } else {
        if (doorCount.length > 0) {
            respArr.push("THERE IS NO SUCH DOOR HERE.");
            return {
                response: respArr,
                noMovement: 1
            }
        } else {
            respArr.push("THERE ARE NO DOORS HERE.");
            return {
                response: respArr,
                noMovement: 1
            }
        }
    }
}

async function lockDoor(command) {
    const action = command?.action;
    const object = command?.object;
    const indirect = command?.indirectObject;
    const respArr = [];

    //IF NO OBJECT
    if (!object) {
        return {
            response: ["WHAT WOULD YOU LIKE TO " + action.originalAction + "?"],
            noMovement: 1
        }
    }

    //IF OBJECT IS KEY AND ACTION IS NOT USE
    if (action.originalAction !== "USE" && object.item) {
        return {
            response: ["YOU CAN ONLY " + action.originalAction + " DOORS."],
            noMovement: 1
        }
    }

    //DETERMINE WHAT OBJECT KEY AND DOOR ARE
    const door = (object.door) ? object : indirect;
    const key = (object.door) ? indirect : object;

    if (!door) {
        return {
            response: ["WHAT DOOR WOULD YOU LIKE TO " + action.originalAction + "?"],
            noMovement: 1
        }
    }

    //GET CURRENT DOOR FROM DOORS ARRAY
    const curDoor = doors.filter((d) => {
        return d.name === door.name;
    })[0];

    //SET DOOR ATTRIBUTES BY CURRENT SCENE
    let noKey = door.lock_without_key;
    let noLock = door.no_lock;
    let noLockMsg = door.no_lock_message;

    const noKeyFilter = door.paths.filter((p) => {
        return p.lock_without_key === 1;
    })[0];

    const firstNoKey = door.lock_without_key;
    const secondNoKey = noKeyFilter?.lock_without_key;

    const sceneDoor = door.paths.filter((p) => {
        return p.scene === player.scene;
    })[0];

    if (door.scene !== player.scene) {
        noKey = sceneDoor?.lock_without_key;
        noLock = sceneDoor?.no_lock;
        noLockMsg = sceneDoor?.no_lock_message;
    }


    //IF IN CONTAINER, EXIT THE CONTAINER
    if (player.owner) {
        //GET ITEM OWNER
        const owner = items.filter((it) => {
            return it.name === player.owner;
        })[0];
        const nameArr = ((owner.title) ? owner.title : owner.name).split(" ");
        respArr.push("///YOU_EXIT_" + addThe(owner) + ".");
        player.owner = "";
        const newOwner = await IDB.setValue('player', player.owner, 'owner').catch(() => { return { error: "LOCKDOOR_OWNER_IDB_ERROR" } });
        if (newOwner?.error) {
            return newOwner;
        }
    }

    //GET COUNT OF DOORS IN CURRENT SCENE
    const doorCount = doors.filter((d) => {
        if (d.scene === player.scene) {
            return true;
        } else {
            return d.paths.filter((dp) => {
                return dp.scene === player.scene;
            })[0];
        };
    });

    let paths = object?.paths;
    paths = paths.filter((p) => {
        return p.scene === player.scene;
    })[0];

    if (object.scene === player.scene || paths) {
        //IF NO KEY REQUIRED OR DOOR IS OPEN AND ONE SIDE REQUIRES NO KEY
        if (noKey || (door.open === 1 && (firstNoKey === 1 || secondNoKey === 1))) {
            let newDoor;
            if (key) {
                if (door.open) {
                    respArr.push("A KEY IS NOT REQUIRED TO " + action.originalAction + " WHEN THIS DOOR IS OPEN.");
                } else {
                    respArr.push("A KEY IS NOT REQUIRED TO " + action.originalAction + " THIS DOOR.");
                }
            }

            if (action.originalAction === "LOCK" && door.locked === 1) {
                respArr.push("THE DOOR IS ALREADY LOCKED.");
            } else if (action.originalAction === "UNLOCK" && door.locked !== 1) {
                respArr.push("THE DOOR IS ALREADY UNLOCKED.");
            } else {
                respArr.push("YOU " + action.originalAction + " THE DOOR.");
                curDoor.locked = (action.originalAction === "LOCK") ? 1 : 0;
                newDoor = await IDB.setValue('doors', curDoor).catch(() => { return { error: "LOCKDOOR_LOCKNOKEY_IDB_ERROR" } });
            }

            if (newDoor?.error) {
                return newDoor;
            } else {
                return { response: respArr };
            }
        } else if (noLock) {
            respArr.push((noLockMsg) ? noLockMsg : "THE DOOR CANNOT BE " + action.originalAction + "ED FROM THIS SIDE.");
            return {
                response: respArr,
                noMovement: 1
            }
        } else if (action.originalAction === "LOCK" && door.locked === 1) {
            respArr.push("THE DOOR IS ALREADY LOCKED.");
            return {
                response: respArr,
                noMovement: 1
            }
        } else if (action.originalAction === "UNLOCK" && door.locked !== 1) {
            respArr.push("THE DOOR IS ALREADY UNLOCKED.");
            return {
                response: respArr,
                noMovement: 1
            }
        } else {
            if (!key) {
                respArr.push("THIS DOOR REQUIRES A KEY TO " + action.originalAction + ".");
                return {
                    response: respArr,
                    noMovement: 1
                }
            } else {
                const isKey = door.keys.filter((k) => {
                    return k === key.name;
                })[0];
                if (!isKey) {
                    respArr.push("THAT KEY DOESN'T WORK ON THIS DOOR.");
                    return {
                        response: respArr,
                        noMovement: 1
                    }
                } else {
                    respArr.push("YOU " + action.originalAction + " THE DOOR.");
                    curDoor.locked = (action.originalAction === "LOCK") ? 1 : 0;
                    const newDoor = await IDB.setValue('doors', curDoor).catch(() => { return { error: "LOCKDOOR_LOCK_IDB_ERROR" } });
                    if (newDoor?.error) {
                        return newDoor;
                    } else {
                        return { response: respArr };
                    }
                }
            }
        }
    } else {
        if (doorCount.length > 0) {
            respArr.push("THERE IS NO SUCH DOOR HERE.");
            return {
                response: respArr,
                noMovement: 1
            }
        } else {
            respArr.push("THERE ARE NO DOORS HERE.");
            return {
                response: respArr,
                noMovement: 1
            }
        }
    }
}

//FUNCTION TO CHANGE A DOORS STATE
/*async function openCloseDoor(action, object) {
    //IF ACTION BUT NO OBJECT
    if (!object?.object) {
        return { response: ["WHAT DO YOU WANT TO " + action.originalAction + "?"] }
    }

    //CHECK FOR DOORS IN CURRENT SCENE
    let curDoors = doors.filter((d) => {
        if (d?.scenes) {
            return d?.scenes.filter((dd) => {
                return dd.scene === player.scene;
            }).length > 0;
        } else {
            return false;
        }
    });

    if (curDoors.length === 0) {
        return { response: ["THERE ARE NO DOORS HERE TO " + action.originalAction + "."] };
    }

    //IF GENERIC NAME
    if (object.object === 'DOOR') {
        if (curDoors.length > 1) {
            let multiResp = '';
            for (let i = 0; i < curDoors.length; i++) {
                const respName = '***' + curDoors[i].name.replaceAll(' ', '_');
                if (i === 0) {
                    multiResp += respName;
                } else if (i === curDoors.length - 1) {
                    multiResp += ', OR ' + respName;
                } else {
                    multiResp += ', ' + respName;
                }
            }

            const respTheCheck = multiResp.split(" ");
            return {
                response: ['WHICH ONE WOULD YOU LIKE TO ' + action.originalAction + ', ' + ((respTheCheck[0] === "THE") ? "" : " THE ") + multiResp + "?"],
                setCommand: action.originalAction + " "
            };
        } else {
            object.object = curDoors[0].name;
        }
    }

    //CHECK IF REQUESTED DOOR EXISTS IN CURRENT SCENE
    curDoors = curDoors.filter((door) => {
        const nameNoThe = removeThe(door.name);
        const titleNoThe = removeThe(door.title);
        const doorNoThe = removeThe(object.object);
        return nameNoThe === doorNoThe || titleNoThe === doorNoThe;
    })[0];

    if (curDoors) {
        let doorThe = "THE ***" + curDoors.name.replaceAll(' ', '_');
        const doorName = (!curDoors.title) ? curDoors.name : curDoors.title;
        const doorTheCheck = doorName.split(" ");
        if (doorTheCheck[0] === "THE") {
            doorThe = "***" + curDoors.name.replaceAll(' ', '_');
        };

        if (action.action === "OPEN" && curDoors.open === 1) {
            return { response: [doorThe + " IS ALREADY OPENED."] };
        } else if (action.action === "CLOSE" && curDoors.open !== 1) {
            return { response: [doorThe + " IS ALREADY CLOSED."] };
        } else {
            let doorOpen = 0;
            let doorMsg = 'YOU ' + action.originalAction + ' ' + doorThe + '.';
            if (curDoors.locked === 1) {
                if (curDoors.open === 1) {
                    doorMsg = "YOU CLOSE THE DOOR AND IT IS NOW LOCKED AND SHUT.";
                } else {
                    doorMsg = "THAT DOOR IS CURRENTLY LOCKED AND CANNOT BE OPENED.";
                }
            } else {
                if (curDoors.open !== 1) {
                    doorOpen = 1;
                }
            }

            curDoors.open = doorOpen;

            const updateDoor = await IDB.setValue('doors', curDoors).catch(() => { return { error: "SETOPEN_UPDATE_IDB_ERROR" } });
            if (!updateDoor?.error) {
                return { response: [doorMsg] };
            } else {
                return updateDoor;
            }
        }
    } else {
        return { response: ["THERE'S NO DOOR WITH THAT NAME HERE."] };
    }
}

async function doorKnock(action, object) {
    const respArr = [];
    //CHECK SYNTAX
    if (!action?.preposition) {
        respArr.push(('///' + action.originalAction + ' ON ' + object.originalObject + '.').replaceAll(' ', '_'));
    }
    //IF ACTION BUT NO OBJECT
    if (!object?.object) {
        respArr.push("WHAT DO YOU WANT TO " + action.originalAction + ((action.preposition) ? ' ' + action.preposition : ' ON') + "?");
        return { response: respArr };
    }

    //CHECK FOR DOORS IN CURRENT SCENE
    let curDoors = doors.filter((d) => {
        if (d?.scenes) {
            return d?.scenes.filter((dd) => {
                return dd.scene === player.scene;
            }).length > 0;
        } else {
            return false;
        }
    });

    if (curDoors.length === 0) {
        respArr.push("THERE ARE NO DOORS HERE TO " + action.originalAction + ((action.preposition) ? ' ' + action.preposition : ' ON') + ".");
        return { response: respArr };
    }

    //IF GENERIC NAME
    if (object.object === 'DOOR') {
        if (curDoors.length > 1) {
            let multiResp = '';
            for (let i = 0; i < curDoors.length; i++) {
                const respName = '***' + curDoors[i].name.replaceAll(' ', '_');
                if (i === 0) {
                    multiResp += respName;
                } else if (i === curDoors.length - 1) {
                    multiResp += ', OR ' + respName;
                } else {
                    multiResp += ', ' + respName;
                }
            }

            const respTheCheck = multiResp.split(" ");
            respArr.push('WHICH ONE WOULD YOU LIKE TO ' + action.originalAction + ((action.preposition) ? ' ' + action.preposition : ' ON') + ', ' + ((respTheCheck[0] === "THE") ? "" : " THE ") + multiResp + "?");
            return {
                response: respArr,
                setCommand: action.originalAction + " " + ((action?.preposition) ? action.preposition + " " : " ON ")
            };
        } else {
            object.object = curDoors[0].name;
        }
    }

    //CHECK IF REQUESTED DOOR EXISTS IN CURRENT SCENE
    curDoors = curDoors.filter((door) => {
        const nameNoThe = removeThe(door.name);
        const titleNoThe = removeThe(door.title);
        const doorNoThe = removeThe(object.object);
        return nameNoThe === doorNoThe || titleNoThe === doorNoThe;
    })[0];

    if (curDoors) {
        let doorResp = "NOTHING HAPPENS.";
        //FILTER TO CURRENT SCENE OBJECT
        if (curDoors?.scenes) {
            const curSceneDoor = curDoors.scenes.filter((d) => {
                return d.scene === player.scene;
            })[0]?.knock;
            if (curSceneDoor) {
                doorResp = curSceneDoor;
            }
        };

        respArr.push(doorResp);
        return { response: respArr };
    } else {
        respArr.push("THERE'S NO DOOR WITH THAT NAME HERE.");
        return { response: respArr };
    }
}*/
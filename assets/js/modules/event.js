//MODULE FOR EVENTS
export const event = async (command, before) => {
    const action = command?.action;
    const object = command?.object;
    const indirect = command?.indirectObject;
    //FILTER EVENTS
    let respArr = [];
    let event_only = 0;
    let fx;
    const eventsCheck = events.filter((e) => {
        let testPass = true;
        //ONLY CHECK ACTIVE EVENTS
        if (e.active === 1) {
            if ((before === 1 && e.before !== 1) || ((!before || before === 0) && e.before === 1)) {
                return false;
            }

            if (e.cause) {
                testPass = true;
                const cause = e.cause;

                if (e.action && !e.action.includes(action?.action)) {
                    return false;
                } else {
                    //LOOP THROUGH ALL CAUSE OBJECTS
                    for (let x = 0, keys = Object.keys(cause); x < keys.length; x++) {
                        //IF PLAYER
                        if (keys[x] === "player") {
                            const value = cause[keys[x]];
                            for (let y = 0, conditions = Object.keys(cause[keys[x]]); y < conditions.length; y++) {
                                if (conditions[y] && player[conditions[y]] !== value[conditions[y]]) {
                                    testPass = false;
                                }
                            }
                        } else if ((keys[x] === "object" && object) || (keys[x] === "indirect_object" && indirect)) {//IF OBJECT
                            let testFilter;
                            const curObject = (keys[x] === "indirect_object") ? indirect : object;
                            for (let y = 0, conditions = Object.keys(cause[keys[x]]); y < conditions.length; y++) {
                                const testObject = (curObject.item) ? items : (curObject.character) ? characters : (curObject.door) ? doors : "";
                                if (!testObject) {
                                    testPass = false;
                                } else {
                                    const value = cause[keys[x]];
                                    testFilter = testObject.filter((t) => {
                                        if (t.name === value.name) {
                                            const owner = getOwner(t);
                                            if (value?.scene) {
                                                if (value?.scene === "PLAYER") {
                                                    if (owner && owner?.scene !== player.scene && t.owner !== "PLAYER") {
                                                        console.log('1');
                                                        testPass = false;
                                                    } else if (t.scene !== player.scene && t.owner !== "PLAYER") {
                                                        testPass = false;
                                                    } else {
                                                        return true;
                                                    }
                                                } else {
                                                    let secondObject = scenes.filter((s) => {
                                                        return s.name === value?.scene;
                                                    })[0];
                                                    if (!secondObject) {
                                                        secondObject = items.filter((it) => {
                                                            return it.name === value?.scene;
                                                        })[0];
                                                        if (!secondObject) {
                                                            secondObject = characters.filter((c) => {
                                                                return c.name === value?.scene;
                                                            })[0];
                                                        }
                                                        const checkOwner = getOwner(secondObject);

                                                        if (checkOwner && checkOwner?.name !== "PLAYER" && checkOwner?.scene !== player.scene) {
                                                            testPass = false;
                                                        } else if (owner && owner?.scene !== secondObject.scene && owner?.scene !== checkOwner?.scene) {
                                                            testPass = false;
                                                        } else if (t.scene !== secondObject.scene && t.scene !== checkOwner?.scene) {
                                                            testPass = false;
                                                        } else {
                                                            return true;
                                                        }
                                                    } else {
                                                        if (t.scene !== secondObject.name) {
                                                            testPass = false;
                                                        } else {
                                                            return true;
                                                        }
                                                    }
                                                }
                                            } else if (conditions[y] && t[conditions[y]] !== value[conditions[y]]) { //IF OBJECT ATTRIBUTE EQUALS EVENT ATTRIBUTE
                                                testPass = false;
                                            } else {
                                                return true;
                                            }
                                        }
                                    })[0];
                                }
                            }
                            if (!testFilter) {
                                testPass = false
                            }
                        } else if (cause[keys[x]] && cause[keys[x]].length > 0) {//IF OBJECT EXISTS
                            let testFilter;
                            //SET OBJECT TO TEST
                            const testObject = (keys[x] === "items") ? items : (keys[x] === "characters") ? characters : (keys[x] === "doors") ? doors : "";
                            if (!testObject) {
                                testPass = false;
                            } else {
                                for (let y = 0; y < cause[keys[x]].length; y++) {
                                    for (let z = 0, conditions = Object.keys(cause[keys[x]][y]); z < conditions.length; z++) {
                                        testFilter = testObject.filter((t) => {
                                            const value = cause[keys[x]][y];
                                            if (t.name === value.name) {
                                                //GET OWNERS FOR ITEMS
                                                const owner = getOwner(t);
                                                if (value?.scene) {
                                                    if (value?.scene === "PLAYER") { //IF SCENE SAME AS PLAYER SCENE
                                                        if (owner && owner?.scene !== player.scene && t.owner !== "PLAYER") {
                                                            testPass = false;
                                                        } else if (t.scene !== player.scene && t.owner !== "PLAYER") {
                                                            testPass = false;
                                                        } else {
                                                            return true;
                                                        }
                                                    } else {
                                                        let secondObject = scenes.filter((s) => {
                                                            return s.name === value?.scene;
                                                        })[0];
                                                        if (!secondObject) {
                                                            secondObject = items.filter((it) => {
                                                                return it.name === value?.scene;
                                                            })[0];
                                                            if (!secondObject) {
                                                                secondObject = characters.filter((c) => {
                                                                    return c.name === value?.scene;
                                                                })[0];
                                                            }
                                                            const checkOwner = getOwner(secondObject);

                                                            if (checkOwner && checkOwner?.name !== "PLAYER" && checkOwner?.scene !== player.scene) {
                                                                testPass = false;
                                                            } else if (owner && owner?.scene !== secondObject.scene && owner?.scene !== checkOwner?.scene) {
                                                                testPass = false;
                                                            } else if (t.scene !== secondObject.scene && t.scene !== checkOwner?.scene) {
                                                                testPass = false;
                                                            } else {
                                                                return true;
                                                            }
                                                        } else {
                                                            if (t.scene !== secondObject.name) {
                                                                testPass = false;
                                                            } else {
                                                                return true;
                                                            }
                                                        }
                                                    }
                                                } else if (t[conditions[z]] !== value[conditions[z]]) { //IF OBJECT ATTRIBUTE EQUALS EVENT ATTRIBUTE
                                                    testPass = false;
                                                } else {
                                                    return true;
                                                }
                                            }
                                        })[0];
                                    }
                                    if (!testFilter) {
                                        testPass = false;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if (!testPass) {
                return false;
            } else {
                return true;
            }
        } else {
            return false;
        };
    });

    if (eventsCheck && eventsCheck.length > 0) {
        for (let i = 0; i < eventsCheck.length; i++) {
            const effect = eventsCheck[i].effect;
            for (let x = 0, keys = Object.keys(effect); x < keys.length; x++) {
                if (keys[x] !== "response" && keys[x] !== "score" && keys[x] !== "fx") {
                    if (effect[keys[x]] && effect[keys[x]].length > 0) {
                        const resultObject = (keys[x] === "items") ? items : (keys[x] === "characters") ? characters : (keys[x] === "doors") ? doors : (keys[x] === "scenes") ? scenes : (keys[x] === "events") ? events : "";
                        if (resultObject) {
                            for (let y = 0; y < effect[keys[x]].length; y++) {
                                for (let z = 0, results = Object.keys(effect[keys[x]][y]); z < results.length; z++) {
                                    if (results[z] !== "name") {
                                        const value = effect[keys[x]][y];
                                        const resultFilter = resultObject.filter((r) => {
                                            return r.name === effect[keys[x]][y].name;
                                        })[0];
                                        if (resultFilter) {
                                            if (value?.scene) {
                                                if (value?.scene === "PLAYER") { //IF SCENE SAME AS PLAYER SCENE
                                                    resultFilter[results[z]] = player.scene;
                                                } else {
                                                    let secondObject = scenes.filter((s) => {
                                                        return s.name === value?.scene;
                                                    })[0];
                                                    if (!secondObject) { //IF NOT A SCENE
                                                        secondObject = items.filter((it) => {
                                                            return it.name === value?.scene;
                                                        })[0];
                                                        if (!secondObject) {
                                                            secondObject = characters.filter((c) => {
                                                                return c.name === value?.scene;
                                                            })[0];
                                                        }
                                                        const checkOwner = getOwner(secondObject);
                                                        if (checkOwner && checkOwner?.name === "PLAYER") {
                                                            resultFilter[results[z]] = player.scene;
                                                        } else if (checkOwner) {
                                                            resultFilter[results[z]] = checkOwner.scene;
                                                        } else {
                                                            resultFilter[results[z]] = secondObject.scene;
                                                        }
                                                    } else {
                                                        resultFilter[results[z]] = secondObject.name;
                                                    }
                                                }
                                            } else {
                                                resultFilter[results[z]] = value[results[z]];
                                            }
                                            const resultUpdate = IDB.setValue(keys[x], resultFilter).catch(() => { return { error: "EVENT_RESULT_IDB_ERROR" } });
                                            if (resultUpdate?.error) {
                                                return resultUpdate;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if (eventsCheck[i]?.effect?.response) {
                respArr.push(eventsCheck[i]?.effect?.response);
            }
            if (eventsCheck[i].event_only === 1) {
                event_only = 1;
            }
            if (eventsCheck[i]?.effect?.score > 0) {
                player.score = player.score + eventsCheck[i].effect.score;
                const evtUpdate = await IDB.setValue('player', player.score, 'score').catch(() => { return { error: "EVENT_SCORE_IDB_ERROR" } });
                if (evtUpdate?.error) {
                    return evtUpdate;
                }
            }
            if (eventsCheck[i]?.effect?.fx) {
                fx = eventsCheck[i]?.effect?.fx;
            }
            if (eventsCheck[i].repeatable !== 1) {
                eventsCheck[i].active = 0;
                const eventUpdate = IDB.setValue("events", eventsCheck[i]).catch(() => { return { error: "EVENT_CHANGE_IDB_ERROR" } });
                if (eventUpdate?.error) {
                    return eventUpdate;
                }
            }
        }
    }
    return {
        response: respArr,
        event_only: event_only,
        fx: fx
    }
}
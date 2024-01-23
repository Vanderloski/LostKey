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
                const cause = e.cause;

                if (e.action && !e.action.includes(action?.action)) {
                    return false;
                } else {
                    //LOOP THROUGH ALL CAUSE OBJECT REQUIREMENTS
                    for (let x = 0, evtReqs = Object.keys(cause); x < evtReqs.length; x++) {
                        //IF PLAYER REQUIREMENT
                        if (evtReqs[x] === "player") {
                            const causeObj = cause[evtReqs[x]];
                            for (let y = 0, conditions = Object.keys(causeObj); y < conditions.length; y++) {
                                if (conditions[y] && player[conditions[y]] !== causeObj[conditions[y]]) {
                                    testPass = false;
                                }
                            }
                        } else {
                            //IF OBJECT CHECK BUT NO OBJECT
                            if (evtReqs[x] === "object" && (!object || object.length === 0)) {
                                testPass = false;
                            } else if (evtReqs[x] === "indirect_object" && (!indirect || indirect.length === 0)) {//IF INDIRECT OBJECT CHECK BUT NO INDIRECT
                                testPass = false;
                            } else if (evtReqs[x] === "object" && object.name !== cause[evtReqs[x]].name) {
                                testPass = false;
                            } else if (evtReqs[x] === "indirect_object" && indirect.name !== cause[evtReqs[x]].name) {
                                testPass = false;
                            } else {
                                const causeArr = (evtReqs[x] === "object" || evtReqs[x] === "indirect_object") ? [cause[evtReqs[x]]] : cause[evtReqs[x]];

                                for (let y = 0; y < causeArr.length; y++) {
                                    //SET OBJECT TO TEST
                                    let testObject = (evtReqs[x] === "items") ? items : (evtReqs[x] === "characters") ? characters : (evtReqs[x] === "doors") ? doors : "";
                                    if (evtReqs[x] === "object" || evtReqs[x] === "indirect_object") {
                                        testObject = (evtReqs[x] === "indirect_object") ? indirect : object;
                                    } else {
                                        testObject = testObject.filter((t) => {
                                            return causeArr[y].name === t.name;
                                        })[0];
                                    }
                                    const owner = getOwner(testObject);
                                    if (action?.inclusive !== 1 && testObject.encountered !== 1) {
                                        testPass = false;
                                    } else if (action?.inclusive !== 1 && testObject.scene !== player.scene && testObject.owner !== "PLAYER" && owner?.scene !== player.scene) {
                                        testPass = false;
                                    } else {
                                        for (let z = 0, conditions = Object.keys(causeArr[y]); z < conditions.length; z++) {
                                            if (conditions[z] !== "name") {
                                                //CHECK FOR NOT EQUALS
                                                if (conditions[z].slice(-4) === '_neq') {
                                                    const condition = conditions[z].slice(0, -4);
                                                    if (condition === "scene") {
                                                        if (causeArr[y][conditions[z]] === "PLAYER" && (testObject[condition] === player.scene || testObject.owner === "PLAYER" || owner?.scene === player.scene)) {
                                                            testPass = false;
                                                        } else if (causeArr[y][conditions[z]] !== "PLAYER" && causeArr[y][conditions[z]] === testObject[condition]) {
                                                            testPass = false;
                                                        }
                                                    } else if (causeArr[y][conditions[z]] === testObject[condition]) {
                                                        testPass = false;
                                                    }
                                                } else {
                                                    if (conditions[z] === "scene") {
                                                        if (causeArr[y][conditions[z]] === "PLAYER" && testObject[conditions[z]] !== player.scene && testObject.owner !== "PLAYER" && owner?.scene !== player.scene) {
                                                            testPass = false;
                                                        } else if (causeArr[y][conditions[z]] !== "PLAYER" && causeArr[y][conditions[z]] !== testObject[conditions[z]]) {
                                                            testPass = false;
                                                        }
                                                    } else if (causeArr[y][conditions[z]] !== testObject[conditions[z]]) {
                                                        testPass = false;
                                                    }
                                                }
                                            }
                                        }
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
        }
    });

    if (eventsCheck && eventsCheck.length > 0) {
        for (let i = 0; i < eventsCheck.length; i++) {
            let effect = eventsCheck[i].effect;
            //IF SAME AS EFFECT
            if (effect.same_as) {
                //GET EVENT
                const sameAsEvt = events.filter((e) => {
                    return e.name === effect.same_as;
                })[0];
                effect = sameAsEvt.effect;
            }
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
            if (effect?.response) {
                respArr.push(effect?.response);
            }
            if (eventsCheck[i].event_only === 1) {
                event_only = 1;
            }
            if (effect?.score > 0) {
                player.score = player.score + effect.score;
                const evtUpdate = await IDB.setValue('player', player.score, 'score').catch(() => { return { error: "EVENT_SCORE_IDB_ERROR" } });
                if (evtUpdate?.error) {
                    return evtUpdate;
                }
            }
            if (effect?.fx) {
                fx = effect?.fx;
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
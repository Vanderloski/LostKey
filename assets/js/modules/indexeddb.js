let dbRequest,
    scenesJSON,
    itemsJSON,
    doorsJSON,
    charactersJSON,
    eventsJSON;

//GET DB SIZE
export const dbSize = async () => {
    let sceneSize = 0;
    let itemSize = 0;
    let doorSize = 0;
    let characterSize = 0;
    let eventSize = 0;

    await fetch('./assets/json/scenes.json', { method: 'HEAD' })
        .then((result) => {
            sceneSize = result.headers.get("content-length") || 0;
        });
    await fetch('./assets/json/items.json', { method: 'HEAD' })
        .then((result) => {
            itemSize = result.headers.get("content-length") || 0;
        });
    await fetch('./assets/json/doors.json', { method: 'HEAD' })
        .then((result) => {
            doorSize = result.headers.get("content-length") || 0;
        });
    await fetch('./assets/json/characters.json', { method: 'HEAD' })
        .then((result) => {
            characterSize = result.headers.get("content-length") || 0;
        });
    await fetch('./assets/json/events.json', { methdo: 'HEAD' })
        .then((result) => {
            eventSize = result.headers.get("content-length") || 0;
        })
    const dbSize = parseInt(sceneSize) + parseInt(itemSize) + parseInt(doorSize) + parseInt(characterSize) + parseInt(eventSize);
    if (dbSize < 1000000) {
        return `${Math.round(+dbSize / 1024).toFixed(0)}KB`
    } else {
        return `${(Math.round(+dbSize / 1024) / 1000).toFixed(2)}MB`
    }
}


//DATABASE CHECK
export const initDB = async () => {
    //CHECK IF INDEXEDDB IS SUPPORTED
    //===========================================================================
    //NEED TO ADD CHECK IF ENOUGH STORAGE SPACE
    //===========================================================================
    if (!('indexedDB' in window)) {
        alert("SORRY, THIS GAME IS UNABLE TO RUN BECAUSE YOUR BROWSER DOES NOT SUPPORT INDEXEDDB.");
    } else {
        return new Promise((resolve, reject) => {
            //OPEN AND/OR CREATE NEW DB IF NOT EXIST
            dbRequest = indexedDB.open('lk_' + options.indexeddb_name, 1);

            //CREATE OBJECTSTORES IF THEY DON'T EXIST
            dbRequest.onupgradeneeded = function () {
                let lk_db = dbRequest.result;
                lk_db.createObjectStore("player");
                lk_db.createObjectStore("scenes", { keyPath: "name" });
                lk_db.createObjectStore("doors", { keyPath: "name" });
                lk_db.createObjectStore("events", { keyPath: "name" });
                const characterStore = lk_db.createObjectStore("characters", { keyPath: "name" });
                const itemStore = lk_db.createObjectStore("items", { keyPath: "name" });

                itemStore.createIndex("scene", ["scene"], { unique: false });
                characterStore.createIndex("scene", ["scene"], { unique: false });

                lk_db.onerror = function () {
                    return reject((options.test_mode) ? 'ERROR: INDEXEDDB_INITDB_ONUPGRADENEEDED_ONERROR' : engineError);
                }

                return resolve('DBCREATED');
            }

            dbRequest.onerror = function () {
                return reject((options.test_mode) ? 'ERROR: INDEXEDDB_INITDB_ONERROR' : engineError);
            };

            dbRequest.onsuccess = async function () {
                try {
                    return resolve('DBEXISTS');
                } catch (err) {
                    return reject((options.test_mode) ? err : engineError);
                }
            }
        })
    }
}

//POPULATE TABLES ON FIRST PLAY
export function populateDB() {
    return new Promise((resolve, reject) => {
        try {
            //GET ALL JSONS NEEDED FOR DB
            //SCENES
            $.getJSON("./assets/json/scenes.json", (s) => {
                scenesJSON = s.scenes;
                if (scenesJSON && scenesJSON.length > 0) {
                    for (let i = 0; i < scenesJSON.length; i++) {
                        scenesJSON[i].name = scenesJSON[i].name.toUpperCase();
                        if (scenesJSON[i].title) {
                            scenesJSON[i].title = scenesJSON[i].title.toUpperCase();
                        }
                        if (scenesJSON[i].introduction) {
                            scenesJSON[i].introduction = scenesJSON[i].introduction.toUpperCase();
                        }
                        if (scenesJSON[i].description) {
                            scenesJSON[i].description = scenesJSON[i].description.toUpperCase();
                        }
                        if (scenesJSON[i].light) {
                            scenesJSON[i].light = scenesJSON[i].light.toUpperCase();
                        }
                        if (!isNaN(scenesJSON[i].visited)) {
                            scenesJSON[i].visited = parseInt(scenesJSON[i].visited);
                        }
                        if (scenesJSON[i]?.alias && scenesJSON[i].alias.length > 0) {
                            for (let ii = 0; ii < scenesJSON[i].alias.length; ii++) {
                                scenesJSON[i].alias[ii] = scenesJSON[i].alias[ii].toUpperCase();
                            }
                        }
                        if (scenesJSON[i]?.exits && scenesJSON[i].exits.length > 0) {
                            for (let ii = 0; ii < scenesJSON[i].exits.length; ii++) {
                                scenesJSON[i].exits[ii].direction = scenesJSON[i].exits[ii].direction.toUpperCase();
                                scenesJSON[i].exits[ii].scene = scenesJSON[i].exits[ii].scene.toUpperCase();
                                if (scenesJSON[i].exits[ii].impassable_message) {
                                    scenesJSON[i].exits[ii].impassable_message = scenesJSON[i].exits[ii].impassable_message.toUpperCase();
                                }
                                if (scenesJSON[i].exits[ii].vehicle_message) {
                                    scenesJSON[i].exits[ii].vehicle_message = scenesJSON[i].exits[ii].vehicle_message.toUpperCase();
                                }
                                if (!isNaN(scenesJSON[i].exits[ii].impassable)) {
                                    scenesJSON[i].exits[ii].impassable = parseInt(scenesJSON[i].exits[ii].impassable);
                                }
                                if (!isNaN(scenesJSON[i].exits[ii].vehicle_required)) {
                                    scenesJSON[i].exits[ii].vehicle_required = parseInt(scenesJSON[i].exits[ii].vehicle_required);
                                }
                            }
                        }
                    }
                }
            }).then(() => {
                //ITEMS
                $.getJSON("./assets/json/items.json", (itm) => {
                    itemsJSON = itm.items;
                    if (itemsJSON && itemsJSON.length > 0) {
                        for (let i = 0; i < itemsJSON.length; i++) {
                            itemsJSON[i].name = itemsJSON[i].name.toUpperCase();
                            if (itemsJSON[i].title) {
                                itemsJSON[i].title = itemsJSON[i].title.toUpperCase();
                            }
                            if (itemsJSON[i].description) {
                                itemsJSON[i].description = itemsJSON[i].description.toUpperCase();
                            }
                            if (itemsJSON[i].description_open) {
                                itemsJSON[i].description_open = itemsJSON[i].description_open.toUpperCase();
                            }
                            if (itemsJSON[i].scene) {
                                itemsJSON[i].scene = itemsJSON[i].scene.toUpperCase();
                            }
                            if (itemsJSON[i].unobtainable_message) {
                                itemsJSON[i].unobtainable_message = itemsJSON[i].unobtainable_message.toUpperCase();
                            }
                            if (itemsJSON[i].taken_message) {
                                itemsJSON[i].taken_message = itemsJSON[i].taken_message.toUpperCase();
                            }
                            if (itemsJSON[i].interior_message) {
                                itemsJSON[i].interior_message = itemsJSON[i].interior_message.toUpperCase();
                            }
                            if (itemsJSON[i].owner) {
                                itemsJSON[i].owner = itemsJSON[i].owner.toUpperCase();
                            }
                            if (itemsJSON[i].ownerType) {
                                itemsJSON[i].ownerType = itemsJSON[i].ownerType.toUpperCase();
                            }
                            if (itemsJSON[i].container) {
                                itemsJSON[i].container = itemsJSON[i].container.toUpperCase();
                            }
                            if (!isNaN(itemsJSON[i].order)) {
                                itemsJSON[i].order = parseInt(itemsJSON[i].order);
                            }
                            if (!isNaN(itemsJSON[i].encountered)) {
                                itemsJSON[i].encountered = parseInt(itemsJSON[i].encountered);
                            }
                            if (!isNaN(itemsJSON[i].taken)) {
                                itemsJSON[i].taken = parseInt(itemsJSON[i].taken);
                            }
                            if (!isNaN(itemsJSON[i].unobtainable)) {
                                itemsJSON[i].unobtainable = parseInt(itemsJSON[i].unobtainable);
                            }
                            if (!isNaN(itemsJSON[i].enterable)) {
                                itemsJSON[i].enterable = parseInt(itemsJSON[i].enterable);
                            }
                            if (!isNaN(itemsJSON[i].exclude)) {
                                itemsJSON[i].exclude = parseInt(itemsJSON[i].exclude);
                            }
                            if (!isNaN(itemsJSON[i].emittable)) {
                                itemsJSON[i].emittable = parseInt(itemsJSON[i].emittable);
                            }
                            if (!isNaN(itemsJSON[i].on)) {
                                itemsJSON[i].on = parseInt(itemsJSON[i].on);
                            }
                            if (!isNaN(itemsJSON[i].transparent)) {
                                itemsJSON[i].transparent = parseInt(itemsJSON[i].transparent);
                            }
                            if (!isNaN(itemsJSON[i].container_allow_player)) {
                                itemsJSON[i].container_allow_player = parseInt(itemsJSON[i].container_allow_player);
                            }
                            if (!isNaN(itemsJSON[i].activate)) {
                                itemsJSON[i].activate = parseInt(itemsJSON[i].activate);
                            }
                            if (itemsJSON[i]?.alias && itemsJSON[i].alias.length > 0) {
                                for (let ii = 0; ii < itemsJSON[i].alias.length; ii++) {
                                    itemsJSON[i].alias[ii] = itemsJSON[i].alias[ii].toUpperCase();
                                }
                            }
                            if (itemsJSON[i]?.converse && itemsJSON[i].converse.length > 0) {
                                for (let ii = 0; ii < itemsJSON[i].converse.length; ii++) {
                                    itemsJSON[i].converse[ii].character = itemsJSON[i].converse[ii].character.toUpperCase();
                                    for (let iii = 0; iii < itemsJSON[i].converse[ii].responses.length; iii++) {
                                        itemsJSON[i].converse[ii].responses[iii] = itemsJSON[i].converse[ii].responses[iii].toUpperCase();
                                    }
                                }
                            }
                            if (itemsJSON[i]?.search && itemsJSON[i].search.length > 0) {
                                for (let ii = 0; ii < itemsJSON[i].search.length; ii++) {
                                    itemsJSON[i].search[ii] = itemsJSON[i].search[ii].toUpperCase();
                                }
                            }
                        }
                    }
                }).then(() => {
                    //THE DOORS
                    $.getJSON("./assets/json/doors.json", (d) => {
                        doorsJSON = d.doors;
                        if (doorsJSON && doorsJSON.length > 0) {
                            for (let i = 0; i < doorsJSON.length; i++) {
                                doorsJSON[i].name = doorsJSON[i].name.toUpperCase();
                                doorsJSON[i].scene = doorsJSON[i].scene.toUpperCase();
                                if (doorsJSON[i].title) {
                                    doorsJSON[i].title = doorsJSON[i].title.toUpperCase();
                                }
                                if (doorsJSON[i].description) {
                                    doorsJSON[i].description = doorsJSON[i].description.toUpperCase();
                                }
                                if (doorsJSON[i].no_lock_message) {
                                    doorsJSON[i].no_lock_message = doorsJSON[i].no_lock_message.toUpperCase();
                                }
                                if (doorsJSON[i].locked_message) {
                                    doorsJSON[i].locked_message = doorsJSON[i].locked_message.toUpperCase();
                                }
                                if (!isNaN(doorsJSON[i]?.open)) {
                                    doorsJSON[i].open = parseInt(doorsJSON[i].open);
                                }
                                if (!isNaN(doorsJSON[i]?.locked)) {
                                    doorsJSON.locked = parseInt(doorsJSON[i].locked);
                                }
                                if (!isNaN(doorsJSON[i].lock_without_key)) {
                                    doorsJSON.lock_without_key = parseInt(doorsJSON[i].lock_without_key);
                                } 
                                if (!isNaN(doorsJSON[i].no_lock)) {
                                    doorsJSON.no_lock = parseInt(doorsJSON[i].no_lock);
                                }
                                if (doorsJSON[i]?.keys && doorsJSON[i].keys.length > 0) {
                                    for (let ii = 0; ii < doorsJSON[i].keys.length; ii++) {
                                        doorsJSON[i].keys[ii] = doorsJSON[i].keys[ii].toUpperCase();
                                    }
                                }
                                if (doorsJSON[i]?.paths && doorsJSON[i].paths.length > 0) {
                                    for (let ii = 0; ii < doorsJSON[i].paths.length; ii++) {
                                        doorsJSON[i].paths[ii].scene = doorsJSON[i].paths[ii].scene.toUpperCase();
                                        if (doorsJSON[i].paths[ii].description) {
                                            doorsJSON[i].paths[ii].description = doorsJSON[i].paths[ii].description.toUpperCase();
                                        }
                                        if (doorsJSON[i].paths[ii].no_lock_message) {
                                            doorsJSON[i].paths[ii].no_lock_message = doorsJSON[i].paths[ii].no_lock_message.toUpperCase();
                                        }
                                        if (doorsJSON[i].paths[ii].locked_message) {
                                            doorsJSON[i].paths[ii].locked_message = doorsJSON[i].paths[ii].locked_message.toUpperCase();
                                        }
                                        if (!isNaN(doorsJSON[i].paths[ii].lock_without_key)) {
                                            doorsJSON[i].paths[ii].lock_without_key = parseInt(doorsJSON[i].paths[ii].lock_without_key);
                                        }
                                        if (!isNaN(doorsJSON[i].paths[ii].no_lock)) {
                                            doorsJSON[i].paths[ii].no_lock = parseInt(doorsJSON[i].paths[ii].no_lock);
                                        }
                                    }
                                }
                            }
                        }
                    }).then(async () => {
                        //THE CHARACTERS
                        $.getJSON("./assets/json/characters.json", (p) => {
                            charactersJSON = p.characters;
                            if (charactersJSON && charactersJSON.length > 0) {
                                for (let i = 0; i < charactersJSON.length; i++) {
                                    charactersJSON[i].name = charactersJSON[i].name.toUpperCase();
                                    if (charactersJSON[i].title) {
                                        charactersJSON[i].title = charactersJSON[i].title.toUpperCase();
                                    }
                                    if (charactersJSON[i].description) {
                                        charactersJSON[i].description = charactersJSON[i].description.toUpperCase();
                                    }
                                    if (charactersJSON[i].scene) {
                                        charactersJSON[i].scene = charactersJSON[i].scene.toUpperCase();
                                    }
                                    if (charactersJSON[i].introduction) {
                                        charactersJSON[i].introduction = charactersJSON[i].introduction.toUpperCase();
                                    }
                                    if (charactersJSON[i].affinity) {
                                        charactersJSON[i].affinity = charactersJSON[i].affinity.toUpperCase();
                                    }
                                    if (!isNaN(charactersJSON[i].encountered)) {
                                        charactersJSON.encountered = parseInt(charactersJSON[i].encountered);
                                    }
                                    if (!isNaN(charactersJSON[i].exclude)) {
                                        charactersJSON.exclude = parseInt(charactersJSON[i].exclude);
                                    }
                                    if (charactersJSON[i]?.responses && charactersJSON[i].responses.length > 0) {
                                        for (let ii = 0; ii < charactersJSON[i].responses.length; ii++) {
                                            charactersJSON[i].responses[ii] = charactersJSON[i].responses[ii].toUpperCase();
                                        }
                                    }
                                    if (charactersJSON[i]?.help && charactersJSON[i].help.length > 0) {
                                        for (let ii = 0; ii < charactersJSON[i].help.length; ii++) {
                                            charactersJSON[i].help[ii] = charactersJSON[i].help[ii].toUpperCase();
                                        }
                                    }
                                    if (charactersJSON[i]?.search && charactersJSON[i].search.length > 0) {
                                        for (let ii = 0; ii < charactersJSON[i].search.length; ii++) {
                                            charactersJSON[i].search[ii] = charactersJSON[i].search[ii].toUpperCase();
                                        }
                                    }
                                }
                            }
                        }).then(async () => {
                            //THE EVENTS
                            $.getJSON("./assets/json/events.json", (ev) => {
                                eventsJSON = ev.events;
                                if (eventsJSON && eventsJSON.length > 0) {
                                    for (let i = 0; i < eventsJSON.length; i++) {
                                        eventsJSON[i].name = eventsJSON[i].name.toUpperCase();
                                        if (eventsJSON[i].door) {
                                            eventsJSON[i].door = eventsJSON[i].door.toUpperCase();
                                        }
                                        if (eventsJSON[i].scene) {
                                            eventsJSON[i].scene = eventsJSON[i].scene.toUpperCase();
                                        }
                                        if (eventsJSON[i].response) {
                                            eventsJSON[i].response = eventsJSON[i].response.toUpperCase();
                                        }
                                        if (eventsJSON[i].inactive_message) {
                                            eventsJSON[i].inactive_message = eventsJSON[i].inactive_message.toUpperCase();
                                        }
                                        if (eventsJSON[i].indirect) {
                                            eventsJSON[i].indirect = eventsJSON[i].indirect.toUpperCase();
                                        }
                                        if (!isNaN(eventsJSON[i].order)) {
                                            eventsJSON[i].order = parseInt(eventsJSON[i].order);
                                        }
                                        if (!isNaN(eventsJSON[i].active)) {
                                            eventsJSON[i].active = parseInt(eventsJSON[i].active);
                                        }
                                        if (!isNaN(eventsJSON[i].before)) {
                                            eventsJSON[i].before = parseInt(eventsJSON[i].before);
                                        }
                                        if (!isNaN(eventsJSON[i].event_only)) {
                                            eventsJSON[i].event_only = parseInt(eventsJSON[i].event_only);
                                        }
                                        if (!isNaN(eventsJSON[i].repeatable)) {
                                            eventsJSON[i].repeatable = parseInt(eventsJSON[i].repeatable);
                                        }
                                        if (!isNaN(eventsJSON[i].exclude)) {
                                            eventsJSON[i].exclude = parseInt(eventsJSON[i].eclude);
                                        }
                                        if (!isNaN(eventsJSON[i].unobtainable)) {
                                            eventsJSON[i].unobtainable = parseInt(eventsJSON[i].unobtainable);
                                        }
                                        if (eventsJSON[i]?.effects && eventsJSON[i].effects.length > 0) {
                                            for (let ii = 0; ii < eventsJSON[i].effects.length; ii++) {
                                                if (eventsJSON[i].effects[ii].character) {
                                                    eventsJSON[i].effects[ii].character = eventsJSON[i].effects[ii].character.toUpperCase();
                                                }
                                                if (eventsJSON[i].effects[ii].item) {
                                                    eventsJSON[i].effects[ii].item = eventsJSON[i].effects[ii].item.toUpperCase();
                                                }
                                                if (eventsJSON[i].effects[ii].scene) {
                                                    eventsJSON[i].effects[ii].scene = eventsJSON[i].effects[ii].scene.toUpperCase();
                                                }
                                                if (eventsJSON[i].effects[ii].event) {
                                                    eventsJSON[i].effects[ii].event = eventsJSON[i].effects[ii].event.toUpperCase();
                                                }
                                                if  (eventsJSON[i].effects[ii].scene_name) {
                                                    eventsJSON[i].effects[ii].scene_name = eventsJSON[i].effects[ii].scene_name.toUpperCase();
                                                }
                                                if (eventsJSON[i].effects[ii].scene_exit) {
                                                    eventsJSON[i].effects[ii].scene_exit = eventsJSON[i].effects[ii].scene_exit.toUpperCase();
                                                }
                                                if (eventsJSON[i].effects[ii].fx) {
                                                    eventsJSON[i].effects[ii].fx = eventsJSON[i].effects[ii].fx.toUpperCase();
                                                }
                                                if (!isNaN(eventsJSON[i].effects[ii].active)) {
                                                    eventsJSON[i].effects[ii].active = parseInt(eventsJSON[i].effects[ii].active);
                                                }
                                                if (!isNaN(eventsJSON[i].effects[ii].impassable)) {
                                                    eventsJSON[i].effects[ii].impassable = parseInt(eventsJSON[i].effects[ii].impassable);
                                                }
                                                if (!isNaN(eventsJSON[i].effects[ii].score)) {
                                                    eventsJSON[i].effects[ii].score = parseInt(eventsJSON[i].effects[ii].score);
                                                }
                                            }
                                        }
                                    }
                                }
                            }).then(async () => {
                                let lk_db = dbRequest.result;
                                let dbStores = lk_db.transaction(["player", "scenes", "items", "doors", "characters", "events"], "readwrite");

                                let dbs_player = dbStores.objectStore("player");
                                dbs_player.add(((options.starting_scene) ? options.starting_scene.toUpperCase() : (scenesJSON[0].name === "OPEN") ? scenesJSON[1].name : scenesJSON[0].name), "scene");
                                dbs_player.add('M', "response_type");
                                dbs_player.add(0, "first");
                                if (options?.score === 1) {
                                    dbs_player.add(0, "score");   
                                }
                                if (options?.moves === 1) {
                                    dbs_player.add(0, "moves");
                                }
                                if (options?.inventory === 1) {
                                    dbs_player.add(1, "inventory");
                                }

                                let dbs_scenes = dbStores.objectStore("scenes");
                                for (let i = 0; i < scenesJSON.length; i++) { dbs_scenes.add(scenesJSON[i]); };

                                let dbs_items = dbStores.objectStore("items");
                                for (let i = 0; i < itemsJSON.length; i++) { dbs_items.add(itemsJSON[i]); };

                                let dbs_doors = dbStores.objectStore("doors");
                                for (let i = 0; i < doorsJSON.length; i++) { dbs_doors.add(doorsJSON[i]); };

                                let dbs_characters = dbStores.objectStore("characters");
                                for (let i = 0; i < charactersJSON.length; i++) { dbs_characters.add(charactersJSON[i]); };

                                let dbs_events = dbStores.objectStore("events");
                                for (let i = 0; i < eventsJSON.length; i++) { dbs_events.add(eventsJSON[i]); };

                                dbStores.oncomplete = () => {
                                    return resolve();
                                };

                                dbStores.onerror = () => {
                                    return reject((options.test_mode) ? 'ERROR: INDEXEDDB_POPULATEDB_ONERROR' : engineError);
                                };
                            }).fail(() => {
                                return reject((options.test_mode) ? 'ERROR: INDEXEDDB_POPULATEDB_EVENTS' : engineError);
                            });
                        }).fail(() => {
                            return reject((options.test_mode) ? 'ERROR: INDEXEDDB_POPULATEDB_CHARACTERS' : engineError);
                        });

                    }).fail(() => {
                        return reject((options.test_mode) ? 'ERROR: INDEXEDDB_POPULATEDB_DOORS' : engineError);
                    });
                }).fail(() => {
                    return reject((options.test_mode) ? 'ERROR: INDEXEDDB_POPULATEDB_ITEMS' : engineError);
                });
            }).fail(() => {
                return reject((options.test_mode) ? 'ERROR: INDEXEDDB_POPULATEDB_SCENES' : engineError);
            });
        } catch (err) {
            return reject((options.test_mode) ? 'ERROR: INDEXEDDB_POPULATEDB_CATCH' : engineError);
        }
    });
}

//GET DB ITEM BY KEY
export const getByKey = async (store, key) => {
    return new Promise(function (resolve, reject) {
        let lk_db = dbRequest.result;
        let dbStores = lk_db.transaction(store, "readonly");

        let dbs_object = dbStores.objectStore(store);
        const request = dbs_object.get(key);

        request.onsuccess = function () {
            if (request.result !== undefined) {
                return resolve(request.result);
            } else {
                return reject();
            }
        };

        request.onerror = () => {
            return reject();
        }
    });
}

//GET ALL DB ITEMS IN OBJECT
export const getByStore = async (store, index, key) => {
    return new Promise(function (resolve, reject) {
        let request;

        let lk_db = dbRequest.result;
        let dbStores = lk_db.transaction(store, "readonly");

        let dbs_object = dbStores.objectStore(store);

        if (index) {
            const dbs_index = dbs_object.index(index);
            request = dbs_index.getAll([key]);
        } else {
            request = dbs_object.getAll();
        }

        request.onsuccess = function () {
            if (request.result !== undefined) {
                return resolve(request.result);
            } else {
                return reject();
            }
        }

        request.onerror = () => {
            return reject();
        }
    })
}

//SET DB ITEM BY KEY
export const setValue = async (store, value, key) => {
    return new Promise(function (resolve) {
        let request;
        let lk_db = dbRequest.result;
        let dbStores = lk_db.transaction(store, "readwrite");

        let dbs_object = dbStores.objectStore(store);

        if (key) {
            request = dbs_object.put(value, key);
        } else {
            request = dbs_object.put(value);
        }

        request.onsuccess = () => {
            return resolve();
        };

        request.onerror = () => {
            return reject();
        }
    })
}

//GET ALL IN STORE WITH KEYS
export const getByStoreWithKeys = async (store) => {
    return new Promise(function (resolve) {
        let request;
        let respObj = {};
        let lk_db = dbRequest.result;
        let dbStores = lk_db.transaction(store, "readwrite");
        let object_store = dbStores.objectStore(store, "readwrite");

        request = object_store.openCursor();

        request.onsuccess = function (event) {
            let cursor = event.target.result;
            if (cursor) {
                respObj[cursor.primaryKey] = cursor.value;
                cursor.continue();
            } else {
                return resolve(respObj);
            }
        };

        request.onerror = () => {
            return reject();
        }
    });
}
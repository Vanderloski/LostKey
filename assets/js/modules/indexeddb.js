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
            $.getJSON("./assets/json/scenes.json", async (s) => {
                scenesJSON = s.scenes;
                if (scenesJSON && scenesJSON.length > 0) {
                    for (let i = 0; i < scenesJSON.length; i++) {
                        scenesJSON[i] = await normalize(scenesJSON[i]);
                    }
                }
            }).then(() => {
                //ITEMS
                $.getJSON("./assets/json/items.json", async (itm) => {
                    itemsJSON = itm.items;
                    if (itemsJSON && itemsJSON.length > 0) {
                        for (let i = 0; i < itemsJSON.length; i++) {
                            itemsJSON[i] = await normalize(itemsJSON[i]);
                        }
                    }
                }).then(() => {
                    //THE DOORS
                    $.getJSON("./assets/json/doors.json", async (d) => {
                        doorsJSON = d.doors;
                        if (doorsJSON && doorsJSON.length > 0) {
                            for (let i = 0; i < doorsJSON.length; i++) {
                                doorsJSON[i] = await normalize(doorsJSON[i]);
                            }
                        }
                    }).then(async () => {
                        //THE CHARACTERS
                        $.getJSON("./assets/json/characters.json", async (p) => {
                            charactersJSON = p.characters;
                            if (charactersJSON && charactersJSON.length > 0) {
                                for (let i = 0; i < charactersJSON.length; i++) {
                                    charactersJSON[i] = await normalize(charactersJSON[i]);
                                }
                            }
                        }).then(async () => {
                            //THE EVENTS
                            $.getJSON("./assets/json/events.json", async (ev) => {
                                eventsJSON = ev.events;
                                if (eventsJSON && eventsJSON.length > 0) {
                                    for (let i = 0; i < eventsJSON.length; i++) {
                                        eventsJSON[i] = await normalize(eventsJSON[i]);
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

//DELETE INDEXED DB
export const deleteDB = async() => {
    if (confirm("THIS WILL DELETE YOUR CURRENT GAME FROM YOUR BROWSER AND PUT YOU BACK AT THE VERY START. ARE YOU SURE YOU WANT TO CONTINUE?") === true) {
        const DBDeleteRequest = window.indexedDB.deleteDatabase('lk_' + options.indexeddb_name);
        DBDeleteRequest.onerror = (error) => {
            return false;
            alert(engineError);
        };

        DBDeleteRequest.onsuccess = () => {
            return true;
        };
    }
}
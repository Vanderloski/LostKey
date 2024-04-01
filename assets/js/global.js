const engineError = "IT SEEMS I'VE ENCOUNTERED AN ERROR, PLEASE REFRESH THE PAGE. ";

//CLASSES
let IDB,
    CMD,
    //GLOBAL VARIABLES
    options,
    player,
    actions,
    profanity,
    items,
    doors,
    scenes,
    characters,
    events,
    lastEngineResp,
    player_input;

const prepositions = [
    "ABOUT",
    "ABOVE",
    "ACROSS",
    "AT",
    "BELOW",
    "BESIDE",
    "BY",
    "DOWN",
    "FOR",
    "FROM",
    "IN",
    "INTO",
    "OF",
    "OFF",
    "ON",
    "ONTO",
    "OUT",
    "OVER",
    "THROUGH",
    "TO",
    "TOWARDS",
    "UNDER",
    "UP",
    "WITH"
];

const articles = [
    "THE",
    "A",
    "AN"
]

//GET OPTIONS CREATE INDEXDB MODULE AND START MAIN JS
$.getJSON("./assets/json/options.json", (opt) => {
    options = opt;
    options.indexeddb_name === options.indexeddb_name.toUpperCase();

    import('./modules/indexeddb.js')
        .then(module => {
            IDB = module;
            indexDBCheck();
        })
        .catch(() => { alert(engineError) });
}).fail(() => {
    alert(engineError);
    return reject();
});

/*
LOAD OPTIONS WITHOUT JQUERY
async function getFetch(url) {
    return await fetch(url)
        .then(async (optStatus) => {
            if (optStatus.status >= 400 && optStatus.status < 600) {
                alert(engineError);
                return;
            }
            return optStatus;
        })
        .then(async (opt) => {
            if (opt.ok) {
                options = await opt.json();
                options.indexeddb_name === options.indexeddb_name.toUpperCase();

                import('./modules/indexeddb.js')
                    .then(module => {
                        IDB = module;
                        indexDBCheck();
                        return;
                    })
                    .catch(() => { 
                        alert(engineError) 
                        return;
                    });
                    return
            } else {
                alert(engineError);
                return;
            }
        })
        .catch(() => {
            alert(engineError);
            return;
        })
}

async function getOptions() {
    getFetch("./assets/json/options.json")
}

//GET OPTIONS AND START GAME
getOptions();*/

//SHOW ERROR AND DISABLE PLAY
function showError(error) {
    $('#cursor').css({ visibility: 'hidden' });
    $('#commandInput').prop("disabled", true);
    $('#commandDisplay').html((options.test_mode) ? 'ERROR: ' + error : engineError);
    return false;
}

//REMOVE THE ARTICLE "THE" FROM BEGINNING OF STRING
function removeThe(string) {
    string = (string && typeof string !== "string") ? string.toString() : string;

    if (typeof string === "string") {
        string = string.split(" ");

        if (string[0] === "THE") {
            string.shift();
        };
        return string.join(" ");
    } else {
        return '';
    }
}

function addThe(name) {
    const wordDec = (name.character) ? ' ###' : (name.door) ? ' ***' : ' |||';
    const nameArr = ((name.title) ? name.title : name.name).split(" ");
    return ((name.character) ? "" : ((nameArr[0] === "THE") ? "" : "THE")) + wordDec + name.name.replaceAll(" ", "_");
}

//MAKE MATH.RANDOM A BIT MORE RANDOM
function rng(min, max) {
    const randomBuffer = new Uint32Array(1);
    window.crypto.getRandomValues(randomBuffer);
    let randomNumber = randomBuffer[0] / (0xffffffff + 1);

    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(randomNumber * (max - min + 1)) + min;
}

//HIDE-SHOW INVENTORY
function inventoryToggle() {
    if (player.inventory === 0 || options.show_inventory === 0 || player.show_inventory === 0) {
        $('#sidebar').animate({
            width: '0%'
        }, () => {
            $('#sidebar').hide();
        });
        $('#storybook').animate({
            width: '100%'
        });
        return 0;
    } else {
        $('#sidebar').show();
        $('#sidebar').animate({
            width: '30%'
        });
        $('#storybook').animate({
            width: '70%'
        });
        return 1;
    }
}

//GET OWNER INFORMATION
function getOwner(subordinate) {
    if (!subordinate?.owner) {
        return undefined;
    } else {
        if (subordinate?.owner === "PLAYER") {
            return {
                name: "PLAYER",
                scene: player.scene,
                subordinate: subordinate
            }
        } else if (subordinate?.ownerType === "CHARACTER") {
            const charOwner = characters.filter((c) => {
                return c.name === subordinate.owner;
            }).map(charObj => ({ ...charObj }))[0];
            charOwner.subordinate = subordinate;
            charOwner.character = 1;
            return charOwner;
        } else if (subordinate?.ownerType === "ITEM") {
            const itemOwner = items.filter((it) => {
                return it.name === subordinate.owner;
            }).map(itemObj => ({ ...itemObj }))[0];

            itemOwner.subordinate = subordinate;
            itemOwner.item = 1;
            if (itemOwner.owner) {
                return getOwner(itemOwner);
            } else {
                return itemOwner;
            }
        } else if (subordinate.owner) { //SET OWNER TYPE IF NOT FOUND
            const charOwner = characters.filter((c) => {
                return c.name === subordinate.owner;
            })[0];
            const itemOwner = items.filter((it) => {
                return it.name === subordinate.owner;
            })[0];
            if (!charOwner && !itemOwner) {
                return undefined;
            } else {
                if (charOwner) {
                    subordinate.ownerType = "CHARACTER";
                }
                if (itemOwner) {
                    subordinate.ownerType = "ITEM";
                }
                const table = (subordinate.door) ? "doors" : ((subordinate.character) ? "characters" : "items")
                const subUpdate = IDB.setValue(table, subordinate).catch(() => { return { error: "GLOBAL_GETOWNER_IDB_UPDATE" } });
                if (subUpdate?.error) {
                    return subUpdate;
                } else {
                    return getOwner(subordinate);
                }
            }
        }
    }
}

//CHECK FOR CURRENT SCENE HERE AND IF NEW SCENE IS PASSED USE THAT FOR ADDITIONAL CHECKS
function sceneLight(sceneVis) {
    //CHECK NEW SCENE VISIBILITY
    const light = items.filter((it) => {
        return it.light_source === 1 && it.on === 1;
    })[0];
    const owner = getOwner(light);
    if (sceneVis?.visibility === "DARK") {
        if (!light) {
            return false;
        } else {
            if (light.owner !== "PLAYER") {
                if (owner && owner?.scene !== player.scene) {
                    return false;
                } else if (light.scene !== player.scene) {
                    return false;
                } else {
                    return true;
                }
            } else {
                return true;
            }
        }
    } else {
        return true;
    }
}


function romanticize(year) {
    const values =
        [1000, 900, 500, 400, 100,
            90, 50, 40, 10, 9, 5, 4, 1];
    const symbols =
        ['M', 'CM', 'D', 'CD', 'C',
            'XC', 'L', 'XL', 'X', 'IX',
            'V', 'IV', 'I'];
    let result = '';

    for (let i = 0; i < values.length; i++) {
        while (year >= values[i]) {
            result += symbols[i];
            year -= values[i];
        }
    }

    return result;
}

//NORMALIZE JSON DATA
async function normalize(file) {
    for (let e = 0, events = Object.keys(file); e < events.length; e++) {
        //IF NUMBER
        if (file[events[e]] && !isNaN(file[events[e]])) {
            file[events[e]] = parseInt(file[events[e]], 10);
        }

        //IF STRING
        if (typeof file[events[e]] === "string") {
            file[events[e]] = file[events[e]].toUpperCase();
        }

        //IF OBJECT
        if (typeof file[events[e]] === "object") {
            const isArr = Array.isArray(file[events[e]]);
            if (isArr) {
                if (file[events[e]].length > 0) {
                    for (let ii = 0; ii < file[events[e]].length; ii++) {
                        if (typeof file[events[e]][ii] === "string") {
                            file[events[e]][ii] = file[events[e]][ii].toUpperCase();
                        } else {
                            file[events[e]][ii] = await normalize(file[events[e]][ii]);
                        };
                    }
                };
            } else {
                file[events[e]] = await normalize(file[events[e]]);
            }
        }

        if (events[e] !== events[e].toLowerCase()) {
            delete Object.assign(file, { [events[e].toLowerCase()]: file[events[e]] })[events[e]];
        }
    }
    return file;
}
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
    lastEngineResp;

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
    return ((nameArr[0] === "THE") ? "" : "THE") + wordDec + name.name.replaceAll(" ", "_");
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
    if (player.inventory === 0 || options.show_inventory === 0) {
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
                const subUpdate = IDB.setValue('items', subordinate).catch(() => { return { error: "GLOBAL_GETOWNER_IDB_UPDATE" } });
                if (subUpdate?.error) {
                    return subUpdate;
                } else {
                    return getOwner(subordinate);
                }
            }
        }
    }
}
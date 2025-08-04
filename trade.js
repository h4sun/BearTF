const config = require("./config");
const axios = require('axios');
const backpacktfHandler = require('./backpacktf');

const fs = require('fs');
let priceList = JSON.parse(fs.readFileSync('./pricelist.json', 'utf8'));

// Sample usage: !buy Team Captain or !sell Team Captain
async function handleTradeCommands(client, manager, steamID, tradeType, itemName, clientInventory, userInventory) {
    try {
        const userSteamId = steamID.getSteamID64();

        if (tradeType == 'buy') { // If the type is true which means buy command the bot must own that item to sell.
            const itemDefindex = await backpacktfHandler.getDefindexFromName(itemName); // Finding itemDefindex from name
            const item = clientInventory.find((item) => {return item.defindex == itemDefindex}); // Checking the item if the bot owns that item, returns item
            if (!item) { // Bot don't have the item
                client.chat.sendFriendMessage(userSteamId, `I could not find any item names in my pricelist that contain "${itemName}". I may not be trading the item you are looking for.`);
            }   
            else {
                // Checking the price list.json, if the bot sell the that item.
                if (priceList[itemName]?.sell) {  // Checking if the bot selling that item                    
                    const price = priceList[itemName]?.sell.metal;
                    const offer = await prepareTradeOffer(manager, userSteamId, 'buy', clientInventory, userInventory, price, itemName);
                    
                    if (offer == -1) {
                        client.chat.sendFriendMessage(userSteamId, "I can not send a trade you might have trade limitations");                        
                    }
                    else if (offer == -2) {
                        client.chat.sendFriendMessage(userSteamId, "You do not have enough metal to make a trade");
                    }
                    else if (offer == -3) {
                        client.chat.sendFriendMessage(userSteamId, "Not enough change to match the price exactly");
                    }
                    else {
                        offer.data("itemName", itemName);
                        offer.send((err, status) => {
                            if(err) {
                                client.chat.sendFriendMessage(userSteamId, "An error occured please try again");
                            }
                            else {
                                client.chat.sendFriendMessage(userSteamId, "Offer is sending please wait");
                                console.log("Offer will sent it to user after the mobile confirmations");
                            }
                        });
                    }

                }
                else {
                    client.chat.sendFriendMessage(userSteamId, `I could not find any item names in my pricelist that contain "${itemName}". I may not be trading the item you are looking for.`);
                }
            }
        }
        
        else if (tradeType == 'sell') {
            // Checking the price list.json, if the bot buying the that item.
            if (priceList[itemName]?.buy) { // Bot is buying that item
                const price = priceList[itemName]?.buy.metal; // The price bot want to buy that item
                const itemDefindex = await backpacktfHandler.getDefindexFromName(itemName);
                const item = userInventory?.find((item) => {return item.defindex == itemDefindex}); // The item bot want to buy from user
                if (item) {
                    const offer = await prepareTradeOffer(manager, userSteamId, 'sell', clientInventory, userInventory, price, itemName);
                    
                    if (offer == -1) {
                        client.chat.sendFriendMessage(userSteamId, "I can not send a trade you might have trade limitations");
                    }
                    else if (offer == -2) {
                        client.chat.sendFriendMessage(userSteamId, "You do not have enough metal to afford");
                    }
                    else if (offer == -3) {
                        client.chat.sendFriendMessage(userSteamId, "Not enough change to match the price exactly");
                    }
                    else {
                        offer.data("itemName", itemName);
                        offer.send((err, status) => {
                            if(err) {
                                console.log(err);
                            }
                            else{
                                console.log("Status: " + " " + status);
                            }
                        });
                        client.chat.sendFriendMessage(userSteamId, "Offer is sending please wait");
                        console.log("Offer will sent it to user after the mobile confirmations");                    
                    }
                }
                else {
                    client.chat.sendFriendMessage(userSteamId, `I could not find ${itemName} on your inventory`);
                }
            }
            else {
                client.chat.sendFriendMessage(userSteamId, `I could not find any item names in my pricelist that contain "${itemName}". I may not be trading the item you are looking for.`);
            }
        }
    }
    catch (err){
        console.error(err);
    }
}

async function prepareTradeOffer(manager, userSteamId, tradeType, clientInventory, userInventory, price, itemName) {
    
    // TODO: Target Cannot Trade Mesajı aldım buna karsılık kullanıcıya mesaj yolla    
    try {
        const offer = manager.createOffer(userSteamId);
    
        if (tradeType == 'buy') {

            const refs = userInventory.filter((item) => {return item.defindex == 5002});
            const recs = userInventory.filter((item) => {return item.defindex == 5001});
            const scraps = userInventory.filter((item) => {return item.defindex == 5000});

            const itemDefindex = await backpacktfHandler.getDefindexFromName(itemName); // finding item defindex
            const item = clientInventory.filter((item) => {return item.defindex == itemDefindex});

            try { 

                const result = await adjustMetals(price, refs, recs, scraps);

                if (result == -3) {
                    return -3;
                }
                else if (result == -2) {
                    return -2;
                }

                const { refsNeeded, recsNeeded, scrapsNeeded } = await adjustMetals(price, refs, recs, scraps);

                // Converting all itemObjects to use offer.addTheirItem() it is expect item object.
                for (let i = 0; i < refsNeeded; i++) {
                    const itemObject = {
                        assetid : refs[i].id,
                        contextid : 2,
                        appid : 440,
                        amount : 1
                    };
                    offer.addTheirItem(itemObject);
                }

                for (let i = 0; i < recsNeeded; i++) {
                    const itemObject = {
                        assetid : recs[i].id,
                        contextid : 2,
                        appid : 440,
                        amount : 1
                    };
                    offer.addTheirItem(itemObject);
                }

                for (let i = 0; i < scrapsNeeded; i++) {
                    const itemObject = {
                        assetid : scraps[i].id,
                        contextid : 2,
                        appid : 440,
                        amount : 1
                    };
                    offer.addTheirItem(itemObject);
                }

                const itemObject = {
                    assetid : item[0].id,
                    contextid : 2,
                    appid : 440,
                    amount : 1 
                };
                offer.addMyItem(itemObject);

                return offer
            }
            catch (err) {
                console.log(err);
                return -2;
            }
        }

        else if (tradeType == 'sell') {

            const refs = clientInventory.filter((item) => {return item.defindex == 5002});
            const recs = clientInventory.filter((item) => {return item.defindex == 5001});
            const scraps = clientInventory.filter((item) => {return item.defindex == 5000});

            const itemDefindex = await backpacktfHandler.getDefindexFromName(itemName); // finding item defindex
            const item = userInventory.filter((item) => {return item.defindex == itemDefindex});

            try {

                const result = await adjustMetals(price, refs, recs, scraps);
                if (result == -3) {
                    return -3;
                }
                else if (result == -2) {
                    return -2;
                }

                const { refsNeeded, recsNeeded, scrapsNeeded } = await adjustMetals(price, refs, recs, scraps);

                for (let i = 0; i < refsNeeded; i++) {
                    const itemObject = {
                        assetid : refs[i].id,
                        contextid : 2,
                        appid : 440,
                        amount : 1
                    };
                    offer.addMyItem(itemObject);
                }

                for (let i = 0; i < recsNeeded; i++) {
                    const itemObject = {
                        assetid : recs[i].id,
                        contextid : 2,
                        appid : 440,
                        amount : 1
                    };
                    offer.addMyItem(itemObject);
                }

                for (let i = 0; i < scrapsNeeded; i++) {
                    const itemObject = {
                        assetid : scraps[i].id,
                        contextid : 2,
                        appid : 440,
                        amount : 1
                    };
                    offer.addMyItem(itemObject);
                }

                const itemO = {
                    assetid : item[0].id,
                    contextid : 2,
                    appid : 440,
                    amount : 1
                };
                offer.addTheirItem(itemO);

               return offer
            }
            catch (err) {
                console.log("User does not have an enough metal to make a trade" + " " + err);
                return -2;
            }
        }
    }
    catch(err) {
        console.log("User have trade limitiations" + " " + err);
        return -1
    }
}

// Adjust correct metals to make a trade
async function adjustMetals (price, refs, recs, scraps) {
        
    // Converting all things to scrap and calculate refs, recs from there
    let userTotalRefs = refs.length
    let userTotalRecs = recs.length
    let userTotalScraps = scraps.length
    let userTotalMetal = userTotalRefs * 9 + userTotalRecs * 3 + userTotalScraps; 


    let itemPriceTotal = 0;
    try {
        let floatPart = Number(String(price).split('.')[1][0]);
        let integerPart = Math.floor(price);
        itemPriceTotal = integerPart * 9 + floatPart;
    }
    catch {
        let integerPart = Math.floor(price);
        itemPriceTotal = integerPart * 9;
    }


    let itemNeedRefs = 0
    let itemNeedRecs = 0
    let itemNeedScraps = 0


    if (userTotalMetal >= itemPriceTotal) {

        while (itemPriceTotal != 0) {

            if (userTotalRefs != 0 && itemPriceTotal >= 9) {
                itemPriceTotal -= 9;
                userTotalRefs--;
                itemNeedRefs++;
            }

            else if (userTotalRecs != 0 && itemPriceTotal >= 3) {
                itemPriceTotal -= 3;
                userTotalRecs--;
                itemNeedRecs++;
            }

            else if (userTotalScraps != 0 && itemPriceTotal >= 1) {
                itemPriceTotal -= 1;
                userTotalScraps--;
                itemNeedScraps++;
            }
            else {
                console.log("Not enough change to match the price exactly.");
                return -3;
            }
        }
    }
    
    else {
        console.log("User does not have an enough metal to make a trade");
        return -2;
    }

    return({ refsNeeded: itemNeedRefs, recsNeeded: itemNeedRecs, scrapsNeeded: itemNeedScraps });
}

async function checkOfferMetals(price, userPay) {

    let keys;
    let refs;
    let recs;
    let scraps;

    for (let i = 0; i < userPay; i++) {
        if (userPay[i] == "Refined Metal") refs.push(userPay[i])
    }



}



// Get spesific inventory within steamID64
async function getInventory(steamID) {

    url = `https://api.steampowered.com/IEconItems_440/GetPlayerItems/v1/?steamid=${steamID}&key=${config.steamapi}`;

    try {
        const response = await axios.get(url);
        const items = response.data.result.items;
        console.log("Caught the inventory successfully");
        return items
    }

    catch (err) {
        await delayAPI(5000);
        return await getInventory(steamID);
    }

}

function delayAPI(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    handleTradeCommands,
    getInventory
}


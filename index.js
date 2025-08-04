const config = require('./config');
const messageHandler = require('./message');
const backpacktfHandler = require('./backpacktf');
const tradeHandler = require('./trade');

const fs = require('fs');
let priceList = JSON.parse(fs.readFileSync('./pricelist.json', 'utf8'));


// -------------------------------- Steam Client  ------------------------------------------------------------

const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const sharedSecret = config.sharedSecret;
const identitySecret = config.identitySecret;
config.login["twoFactorCode"] = SteamTotp.generateAuthCode(sharedSecret);
const client = new SteamUser();
client.logOn(config.login);


// Checking if it is bot loggedOn and change to his state also listing items on backpacktf and make backpacktf state bot
client.on('loggedOn', () => {
    console.log('Bot is online');
    client.setPersona(SteamUser.EPersonaState.Online); // When the bot logged on return state online
})


// Loggin with websession to use steam web api which is needed for using trading
let userInventory;
let clientInventory;
let lastSteamID64;
let sessionReady = false;

client.on('webSession', async (sessionID, cookies) => {
    manager.setCookies(cookies);

    if (!sessionReady) {
        sessionReady = true;
        clientInventory = await tradeHandler.getInventory(client.steamID.getSteamID64());
        client.gamesPlayed(440) // Converting bot state to 'Playing Team Fortress 2'
        console.log("Bot state changed to 'Playing Team Fortress 2'");    
        //await backpacktfHandler.initBackpacktf(clientInventory);
    }
});

client.on("friendRelationship", function(steamID, relationship) { // If 0 -> They removed, 2 -> They added
    if (relationship === 0) {
        const persona = client.users[steamID.getSteamID64()];
        console.log(persona.player_name + " " + "removed us from friend list");
    }

    else if (relationship === 2) {
        client.addFriend(steamID);
        client.chat.sendFriendMessage(steamID.getSteamID64(), `Hi! If you don't know how things work, please type "!how2trade"`)
    }
});

client.on('friendMessage', async (steamID, message) => {
    if (!sessionReady || !clientInventory) {
        client.chat.sendFriendMessage(steamID.getSteamID64(), "The bot is still loading its inventory, please wait a moment and try again.");
        return;
    }
    const splitted = message.split(' ');
    const firstWord = splitted.shift();
    
    const nickname = client.users[steamID.getSteamID64()]?.player_name;
    console.log(`${nickname} said: ${message}`);
    if (firstWord.startsWith('!buy') || firstWord.startsWith('!sell')) {
        client.chat.sendFriendMessage(steamID.getSteamID64(), "Preparing trade offer please be patient it might take 1-2 min...");
        if (lastSteamID64 == undefined) { // Save the last user steam id to reduce getUserInventory usage
            lastSteamID64 = steamID.getSteamID64();
            userInventory = await tradeHandler.getInventory(steamID.getSteamID64());
            messageHandler.botCommands(client, manager, steamID, message, clientInventory, userInventory);
        }
        else if (lastSteamID64 != steamID.getSteamID64()) {
            lastSteamID64 = steamID.getSteamID64();
            userInventory = await tradeHandler.getInventory(steamID.getSteamID64());
            messageHandler.botCommands(client, manager, steamID, message, clientInventory, userInventory);
        }
        else  {
            messageHandler.botCommands(client, manager, steamID, message, clientInventory, userInventory);
        }
    }
    else {
        messageHandler.botCommands(client, manager, steamID, message);
    }
});





// -------------------------------- TradeOfferManager -----------------------------------------------------------------------------------------------------
const TradeOfferManager = require('steam-tradeoffer-manager');
const manager = new TradeOfferManager({
    "steam" : client,
    "domain" : "",
    "language" : "en"
});     

manager.on('newOffer', (offer) => {

    const itemsToGive = offer.itemsToGive;
    const itemsToReceive = offer.itemsToReceive;
    const isOurOffer = offer.isOurOffer;
    const confirmationMethod = offer.confirmationMethod;
    const userSteamObject = offer.partner;
    let isWeSell;
    let hatPrices;
    let userPays;


    for (const itemObject of itemsToGive) {

        const itemName = itemObject.name;

        if (itemName != "Refined Metal" || itemName != "Reclaimed Metal" || itemName != "Scrap Metal" || itemName != "Mann Co. Supply Crate Key") {
            if (priceList[itemName]?.sell) {
                isWeSell = true;
                hatPrices.push(priceList[itemName].sell);                       
            }
        }

        else {
            userPays.push(itemName);
            isWeSell = false;
        }


        console.log(itemObject);

    }

    if (isWeSell) {
        const hatPrice = priceList[itemName].sell;
    }
    else {
        client.chat.sendFriendMessage(userSteamObject.getSteamID64(), `The bot does not sell ${itemName}.`);
    }



})


// Checking the state of offer
manager.on('sentOfferChanged', async (offer, oldState) => {
    console.log(`Offer #${offer.id} changed from ${TradeOfferManager.ETradeOfferState[oldState]} to ${TradeOfferManager.ETradeOfferState[offer.state]}`);

    if (offer.state === TradeOfferManager.ETradeOfferState.Accepted) {
        console.log("Offer accepted!");
        try {
            clientInventory = undefined;
            await delayInventory(10000);
            clientInventory = await tradeHandler.getInventory(client.steamID.getSteamID64()) // Refresh the bot inventory after the trade
            lastSteamID64 = undefined; // Undefined the user inventory same user might want use one more time so we might get wrong item from that user
            
            const itemName = offer.data("itemName");
            //console.log(itemName);
            const {listingId, listingIntent} = await backpacktfHandler.getListingId(itemName, undefined, false);
            const defindex = await backpacktfHandler.getDefindexFromName(itemName);
            if (listingIntent == "buy" && priceList[itemName].buyQuantity > 0) {
                priceList[itemName].buyQuantity = priceList[itemName].buyQuantity - 1;
                fs.writeFileSync('./pricelist.json', JSON.stringify(priceList, null, 2));

                if (priceList[itemName].buyQuantity == 0) {
                    const deleteListing = await backpacktfHandler.deleteListing(listingId, listingIntent, itemName);
                    console.log(`The buy listing of ${itemName} is deleted`)
                    if (deleteListing == 200) { 
                        console.log(`The ${listingIntent} listing of ${itemName} has been deleted`);
                        delete priceList[itemName].listingBuyId;
                        delete priceList[itemName].buyQuantity;
                        fs.writeFileSync('./pricelist.json', JSON.stringify(priceList, null, 2));
                        console.log(`Removed listingBuyId from ${itemName} in pricelist.json`);
                    }
                }
            }

            if (listingIntent == "sell") {
                const item = clientInventory.find(item => item.defindex === defindex);
                if (!item) {
                    const deleteListing = await backpacktfHandler.deleteListing(listingId, listingIntent, itemName);
                    if (deleteListing == 200) { 
                        console.log(`The ${listingIntent} listing of ${itemName} has been deleted`) 
                    }
                } 
            }  
        }
        catch (err) {
            console.log(err);
        }
    } 
    else if (offer.state === TradeOfferManager.ETradeOfferState.Declined) {
        console.log("Offer declined.");
    } 
    else if (offer.state === TradeOfferManager.ETradeOfferState.Canceled) {
        console.log("Offer canceled.");
    }
});


function delayInventory(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
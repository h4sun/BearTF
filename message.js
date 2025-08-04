const tradeHandler = require('./trade');

//  Bot commands
function botCommands (client, manager, steamID, message, clientInventory = undefined, userInventory = undefined) {
    // Sample usage: !buy Team Captain or !sell Team Captain

    // Split message and trying to find item name
    const splitted = message.split(' ');
    const firstWord = splitted.shift(); 
    let itemName = "";
    for (const word of splitted) {
        itemName += word
        itemName += " ";
    }
    itemName = itemName.trim();

    let updatedInventory;

    if ((firstWord.startsWith('!buy') || firstWord.startsWith('!sell')) && updatedInventory == undefined) {
        const tradeType = firstWord.startsWith('!buy') ? 'buy' : 'sell'; // If trade is buy return true else false
        tradeHandler.handleTradeCommands(client, manager, steamID, tradeType, itemName, clientInventory, userInventory);
    }
    
    else if (updatedInventory != undefined) {
        const tradeType = firstWord.startsWith('!buy') ? 'buy' : 'sell'; // If trade is buy return true else false
        tradeHandler.handleTradeCommands(client, manager, steamID, tradeType, itemName, clientInventory, updatedInventory);
    }
   
    else if (message == "!how2trade")  {
        client.chat.sendFriendMessage(steamID.getSteamID64(), `Use one of my commands to request a trade. Say you want to buy a Team Captain, just type "!buy Team Captain" vice versa for sell a item. If I am missing something on your inventory type !update`);
    }

    else if (message == "!update") {
        tradeHandler.getInventory(steamID.getSteamID64()).then((inventory) => {
            updatedInventory = inventory;
        });
        client.chat.sendFriendMessage(steamID.getSteamID64(), `Your inventory updated`);
    }
    
}



module.exports = {
    botCommands,
}
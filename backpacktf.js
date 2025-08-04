const axios = require('axios');
const config = require('./config');
const tradeHandler = require('./trade');

const fs = require('fs');
let priceList = JSON.parse(fs.readFileSync('./pricelist.json', 'utf8'));

// Register/renew the user agent status with backpack.tf. This informs the system that the bot is controlling the user, and the status lasts for 30 minutes.
async function agentPulse() {
    const url = `https://backpack.tf/api/agent/pulse?token=${config.backpacktf.token}`

    const headers = {
        'Accept': 'application/json',
    }

    const response = await axios.post(url, {headers});
    console.log(`Backpacktf status changed to user agent response -> ${response.data.status}`);
}

// Clean the user agent status with backpack.tf
async function cleanAgent() {
    const url = `https://backpack.tf/api/agent/stop?token=${config.backpacktf.token}`

    const headers = {
        'Accept': 'application/json',
    }

    const response = await axios.post(url, {headers});
    if (response.status == 200) {console.log("Backpacktf status has changed to user")}
}

// List items for buy from priceList.json
async function listForBuy(quantity = 1, qualityName = 'Unique', qualityID = 6, qualityColor = "#FF7000", craftable = true) {
    const url = `https://backpack.tf/api/v2/classifieds/listings?token=${config.backpacktf.token}`

    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }

    for (const itemName in priceList) {
        
        await delay(5000);
        if (priceList[itemName].buy) {

            try {
                const detailsText = priceList[itemName].buy.key ? `Buying for ${priceList[itemName].buy.key} keys and ${priceList[itemName].buy.metal} refs Add me and type !sell ${itemName}. Trade Offers will be ignored` : `Buying for ${priceList[itemName].buy.metal} refs Add me and type !sell ${itemName}. Trade Offers will be ignored`;
                    
                if (!priceList[itemName]?.listingBuyId) {
                    
                    listing = {
                        'item': {
                            'baseName' : itemName,
                            'quantity' : quantity,
                            'quality' : {
                                'name' : qualityName,
                                'id' : qualityID,
                                'color' : qualityColor
                            },
                            'tradable' : true,
                            'craftable' : craftable,
                        },
                        'details': detailsText,
                        'currencies': {
                            'metal': priceList[itemName].buy.metal,
                            'keys' :priceList[itemName].buy.key ?? 0,
                        },
                    }
                    const response = await axios.post(url, listing, {headers});
                    if (response.status == 201) {
                        priceList[itemName].listingBuyId = response.data.id;
                        fs.writeFileSync('./pricelist.json', JSON.stringify(priceList, null, 4));
                        console.log(`← The ${response.data.item.baseName} listed. Intent: ${response.data.intent}, For ${response.data.currencies.key ?? 0} keys and ${response.data.currencies.metal} refs`);
                    }
                    else {
                        console.log("An error occurred while listing");
                    }
                }
                else {
                    console.log(`Skipping buy listing ${itemName} reason -> It is already listed `);
                }
            }
            catch(err) {
                console.log("An error occurred while list an item");
            }
        }
    }
}

// List items for sale from priceList.json
async function listForSell(clientInventory, quantity = 1, qualityName = 'Unique', qualityID = 6, qualityColor = "#FF7000", craftable = true) {
    const url = `https://backpack.tf/api/v2/classifieds/listings?token=${config.backpacktf.token}`

    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }

    for (const itemName in priceList) {
        await delay(5000);
        try{
            if (priceList[itemName].sell) {
                const detailsText = priceList[itemName].sell.key ? `Selling for ${priceList[itemName].sell.key} keys and ${priceList[itemName].sell.metal} refs Add me and type !buy ${itemName}. Trade Offers will be ignored` : `Selling for ${priceList[itemName].sell.metal} refs Add me and type !buy ${itemName}. Trade Offers will be ignored`;
            
                const itemDefindex = await getDefindexFromName(itemName);
                const item = clientInventory.find((item) => {return item.defindex == itemDefindex});
                
                const listed = await isListed(item.id);
                if (!listed) {
                    
                    listing = {
                        'id': item.id,
                        'details': detailsText,
                        'currencies': {
                            'metal': priceList[itemName].sell.metal,
                            'keys' :priceList[itemName].sell.key ?? 0,
                        },
                    }
            
                    const response = await axios.post(url, listing, {headers});
                    
                    if (response.status == 201) {
                        console.log(`→ The ${response.data.item.baseName} listed. Intent: ${response.data.intent}, For ${response.data.currencies.key ?? 0} keys and ${response.data.currencies.metal} refs`);
                    }
                    else {
                        console.log("An error occurred while sale listing");
                    }
                    
                }
                else {
                    console.log(`Skipping sell listing ${itemName} reason -> it is already listed `);
                }
            }
        }
        catch (err) {
            console.log(`The sale listing can not creating reason -> Bot does not have ${itemName}`);   
        }

    }

}

// Check if there is a listing with this listing id
async function isListed(listingId) {
    const url = `https://backpack.tf/api/v2/classifieds/listings/440_${listingId}?token=${config.backpacktf.token}`;

    const headers = {
        'Accept': 'application/json',
    }

    try {
        const response = await axios.get(url, {headers});
        if (response.status == 200) {
            return true; // Item is listed
        }
    }
    catch {
        return false // Item not listed
    }
}

// Bump all listings
async function promoteAllListings() {
    const urlAllListings = `https://backpack.tf/api/v2/classifieds/listings?token=${config.backpacktf.token}`;

    const headers = {
        'Accept': 'application/json',
    }

    try {
        const responseAllListings = await axios.get(urlAllListings, {headers});

        if (responseAllListings.status == 200) {

            const listings = responseAllListings.data;

            for (let i = 0; i < listings.results.length; i++) {
                try {
                    const listingId = listings.results[i].id;
                    //console.log(itemId);
                    const urlPromoteListing = `https://backpack.tf/api/v2/classifieds/listings/${listingId}/promote?token=${config.backpacktf.token}`;
        
                    const responsePromote = await axios.post(urlPromoteListing, {headers});
                    
                    if (responsePromote.status == 200) {
                        console.log(`The listing of ${listings.results[i].item.baseName} has been promoted`);
                    }
                }
                catch (err) {
                    console.log("Promotion failed");
                }
            }

        }
        if (responseAllListings.status == 200) {
            return true; // Item is listed
        }
    }
    catch (err){
        console.log("An error occurred while getting listings");
    }
}

// Delete listing withing listing id
async function deleteListing(listingId, listingIntent, itemName) {

    const url = `https://backpack.tf/api/v2/classifieds/listings/${listingId}?token=${config.backpacktf.token}`

    const headers = {
        'Accept': 'application/json',
    }

    try {
        const response = await axios.delete(url, {headers});
        if (response.status == 200) {
            console.log(`The ${listingIntent} listing of the ${itemName} has been deleted`)
        }

        return response.status;
    }
    catch (err) {
        console.log("An error occurred while deleting the listing");
    }

    
}

// Get listingId from item name
async function getListingId(itemName, intent = "sell", justId = false) {
    const url = `https://backpack.tf/api/v2/classifieds/listings?token=${config.backpacktf.token}`;
    
    const headers = {
        'Accept': 'application/json',
    }

    try {
        const response = await axios.get(url, { headers });
        const listings = response.data.results;

        for (const listing of listings) {
            if (listing.item.baseName === itemName && justId == false) {
                return {
                    listingId: listing.id,
                    listingIntent: listing.intent
                };
            }
            else if (listing.item.baseName === itemName && listing.intent == intent && justId == true) {
                return listing.id;
            }
        }

    } catch (err) {
        console.error("An error occured while getting the listing id");
        return null;
    }
}


// Get item defindex from item name
async function getDefindexFromName(itemName) {
    const url = `https://backpack.tf/api/IGetPrices/v4?key=${config.backpacktf.api}`;

    const response = await axios.get(url);

    items = response.data.response.items;

    try {
        return items[itemName].defindex[0];
    }
    catch {
        console.log("Item does not exist");
    }
}

// Checking other bots how much they are selling the items
async function checkCurrentPrice(itemName, baseName, tries = 0) {
    
    if (tries > 1) {
        return -1;
    }
    await delay(5000);

    try {

        const url = `https://backpack.tf/api/classifieds/listings/snapshot?appid=440&sku=${itemName}&token=${config.backpacktf.token}`;
        const response = await axios.get(url);

        const listings = response.data.listings;

        for (const listing of listings) {

            if (listing.intent == "sell" && listing.userAgent) {

                let metal;
                let keys = listing.currencies.keys;
                if (keys == undefined) {
                    keys = 0
                };
                const stringNumber = listing.currencies.metal.toString().split('.');
                if (stringNumber.length > 1) {
                    const integerPart = Number(stringNumber[0]);
                    const firstFloat = Math.floor(Number(stringNumber[1]) / 10);
                    const floatPart = firstFloat + (firstFloat * 10)
                    metal = integerPart + (floatPart / 100)
                }
                else {
                    metal = listing.currencies.metal
                }
                
                if (priceList[baseName]?.sell?.key != undefined && priceList[baseName]?.sell?.metal != undefined) {
                    const oldKey = priceList[baseName].sell.key ?? 0;
                    const oldMetal = priceList[baseName].sell.metal;
                    if (oldKey != keys || oldMetal != metal) {
                        priceList[baseName].sell.key = Number(keys);
                        priceList[baseName].sell.metal = Number(metal);
                        const listingId =  await getListingId(baseName, "sell", true);
                        
                        await updateListing(listingId, "sell", baseName, Number(keys), Number(metal));
                        console.log(`The sell listing ${baseName} price changed from ${oldKey} keys and ${oldMetal} refs to ${keys} keys and ${metal} refs`);
                        fs.writeFileSync('./pricelist.json', JSON.stringify(priceList, null, 2));
                        
                    }
                }
                
                if (priceList[baseName]?.buy?.key != undefined && priceList[baseName]?.buy?.metal != undefined) {
                    const oldKey = priceList[baseName].buy.key ?? 0;
                    const oldMetal = priceList[baseName].buy.metal;
                    metal = (metal - 0.11).toFixed(2)
                    if (oldKey != keys || oldMetal != metal) {
                        priceList[baseName].buy.key = Number(keys);
                        priceList[baseName].buy.metal = Number(metal);
                        const listingId =  await getListingId(baseName, "buy", true);
                    
                        await updateListing(listingId, "buy", baseName, Number(keys), Number(metal));
                        console.log(`The buy listing ${baseName} price changed from ${oldKey} keys and ${oldMetal} refs to ${keys} keys and ${metal} refs`);  
                        fs.writeFileSync('./pricelist.json', JSON.stringify(priceList, null, 2));
                        
                    }

                }
                return 0;
            }
        }
        return -1;
    }

    catch (err) {
        await delay(5000);
        return await checkCurrentPrice("The" + " " + itemName, baseName, tries + 1);
    }
}

// Update price the exist listing
async function updateListing(listingId, intent, baseName, key, metal) {
    
    try {
    
        let detailsText = "";
        if (key > 0) {
            if (intent == "buy") {
                detailsText = `Buying for ${key} keys and ${metal} refs Add me and type !sell ${baseName}. Trade Offers will be ignored`;
            }
            else {
                detailsText = `Selling for ${key} keys and ${metal} refs Add me and type !buy ${baseName}. Trade Offers will be ignored`;
            }
        }
        else {
            if (intent == "buy") {
                detailsText = `Buying for ${metal} refs Add me and type !sell ${baseName}. Trade Offers will be ignored`;
            }
            else {
                detailsText = `Selling for ${metal} refs Add me and type !buy ${baseName}. Trade Offers will be ignored`;
            }
        }
        await delay(5000);
        const url = `https://backpack.tf/api/v2/classifieds/listings/${listingId}?token=${config.backpacktf.token}`;

        const newPrice = {
            "currencies":  {
                "metal": Number(metal),
                "keys": Number(key)
            },
            "details": detailsText
        }
        
        await axios.patch(url, newPrice);

        console.log(`${baseName} ${intent} listing is updated`);
    }
    catch (err) {
        console.log("An error occurred while updating the listing");
    }
}


// Init backpacktf functions
async function initBackpacktf(clientInventory) {
    try {
        await listForBuy();
        await listForSell(clientInventory);
        //await promoteAllListings(); // This function working only on backpacktf premium users
       
        for (const itemName in priceList) {
            await delay(5000);
            await checkCurrentPrice(itemName, itemName);
        }
        
        await agentPulse();

        setInterval(async () => {
            await cleanAgent();
            await delay(20000);
            await agentPulse();
        }, 2000000); 
        
        
        
        setInterval(async () => {
            for (const itemName in priceList) {
                await delay(5000);
                checkCurrentPrice(itemName, itemName);
            }
        },2000000);
        
        console.log("Backpacktf is ready!");
        
    }
    catch (err) {
        console.log("An error occurred while backpacktf initialization");
    }
}


function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    listForBuy,
    listForSell,
    agentPulse,
    promoteAllListings,
    getListingId,
    deleteListing,
    cleanAgent,
    getDefindexFromName,
    initBackpacktf
}

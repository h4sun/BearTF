require('dotenv').config();

module.exports = {
    login: {
        "accountName": process.env.STEAM_USERNAME,
        "password": process.env.STEAM_PASSWORD,
    },
    backpacktf: {
        "token": process.env.BACKPACKTF_TOKEN,
        "api": process.env.BACKPACKTF_API,
    },
    steamapi: process.env.STEAM_API,
    sharedSecret: process.env.shared_secret,
    identitySecret: process.env.identity_secret,
};
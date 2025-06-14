# 🐻 BearTF - Automated TF2 Trading Bot

**BearTF** is a fully automated Steam trading bot built for **Team Fortress 2**, designed to list buy/sell offers on [backpack.tf](https://backpack.tf). It interacts with the Steam Web API and backpack.tf API to handle trades, pricing, and listing promotion — like a real trader, but hands-free.

> ⚠️ Before running the bot, you must create a `config.js` file with your Steam and backpack.tf credentials. See the **Configuration** section below.

---

## ✨ Features

- 🔁 Automatically creates buy/sell listings on backpack.tf
- 🛒 Uses custom `pricelist.json` to define trade values
- 🤖 Runs as a user agent to bump listings every 30 minutes
- 🔐 Integrates Steam login, inventory, and tradeoffer management
- 📦 Detects and skips already-listed items
- 🚀 Simple setup — run with just one command

---

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/h4sun/BearTF.git
cd BearTF
```

### 2. Install Dependencies

```bash
npm install steam-user
npm install steam-tradeoffer-manager
npm install steamcommunity
npm install axios
```

---

## ⚙️ Configuration

Create a `config.js` file in the root directory with the following content:

```js
module.exports = {
  login: {
    accountName: "YOUR_STEAM_USERNAME",
    password: "YOUR_STEAM_PASSWORD",
    sharedSecret: "YOUR_SHARED_SECRET"
  },
  backpacktf: {
    token: "YOUR_BACKPACKTF_TOKEN",
    api: "YOUR_STEAM_API_KEY"
  },
  steamapi: "YOUR_STEAM_API_KEY",
  identitySecret: "YOUR_IDENTITY_SECRET",
  sharedSecret: "YOUR_SHARED_SECRET",
};
```

---

## 🛠 Example `pricelist.json`

```json
{
  "Team Captain": {
    "buy": { "key": 0, "metal": 15.00 },
    "sell": { "key": 0, "metal": 15.33 }
  },
  "Mistaken Movember": {
    "buy": { "key": 0, "metal": 5.00 },
    "sell": { "key": 0, "metal": 5.33 }
  }
}
```

This file defines the items and prices the bot will trade.

---

## ▶️ Running the Bot

Once everything is configured, run the bot with:

```bash
node index.js
```

The bot will log into Steam, fetch your inventory, and automatically create listings on backpack.tf based on your `pricelist.json`.

---

## 🧠 License

MIT License © 2025 BearTF Contributors


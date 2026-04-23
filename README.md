# 🚀 Epic-DiscordBOT

![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)
![Node](https://img.shields.io/badge/Node.js-v20.x-blue.svg)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-success.svg)
![License](https://img.shields.io/badge/License-GPL--3.0-yellow.svg)

An advanced, high-performance Discord bot built with **Node.js** and **Discord.js**, featuring a robust **MongoDB** backend. Designed for speed, security, and ease of use.

---

## ✨ Features

* **🛡️ Moderation:** Kick, ban, and timeout commands to keep your server safe.
* **💰 Economy System:** Integrated currency, daily rewards, and shop systems.
* **🎵 Music Support:** High-quality audio streaming directly in voice channels.
* **📊 Leveling:** XP systems with customizable rank cards.
* **⚙️ Easy Config:** Fully managed via `.env` and a streamlined configuration file.

---

## 🛠️ Installation & Setup

Follow these steps to get your own instance of **Epic-DiscordBOT** running:

### 1. Prerequisites
* [Node.js v20+](https://nodejs.org/)
* [MongoDB Atlas Account](https://www.mongodb.com/cloud/atlas)
* [Discord Developer Account](https://discord.com/developers/applications)

### 2. Clone the Repository
```bash
git clone [https://github.com/ThePiemann/Epic-DiscordBOT.git](https://github.com/ThePiemann/Epic-DiscordBOT.git)
cd Epic-DiscordBOT

3. Install Dependencies
Bash

npm install

4. Configure Environment Variables

Create a .env file in the root directory (this is already in .gitignore to keep you safe!):
Code snippet

DISCORD_TOKEN=your_token_here
MONGODB_URI=your_mongodb_connection_string
CLIENT_ID=your_bot_id

5. Start the Bot
Bash

node index.js

🚀 Deployment

This bot is optimized for Railway.app.

    Connect your GitHub repository to Railway.

    Add your .env variables to the Variables tab in Railway.

    Railway will automatically detect the package.json and start the bot 24/7.

📜 License

Distributed under the GNU GPL v3 License.

    This license allows you to use, modify, and distribute the code, but any derivative works must also be open-source and under the same license. This prevents people from taking your hard work and turning it into a closed-source, paid product.

🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

Show your support by giving a ⭐️ if this project helped you!


---

### Pro-Tips to make it "Pop":
1.  **Add a Banner:** Create a simple image in Canva or Photoshop with your bot's name and put it at the very top. Use `![Banner](link-to-image)`.
2.  **Add Screenshots:** If your bot has a cool command (like a profile card), take a screenshot and put it under the "Features" section. 
3.  **Check your links:** Make sure the GitHub links in the template match your actual username and repo name! 

Since we settled on **GPL v3**, I've included that in the License section for you. It's the "stron

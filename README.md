# Daily Rift Herald

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-7289DA?logo=discord&logoColor=white)](https://discord.js.org)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)](https://nodejs.org)

A sophisticated Discord bot built with Node.js and the Riot Games API to track and announce daily League of Legends ranked LP changes with interactive slash commands.

---

## ✨ Features

- **Automated Daily Updates:** Automatically posts a summary of LP gains or losses at a configurable time.
- **Interactive Commands:** Manage the bot entirely through intuitive slash commands.
- **Case-Insensitive Tracking:** Prevents duplicate entries for players (e.g., `Player#NA1` is the same as `player#na1`).
- **User-Friendly Autocomplete:** Easily select players to untrack from a dynamic dropdown list.
- **Clean & Modular Codebase:** Professionally structured for easy maintenance and future feature development.

## 🤖 Bot Commands

- `/track <riot_id>`: Adds a new player to the tracking list.
- `/untrack <player>`: Removes a player from the list using an autocomplete dropdown.
- `/list`: Displays an embed showing all currently tracked players and their last known rank.
- _(Coming Soon: `/profile`)_

## 🛠️ Tech Stack

- **Backend:** Node.js
- **Discord API:** Discord.js v14
- **Riot Games API:** Twisted.js & Node-Fetch
- **Database:** SQLite3
- **Scheduling:** Node-Cron

## 🚀 Setup and Installation

Follow these steps to run your own instance of Daily Rift Herald.

1.  **Clone the Repository**

    ```bash
    git clone https://github.com/YourUsername/daily-rift-herald.git
    cd daily-rift-herald
    ```

2.  **Install Dependencies**

    ```bash
    npm install
    ```

3.  **Set Up Environment Variables**
    Create a `.env` file in the root directory and populate it with your secret keys. Use the `.env.example` as a template.

    ```env
    DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN
    RIOT_API_KEY=YOUR_RIOT_GAMES_API_KEY
    TARGET_DISCORD_CHANNEL_ID=THE_ID_OF_THE_CHANNEL_FOR_DAILY_POSTS
    CLIENT_ID=YOUR_DISCORD_BOT_APPLICATION_ID
    ```

4.  **Register Slash Commands**
    Run this script once to register your commands with Discord.

    ```bash
    node deploy-commands.js
    ```

5.  **Start the Bot**
    ```bash
    node src/index.js
    ```

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

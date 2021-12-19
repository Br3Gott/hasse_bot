# hasse_bot

A discord bot written in javascript using node.js with discordjs. 


## Installation

### Requirements:

 - A valid config.json file (See *example.config.json*).
 - Node 16 or higher.

Commands are registered on a guild basis and fetches guild and client IDs from *config.json*.
Bot is run separately and can respond to request from different guilds.


  

### To run:

  

```bash

#Install dependencies

npm install

  

#To add commads to guild (Make sure IDs exist in config.json)

npm run commands

  

#Start bot (Make sure token exist in config.json)

npm run start

```

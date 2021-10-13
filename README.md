# hasse_bot

Edit the example files and remove example. from file name.

Folder /src/ should exist with 8 audio files 1.mp3 - 8.mp3.

Folder /public/ should exist with frontend files. Using [hasse_bot_vue](https://github.com/Br3Gott/hasse_bot_vue "hasse_bot_vue") for now.

App requires node and npm.

Install dependencies with "npm install"

Run app with "node ."

Using Docker:

    build with - docker build -t <reponame>

    run with - docker run -i --init --rm -p 2345:2345 --cap-add=SYS_ADMIN --name <name> <reponame> node "."

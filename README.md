# Druncord Tanking Bot

Pretty mickey mouse discord bot for "drunk tanking" problem users.

Drunk tanking is where a custom role is given that blocks access to most channels for a set period of time for them to cool off.

# How to use

To run with the existing config, use:
* npm run testserver - connects to test server using test.js config
* npm run production - connects to druncord using druncord.js config

Fill in a config file and pop it into the config folder. pass the name of the file as a command line argument like so:

node main.js configfilename

Will load the app with config file located in ./config/configfilename.js

Options:

* drunktankRole = Role ID for the role that locks a user out of the other channels
* tankChannel = Channel ID for the drunk-tank channel to message the tankee
* logChannel = Channel ID to log tank events to.
* botMasterRole = Role ID for the role that will be able to execute bot commands. No one without this role should be able to use. Disclaimer: Not tested and probably easily hackable.
* tankUOM = hours, minutes or days 
* tankDuration = default duration for people to remain in the tank
* commandPrefix = the bot command prefix
* access_key = Your discord bot access key. Keep this in .env and access via process.env
* json_path = Path to a local json file that the app can use for storage.
* bot_name = Give your bot a name. Call it whatever you please.

NB: Be careful with your access key. Keep it out of source control. I keep mine in .env and have it gitignored.


TODO LIST (Features)
- Disconnect users from any voice channels on tanking
- Auto untank after time served (controversial)
- Allow a user to specify duration with command ie .tank @user 12h reasons
- Improve reporting - expand tankstats to allow profiling individual users ie .checkuser @user could return all the times they were tanked and the reasons etc
- Last warning system - mark a user as on their last warning and auto-ban on next tank
- Improve user access control to enable granular access to commands rather than all or nothing

TODO LIST (architecture)
- Add a database backend instead of a json file
- Containerize
- Unit tests
- Archival of old tankings

LONG TERM
- Genericise so it can work on > 1 server with a single instance
- Make the config easier (either through a UI, or use role names or whatever instead)

# License 

ISC License

You are free to use this as you please, however I take no responsibility for what you do with it and I won't provide any support.

Originally forked from: https://github.com/julianYaman/hello-world-discord-bot

Copyright 2021 Donald Carnegie
Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

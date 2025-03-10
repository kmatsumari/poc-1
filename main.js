const BOT_VERSION = "1.0.0";

//Setup config file
if (process.argv.length < 3) {
    console.log("Please pass the config file as a parameter.")
    return;
}
configFile = process.argv[2];
const config = require('./config/' + configFile);
const helpers = require('./helpers');
const persistence = require('./persistence');
const messages = require('./messages')


console.log(config.bot_name + " " + BOT_VERSION + " starting up");
console.log("Configuration: " + configFile);

persistence.injectConfig(config);
helpers.injectConfig(config);

const Discord = require("discord.js");
const client  = new Discord.Client({
    ws: { intents: Discord.Intents.ALL } 
});
client.login(config.access_key);



client.on("ready", () => {
    console.log(config.bot_name + " successfully started.");
});

client.on("message", async  (message) => {
    // It will do nothing when the message doesnt start with the prefix
    if(!message.content.startsWith(config.commandPrefix)) return;

    if (message.content.startsWith(config.commandPrefix + config.commandPrefix)) return;

    const command = helpers.trimCommand(message);
    const msg = helpers.trimMsg(message);

    fetchObj = {
        user: message.author,
        cache: false,
        force: true
    };

    refreshedAuthorObj = await message.guild.members.fetch(fetchObj);
    
    if (!helpers.doesUserHaveRole(refreshedAuthorObj, config.botMasterRole)) {
        console.log ("UNAUTHORIZED USAGE ATTEMPT: " + message.author.username + " Tried to use me with this command: " + command);
        message.channel.send("You don't have the rights to use me you filthy swine.");
        return;
    }
  
    switch (command) {
        case "help":
            handleHelp(message);
            break;
        
        case "tank":
            return handleTank(message, msg);
            break;

        case "untank":
            return handleUntank(message, msg);
            break;

        case "checktank":
            handleCheckTank(message);
            break;

        case "tankstats":
            handleTankStats(message);  
            break;

        case "bacon":
            handleBacon(message);  
            break;

        case "synctank":
            return handleSyncTank(message);
            break;

        default:
            message.channel.send("I don't know that command. Want me to build it? Do it yourself you lazy throbber");
            break;
    }
});


async function handleSyncTank(message) {
    refreshedRoleObj = await message.guild.roles.fetch(config.drunktankRole, false, true);
    var tankees = persistence.getTankedUsers();
    var tankedDict = {};

    for (n=0;n<tankees.length; n++) {
        var obj = tankees[n];
        if (obj.archive) {
            continue;   
        }
        tankedDict[obj.user_tanked] = obj;
    }

    var toSave = [];
    var usersWithRoleDict = {};
    refreshedRoleObj.members.forEach( (key,value) => {
        var dictKey = "<@!" + key + ">"

        if (tankedDict[dictKey] == undefined) {
            //we need to add this user to the tank json.
            message.channel.send(dictKey + " is missing from my tank log. Adding now.");
            toSave.push(dictKey);
        }
        usersWithRoleDict[dictKey] = dictKey;
    });

    toSaveUntank = [];
    for (n=0;n<tankees.length; n++) {
        var obj = tankees[n];
        if (obj.archive) {
            continue;   
        }
        if (usersWithRoleDict[obj.user_tanked] == undefined) {
            //this user has had the role removed, untank here
            toSaveUntank.push(obj.user_tanked);
        }
    }

    for (n=0; n<toSave.length; n++) {
        persistence.saveTanking("Unknown", message.guild, toSave[n], "Added by synctank command", [], config.tankDuration, config.tankDuration);
    }

    toSaveUntank.forEach((x)=> {
        persistence.untankUser(x);
    });

    message.channel.send("TankSync complete. " + toSave.length + " entries added to the tank log, " + toSaveUntank.length + " removed.");
}
function handleUntank(message, msg) {
    tokens = helpers.tokenize(msg.substr(1,msg.length -1 ));
        
    if (tokens.length < 1) {
        message.channel.send("Invalid arguments. Correct usage: &&untank @user optionalreason");
        return;
    }
    var reason = helpers.getReason(tokens);
    if (!helpers.validateMentions(message, "untank", config.commandPrefix)) {
        return;
    }
    if (reason.replace(/[^A-Za-z0-9]/g, '') == "") {
        reason = "Default - assume time served.";
    }

    const discord_user = message.mentions.users.first();
    const guild_member = message.guild.member(discord_user);
    var userToUntank = tokens[0];

    user = persistence.untankUser(userToUntank);
    if (user == undefined){
        message.channel.send("User not found in tank log. Do it manually.");
        return;
    }
       
    for( var i = 0; i < user.roles_to_give_back.length; i++){ 
        if (user.roles_to_give_back[i] === user.role_to_remove) { 
            user.roles_to_give_back.splice(i, 1); 
        }
    }

    console.log("Untanking " + userToUntank + " -- initiated by " + message.author.username);

    return guild_member.roles.set(user.roles_to_give_back) 
        .then(() => {
            let ts = Date.now();
            var datediff = helpers.getDateDiffString(ts, user.time_tanked);
            msg = messages.log_blue_untank_msg(message.author.username, guild_member, userToUntank, reason, datediff);
            return messages.write_to_channel(message.guild, config.logChannel, msg);
        }) 
        .then(() => {
            msg = messages.confirm_untank_message(message.author.username, userToUntank, reason, user.roles_to_give_back)
            return message.channel.send(msg);
        })
        .catch((error) => {
            message.channel.send("Failed to set roles for " + userToUntank + 
                "\r\nDo I have the permissions to manage this user?" +
                "\r\n"+error
            ); 
        });
}

async function handleTank(message, msg) {
    tokens = helpers.tokenize(msg.substr(1,msg.length -1 ));
        
    if (tokens.length < 2) {
        message.channel.send("Invalid arguments. Correct usage: &&tank @user reason");
        return;
    }

    var reason = helpers.getReason(tokens);

    if (!helpers.validateReason(reason, message)) {
        return;
    }
    if (!helpers.validateMentions(message, "tank", config.commandPrefix)) {
        return;
    }

    var userToTank = tokens[0];
    const discord_user = message.mentions.users.first();
    const guild_member = message.guild.member(discord_user);

    const role = await message.guild.roles.fetch(config.drunktankRole);
    const role_name = role.name;

    const oldRoles = Array.from(guild_member.roles.cache.mapValues(role => role.id).keys());

    console.log("Drunk tanking " + discord_user.username + " -- initiated by " + message.author.username);
  
    //clear all their existing roles
    return guild_member.roles.set([config.drunktankRole], "Drunk tanked by " + message.author.username)    
        .then(() => {
            // console.log(guild_member.voice);
            // if (guild_member.voice.channel != undefined) {
            //     return guild_member.voice.kick("drunk tanked");
            // }
        })
        .then(() => {
            msg = messages.log_blue_tank_msg(message.author.username, guild_member, userToTank, reason);
            return messages.write_to_channel(message.guild, config.logChannel, msg)
        })
        .then(() => {
            persistence.saveTanking(message.author.username, message.guild, userToTank, reason, oldRoles, config.tankDuration, config.tankUOM)
        })
        .then(() => {
            msg = messages.confirm_message(message.author.username, userToTank, reason, role_name);
            return message.channel.send(msg);
        })
        .then(() => {
            setTimeout(() => {
                msg = messages.tank_msg(message.author.username, userToTank, reason, config.tankDuration, config.tankUOM);
                messages.write_to_channel(message.guild, config.tankChannel, msg);
            }, 10000);
        })
        .catch((error) => {
            message.channel.send("Failed to remove roles for " + userToTank + 
                "\r\nDo I have the permissions to manage this user?" +
                "\r\n"+error
            ); 
        });
}
function handleCheckTank(message) {
    let ts = Date.now();
    var json = persistence.getTankedUsers();
    var concat = "";
    var toSend = [];
    for (n=0;n<json.length; n++) {
        var obj = json[n];
        if (obj.archive) {
            continue;   
        }
        var datediff = helpers.getDateDiffString(ts, obj.time_tanked)
        if (obj.tanked_by == "Unknown") {
            msg = obj.user_tanked + " was not tanked by me. I learned about them " + datediff + " ago."; 
        }
        else {
            msg = "(tanked " + datediff + " ago by " + obj.tanked_by + " for " + obj.reason + ")";
            if (ts > obj.time_to_untank) {
                msg = obj.user_tanked + " has served their time. " + msg; 
            }
            else {
                msg = obj.user_tanked + " still has time to wait. " + msg
            }
        }

        //beware of the max length for a message
        if ((concat + '\r\n' + msg).length >= 2000) {
            toSend.push(concat);
            concat = msg;
        }
        else {
            concat += '\r\n' + msg;
        }
    }
    if (concat != "") toSend.push(concat);

    if (toSend.length == 0) {
        message.channel.send("According to my records, the drunk tank is empty!");
    }
    else {
        toSend.forEach((obj) => {
            message.channel.send(obj);
        });
    }
}

function handleTankStats(message) {
    var json = persistence.getTankedUsers();

    var tankerStats = {};
    var tankeeStats = {};
    var currentTanked = 0;
    var everTanked = 0;
    var uniqueTankings = 0;

    json.forEach( (obj) => {
        everTanked++;

        if (!obj.archive) currentTanked++;

        if (tankeeStats[obj.user_tanked] == undefined) {
            tankeeStats[obj.user_tanked] = {
                count: 1
            };
            uniqueTankings++;
        }
        else {
            tankeeStats[obj.user_tanked].count += 1;
        }
        if (tankerStats[obj.tanked_by] == undefined) {
            tankerStats[obj.tanked_by] = {
                count: 1,
                unique: 1,
                tankees: [obj.user_tanked]
            };
        }
        else {
            tankerStats[obj.tanked_by].count += 1;
            tankerStats[obj.tanked_by].unique += tankerStats[obj.tanked_by].tankees.includes(obj.user_tanked) ? 0 : 1
            tankerStats[obj.tanked_by].tankees.push(obj.user_tanked);
        }
    });


    tankeeTopFive = getTopFive(tankeeStats);
    tankerTopFive = getTopFive(tankerStats);

    var msg = "There are " + currentTanked + " people currently tanked.";
    msg += "\r\n"+everTanked+" tankings have occurred in total."
    msg += "\r\n"+uniqueTankings+" unique users have been tanked."
    msg += "\r\n==Drunk tank hall of shame=="
    var n = 1;
    tankeeTopFive.forEach((obj)=> {
        msg+= "\r\n" + n + ". " + obj.name + " has been tanked " + obj.num.count + " times.";
        n++;
    })
    msg += "\r\n==Most Korrupt Mods=="
    var y = 1;
    tankerTopFive.forEach((obj)=> {
        if (obj.name != "") {
            msg+= "\r\n" + y + ". " + obj.name + " has tanked on " + obj.num.count + " occasions ("+obj.num.unique+" unique users). Favourite victim: " + mode(obj.num.tankees);
            y++;
        }
    });
    
    message.channel.send(msg);
}

function mode(array)
{
    if(array == undefined)
        return "";
    if(array.length == 0)
        return "";
    var modeMap = {};
    var maxEl = array[0], maxCount = 1;
    for(var i = 0; i < array.length; i++)
    {
        var el = array[i];
        if(modeMap[el] == null)
            modeMap[el] = 1;
        else
            modeMap[el]++;  
        if(modeMap[el] > maxCount)
        {
            maxEl = el;
            maxCount = modeMap[el];
        }
    }
    return maxEl;
}

// This code is TERRIBLE and needs rewritten
// i did it in a rush on a sunday evening and couldn't be fucked looking things up
// I'm not a JS developer, bite me.
function getTopFive(stats) {
    var first = {
        num: {
            count: 0
        },
        name:  ""
    };
    var second={
        num: {
            count: 0
        },
        name:  ""
    };
    var third={
        num: {
            count: 0
        },
        name:  ""
    };
    var fourth={
        num: {
            count: 0
        },
        name:  ""
    };
    var fifth={
        num: {
            count: 0
        },
        name:  ""
    };

    Object.entries(stats).forEach((value) => {
        
        var key = value[0];
        var val = value[1];

        if (val.count >= first.num.count) {
            fifth = fourth;
            fourth = third;
            third = second;
            second = first;

            first = {
                name: key,
                num: val
            }

            return;
        }
        if (val.count >= second.num.count) {
            fifth = fourth;
            fourth = third;
            third = second;
            second = {
                name: key,
                num: val
            }

            return;
        }
        if (val.count >= third.num.count) {
            fifth = fourth;
            fourth = third;

            third = {
                name: key,
                num: val
            }

            return;
        }
        if (val.count >= fourth.num.count) {
            fifth = fourth;

            fourth = {
                name: key,
                num: val
            }

            return;
        }
        if (val.count >= fifth.num.count) {
            fifth = {
                name: key,
                num: val
            }

            return;
        }
    });

    var top5 = []
    if (first.name != "") top5.push(first);
    if (second.name != "") top5.push(second);
    if (third.name != "") top5.push(third);
    if (fourth.name != "") top5.push(fourth);
    if (fifth.name != "") top5.push(fifth);

    return top5;
}

function handleHelp(message) {
    var help = "==help==" +
        "\r\n" + config.commandPrefix +"tank - drunk tanks a user. usage: "+config.commandPrefix+"tank @user reason." +
        "\r\n" + config.commandPrefix +"checktank - Checks the current users in the tank." +
        "\r\n" + config.commandPrefix +"untank - Untank a user. usage: "+config.commandPrefix+"untank @user reason." +
        "\r\n" + config.commandPrefix +"tankstats - Stats for fun. " +
        "\r\n" + config.commandPrefix +"synctank - sync up the 2drunk2party role with the Bot tank log. " +
        "\r\n" + config.commandPrefix +"help - Sends this help message" +
        "\r\n" +
        "\r\n" + config.bot_name + " " + BOT_VERSION + " by stevie_pricks";


    message.channel.send(help);
}

function handleBacon(message) {
    message.channel.send("BACON IS DELICIOUS AND YOUR MA IS A MATTRESS");
}
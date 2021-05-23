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
const client  = new Discord.Client();
client.login(config.access_key);



client.on("ready", () => {
    console.log(config.bot_name + " successfully started.");
});

client.on("message", async  (message) => {
    // It will do nothing when the message doesnt start with the prefix
    if(!message.content.startsWith(config.commandPrefix)) return;

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

        default:
            message.channel.send("I don't know that command. Want me to build it? Do it yourself you lazy throbber");
            break;
    }
});

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

    console.log(user.roles_to_give_back);
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
            msg = messages.log_blue_tank_msg(message.author.username, guild_member, userToTank, reason);
            return messages.write_to_channel(message.guild, config.logChannel, msg)
        })
        .then(() => {
            return persistence.saveTanking(message.author.username, message.guild, userToTank, reason, oldRoles, config.tankDuration, config.tankUOM)
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
        msg = "(tanked " + datediff + " ago by " + obj.tanked_by + " for " + obj.reason + ")";
        if (ts > obj.time_to_untank) {
            msg = obj.user_tanked + " has served their time. " + msg; 
        }
        else {
            msg = obj.user_tanked + " still has time to wait. " + msg
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
    message.channel.send("There are X people currently tanked" +
    "\r\nY unique people have been in the drunk tank" +
    "\r\nThe average time spent in the drunk tank is x hours" +
    "\r\n" +
    "\r\n==Drunk tank hall of shame==" + 
    "\r\n1. Nathan - yy times in the tank, total of xx hours." +
    "\r\n2. stevie_pricks - yy times in the tank, total of xx hours." +
    "\r\n3. Paddy - yy times in the tank, total of xx hours." +
    "\r\n4. Tom_Carry - yy times in the tank, total of xx hours." +
    "\r\n5. Wednesday - yy times in the tank, total of xx hours." +
    "\r\n" +
    "\r\n==Most Korrupt mods==" + 
    "\r\n1. Nathan - tanked x times (y unique users) for a total of z hours. Favourite victim: Oliver (3 tanks)." +
    "\r\n2. stevie_pricks - tanked x times (y unique users) for a total of z hours. Favourite victim: Oliver (3 tanks)." +
    "\r\n3. Paddy - tanked x times (y unique users) for a total of z hours. Favourite victim: Oliver (3 tanks)." +
    "\r\n4. Tom_Carry - tanked x times (y unique users) for a total of z hours. Favourite victim: Oliver (3 tanks)." +
    "\r\n5. Wednesday - tanked x times (y unique users) for a total of z hours. Favourite victim: Oliver (3 tanks)." 
    
    );
}

function handleHelp(message) {
    var help = "==help==" +
        "\r\n" + config.commandPrefix +"tank - drunk tanks a user. usage: "+config.commandPrefix+"tank @user reason." +
        "\r\n" + config.commandPrefix +"checktank - Checks the current users in the tank." +
        "\r\n" + config.commandPrefix +"untank - Untank a user. usage: "+config.commandPrefix+"untank @user reason." +
        "\r\n" + config.commandPrefix +"tankstats - Stats for fun. Not implemented yet." +
        "\r\n" + config.commandPrefix +"help - Sends this help message" +
        "\r\n" +
        "\r\n" + config.bot_name + " " + BOT_VERSION + " by stevie_pricks";


    message.channel.send(help);
}

function handleBacon(message) {
    message.channel.send("BACON IS DELICIOUS AND YOUR MA IS A MATTRESS");
}
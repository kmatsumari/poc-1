const BOT_VERSION = "1.0.0";

//Setup config file
if (process.argv.length < 3) {
    console.log("Please pass the config file as a parameter.")
    return;
}
configFile = process.argv[2];
var config = require('./config/' + configFile);
var helpers = require('./helpers');
var persistence = require('./persistence');
var messages = require('./messages')
require('dotenv').config();

console.log(config.bot_name + " " + BOT_VERSION + " starting up");
console.log("Configuration: " + configFile);

persistence.injectConfig(config);

const Discord = require("discord.js");
const client  = new Discord.Client();
client.login(process.env.access_key);


client.on("ready", () => {
    console.log("StevieBot successfully started.");
});

client.on("message",  (message) => {
    // It will do nothing when the message doesnt start with the prefix
    if(!message.content.startsWith(config.commandPrefix)) return;


    // This cuts out the command from the message which was sent and cuts out the prefix
    // So when you check if a specific command was executed, you must not type
    let command = message.content.toLowerCase().split(" ")[0];
    //Strip the command and the prefix for the message for processing
    var msg =  message.content.slice(command.length);
    //Strip the prefix for analysing the command
    command = command.slice(config.commandPrefix.length);
    

    switch (command) {
        case "help":
            handleHelp(message,);
            break;
        
        case "tank":
            handleTank(message, msg);
            break;

        case "checktank":
            handleCheckTank(message);
            break;

        case "untank":
            handleUntank(message, msg);

        case "tankstats":
            handleTankStats(message);  
            break;

        default:
            message.channel.send("I don't know that command. Want me to build it? Do it yourself you lazy throbber");
            break;

    }
});

function handleUntank(message, msg) {
    tokens = helpers.tokenize(msg.substr(1,msg.length -1 ));
        
    if (tokens.length < 2) {
        message.channel.send("Invalid arguments. Correct usage: &&untank @user reason");
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
       
    //Make sure we remove 2drunk2party
    for( var i = 0; i < user.roles_to_give_back.length; i++){ 
        if (user.roles_to_give_back[i] === user.role_to_remove) { 
            user.roles_to_give_back.splice(i, 1); 
        }
    }

    return guild_member.setRoles(user.roles_to_give_back) 
        .then(() => {
            let ts = Date.now();
            var datediff = helpers.getDateDiffString(ts, user.time_tanked);
            msg = messages.log_blue_untank(message.author.username, guild_member, userToUntank, reason, datediff);
            return messages.write_to_channel(message.guild, config.logChannel, msg);
        }) 
        .then(() => {
            msg = messages.confirm_untank_message(message.author, userToUntank, reason, user.roles_to_give_back)
            return message.channel.send(msg);
        })
        .catch((error) => {
            message.channel.send("Failed to set roles for " + userToUntank + 
                "\r\nDo I have the permissions to manage this user?" +
                "\r\n"+error
            ); 
        });;
}

function handleTank(message, msg) {
    tokens = helpers.tokenize(msg.substr(1,msg.length -1 ));
        
    if (tokens.length < 2) {
        message.channel.send("Invalid arguments. Correct usage: &&tank @user reason");
        return;
    }

    var reason = getReason(tokens);

    if (!helpers.validateReason(reason, message)) {
        return;
    }
    if (!helpers.validateMentions(message, "tank", config.commandPrefix)) {
        return;
    }

    var userToTank = tokens[0];
    const discord_user = message.mentions.users.first();
    const guild_member = message.guild.member(discord_user);

    const role_name = message.guild.roles.get(config.drunktankRole);
    const oldRoles = Array.from(guild_member.roles.keys());


    //clear all their existing roles
    return guild_member.setRoles([config.drunktankRole], "Drunk tanked by " + message.author)    
        .then(() => {
            msg = messages.log_blue_tank(message.author, guild_member, userToTank, reason);
            return messages.write_to_channel(message.guild, config.logChannel, msg)
        })
        .then(() => {
            msg = messages.tank_msg(message.author, userToTank, reason, config.tankDuration, config.tankUOM)
            return messages.write_to_channel(message.guild, config.tankChannel, msg)
        })
        .then(() => {
            return persistence.saveTanking(message.author, message.guild, userToTank, reason, oldRoles, config.tankDuration, config.tankUOM)
        })
        .then(() => {
            msg = messages.confirm_message(message.author, userToTank, reason, role_name);
            return message.channel.send(msg);
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
            concat += concat + '\r\n' + msg;
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
    let embed = new Discord.RichEmbed()
        .addField("&&tank", "drunk tanks a user. usage: &&tank @user reason")
        .addField("&&checktank", "Checks the current users in the tank")
        .addField("&&untank", "Untank a user. usage: &&untank @user reason")

        .addField("&&tankstats", "Stats for fun. not implement yet")

        .addField("&&help", "Sends this help embed")
        .setTitle(config.bot_name + " " + BOT_VERSION + " - commands help")
        .setFooter("Here you have all bot commands you can use!")
        .setColor("AQUA");

    // Send the embed with message.channel.send()
    message.channel.send({ embed: embed });
}

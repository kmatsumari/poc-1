var fs = require('fs')
const Discord = require("discord.js");
const client  = new Discord.Client();

const BOT_VERSION = "1.0.0";

// Here you find the prefix for all commands.
// For example: When it is set to "!" then you can execute commands with "!" like "!help"
//              or if you set it to "_" then you can execute commands like "_help".
const commandPrefix = "&&";

//config
const drunktankRole = "795125880363679745"

const tankChannel = "795125618957484052"
const logChannel = "795125578494640188"

const tankUOM = "minutes";
const tankDuration = "1";


// This is a function which will be called when the bot is ready.
client.on("ready", () => {
    console.log("Bot started! Version " + BOT_VERSION);

});
 client.on("message",  (message) => {
    // It will do nothing when the message doesnt start with the prefix
    if(!message.content.startsWith(commandPrefix)) return;


    // This cuts out the command from the message which was sent and cuts out the prefix
    // So when you check if a specific command was executed, you must not type
    //   if(command === commandprefix + "help" )
    // but you can type:
    //   if(command === "help")
    let command = message.content.toLowerCase().split(" ")[0];

    //Strip the command and the prefix for the message for processing
    var msg =  message.content.slice(command.length);
    //Strip the prefix for analysing the command
    command = command.slice(commandPrefix.length);
    

    if(command === "help"){

        let embed = new Discord.RichEmbed()
            .addField("&&tank", "drunk tanks a user. usage: &&tank @user reason")
            .addField("&&checktank", "Checks the current users in the tank")
            .addField("&&untank", "Untank a user. usage: &&untank @user reason")

            .addField("&&tankstats", "Stats for fun. not implement yet")

            .addField("&&help", "Sends this help embed")
            .setTitle("Bot commands:")
            .setFooter("Here you have all bot commands you can use!")
            .setColor("AQUA");

        // Send the embed with message.channel.send()

        message.channel.send({embed: embed});

    }

    if(command === "tank"){
        tokens = tokenize(msg.substr(1,msg.length -1 ));
        
        if (tokens.length < 2) {
            message.channel.send("Invalid arguments. Correct usage: &&tank @user reason");
            return;
        }

        var reason = ""
        for  (n = 1; n < tokens.length; n++) {
            reason += tokens[n] + " ";
        } 
    
        if (message.mentions.users.size == 0) {
            message.channel.send("Invalid arguments. You need to @ the user to drunk tank them. Correct usage: &&tank @user reason");
            return;
        }

        if (message.mentions.users.size > 1) {
            message.channel.send("Invalid arguments. More than one user @'d - only @ the user you are tanking. Correct usage: &&tank @user reason");
            return;
        }

        if (reason.replace(/[^A-Za-z0-9]/g, '') == "") {
            message.channel.send("Invalid arguments. You must enter a reason. Correct usage: &&tank @user reason");
            return;
        }

        var userToTank = tokens[0];
        const discord_user = message.mentions.users.first();
        const guild_member = message.guild.member(discord_user);

        const role_name = message.guild.roles.get(drunktankRole);
        const oldRoles = Array.from(guild_member.roles.keys());


   
        //clear all their existing roles
        guild_member.setRoles([drunktankRole], "Drunk tanked by " + message.author)    
            .then(() => {
                msg = log_blue_tank(message.author, guild_member, userToTank, reason);
                return log_blue(message.guild, logChannel, msg)
            })
            .then(() => {
                return log_tank_channel(message.guild, tankChannel, userToTank, message.author, reason)
            })
            .then(() => {
                return set_reminder(message.author, message.guild, userToTank, reason, oldRoles, tankDuration, tankUOM)
            })
            .then(() => {
                return message.channel.send(confirm_message(message.author, userToTank, reason, role_name));
            })
            .catch((error) => {
                message.channel.send("Failed to remove roles for " + userToTank + 
                    "\r\nDo I have the permissions to manage this user?" +
                    "\r\n"+error
                ); 
            });
    }

    if(command === "checktank") {

        check_tank(message);

    }

    if(command === "untank") { 
        tokens = tokenize(msg.substr(1,msg.length -1 ));
        
        if (tokens.length < 2) {
            message.channel.send("Invalid arguments. Correct usage: &&untank @user reason");
            return;
        }
        var reason = ""
        for  (n = 1; n < tokens.length; n++) {
            reason += tokens[n] + " ";
        } 

        if (message.mentions.users.size == 0) {
            message.channel.send("Invalid arguments. You need to @ the user to untank them. Correct usage: &&untank @user reason");
            return;
        }

        if (message.mentions.users.size > 1) {
            message.channel.send("Invalid arguments. More than one user @'d - only @ the user you are untanking. Correct usage: &&untank @user reason");
            return;
        }

        if (reason.replace(/[^A-Za-z0-9]/g, '') == "") {
            reason = "Default - assume time served.";
        }
    
        const discord_user = message.mentions.users.first();
        const guild_member = message.guild.member(discord_user);
        var userToUntank = tokens[0];
        user = get_user_to_untank(userToUntank);
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
                var dateTanked = new Date(user.time_tanked);
                var now = new Date(ts);
                var diffhours = parseInt((now - dateTanked) / (1000 * 60 * 60)); 
                var diffmins = parseInt((now - dateTanked) / (1000 * 60));
                diffmins = diffmins - (diffhours * 60)
                msg = log_blue_untank(message.author.username, guild_member, userToUntank, reason, diffhours, diffmins);
                return log_blue(message.guild, logChannel, msg);
            }) 
            .then(() => {
                return message.channel.send(confirm_untank_message(message.author, userToUntank, reason, user.roles_to_give_back));
            })
            .catch((error) => {
                message.channel.send("Failed to set roles for " + userToUntank + 
                    "\r\nDo I have the permissions to manage this user?" +
                    "\r\n"+error
                ); 
            });;
    }

    if(command === "tankstats") { 
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

});
function confirm_message(author, tankee, reason, drunktankRole) {
    return author + 
    "\r\nCommanded me to drunk tank " + tankee +
    "\r\nWith Reason: " + reason +
    "\r\nI have removed all their roles, and granted " + drunktankRole;
}
function confirm_untank_message(author, tankee, reason, drunktankRole) {
    return author + 
    "\r\nCommanded me to untank " + tankee +
    "\r\nWith Reason: " + reason +
    "\r\nI have removed 2Drunk2Party, and returned their original roles: " + drunktankRole;
}

function log_blue(guild, channel_id, msg) {
    channel = guild.channels.get(channel_id);
    return channel.send(msg);
}
function log_blue_tank(author, tankee, userToTank, reason) {
    return "=== DRUNK TANKED ===" +
    "\r\nNickname: " + userToTank +
    "\r\nUsername: " + tankee.user.username +
    "\r\nId: " + tankee.user.id +
    "\r\nDrunk tanked by " + author + 
    "\r\nReason: " + reason
}
function log_blue_untank(author, tankee, userToTank, reason, hourstanked, minutestanked) {
    return "=== UNTANKED ===" +
    "\r\nNickname: " + userToTank +
    "\r\nUsername: " + tankee.user.username +
    "\r\nId: " + tankee.user.id +
    "\r\nUntanked by " + author +
    "\r\nReason: " + reason +
    "\r\nThey were in the tank for a total of " + hourstanked + " hours and " + minutestanked + " minutes."
}

function log_tank_channel(guild, channel_id, userToTank, author, reason) {
    channel = guild.channels.get(channel_id);
    message = tank_msg(author, userToTank, reason, tankDuration, tankUOM)
    return channel.send(message);
}
function tank_msg(author, userToTank, reason, duration, uom) {
    return userToTank + "," +
    "\r\nYou were drunk tanked by " + author + 
    "\r\nReason: " + reason + 
    "\r\nYou are here for " + duration + " " + uom 
}

function set_reminder(author, guild, userToTank, reason, oldRoles, duration, uom) {
    let ts = Date.now();
    let untank_time = 0;

    switch (uom) {
        case "days": 
            untank_time = ts + (duration*24*60*60*1000)
            break;
        case "hours": 
            untank_time = ts + (duration*60*60*1000)
            break;
        case "minutes":
            untank_time = ts + (duration*60*1000)
            break;
    }

    tankee_obj = {
        guild_id: guild.id,
        user_tanked: userToTank,
        tanked_by: author.username,
        reason: reason, 
        time_tanked: ts,
        time_to_untank: untank_time,
        role_to_remove: drunktankRole,
        roles_to_give_back: oldRoles,
        archive: false
    }

    if (!fs.existsSync("c:/t/tankees.json")) {
        fs.writeFileSync("c:/t/tankees.json", JSON.stringify([tankee_obj]));
    }
    else {
    return fs.readFile('c:/t/tankees.json', function (err, data) {
            var json = JSON.parse(data)
            json.push(tankee_obj)
            fs.writeFileSync("c:/t/tankees.json", JSON.stringify(json))
        })
    }
}
function check_tank(message) {
    let ts = Date.now();

    fs.readFile('c:/t/tankees.json', function (err, data) {
        var json = JSON.parse(data)
        var nobody = true;
        for (n=0;n<json.length; n++) {
            var obj = json[n];
            if (obj.archive) {
                continue;   
            }
            nobody=false;
            var dateTanked = new Date(obj.time_tanked);
            var now = new Date(ts);
            var diffhours = parseInt((now - dateTanked) / (1000 * 60 * 60)); 
            var diffmins = parseInt((now - dateTanked) / (1000 * 60));
            diffmins = diffmins - (diffhours * 60)
            msg = "(tanked " + diffhours + " hours and " + diffmins  + " minutes ago by " + obj.tanked_by + " for " + obj.reason + ")";
            if (ts > obj.time_to_untank) {
                message.channel.send(obj.user_tanked + " has served their time. " + msg);
                console.log(obj.user_tanked + " has served their time. " + msg);
            }
            else {
                message.channel.send(obj.user_tanked + " still has time to wait. " + msg);
                console.log(obj.user_tanked + " has served their time. " + msg);
            }
        }
        if (nobody) {
            message.channel.send("According to my records, the drunk tank is empty!");
        }

    });
}

function get_user_to_untank(userToUntank){
    data = fs.readFileSync('c:/t/tankees.json');
    var json = JSON.parse(data)
    var user;
    for (n=0;n<json.length; n++) {
        if (json[n].archive) {
            continue;   
        }
        if (json[n].user_tanked == userToUntank) {
            json[n].archive = true;
            user = json[n];
        }
    }

    fs.writeFileSync("c:/t/tankees.json", JSON.stringify(json))

    return user;
}

function tokenize(m) {
    return m.split(" ");
}

require('dotenv').config();
client.login(process.env.access_key);


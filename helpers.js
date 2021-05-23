function getDateDiffString(future, past) {
    var diffseconds = parseInt((future - past) / 1000); 
    var diffMinutes = diffseconds / 60
    var diffHours = diffMinutes / 60


    console.log (diffseconds )
    console.log (diffMinutes)
    console.log(diffHours)
    var seconds =  parseInt(diffseconds % 60);
    var minutes =  parseInt(diffMinutes % 60);
    var hours =  parseInt(diffHours > 23 ? diffHours % 24 : diffHours);
    var days = parseInt(hours / 24)

   var result = days > 0 ? days + " days, " : "" +
                hours + " hours, " +
                minutes + " minutes" +
                " & " + seconds + " seconds";
    
    return result;
}

function getReason(tokens) {
    reason = "";
    for  (n = 1; n < tokens.length; n++) {
        reason += tokens[n] + " ";
    } 
    return reason;
}
function validateReason(reason, message) {
    if (reason.replace(/[^A-Za-z0-9]/g, '') == "") {
        message.channel.send("Invalid arguments. You must enter a reason. Correct usage: &&tank @user reason");
        return false;
    }
    return true;
}

function validateMentions(message, command, prefix) {

    if (message.mentions.users.size == 0) {
        message.channel.send("Invalid arguments. You need to @ the user to drunk tank them. Correct usage: " + prefix + command + " @user reason");
        return false;
    }

    if (message.mentions.users.size > 1) {
        message.channel.send("Invalid arguments. More than one user @'d - only @ the user you are tanking. Correct usage: " + prefix + command + " @user reason");
        return false;
    }

    return true;
}

function tokenize(m) {
    return m.split(" ");
}


exports.getDateDiffString = getDateDiffString;
exports.getReason = getReason;
exports.validateReason = validateReason;
exports.validateMentions = validateMentions;
exports.tokenize = tokenize;
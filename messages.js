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
function log_blue_tank_msg(author, tankee, userToTank, reason) {
    return "=== DRUNK TANKED ===" +
    "\r\nNickname: " + userToTank +
    "\r\nUsername: " + tankee.user.username +
    "\r\nId: " + tankee.user.id +
    "\r\nDrunk tanked by " + author + 
    "\r\nReason: " + reason
}
function log_blue_untank_msg(author, tankee, userToTank, reason, datediff) {
    return "=== UNTANKED ===" +
    "\r\nNickname: " + userToTank +
    "\r\nUsername: " + tankee.user.username +
    "\r\nId: " + tankee.user.id +
    "\r\nUntanked by " + author +
    "\r\nReason: " + reason +
    "\r\nThey were in the tank for " + datediff;
}
function tank_msg(author, userToTank, reason, duration, uom) {
    return userToTank + "," +
    "\r\nYou were drunk tanked by " + author + 
    "\r\nReason: " + reason + 
    "\r\nYou are here for " + duration + " " + uom 
}

function write_to_channel(guild, channel_id, msg) {
    channel = guild.channels.get(channel_id);
    return channel.send(msg);
}

exports.write_to_channel = write_to_channel;
exports.confirm_untank_message = confirm_untank_message;
exports.confirm_message = confirm_message;
exports.log_blue_untank_msg = log_blue_untank_msg;
exports.log_blue_tank_msg = log_blue_tank_msg;
exports.tank_msg = tank_msg;
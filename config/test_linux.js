require('dotenv').config();

const drunktankRole = "795125880363679745";
const tankChannel = "795125618957484052";
const logChannel = "795125578494640188";
const botMasterRole = "846036899523985449";
const serverID = "795115424634372147";
const tankUOM = "hours";
const tankDuration = "12";
const commandPrefix = "&&";
const access_key = process.env.test_access_key;
const json_path = "~/tankees.json";
const bot_name = "StevieBot";

exports.drunktankRole = drunktankRole
exports.tankChannel = tankChannel
exports.logChannel = logChannel
exports.botMasterRole = botMasterRole
exports.tankUOM = tankUOM
exports.tankDuration = tankDuration
exports.commandPrefix = commandPrefix
exports.access_key = access_key
exports.json_path = json_path
exports.bot_name = bot_name
exports.serverID = serverID
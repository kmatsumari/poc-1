var helpers = require( './helpers');

let ts = Date.now();
var d2 = ts - (800*57*45*24);

console.log(ts);
console.log(d2);
console.log(ts-d2);
var diff = helpers.getDateDiffString(ts,d2)

console.log(diff);
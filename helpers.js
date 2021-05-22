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

exports.getDateDiffString = getDateDiffString;
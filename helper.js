const moment = require('moment-timezone');

// Function get Month and Day
async function isSameMonthAndDay(date1, date2) {
    const formattedDate1 = moment(date1).format('MM-DD');
    const formattedDate2 = moment(date2).format('MM-DD');
    
    return formattedDate1 === formattedDate2;
}

// Function get Month and Day
async function isSameHour(hour1, hour2) {
    return moment(hour1, 'HH').isSame(moment(hour2, 'HH'), 'hour');
}

function isAfter(input1, input2) {
    const date1 = moment(input1, 'DD/MM/YYYY');
    const date2 = moment(input2, 'DD/MM/YYYY');
    
    const isAfter = (date1.month() > date2.month()) || 
                    (date1.month() === date2.month() && date1.date() > date2.date());
    return isAfter;
}


module.exports = {
    isSameMonthAndDay,
    isSameHour,
    isAfter
};

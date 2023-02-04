const emailValidator = require("email-validator");

exports.emptyParameter = (obj, field) => {
    if(!obj.body || !obj.body[field] || !obj.body[field].length){
        return true;
    }
    return false;
};

exports.validateEmail = (obj) => {
    return emailValidator.validate(obj.body.email);
};

exports.validGender = () => {
    return ['m', 'f'];
};

exports.isValidDate = (dateString) => {
    if(!dateString || dateString.length !== 10){
        return false;
    }
    let year, month, day;
    [year, month, day] = dateString.split('-');
    if(
        (month == '11' || month == '04' || month == '06' || month == '09')
        && Number(day) > 30
    ){
        return false;
    }
    if(
        month == '02'&& Number(day) > 29
    ){
        return false;
    }
    if(
        month == '02'&& Number(day) === 29
    ){
        if(!((year % 4 == 0 && year % 100) || year % 400 == 0)){
            return false;
        }
    }
    const regEx = /^\d{4}-\d{2}-\d{2}$/;
    let validDate = Date.parse(dateString);
    if (isNaN(validDate)) {
        return false;
    }
    return dateString.match(regEx) != null;
}

exports.validSearchGender = () => {
    return ['m', 'f', 'a'];
};

exports.validSearchDistance = () => {
    return ['close', 'all'];
};

exports.validSearchBodyType = () => {
    return ["xs","s","m","l","xl","xxl"];
};

/*exports.validSearchGender = () => {
    return ['m', 'f', 'a'];
};*/

exports.isValidInteger = (nr) => {
    return isFinite(nr);
};

exports.validatePassword = (obj) => {
    if(!obj.body || !obj.body.password || !obj.body.password.length){
        return false;
    }
    if(obj.body.password.length < 6){
        return false;
    }
    return true;
};


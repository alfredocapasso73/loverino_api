const { v4: uuidv4 } = require('uuid');
const config = require("../config/config.json");
const fs = require("fs");
const {clone} = require("nodemon/lib/utils");
const User = require('../models/user');


exports.generateUuid = () => {
    return uuidv4();
};

exports.formatDescription = (description) => {
    if(description.length <= config.description_max_number_of_chars){
        return description;
    }
    const substr = description.substring(0, config.description_max_number_of_chars);
    return `${substr}...`;
}

exports.deleteTestImage = async (filename) => {
    for await(name of config.picture_name_format){
        try{
            const full_filename = `${process.env.IMAGE_UPLOAD_PATH}/${name}-${filename}`;
            fs.unlinkSync(full_filename);
        }
        catch(exception){
            console.log("exception",exception);
        }
    }
};

exports.deleteTempImage = async (filename) => {
    const full_filename = `${process.env.IMAGE_UPLOAD_PATH}/picture-${filename}`;
    fs.unlinkSync(full_filename);
};

exports.deleteUserPicture = async (picture_id, user_id) => {
    try{
        const foundUser = await User.find({_id: user_id, pictures: { $elemMatch: {$eq: picture_id} }});
        if(!foundUser.length){
            throw 'image_not_found';
        }
        const deleteResult = await User.updateOne({ _id: user_id }, {
            $pullAll: {pictures: [picture_id]},
        });
        if(!deleteResult.acknowledged){
            throw 'something_went_wrong';
        }
        const original_filename = `${process.env.IMAGE_UPLOAD_PATH}/picture-${picture_id}`;
        const tiny_filename = `${process.env.IMAGE_UPLOAD_PATH}/tiny-picture-${picture_id}`;
        const small_filename = `${process.env.IMAGE_UPLOAD_PATH}/small-picture-${picture_id}`;

        if(fs.existsSync(original_filename)){
            fs.unlinkSync(original_filename);
        }
        if(fs.existsSync(tiny_filename)){
            fs.unlinkSync(tiny_filename);
        }
        if(fs.existsSync(small_filename)){
            fs.unlinkSync(small_filename);
        }
        return true;
    }
    catch(exception){
        throw exception;
    }
};

exports.deleteImages = async (filename) => {
    const original_filename = `${process.env.IMAGE_UPLOAD_PATH}/picture-${filename}`;
    const tiny_filename = `${process.env.IMAGE_UPLOAD_PATH}/tiny-picture-${filename}`;
    const small_filename = `${process.env.IMAGE_UPLOAD_PATH}/small-picture-${filename}`;

    if(fs.existsSync(original_filename)){
        fs.unlinkSync(original_filename);
    }
    if(fs.existsSync(tiny_filename)){
        fs.unlinkSync(tiny_filename);
    }
    if(fs.existsSync(small_filename)){
        fs.unlinkSync(small_filename);
    }
};


exports.ageFromBirthday = (birthday) => {
    const birthday_timestamp = new Date(birthday.getFullYear(), birthday.getMonth(), birthday.getDate());
    const current_date = new Date().getTime();
    const difference = current_date - birthday_timestamp;
    const result = Math.floor(difference / 31557600000);
    return result === 17 ? 18 : result;
}

exports.birthdayFromAge = (age) => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - age);
    return date;
}

const subtractHours = (date, hours) => {
    date.setHours(date.getHours() - hours);
    return date;
}

exports.addHours = (date, hours) => {
    const copy = clone(date);
    copy.setHours(copy.getHours() + hours);
    return copy;
}

exports.addMinutes = (date, minutes) => {
    const copy = clone(date);
    copy.setMinutes(copy.getMinutes() + minutes);
    return copy;
}

exports.dateXHoursAgo = (hours) => {
    const date = new Date();
    return subtractHours(date, hours);
}

exports.date2HoursAgo = () => {
    const date = new Date();
    return subtractHours(date, 2);
}

exports.date9HoursAgo = () => {
    const date = new Date();
    return subtractHours(date, 9);
}

exports.date1DayAgo = () => {
    const date = new Date();
    return subtractHours(date, 24);
}
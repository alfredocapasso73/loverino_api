const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const City = require("../models/city");
const Region = require("../models/region");
const RefusedUser = require('../models/refused_user');
const CanceledMatch = require('../models/canceled_match');
const Chat = require('../models/chat');
const WinnerUser = require('../models/winner_user');
const validation = require('../helpers/validation');
const helper = require('../helpers/helper');
const mailer = require('../helpers/mailer');
const mongoose = require('mongoose');
const path = require('path');
const sharp = require('sharp');
const multer  = require('multer');
const fs = require('fs');
const {v4: uuidv4} = require("uuid");

exports.getChatMessages = async (req, res) => {
    try{
        const user = req.user;
        const room = user.room;
        const messages = await Chat.find({room_id: room});
        return res.status(200).send({message: "me", messages: messages});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};

const encode_image = (data) => {
    const str = data.reduce(function(a,b){ return a+String.fromCharCode(b) },'');
    return btoa(str).replace(/.{76}(?=.)/g,'$&\n');
}

exports.publicTestImage = async (req, res) => {
    try{
        res.status(200).json({message: "publicTestImage"});
        //console.log("encoded_image",encoded_image);
        //return res.json(200).send({message: 'ok', encoded_image: encoded_image});
        //const img = '<img src="data:image/png;base64,'+encoded_image+'" />';
        //const html = '<html><body>'+img+'</body></html>';
        //res.send(html);
    }
    catch(exception){
        return res.status(500).send({error2: exception});
    }
};

exports.publicTest = async (req, res) => {
    res.status(200).json({message: "publicTest"});
};

exports.privateTest = (req, res) => {
    res.status(200).json({message: "privateTest"});
};

exports.dbTest = async (req, res) => {
    res.status(200).json({message: 'dbTest', all_users: []});
};

exports.changeRestoredPassword = async (req, res) => {
    try{
        if(validation.emptyParameter(req, 'password')){
            return res.status(400).send({message: 'missing_parameter_password',error: 'missing_parameter_password'});
        }
        if(!validation.validatePassword(req)){
            return res.status(400).send({message: 'password_rule_failed',error: 'password_rule_failed'});
        }
        if(validation.emptyParameter(req, 'restorePasswordString')){
            return res.status(400).send({message: 'missing_parameter_restorePasswordString',error: 'missing_parameter_restorePasswordString'});
        }
        if(validation.emptyParameter(req, 'userId')){
            return res.status(400).send({message: 'missing_parameter_userId',error: 'missing_parameter_userId'});
        }
        const validObjectId = mongoose.isObjectIdOrHexString(req.body.userId);
        if(!validObjectId){
            return res.status(400).send({message: 'restored_string_not_found',error: 'restored_string_not_found'});
        }
        const foundUserByRestoreString =
            await User.find({restorePasswordString: req.body.restorePasswordString, _id: req.body.userId}) || [];
        if(!foundUserByRestoreString.length){
            return res.status(404).send({message: 'restored_string_not_found',error: 'restored_string_not_found'});
        }
        const user = foundUserByRestoreString[0];
        user.password = bcrypt.hashSync(req.body.password, 8)
        await user.save();
        res.status(200).json({message: "password_changed"});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: 'something_went_wrong'});
    }
};

exports.restore = async (req, res) => {
    try{
        const validObjectId = mongoose.isObjectIdOrHexString(req.params.userId);
        if(!validObjectId){
            return res.status(404).send({message: 'restored_string_not_found'});
        }
        const foundUserByRestoreString =
            await User.find({restorePasswordString: req.params.restorePasswordString, _id: req.params.userId}) || [];
        if(!foundUserByRestoreString.length){
            return res.status(404).send({message: 'restored_string_not_found'});
        }
        res.status(200).json({message: "restore"});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: 'something_went_wrong'});
    }
};

exports.forgotPassword = async (req, res) => {
    try{
        if(validation.emptyParameter(req, 'email')){
            return res.status(400).send({error: 'missing_parameter_email'});
        }
        const foundUserByEmail = await User.find({email: req.body.email}) || [];
        if(!foundUserByEmail.length){
            return res.status(404).send({error: 'user_not_found'});
        }
        const user = foundUserByEmail[0];
        user.restorePasswordString = helper.generateUuid();
        await user.save();
        await mailer.forgotPasswordEmail(user);
        res.status(200).json({message: "password_restored", restorePasswordString: user.restorePasswordString});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: 'something_went_wrong'});
    }
};

exports.signup = async (req, res) => {
    try{
        if(validation.emptyParameter(req, 'name')){
            return res.status(400).json({error: 'missing_parameter_name'});
        }
        if(validation.emptyParameter(req, 'email')){
            return res.status(400).send({error: 'missing_parameter_email'});
        }
        if(validation.emptyParameter(req, 'password')){
            return res.status(400).send({error: 'missing_parameter_password'});
        }
        if(!validation.validateEmail(req)){
            return res.status(400).send({error: 'invalid_email'});
        }
        if(!validation.validatePassword(req)){
            return res.status(400).send({error: 'password_rule_failed'});
        }

        const foundUserByEmail = await User.find({email: req.body.email}) || [];
        if(foundUserByEmail.length){
            return res.status(400).send({error: 'email_already_in_use'});
        }

        const activation_string = helper.generateUuid();

        const user = new User({
            name: req.body.name
            ,email: req.body.email
            ,password: bcrypt.hashSync(req.body.password, 8)
            ,activation_string: activation_string
        });
        const createdUser = await user.save();
        await mailer.welcomeEmail(createdUser);
        const returnUser = (({ _id,name, activation_string }) => ({ _id,name, activation_string }))(createdUser);

        res.status(200).send({message: "signup_ok", returnUser: returnUser});
    }
    catch(exception){
        return res.status(500).send({message: exception});
    }
};

exports.resendActivationLink = async (req, res) => {
    try{
        const email = req.body.email;
        const foundUser = await User.findOne({email: email});
        if(!foundUser){
            return res.status(404).json({error: "user_not_found"});
        }
        await mailer.welcomeEmail(foundUser);
        res.status(200).json({message: "activation_link_sent"});
    }
    catch(exception){
        return res.status(500).send({message: exception});
    }

};

exports.activate = async (req, res) => {
    try{
        const activation_string = req.params.activation_string;
        const userId = req.params.userId;
        const validObjectId = mongoose.isObjectIdOrHexString(userId);
        if(!validObjectId){
            return res.status(404).json({error: "user_not_found"});
        }
        const foundUser = await User.find({activation_string: activation_string, _id: userId}) || [];
        if(!foundUser.length){
            return res.status(404).json({error: "user_not_found"});
        }
        const userToActivate = foundUser[0];
        userToActivate.active = true;
        const active = await userToActivate.save();
        if(!active){
            return res.status(400).json({error: "could_not_activate_user"});
        }
        res.status(200).json({message: "activated"});
    }
    catch(exception){
        return res.status(500).send({message: exception});
    }

};

exports.signin = async (req, res) => {
    try{
        if(validation.emptyParameter(req, 'email')){
            return res.status(400).send({error: 'missing_parameter_email'});
        }
        if(validation.emptyParameter(req, 'password')){
            return res.status(400).send({error: 'missing_parameter_password'});
        }
        const foundUser = await User.find({email: req.body.email}) || [];
        if(!foundUser.length){
            return res.status(401).send({error: "wrong_email_or_password"});
        }
        const user = foundUser[0];
        const comparison = await bcrypt.compareSync(req.body.password,user.password);
        if(!comparison){
            return res.status(401).send({error: "wrong_email_or_password"});
        }
        if(!user.active){
            return res.status(400).send({error: "not_activate_yet"});
        }

        const token = jwt.sign({id: user.id}, process.env.API_SECRET, {expiresIn: process.env.JWT_EXPIRATION});
        const logged_in_at = Date.now();
        await User.updateOne({_id: user.id}, {$set: {access_token: token, logged_in_at: logged_in_at}});
        return res.status(200)
            .send({
                user: {
                    _id: user._id,
                    email: user.email,
                    name: user.name,
                    pictures: user.pictures,
                },
                message: "login_ok",
                accessToken: token,
            });
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};

exports.closeAccount = async (req, res) => {
    try{
        const user = await User.findOne({_id: req.user._id});
        if(!user){
            return res.status(500).send({error: 'user_not_found'});
        }

        if(user.current_match){
            const current_match = user.current_match;
            const user_current_match = await User.findOne({_id: current_match});
            await handleMatchCanceled(req.user._id, user_current_match._id);
        }
        if(user.pictures.length){
            const pictures = user.pictures;
            for await (const pic of pictures){
                await helper.deleteImages(pic);
            }
        }
        await User.deleteOne({_id: req.user._id});
        return res.status(200).send({message: "ok"});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};

exports.testRematch = async (req, res) => {
    const deleted = await User.deleteMany({$or: [{name: "Rematch1"},{name: "Rematch2"},{name: "Rematch3"},{name: "Rematch4"}]});
    const user1_val = new User({name: "Rematch1", email: "Rematch1@loverino.se", password: "password", active: true, current_step: "done", status: "complete", activation_string: "abcd"});
    const user1_ob = await user1_val.save();
    const user2_val = new User({name: "Rematch2", email: "Rematch2@loverino.se", password: "password", active: true, current_step: "done", status: "complete", activation_string: "abcd"});
    const user2_ob = await user2_val.save();
    const user3_val = new User({name: "Rematch3", email: "Rematch3@loverino.se", password: "password", active: true, current_step: "done", status: "complete", activation_string: "abcd"});
    const user3_ob = await user3_val.save();
    const user4_val = new User({name: "Rematch4", email: "Rematch4@loverino.se", password: "password", active: true, current_step: "done", status: "complete", activation_string: "abcd"});
    const user4_ob = await user4_val.save();
    const winner_1_val = new WinnerUser({for_user_id: user1_ob._id,winner_id: user2_ob._id, is_test: true});
    const winner_1_ob = await winner_1_val.save();
    const winner_2_val = new WinnerUser({winner_id: user1_ob._id,for_user_id: user2_ob._id, is_test: true});
    const winner_2_ob = await winner_2_val.save();
    const winner_3_val = new WinnerUser({for_user_id: user1_ob._id,winner_id: user3_ob._id, is_test: true});
    const winner_3_ob = await winner_3_val.save();
    const winner_4_val = new WinnerUser({winner_id: user1_ob._id,for_user_id: user3_ob._id, is_test: true});
    const winner_4_ob = await winner_4_val.save();

    await User.updateOne({_id: user1_ob._id}, {$set: {current_match: user2_ob._id}});
    await User.updateOne({_id: user2_ob._id}, {$set: {current_match: user1_ob._id}});


    await handleMatchCanceled(user1_ob._id, user2_ob._id);


    const all_winners = await WinnerUser.find({});
    const rematch_for_users = await checkIfCanceledUsersHaveMatch(user1_ob._id, user2_ob._id);

    const user1_refetched = await User.findOne({_id: user1_ob._id});
    const user2_refetched = await User.findOne({_id: user2_ob._id});
    const user3_refetched = await User.findOne({_id: user3_ob._id});

    await WinnerUser.deleteMany({is_test: true});
    return res.status(200).send(
        {
            message: "testRematch"
            , all_winners: all_winners
            , user1_ob: user1_ob
            , user1_refetched: user1_refetched
            , user2_ob: user2_ob
            , user2_refetched: user2_refetched
            , user3_ob: user3_ob
            , user3_refetched: user3_refetched
            , user4_ob: user4_ob
            , rematch_for_users: rematch_for_users
        });
}


const getRematchedForUser = async (user_id) => {
    const winners_for_user = await WinnerUser.find({for_user_id: user_id}) || [];
    if(!winners_for_user.length){
        return null;
    }
    const winners_for_user_arr = winners_for_user.map(el => mongoose.Types.ObjectId(el.winner_id).valueOf());
    const set_user_as_winner = await WinnerUser.find({
        $and: [{for_user_id: {$in: winners_for_user_arr}},{winner_id: user_id}]
    }) || [];
    if(!set_user_as_winner.length){
        return null;
    }
    const potential_matches_ids = set_user_as_winner.map(el => el.for_user_id);
    const found_matches = await User.find({
        _id: {$in: potential_matches_ids}
    });
    return found_matches.length ? found_matches[0] : null;
}

const checkIfCanceledUsersHaveMatch = async (user_leaving_id, user_left_id) => {
    const data = {rematch_user_1: null,rematch_user_2: null};

    const match_for_user_leaving = await getRematchedForUser(user_leaving_id);
    //There is a new match already for user_leaving_id
    if(match_for_user_leaving){
        const room = uuidv4();
        await User.updateOne({_id: user_leaving_id}, {$set: {current_match: match_for_user_leaving._id, room: room}});
        await User.updateOne({_id: match_for_user_leaving._id}, {$set: {current_match: user_leaving_id, room: room}});
        data.rematch_user_1 = match_for_user_leaving._id;
    }

    const match_for_user_left = await getRematchedForUser(user_left_id);
    //There is a new match already for user_left_id
    if(match_for_user_left){
        const room = uuidv4();
        await User.updateOne({_id: user_left_id}, {$set: {current_match: match_for_user_left._id, room: room}});
        await User.updateOne({_id: match_for_user_left._id}, {$set: {current_match: user_left_id, room: room}});
        data.rematch_user_2 = match_for_user_left._id;
    }
    return data;
}

const handleMatchCanceled = async (user_leaving_id, user_left_id) => {
    const update_fields = {
        suggestions_completed_at: helper.date1DayAgo()
        ,current_match: null
        ,room: null
    };
    await User.updateOne({_id: user_leaving_id}, update_fields);
    await User.updateOne({_id: user_left_id}, update_fields);
    await RefusedUser.updateOne({for_user_id: user_leaving_id}, {$push: {users: user_left_id}}, {upsert: true});
    await WinnerUser.deleteMany({for_user_id: user_leaving_id, winner_id: user_left_id});
    await WinnerUser.deleteMany({for_user_id: user_left_id, winner_id: user_leaving_id});
    const canceled_match = new CanceledMatch({for_user_id: user_left_id, canceling_id: user_leaving_id});
    await canceled_match.save();
}

exports.cancelCurrentMatch = async (req, res) => {
    try{
        const user = await User.findOne({_id: req.user._id});
        if(!user.current_match){
            return res.status(500).send({error: 'no_current_match'});
        }
        const current_match = user.current_match;
        const user_current_match = await User.findOne({_id: current_match});
        if(!user_current_match){
            return res.status(500).send({error: 'corresponding_match_not_found'});
        }
        if(
            mongoose.Types.ObjectId(user_current_match.current_match).valueOf()
            !== mongoose.Types.ObjectId(req.user._id).valueOf()
        ){
            return res.status(500).send({error: 'match_ids_are_not_equal'});
        }
        await handleMatchCanceled(req.user._id, current_match);
        const rematches = await checkIfCanceledUsersHaveMatch(req.user._id, current_match);
        /*const update_fields = {
            suggestions_completed_at: helper.date1DayAgo()
            ,current_match: null
        };
        await User.updateOne({_id: req.user._id}, update_fields);
        await User.updateOne({_id: current_match}, update_fields);
        await RefusedUser.updateOne({for_user_id: req.user._id}, {$push: {users: current_match}}, {upsert: true});
        const canceled_match = new CanceledMatch({for_user_id: current_match, canceling_id: req.user._id});
        await canceled_match.save();*/

        return res.status(200).send({message: "ok", rematches: rematches});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({error: exception});
    }
};


exports.current_match = async (req, res) => {
    try{
        const user = await User.findOne({_id: req.user._id});
        const has_been_canceled = await CanceledMatch.findOne({for_user_id: req.user._id, has_been_read: false});
        let just_been_canceled = false;
        if(has_been_canceled){
            just_been_canceled = true;
            await CanceledMatch.updateOne({for_user_id: req.user._id, has_been_read: false}, {has_been_read: true});
        }
        return res.status(200).send({message: "ok", current_match: user.current_match, just_been_canceled: just_been_canceled});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};

exports.getUser = async (req, res) => {
    try{
        const user_id = req.params.user_id;
        const user = await User.findOne({_id: user_id}).lean();
        if(!user){
            return res.status(404).json({error: "user_not_found"});
        }
        delete user.password;
        delete user.is_paying_user;
        delete user.email;
        delete user.activation_string;
        const region_name = await Region.findOne({_id: user.region});
        if(region_name){
            user.region_name = region_name.name;
        }
        const city_name = await City.findOne({_id: user.city});
        if(city_name){
            user.city_name = city_name.name;
        }

        return res.status(200).send({message: "ok", user: user});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};

exports.me = async (req, res) => {
    try{
        const user = req.user;
        delete user.password;
        return res.status(200).send({message: "me", user: user});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};

exports.update = async (req, res) => {
    try{
        const user = req.user;
        const set = {};
        if(req.body.name){
            set.name = req.body.name;
        }
        await User.updateOne({_id: user._id},  {$set: set});
        const foundUser = await User.find({_id: user._id}).lean();
        if(!foundUser){
            return res.status(500).send({message: "user_not_found"});
        }
        const updatedUser = foundUser[0];
        req.user = updatedUser;
        delete updatedUser.password;
        return res.status(200).send({message: "updated", user: updatedUser});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};

exports.updateNotifications = async (req, res) => {
    try{
        const user = req.user;
        const notify_new_match = req.body.notify_new_match || false;
        const notify_new_suggestions = req.body.notify_new_suggestions || false;
        const id = user._id;
        await User.updateOne({_id: user._id}, {$set: {notify_new_match: notify_new_match, notify_new_suggestions: notify_new_suggestions}});
        return res.status(200).send({message: "ok"});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({error: exception});
    }
};

exports.updateEmail = async (req, res) => {
    try{
        if(validation.emptyParameter(req, 'email')){
            return res.status(400).send({error: 'missing_parameter_email'});
        }
        const user = req.user;
        const new_email = req.body.email;
        const id = user._id;
        const foundUser = await User.find({email: new_email}) || [];
        if(foundUser.length && foundUser[0]._id !== id){
            return res.status(400).send({error: 'email_already_in_use'});
        }
        if(foundUser.length && foundUser[0]._id === id){
            return res.status(400).send({error: 'same_email_as_before'});
        }
        await User.updateOne({_id: user._id}, {$set: {email: new_email}});
        return res.status(200).send({message: "email_updated"});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({error: exception});
    }
};

exports.updatePassword = async (req, res) => {
    try{
        if(validation.emptyParameter(req, 'password')){
            return res.status(400).send({error: 'missing_parameter_password'});
        }
        if(!validation.validatePassword(req)){
            return res.status(400).send({error: 'password_rule_failed'});
        }
        const new_password = bcrypt.hashSync(req.body.password, 8);
        await User.updateOne({_id: req.user._id}, {$set: {password: new_password}});
        return res.status(200).send({message: "password_updated"});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({error: exception});
    }
};

const validateStep2 = async (req, validate_name = false) => {
    const errors = [];
    const set = {};

    try{
        if(validation.emptyParameter(req, 'gender')){
            errors.push('missing_parameter_gender');
        }
        const gender = req.body.gender;
        const validGenders = validation.validGender();
        if(!validGenders.includes(gender)){
            errors.push('invalid_gender');
        }
        set.gender = gender;

        if(validation.emptyParameter(req, 'search_gender')){
            errors.push('missing_parameter_search_gender');
        }
        const search_gender = req.body.search_gender;
        const validSearchGenders = validation.validSearchGender();
        if(!validSearchGenders.includes(search_gender)){
            errors.push('invalid_search_gender');
        }
        set.search_gender = search_gender;

        if(validation.emptyParameter(req, 'birthday')){
            errors.push('missing_parameter_birthday');
        }
        const birthday = req.body.birthday;
        if(!validation.isValidDate(birthday)){
            errors.push('invalid_birthday');
        }
        set.birthday = birthday;

        if(validation.emptyParameter(req, 'search_min_age')){
            errors.push('missing_parameter_search_min_age');
        }
        const search_min_age = req.body.search_min_age;
        if(!validation.isValidInteger(search_min_age)){
            errors.push('invalid_search_min_age');
        }
        set.search_min_age = search_min_age;

        if(validation.emptyParameter(req, 'search_max_age')){
            errors.push('missing_parameter_search_max_age');
        }
        const search_max_age = req.body.search_max_age;
        if(!validation.isValidInteger(search_max_age)){
            errors.push('invalid_search_max_age');
        }
        if(search_max_age < search_min_age){
            errors.push('invalid_range_for_search_age');
        }
        set.search_max_age = search_max_age;

        if(validation.emptyParameter(req, 'region')){
            errors.push('missing_parameter_region');
        }
        const region = req.body.region;
        const validRegionId = mongoose.isObjectIdOrHexString(region);
        if(!validRegionId){
            errors.push('invalid_region_parameter');
        }
        const foundRegion = await Region.find({_id: region});
        if(!foundRegion.length){
            errors.push('region_not_found');
        }
        set.region = region;

        if(validation.emptyParameter(req, 'city')){
            errors.push('missing_parameter_city');
        }
        const city = req.body.city;
        const validCityId = mongoose.isObjectIdOrHexString(city);
        if(!validCityId){
            errors.push('invalid_city_parameter');
        }
        const foundCity = await City.find({_id: city});
        if(!foundCity.length){
            errors.push('city_not_found');
        }
        set.city = city;

        if(validation.emptyParameter(req, 'search_distance')){
            errors.push('missing_parameter_search_distance');
        }
        const search_distance = req.body.search_distance;
        const valid_search_distance = validation.validSearchDistance();
        if(!valid_search_distance.includes(search_distance)){
            errors.push('invalid_search_distance');
        }
        set.search_distance = search_distance;

        if(!req.body.height){
            errors.push('missing_parameter_height');
        }
        const height = req.body.height;
        const valid_height = validation.isValidInteger(height);
        if(!valid_height){
            errors.push('invalid_height');
        }
        set.height = height;

        if(validation.emptyParameter(req, 'body_type')){
            errors.push('missing_parameter_body_type');
        }
        const body_type = req.body.body_type;
        const valid_body_types = validation.validSearchBodyType();

        if(!valid_body_types.includes(body_type)){
            errors.push('invalid_body_type');
        }
        set.body_type = body_type;

        if(validate_name){
            if(validation.emptyParameter(req, 'name')){
                errors.push('missing_parameter_name');
            }
            const name = req.body.name;
            set.name = name;
        }

        return {errors: errors, set: set};
    }
    catch(exception){
        //console.log(exception);
        errors.push(exception);
        return {errors: errors, set: set};
    }
}

exports.updateMyProfile = async (req, res) => {
    try{
        const validation = await validateStep2(req, true);
        if(validation.errors.length){
            return res.status(400).send({errors: validation.errors});
        }
        const description = req.body.description || '';
        validation.set.description = helper.formatDescription(description);

        const updatedUser = await User.updateOne({_id: req.user._id}, {$set: validation.set});
        const updated = updatedUser?.acknowledged || false;
        return res.status(200).send({message: "ok", updated: updated});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};

exports.runStep2 = async (req, res) => {
    try{
        const validation = await validateStep2(req, false);
        if(validation.errors.length){
            return res.status(400).send({errors: validation.errors});
        }
        const description = req.body.description || '';
        validation.set.current_step = 'step3';
        validation.set.description = helper.formatDescription(description);

        const updatedUser = await User.updateOne({_id: req.user._id}, {$set: validation.set});
        const updated = updatedUser?.acknowledged || false;
        return res.status(200).send({message: "ok", updated: updated});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, process.env.IMAGE_UPLOAD_PATH);
    },
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});


const imageFilter = function(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|webp|WEBP)$/)) {
        req.fileValidationError = 'only_images_allowed';
        return cb(new Error('only_images_allowed'), false);
    }
    if (!file.size > 100000000) {
        req.fileValidationError = 'max_size_10_mb';
        return cb(new Error('max_size_10_mb'), false);
    }
    cb(null, true);
};

exports.uploadPicture = async (req, res) => {
    let upload = multer({ storage: storage, fileFilter: imageFilter, limits: { fileSize: 2000000 }  }).single('picture');
    const user = req.user;
    upload(req, res, async function(err) {
        if (err instanceof multer.MulterError) {
            console.log("err1",err);
            if(err.code === 'LIMIT_FILE_SIZE'){
                return res.status(500).json({error: "file_too_large"});
            }
            else{
                return res.status(500).json({error: err});
            }
        }
        if (req.fileValidationError) {
            return res.status(500).json({error: 'only_images_allowed'});
        }
        if (!req.file) {
            return res.status(500).json({error: 'no_image_sent'});
        }
        if (err) {
            return res.status(500).json({error: err});
        }

        try {
            await sharp(req.file.path).resize(50, 50).toFile(process.env.IMAGE_UPLOAD_PATH + '/tiny-' + req.file.filename);
            await sharp(req.file.path).resize(200, 200).toFile(process.env.IMAGE_UPLOAD_PATH + '/small-' + req.file.filename);
            const filename = req.file.filename.replace('picture-', '');
            await User.updateOne({_id: user._id},  {$addToSet: {"pictures": [filename]}});
            const foundUser = await User.find({_id: user._id});
            const pictures = foundUser[0].pictures;
            await User.updateOne({_id: user._id},  {$set: {"current_step": "done", "status": "complete"}});
            return res.json({message: "ok", filename: filename, pictures: pictures});
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({error: 'image_thumb_error'});
        }
    });
};

exports.deletePicture = async (req, res) => {
    try{
        const picture_id = req.body.picture_id || '';
        if(!picture_id){
            return res.status(400).json({error: 'no_image_sent'});
        }
        const foundUser = await User.find({_id: req.user._id, pictures: { $elemMatch: {$eq: picture_id} }});
        if(!foundUser.length){
            return res.status(400).json({error: 'image_not_found'});
        }
        const deleteResult = await User.updateOne({ _id: req.user._id }, {
            $pullAll: {pictures: [picture_id]},
        });
        if(!deleteResult.acknowledged){
            return res.status(400).json({error: 'something_went_wrong'});
        }
        //await helper.deleteTempImage(picture_id);
        await helper.deleteImages(picture_id);

        const users = await User.find({_id: req.user._id});
        if(users.length){
            const user = users[0];
            if(!user.pictures.length){
                await User.updateOne({_id: user._id},  {$set: {"current_step": "step3", "status": "in_progress"}});
            }
        }
        return res.status(200).send({message: "ok"});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};

exports.getImage = async (req, res) => {
    try{
        const image = req.params.image;
        const image_not_found = 'image_not_found.png';

        let imgPath = `${process.env.IMAGE_UPLOAD_PATH}/${image}`;
        if(!fs.existsSync(imgPath)){
            imgPath = `${process.env.IMAGE_UPLOAD_PATH}/${image_not_found}`;
        }
        const img_file = fs.readFileSync(imgPath);
        const img = Buffer.from(img_file, 'base64');
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': img.length
        });
        res.end(img);
    }
    catch(exception){
        return res.status(500).send({error: exception});
    }
}

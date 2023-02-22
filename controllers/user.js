const mongoose = require('mongoose');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const fs = require('fs');
const {v4: uuidv4} = require("uuid");
const User = require("../models/user");
const City = require("../models/city");
const Region = require("../models/region");
const CanceledMatch = require('../models/canceled_match');
const Chat = require('../models/chat');
const RefusedUser = require('../models/refused_user');
const LikedUser = require('../models/liked_user');
const PerhapsUser = require('../models/perhaps_user');
const validation = require('../helpers/validation');
const helper = require('../helpers/helper');
const mailer = require('../helpers/mailer');
const user_handler = require('../helpers/user_handler');
const image_handler = require('../helpers/image_handler');
const config = require('../config/config.json');

exports.restoreRefusedUser = async (req, res) => {
    return restoreFromUserList(req, res, 'refused');
};

exports.restoreFavoriteUser = async (req, res) => {
    return restoreFromUserList(req, res, 'favorites');
};

const restoreFromUserList = async (req, res, caller) => {
    try{
        if(!req?.body?.restore_id){
            return res.status(500).send({message: "missing_restore_id"});
        }
        const user = req.user;
        const restore_id = req.body.restore_id;
        if(caller === 'refused'){
            await RefusedUser.updateOne({ for_user_id: user._id }, {
                $pull: {users: restore_id},
            });
            await LikedUser.updateOne({for_user_id: user._id}, {$push: {users: restore_id}}, {upsert: true});
        }
        else{
            await LikedUser.updateOne({ for_user_id: user._id }, {
                $pull: {users: restore_id},
            });
            await PerhapsUser.updateOne({ for_user_id: user._id }, {
                $pull: {users: restore_id},
            });
            await RefusedUser.updateOne({for_user_id: user._id}, {$push: {users: restore_id}}, {upsert: true});
        }
        return res.status(200).send({message: "ok"});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
}

const getListOfUsers = async (req, res, caller) => {
    try{
        const users_per_page = req?.body?.users_per_page || config.list_users_default_per_page;
        const current_page = req.body.current_page || config.list_users_default_page_number;
        const user = req.user;
        let user_list = [];
        let users_found = false;
        let nr_of_pages = 0;
        let array_with_users = [];
        if(caller === 'refused'){
            const refused = await RefusedUser.findOne({for_user_id: user._id});
            if(refused && refused?.users?.length){
                array_with_users = [...new Set(refused.users)];
            }
        }
        else{
            const liked = await LikedUser.findOne({for_user_id: user._id});
            const perhaps = await PerhapsUser.findOne({for_user_id: user._id});
            if((liked || perhaps) && (liked?.users?.length || perhaps?.users?.length)){
                const liked_user_array = liked?.users?.length ? liked.users : [];
                const perhaps_user_array = perhaps?.users?.length ? perhaps.users : [];
                const both_arrays = liked_user_array.concat(perhaps_user_array);
                array_with_users = [...new Set(both_arrays)];
            }
        }
        if(array_with_users?.length){
            const func_result = await user_handler.getUsersList(array_with_users, users_per_page, current_page);
            user_list = func_result.users_list;
            nr_of_pages = func_result.nr_of_pages;
            users_found = true;
        }
        return res.status(200).send({message: "ok", user_list: user_list, users_found: users_found, nr_of_pages: nr_of_pages});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
}

exports.getRefusedUsers = async (req, res) => {
    return getListOfUsers(req, res, 'refused');
};

exports.getFavoriteUsers = async (req, res) => {
    return getListOfUsers(req, res, 'favorites');
};

exports.getChatHistory = async (req, res) => {
    try{
        if(!req?.body?.last_created_at){
            return res.status(500).send({message: "missing_last_created_at"});
        }
        const user = req.user;
        const room = user.room;
        if(!user || !room){
            return res.status(500).send({message: "missing_room_and_user"});
        }
        const last_created_at = req.body.last_created_at;
        const messages_unordered = await Chat.find({createdAt: {$lt: new Date(last_created_at)}}).sort({createdAt: -1}).limit(10);
        if(!messages_unordered?.length){
            return res.status(200).send({message: "me", messages: []});
        }
        const messages = messages_unordered;
        const oldest_message = messages[0];
        const more_messages = await Chat.count({createdAt: {$lt: new Date(oldest_message.createdAt)}});
        return res.status(200).send({message: "me", messages: messages, more_messages: more_messages});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};

exports.unreadChatMessages = async (req, res) => {
    try{
        const user = req.user;
        const room = user.room;
        if(!user || !room){
            return res.status(500).send({message: "missing_room_and_user"});
        }
        const unread_messages = await Chat.count({room_id: room, read_at: null, to: user._id});
        return res.status(200).send({message: "ok", unread_messages: unread_messages});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};

exports.readChatMessages = async (req, res) => {
    try{
        const user = req.user;
        const room = user.room;
        if(!user || !room){
            return res.status(500).send({message: "missing_room_and_user"});
        }
        await Chat.update({room_id: room, read_at: null}, {$set: {read_at: new Date()}});
        return res.status(200).send({message: "ok"});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};

exports.getChatMessages = async (req, res) => {
    try{
        const user = req.user;
        const room = user.room;
        if(!user || !room){
            return res.status(500).send({message: "missing_room_and_user"});
        }
        const messages_unordered = await Chat.find({room_id: room}).sort({createdAt: -1}).limit(10);
        const messages = messages_unordered ? messages_unordered.reverse() : [];
        let more_messages = 0;
        if(messages?.length){
            const oldest_message = messages[0];
            more_messages = await Chat.count({createdAt: {$lt: new Date(oldest_message.createdAt)}});
        }
        return res.status(200).send({message: "me", messages: messages, more_messages: more_messages});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};

exports.publicTestImage = async (req, res) => {
    try{
        res.status(200).json({message: "publicTestImage"});
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
        const ip_address = req.socket.remoteAddress || '';

        const user = new User({
            name: req.body.name
            ,email: req.body.email
            ,password: bcrypt.hashSync(req.body.password, 8)
            ,signup_ip_address: ip_address
            ,activation_string: activation_string
        });
        const createdUser = await user.save();
        await mailer.welcomeEmail(createdUser);
        const returnUser = (({ _id,name, activation_string }) => ({ _id,name, activation_string }))(createdUser);
        await mailer.adminNewSignup(user);

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

exports.refreshToken = async (req, res) => {
    try{
        if(validation.emptyParameter(req, 'user')){
            return res.status(500).send({error: 'missing_parameter_user'});
        }
        if(validation.emptyParameter(req, 'refresh_token')){
            return res.status(500).send({error: 'missing_parameter_refresh_token'});
        }
        jwt.verify(req.body.refresh_token, process.env.REFRESH_API_SECRET, async function (err, decode) {
            if (err){
                return res.status(500).send({message: "jwt_expired"});
            }
            try{
                const user = await User.findOne({_id: req.body.user}).lean();
                req.user = user;
                const token = jwt.sign({id: user._id}, process.env.API_SECRET, {expiresIn: process.env.JWT_EXPIRATION});
                res.status(200).json({message: "refreshed", accessToken: token});
            }
            catch(exception){
                console.log("err:",err);
                console.log("exception:",exception);
                return res.status(500).send({message: "jwt_expired"});
            }
        });
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
        const token = jwt.sign({id: user._id}, process.env.API_SECRET, {expiresIn: process.env.JWT_EXPIRATION});
        const refreshToken = jwt.sign({id: user._id}, process.env.REFRESH_API_SECRET, {expiresIn: process.env.REFRESH_JWT_EXPIRATION});

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
                refreshToken: refreshToken
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
        await user_handler.manageUserClosingAccount(user);
        return res.status(200).send({message: "ok"});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};

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
        await user_handler.handleMatchCanceled(req.user._id, current_match);
        const rematches = await user_handler.checkIfCanceledUsersHaveMatch(req.user._id, current_match);

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

exports.updateMyProfile = async (req, res) => {
    try{
        const validation = await user_handler.validateStep2(req, true);
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
        const validation = await user_handler.validateStep2(req, false);
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

exports.uploadPicture = async (req, res) => {
    return image_handler.uploadPicture(req, res);
};

exports.deletePicture = async (req, res) => {
    return image_handler.deletePicture(req, res);
};

exports.getImage = async (req, res) => {
    return image_handler.getImage(req, res);
}

exports.apiToken = async (req, res) => {
    return res.status(200).send({message: "ok", user: req.user});
}

exports.addPicture = async (req, res) => {
    return user_handler.addPicture(req, res, req.user._id);
}
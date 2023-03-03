const Competition = require("../models/competition");
const LikedUser = require("../models/liked_user");
const PerhapsUser = require("../models/perhaps_user");
const RefusedUser = require("../models/refused_user");
const WinnerUser = require("../models/winner_user");
const Suggestion = require("../models/suggestion");
const Partner = require("../models/partners");
const helper = require("./helper");
const mailer = require("./mailer");
const User = require("../models/user");
const CanceledMatch = require("../models/canceled_match");
const validation = require("./validation");
const mongoose = require("mongoose");
const Region = require("../models/region");
const City = require("../models/city");
const {v4: uuidv4} = require("uuid");

exports.manageUserClosingAccount = async (user) => {
    try{
        const user_id = user._id;
        if(user?.current_match){
            const current_match = user.current_match;
            const user_current_match = await User.findOne({_id: current_match});
            if(user_current_match?._id){
                await matchCanceled(user_id, user_current_match._id);
                await matchedForCanceledUsers(user_id, user_current_match._id);
            }
        }
        if(user?.pictures?.length){
            const pictures = user.pictures;
            for await (const pic of pictures){
                try{
                    await helper.deleteImages(pic);
                }
                catch(img_exception){
                    console.log("img_exception",img_exception);
                }
            }
        }

        const where = {for_user_id: user_id};
        const where_winner_id = {winner_id: user_id};
        await Competition.deleteMany(where);
        await Suggestion.deleteMany(where);
        await LikedUser.deleteMany(where);
        await PerhapsUser.deleteMany(where);
        await RefusedUser.deleteMany(where);
        await WinnerUser.deleteMany(where);
        await WinnerUser.deleteMany(where_winner_id);

        const suggestions = await Suggestion.find({users: { $elemMatch: { user_id: user_id } }}) || [];
        if(suggestions.length){
            for await (const suggestion of suggestions){
                try{
                    if(suggestion?.users?.length === 1){
                        await Suggestion.deleteMany({_id: suggestion._id});
                    }
                    else{
                        await Suggestion.updateOne({ _id: suggestion._id }, {
                            $pull: {users: {user_id: {$in: [user_id]}}},
                        });
                    }
                }
                catch(suggestion_exception){
                    console.log("suggestion_exception",suggestion_exception);
                }
            }
        }

        const competitions = await Competition.find({users: { $elemMatch: { user_id: user_id } }}) || [];

        if(competitions.length){
            for await (const competition of competitions){
                try{
                    const where_competition_id = { _id: competition._id };
                    const pull_user = {$pull: {users: {user_id: {$in: [user_id]}}}};
                    if(competition?.users?.length === 1){
                        await Competition.deleteMany(where_competition_id);
                    }
                    else if(competition?.users?.length > 2){
                        await Competition.updateOne(where_competition_id, pull_user);
                    }
                    else if(competition?.users?.length === 2){
                        await Competition.updateOne(where_competition_id, pull_user);
                        const competition_for_user_id = competition.for_user_id;
                        console.log("competition_for_user_id",competition_for_user_id);
                        const updated_competition = await Competition.findOne(where_competition_id);
                        const last_user_id = updated_competition?.users?.length ? updated_competition.users[0].user_id : '';
                        if(last_user_id && competition_for_user_id){
                            console.log("last_user_id",last_user_id);
                            const new_winner_user_doc = {for_user_id: competition_for_user_id, winner_id: last_user_id};
                            const new_winner_user = new WinnerUser(new_winner_user_doc);
                            console.log("new_winner_user_doc:",new_winner_user_doc);
                            await new_winner_user.save();
                            await Competition.deleteMany(where_competition_id,last_user_id);
                            console.log("competition should be gone:");
                            await matchTwoUsersIfApplicable(competition_for_user_id, last_user_id);
                        }
                    }
                }
                catch(competition_exception){
                    console.log("competition_exception",competition_exception);
                }
            }
        }

        const pull_out = { $pull: { users: user_id.toString() } };
        await LikedUser.updateMany({},pull_out);
        await PerhapsUser.updateMany({},pull_out);
        await RefusedUser.updateMany({},pull_out);
        await User.deleteOne({_id: user_id});
        return true;
    }
    catch(exception){
        console.log("exception in manageUserClosingAccount:",exception);
        throw exception;
    }
}

const matchCanceled = async (user_leaving_id, user_left_id) => {
    try{
        const update_fields = {
            suggestions_completed_at: helper.date1DayAgo()
            ,current_match: null
            ,room: null
        };
        await User.updateOne({_id: user_leaving_id}, update_fields);
        await User.updateOne({_id: user_left_id}, update_fields);
        await RefusedUser.updateOne({for_user_id: user_leaving_id}, {$push: {users: user_left_id}}, {upsert: true});
        const user_leaving_id_string = user_leaving_id.toString();
        const user_left_id_string = user_left_id.toString();

        await PerhapsUser.updateOne({ for_user_id: user_leaving_id }, {
            $pull: {users: user_left_id_string},
        });
        await PerhapsUser.updateOne({ for_user_id: user_left_id }, {
            $pull: {users: user_leaving_id_string},
        });
        await LikedUser.updateOne({ for_user_id: user_leaving_id }, {
            $pull: {users: user_left_id_string},
        });
        await LikedUser.updateOne({ for_user_id: user_left_id }, {
            $pull: {users: user_leaving_id_string},
        });

        await WinnerUser.deleteMany({for_user_id: user_leaving_id, winner_id: user_left_id});
        await WinnerUser.deleteMany({for_user_id: user_left_id, winner_id: user_leaving_id});

        await Partner.deleteMany({users: { $elemMatch: {$eq: user_leaving_id} }});

        const canceled_match = new CanceledMatch({for_user_id: user_left_id, canceling_id: user_leaving_id});
        await canceled_match.save();
    }
    catch(exception){
        throw exception;
    }
}

exports.handleMatchCanceled = async (user_leaving_id, user_left_id) => {
    try{
        await matchCanceled(user_leaving_id, user_left_id);
    }
    catch(exception){
        throw exception;
    }
}

const getRematchedForUser = async (user_id) => {
    try{
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
    catch(exception){
        throw exception;
    }
}

exports.exposeMatchTwoUsersIfApplicable = async (user_id_1, user_id_2) => {
    try{
      await matchTwoUsersIfApplicable(user_id_1, user_id_2);
    }
    catch(exception){
        throw exception;
    }
}

const matchTwoUsersIfApplicable = async (user_id_1, user_id_2) => {
    try{
        const user1 = await User.findOne({_id: user_id_1});
        if(!user1 || user1?.current_match){
            console.log("false on user1?.current_match");
            return false;
        }
        const user2 = await User.findOne({_id: user_id_2});
        if(!user2 || user2?.current_match){
            console.log("false on user2?.current_match");
            return false;
        }
        const partners = new Partner({users: [user_id_1, user_id_2]});
        await partners.save();
        const room = uuidv4();
        await User.updateOne({_id: user_id_1}, {$set: {current_match: user_id_2, room: room}});
        if(user1?.notify_new_match){
            console.log("send mail for match");
            await mailer.newMatchEmail(user1);
        }
        await User.updateOne({_id: user_id_2}, {$set: {current_match: user_id_1, room: room}});
        if(user2?.notify_new_match){
            await mailer.newMatchEmail(user2);
            console.log("send mail for match");
        }

        return true;
    }
    catch(exception){
        throw exception;
    }
}

const matchedForCanceledUsers = async (user_leaving_id, user_left_id) => {
    try{
        const data = {rematch_user_1: null,rematch_user_2: null};

        const match_for_user_leaving = await getRematchedForUser(user_leaving_id);
        //There is a new match already for user_leaving_id
        if(match_for_user_leaving){
            const could_match = await matchTwoUsersIfApplicable(user_leaving_id, match_for_user_leaving._id);
            if(could_match){
                data.rematch_user_1 = match_for_user_leaving._id;
            }
        }

        const match_for_user_left = await getRematchedForUser(user_left_id);
        //There is a new match already for user_left_id
        if(match_for_user_left){
            const could_match = await matchTwoUsersIfApplicable(user_left_id, match_for_user_left._id);
            if(could_match){
                data.rematch_user_2 = match_for_user_left._id;
            }
        }
        return data;
    }
    catch(exception){
        throw exception;
    }
}

exports.checkIfCanceledUsersHaveMatch = async (user_leaving_id, user_left_id) => {
    try{
        return await matchedForCanceledUsers(user_leaving_id, user_left_id);
    }
    catch(exception){
        throw exception;
    }
}
exports.validateStep2 = async (req, validate_name = false) => {
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
        errors.push(exception);
        return {errors: errors, set: set};
    }
}

exports.getUsersList = async (arr_users, users_per_page, current_page) => {
    arr_users.reverse();
    const nr_of_pages = Math.ceil(arr_users.length/users_per_page);
    const users_list = [];
    const start = (current_page-1)*users_per_page;
    const end = current_page*users_per_page;
    const sliced_array = arr_users.slice(start, end);
    for await (const user_id of sliced_array){
        try{
            const found = await getPublicUserFields(user_id);
            if(found){
                users_list.push(found);
            }
        }
        catch(exception){
            console.log("exception",exception);
        }
    }
    return {users_list: users_list, nr_of_pages: nr_of_pages}
}

exports.getUserPublicFields = async (id) => {
    return getPublicUserFields(id);
}

const getPublicUserFields = async (id) => {
    try{
        const user = await User.findOne({_id: id}).lean();
        if(!user){
            return null;
        }
        const region_name = await Region.findOne({_id: user.region});
        if(region_name){
            user.region_name = region_name.name;
        }
        const city_name = await City.findOne({_id: user.city});
        if(city_name){
            user.city_name = city_name.name;
        }
        delete user.password;
        delete user.activation_string;
        delete user.is_paying_user;
        return user;
    }
    catch(exception){
        console.log(exception);
    }
}

exports.addPicture = async (req, res, user_id) => {
    try{
        const filename = req.body.filename;
        if(!filename){
            return res.status(500).send({error: "missing_filename"});
        }
        await User.updateOne({_id: user_id},  {$addToSet: {"pictures": [req.body.filename]}});
        const foundUser = await User.findOne({_id: user_id});
        const pictures = foundUser.pictures;
        await User.updateOne({_id: user_id},  {$set: {"current_step": "done", "status": "complete"}});
        return res.status(200).send({message: "addPicture", pictures: pictures});
    }
    catch(exception){
        return res.status(500).send({error: exception});
    }
}

exports.deletePicture = async (req, res, user_id, picture_id) => {
    try{
        const foundUser = await User.find({_id: user_id, pictures: { $elemMatch: {$eq: picture_id} }});
        if(!foundUser.length){
            return res.status(500).json({error: 'image_not_found'});
        }
        const deleteResult = await User.updateOne({ _id: user_id }, {
            $pullAll: {pictures: [picture_id]},
        });
        if(!deleteResult.acknowledged){
            return res.status(500).json({error: 'something_went_wrong'});
        }
        return res.status(200).send({message: "ok"});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};

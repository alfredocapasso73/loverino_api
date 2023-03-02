const config = require('../config/config.json');
const User = require("../models/user");
const Suggestion = require('../models/suggestion');
const SuggestionUser = require('../models/suggestion_user');
const RefusedUser = require('../models/refused_user');
const WinnerUser = require('../models/winner_user');
const mongoose = require("mongoose");
const helper = require('../helpers/helper');

const generateSuggestions = async (user) => {
    try{
        const min_age_as_birthday = helper.birthdayFromAge(user.search_min_age);
        const max_age_as_birthday = helper.birthdayFromAge(user.search_max_age);
        const user_age = helper.ageFromBirthday(user.birthday);

        const where = {};
        if(user.search_gender !== 'a'){
            where.gender = user.search_gender;
        }
        if(user.search_distance !== 'all'){
            where.region = user.region;
        }
        where.$and = [{'$or': [{search_distance: 'all'}, {region: user.region}]}, {'$or': [{search_gender: user.gender}, {search_gender: 'a'}]}];
        where.birthday = {
            '$lte': min_age_as_birthday
            ,'$gte': max_age_as_birthday
        };
        where.search_min_age = {"$lte": user_age};
        where.search_max_age = {"$gte": user_age};
        let array_of_ids_to_remove = [];
        array_of_ids_to_remove.push(user._id);

        const users_i_refused = await RefusedUser.findOne({for_user_id: user._id});
        if(users_i_refused && users_i_refused.users){
            array_of_ids_to_remove = array_of_ids_to_remove.concat(users_i_refused.users);
        }
        /*
        If we include the users that refused me, there will be too few suggestions
        Maybe we can wait before implementing this
        For now we only remove those that I refused
         */

        const my_winner_users = await WinnerUser.find({for_user_id: user._id});
        if(my_winner_users && my_winner_users.length){
            const winners = my_winner_users.map(el => el.winner_id);
            array_of_ids_to_remove = array_of_ids_to_remove.concat(winners);
        }

        where._id = {"$nin": array_of_ids_to_remove};

        console.log("where",JSON.stringify(where));
        //Just in case aggregate would not work...
        //const results = await User.find(where).limit(config.max_number_of_suggestion).lean();
        const results = await User.aggregate([{ $match: where },{ $sample: { size: config.max_number_of_suggestion } }]);
        return results;
    }
    catch(exception){
        console.log(`Could not generate suggestions: ${exception}`);
    }
}

const getMinutesForNextSuggestions = (suggestions_completed_at, is_paying_user) => {
    if(!suggestions_completed_at){
        return undefined;
    }

    const number_of_minutes = is_paying_user ? config.number_of_minutes_between_suggestions_for_paying_users : config.number_of_minutes_between_suggestions;
    const date_next_suggestion = helper.addMinutes(suggestions_completed_at, number_of_minutes);
    const ms_difference =  new Date(date_next_suggestion) - new Date();
    const seconds = Math.floor(ms_difference/1000);
    const minutes = Math.floor(ms_difference/1000/60);
    console.log("ms_difference",ms_difference);
    console.log("seconds",seconds);
    console.log("minutes",minutes);
    if(minutes < 0){
        return undefined;
    }
    return minutes;
}

exports.getSuggestionsForUser = async (user) => {
    const json = {};
    json.suggestions = [];
    json.new_suggestions = false;
    if(!(user instanceof User)){
        json.error = "not_an_instance_of_user";
        return json;
    }
    if(!(user.active) || (user.status !== 'complete')){
        json.error = "user_not_active_yet";
        return json;
    }
    if(user.current_match){
        json.error = "currently_in_a_match";
        return json;
    }
    let found_suggestions = await Suggestion.findOne({for_user_id: user._id}).lean();
    if(found_suggestions && found_suggestions.status === 'voted'){
        json.error = "all_users_voted";
        return json;
    }
    const next_suggestion_possible_within_minutes = getMinutesForNextSuggestions(user.suggestions_completed_at, user.is_paying_user);
    if(next_suggestion_possible_within_minutes !== undefined){
        json.error = "wait_until_next_suggestion";
        json.next_suggestion_possible_within_minutes = next_suggestion_possible_within_minutes;
        return json;
    }


    if(!found_suggestions){
        let suggestions = await generateSuggestions(user);
        if(suggestions.length){
            const found_users = [];
            suggestions.map(el => {
                found_users.push(new SuggestionUser({user_id: el._id}));
            });
            const doc = {
                for_user_id: user._id
                ,created: new Date()
                ,users: found_users
            };
            found_suggestions = new Suggestion(doc);
            await found_suggestions.save();
            json.new_suggestions = true;
        }
    }
    json.suggestions.push(found_suggestions);
    return json;
}
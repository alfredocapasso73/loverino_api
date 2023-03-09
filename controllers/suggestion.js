const User = require("../models/user");
const Suggestion = require("../models/suggestion");
const SuggestionEngine = require('../suggestion/SuggestionEngine');
const mongoose = require("mongoose");
const LikedUser = require('../models/liked_user');
const PerhapsUser = require('../models/perhaps_user');
const RefusedUser = require('../models/refused_user');
const Competition = require('../models/competition');
const ArchivedCompetition = require('../models/archived_competition');
const CompetitionUser = require('../models/competition_user');
const WinnerUser = require('../models/winner_user');
const ArchivedSuggestion = require('../models/archived_suggestion');
const City = require("../models/city");
const { v4: uuidv4 } = require('uuid');
const suggestion_handler = require('../helpers/suggestion_handler');
const user_handler = require('../helpers/user_handler');

exports.getCompetition = async (req, res) => {
    try{
        const user = await User.findOne({_id: req.user._id});
        const found_competition = await Competition.find({for_user_id: user._id, status: {"$ne": 'ended'}});
        if(!found_competition.length){
            return res.status(200).send({error: "no_current_competition"});
            //return res.status(500).send({error: 'no_current_competition'});
        }
        return res.status(200).send({message: "ok", users: found_competition[0].users, competition_id: found_competition[0]._id, competition_status: found_competition[0].status});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({error: exception});
    }
};

exports.getWinners = async (req, res) => {
    try{
        const user = await User.findOne({_id: req.user._id});
        const found_winners = await WinnerUser.find({for_user_id: user._id});
        if(!found_winners.length){
            return res.status(200).send({message: 'ok', winners: found_winners});
        }
        return res.status(200).send({message: "ok", winners: found_winners});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({error: exception});
    }
};

exports.getSuggestions = async (req, res) => {
    try{
        const user = await User.findOne({_id: req.user._id});
        const suggestion_result = await SuggestionEngine.getSuggestionsForUser(user);
        if(suggestion_result.error){
            const next_suggestion_possible_within_minutes =
                suggestion_result.next_suggestion_possible_within_minutes ?
                    suggestion_result.next_suggestion_possible_within_minutes : '';
            return res.status(200).send(
                {
                    error: suggestion_result.error
                    , next_suggestion_possible_within_minutes: next_suggestion_possible_within_minutes
                });
        }
        let suggestions = suggestion_result.suggestions.length ? suggestion_result.suggestions[0] : null;
        const return_users = [];
        if(suggestions?.users?.length){
            const users = suggestions.users;
            for await(const tmp_user of users){
                try{
                    const found = await user_handler.getUserPublicFields(tmp_user.user_id);
                    if(found){
                        const city_name = await City.findOne({_id: found.city});
                        if(city_name){
                            found.city_name = city_name.name;
                        }
                        tmp_user.data = found;
                        return_users.push(tmp_user);
                    }
                }
                catch(sugegstion_exception){
                    console.log("sugegstion_exception",sugegstion_exception);
                }
            }
            suggestions.users = return_users;
        }
        return res.status(200).send(
            {
                message: "ok"
                , suggestions: suggestions
                //, suggestions: return_suggestions
                , new_suggestions: suggestion_result.new_suggestions
            });
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({error: exception});
    }
};

const votingIsInvalid = async (req) => {
    if(!req.body.suggestion_id || !mongoose.isObjectIdOrHexString(req.body.suggestion_id)){
        return 'missing_param_suggestion_id';
    }
    if(!req.body.voted_user_id || !mongoose.isObjectIdOrHexString(req.body.voted_user_id)){
        return 'missing_param_voted_user_id';
    }
    if(!['y', 'm', 'n'].includes(req.body.vote)){
        return 'invalid_vote_string';
    }
    return '';
}

exports.voteSuggestion = async (req, res) => {
    try{
        const user = await User.findOne({_id: req.user._id});
        const invalidVoting = await votingIsInvalid(req);
        if(invalidVoting){
            return res.status(500).send({error: invalidVoting});
        }
        const suggestion_id = req.body.suggestion_id;
        const for_user_id = mongoose.Types.ObjectId(req.user._id).valueOf();
        const voted_user_id = req.body.voted_user_id;
        const vote = req.body.vote;
        const suggestion_json_filter = {_id: suggestion_id, for_user_id: for_user_id, "users.user_id": voted_user_id};

        if(mongoose.Types.ObjectId(user._id).valueOf() !== for_user_id){
            return res.status(500).send({error: 'wrong_user_id'});
        }


        const found = await Suggestion.findOne(suggestion_json_filter);
        //console.log('suggestion_json_filter',suggestion_json_filter);
        if(!found){
            return res.status(500).send({error: 'row_not_found'});
        }
        const json_filter = {for_user_id: for_user_id};
        const json_update = {$push: {users: voted_user_id}};
        const json_options = {upsert: true};

        let user_status_in_suggestion = '';
        //alfio
        switch(vote){
            case 'y':
                await LikedUser.updateOne(json_filter, json_update, json_options);
                await Competition.updateOne(json_filter, {$push: {users: new CompetitionUser({user_id: voted_user_id})}}, json_options);
                user_status_in_suggestion = 'liked';
                break;
            case 'n':
                await RefusedUser.updateOne(json_filter, json_update, json_options);
                await PerhapsUser.updateOne({ for_user_id: for_user_id }, {$pull: {users: voted_user_id}});
                await LikedUser.updateOne({ for_user_id: for_user_id }, {$pull: {users: voted_user_id}});
                user_status_in_suggestion = 'refused';
                break;
            default:
                await PerhapsUser.updateOne(json_filter, json_update, json_options);
                await Competition.updateOne(json_filter, {$push: {users: new CompetitionUser({user_id: voted_user_id})}}, json_options);
                user_status_in_suggestion = 'perhaps';
                break;
        }

        await Suggestion.updateOne(suggestion_json_filter, {$set: {'users.$.status': user_status_in_suggestion}})
        const found_again = await Suggestion.findOne(suggestion_json_filter);
        const found_unread = found_again.users.filter(el => el.status === 'unread');

        let you_got_a_match = undefined;
        let winner = undefined;

        if(!found_unread.length){
            found_again.status = 'voted';
            await found_again.save();
            const found_competition = await Competition.findOne({for_user_id: for_user_id, status: {"$ne": 'ended'}});
            if(!found_competition || found_competition.users.length === 1){
                await setCompetitionCompleted(for_user_id);
                if(found_competition && found_competition.users.length === 1){
                    await setWinner(for_user_id, found_competition.users[0].user_id);
                    winner = await user_handler.getUserPublicFields(found_competition.users[0].user_id);
                    await Competition.updateOne({_id: found_competition._id}, {status: 'ended', "$set": {"users[0].status": "won"}});
                    await setCompetitionArchived(found_competition._id);
                    you_got_a_match = await checkIfMatch(req);
                }
            }
            else if(found_competition && found_competition.users.length > 1){
                await Competition.updateOne({_id: found_competition._id}, {status: 'in_progress'});
            }
        }
        return res.status(200).send({message: "ok", winner: winner, you_got_a_match: you_got_a_match});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({error: exception});
    }
};

const checkIfMatch = async (req) => {
    try{
        const user_id = req.user._id;
        const user = await User.findOne({_id: user_id});
        if(!user){
            console.log(`ERROR: checkIfMatch called with wrong user id: ${user_id}`);
            return undefined;
        }
        if(user.current_match){
            console.log(`Already have a match. No need for further investigation.`);
            return undefined;
        }
        const set_me_as_a_winner = await WinnerUser.find({winner_id: user_id});
        const users_that_like_me = [];
        set_me_as_a_winner.map(el => {users_that_like_me.push(el.for_user_id)});
        const my_winners = await WinnerUser.find({for_user_id: user_id, winner_id: {"$in": users_that_like_me}});
        if(!my_winners.length){
            //console.log(`No current liked users. No chances to have a match.`);
            return undefined;
        }

        const both_like_each_other = [];
        my_winners.map(el => {both_like_each_other.push(el.winner_id)});

        const found_matches = await User.find({_id: {"$in": both_like_each_other}, current_match: null});
        if(!found_matches.length){
            console.log(`No matches found for user_id ${user_id}`);
            return undefined;
        }
        const found_match = found_matches[0];
        await user_handler.exposeMatchTwoUsersIfApplicable(user_id, found_match._id);

        return found_match._id;
    }
    catch(exception){
        console.log(exception);
    }
}

const setWinner = async (for_user_id, winner_id) => {
    await suggestion_handler.setWinner(for_user_id, winner_id);
    /*try{
        const winner = new WinnerUser({for_user_id: for_user_id, winner_id: winner_id});
        await winner.save();
    }
    catch(exception){
        console.log('exception:',exception);
    }*/
}

const setCompetitionCompleted = async (for_user_id) => {
    await suggestion_handler.setCompetitionCompleted(for_user_id);
    /*try{
        await User.updateOne({_id: for_user_id}, {suggestions_completed_at: new Date()});
        await Suggestion.updateOne({for_user_id: for_user_id, "status": "voted"}, {status: "ended"});
        const suggestion_copy = await Suggestion.findOne({for_user_id: for_user_id, "status": "ended"}).lean();
        const suggestion_id = suggestion_copy._id;
        delete suggestion_copy._id;
        delete suggestion_copy.__v;
        const archived_suggestion = new ArchivedSuggestion(suggestion_copy);
        await archived_suggestion.save();
        await Suggestion.deleteOne({_id: suggestion_id});
    }
    catch(exception){
        console.log('exception:',exception);
    }*/
}

const setCompetitionArchived = async (competition_id) => {
    await suggestion_handler.setCompetitionArchived(competition_id);
    /*try{
        const competition_copy = await Competition.findOne({_id: competition_id}).lean();
        delete competition_copy._id;
        delete competition_copy.__v;
        const archived_competition = new ArchivedCompetition(competition_copy);
        await archived_competition.save();
        await Competition.deleteOne({_id: competition_id});
    }
    catch(exception){
        console.log('exception:',exception);
    }*/
}

exports.postCompetition = async (req, res) => {
    try{
        if(!req.body.competition_id || !mongoose.isObjectIdOrHexString(req.body.competition_id)){
            return res.status(500).send({error: 'missing_param_competition_id'});
        }
        const competition_id = req.body.competition_id;

        if(!req.body.winner_id || !mongoose.isObjectIdOrHexString(req.body.winner_id)){
            return res.status(500).send({error: 'missing_param_user_id'});
        }
        const winner_id = req.body.winner_id;

        const competition = await Competition.findOne({_id: competition_id, "users.user_id": winner_id});
        if(!competition){
            return res.status(500).send({error: 'competition_not_found'});
        }
        let users = [];
        competition.users.map(el => {
            if(mongoose.Types.ObjectId(el.user_id).valueOf() === winner_id){
                el.status = 'won';
            }
            else{
                el.status = 'lost';
            }
            users.push(el);
        });

        await setWinner(req.user._id, winner_id);
        await Competition.updateOne({_id: competition_id}, {status: 'ended', "$set": {"users": users}});
        await setCompetitionCompleted(req.user._id);
        await setCompetitionArchived(competition_id);
        const you_got_a_match = await checkIfMatch(req);

        return res.status(200).send({message: "ok", you_got_a_match: you_got_a_match});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({error: exception});
    }
};
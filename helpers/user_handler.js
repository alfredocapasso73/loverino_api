const Competition = require("../models/competition");
const LikedUser = require("../models/liked_user");
const PerhapsUser = require("../models/perhaps_user");
const RefusedUser = require("../models/refused_user");
const WinnerUser = require("../models/winner_user");
const Suggestion = require("../models/suggestion");

exports.manageUserClosingAccount = async (user_id) => {
    try{
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
                if(suggestion?.users?.length === 1){
                    await Suggestion.deleteMany({_id: suggestion._id});
                }
                else{
                    await Suggestion.updateOne({ _id: suggestion._id }, {
                        $pull: {users: {user_id: {$in: [user_id]}}},
                    });
                }
            }
        }

        const competitions = await Competition.find({users: { $elemMatch: { user_id: user_id } }}) || [];
        if(competitions.length){
            for await (const competition of competitions){
                if(competition?.users?.length === 1){
                    await Competition.deleteMany({ _id: competition._id });
                }
                else{
                    await Competition.updateOne({ _id: competition._id }, {
                        $pull: {users: {user_id: {$in: [user_id]}}},
                    });
                }
            }
        }
        const pull_out = { $pull: { users: user_id.toString() } };
        console.log("are we here?",pull_out);
        await LikedUser.updateMany({},pull_out);
        console.log("probably LikedUser.updateMany");
        await PerhapsUser.updateMany({},pull_out);

        await RefusedUser.updateMany({},pull_out);
        return true;
    }
    catch(exception){
        throw exception;
    }
}

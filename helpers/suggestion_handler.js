const User = require("../models/user");
const Suggestion = require("../models/suggestion");
const ArchivedSuggestion = require("../models/archived_suggestion");
const Competition = require("../models/competition");
const ArchivedCompetition = require("../models/archived_competition");
const WinnerUser = require("../models/winner_user");


exports.setCompetitionCompleted = async (for_user_id) => {
    try{
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
    }
}

exports.setCompetitionArchived = async (competition_id) => {
    try{
        const competition_copy = await Competition.findOne({_id: competition_id}).lean();
        delete competition_copy._id;
        delete competition_copy.__v;
        const archived_competition = new ArchivedCompetition(competition_copy);
        await archived_competition.save();
        await Competition.deleteOne({_id: competition_id});
    }
    catch(exception){
        console.log('exception:',exception);
    }
}

exports.setWinner = async (for_user_id, winner_id) => {
    try{
        const winner = new WinnerUser({for_user_id: for_user_id, winner_id: winner_id});
        await winner.save();
    }
    catch(exception){
        console.log('exception:',exception);
    }
}

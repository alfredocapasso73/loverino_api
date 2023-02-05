const mongoose = require("mongoose");
require("dotenv").config();
const Suggestion = require('../models/suggestion');
const User = require('../models/user');
const testHelper = require('../test-helper/helper');
const helper = require('../helpers/helper');
let firstManToken, firstManUser, secondTestUser, currentRequesterToken = undefined;
let suggestions_json = {};
let suggestion_fake = new Suggestion();


beforeAll(async () => {
    await testHelper.beforeAll();
    const data = await testHelper.createStartUsers();
    firstManToken = data.firstManToken;
    firstManUser = data.firstManUser;
    secondTestUser = data.secondTestUser;
});

afterAll(async () => {
    await testHelper.resetDatabase();
    await mongoose.connection.close();
});

const prepareSuggestion = async () => {
    await testHelper.resetDatabase();
    const data = await testHelper.createStartUsers();
    firstManToken = data.firstManToken;
    firstManUser = data.firstManUser;
    secondTestUser = data.secondTestUser;
    const res = await testHelper.makeGetSuggestionsRequest(firstManToken);
    testHelper.expectRequestSuccess(res);
    testHelper.expectGetSuggestionsSuccess(res, true);
    suggestions_json = await testHelper.setInitialSuggestions(firstManUser._id);
}

describe(`Vote Single Suggestion`, () => {
    it("should fail if suggestion_id is incorrect", async () => {
        await testHelper.setUserField(firstManUser, 'suggestions_completed_at', helper.date9HoursAgo());
        const res2 = await testHelper.makeGetSuggestionsRequest(firstManToken);
        testHelper.expectRequestSuccess(res2);
        testHelper.expectGetSuggestionsSuccess(res2, true, true);
        suggestions_json = await testHelper.setInitialSuggestions(firstManUser._id);
        const res = await testHelper.makeVoteRequest('', '', '', '', firstManToken);
        testHelper.expectRequestFailure(res, 'missing_param_suggestion_id');
    });
    it("should fail if for_user_id is incorrect", async () => {
        const res = await testHelper.makeVoteRequest(suggestions_json.suggestion_id_1, '', '', '', firstManToken);
        testHelper.expectRequestFailure(res, 'missing_param_voted_user_id');
    });
    it("should fail if voted_user_id is incorrect", async () => {
        const res = await testHelper.makeVoteRequest(suggestions_json.suggestion_id_1, suggestions_json.for_user_id_1, '', '', firstManToken);
        testHelper.expectRequestFailure(res, 'missing_param_voted_user_id');
    });
    it("should fail if vote string is incorrect", async () => {
        const res = await testHelper.makeVoteRequest(suggestions_json.suggestion_id_1, suggestions_json.for_user_id_1, suggestions_json.voted_user_id_1, 'x', firstManToken);
        testHelper.expectRequestFailure(res, 'invalid_vote_string');
    });
    it("should fail if suggestion does not exist", async () => {
        const res = await testHelper.makeVoteRequest(suggestion_fake._id, suggestion_fake._id, suggestions_json.voted_user_id_1, 'y', firstManToken);
        testHelper.expectRequestFailure(res, 'row_not_found');
    });
    it("should fail if user_id does not exist", async () => {
        const res = await testHelper.makeVoteRequest(suggestions_json.suggestion_id_1, suggestions_json.for_user_id_1, suggestion_fake._id, 'y', firstManToken);
        testHelper.expectRequestFailure(res, 'row_not_found');
    });
    it("should succeed if all parameters are correct when voting yes", async () => {
        const res = await testHelper.makeVoteRequest(suggestions_json.suggestion_id_1, suggestions_json.for_user_id_1, suggestions_json.voted_user_id_1, 'y', firstManToken);
        testHelper.expectRequestSuccess(res);
        await testHelper.shouldHaveStatusInSuggestion(suggestions_json.suggestion_id_1, suggestions_json.for_user_id_1, suggestions_json.voted_user_id_1, 'liked');
        //await testHelper.shouldBeInLiked(suggestions_json.for_user_id_1, suggestions_json.voted_user_id_1);
    });
    it("should have 2 liked users when voting yes", async () => {
        const res = await testHelper.makeVoteRequest(suggestions_json.suggestion_id_1, suggestions_json.for_user_id_1, suggestions_json.voted_user_id_2, 'y', firstManToken);
        testHelper.expectRequestSuccess(res);
        await testHelper.shouldHaveStatusInSuggestion(suggestions_json.suggestion_id_1, suggestions_json.for_user_id_1, suggestions_json.voted_user_id_2, 'liked');
        await testHelper.shouldHaveNrOfUsersInLiked(suggestions_json.for_user_id_1, 2);
    });
    it("should have 1 user in Perhaps when voting maybe", async () => {
        const res = await testHelper.makeVoteRequest(suggestions_json.suggestion_id_1, suggestions_json.for_user_id_1, suggestions_json.voted_user_id_3, 'm', firstManToken);
        testHelper.expectRequestSuccess(res);
        await testHelper.shouldHaveStatusInSuggestion(suggestions_json.suggestion_id_1, suggestions_json.for_user_id_1, suggestions_json.voted_user_id_3, 'perhaps');
        await testHelper.shouldHaveNrOfUsersInPerhaps(suggestions_json.for_user_id_1, 1);
    });
    it("should have 1 user in Refused when voting no", async () => {
        const res = await testHelper.makeVoteRequest(suggestions_json.suggestion_id_1, suggestions_json.for_user_id_1, suggestions_json.voted_user_id_4, 'n', firstManToken);
        testHelper.expectRequestSuccess(res);
        await testHelper.shouldHaveStatusInSuggestion(suggestions_json.suggestion_id_1, suggestions_json.for_user_id_1, suggestions_json.voted_user_id_4, 'refused');
        await testHelper.shouldHaveNrOfUsersInRefused(suggestions_json.for_user_id_1, 1);
    });
});

describe(`GET Voting is over`, () => {
    it("should get error message because all the users in suggestion have received a vote", async () => {
        const res = await testHelper.makeGetSuggestionsRequest(firstManToken);
        testHelper.expectRequestFailure(res, 'all_users_voted', 200);
    });
});

describe(`Vote OK for nobody`, () => {
    it("should get error no_current_competition if voted 'no' to everybody", async () => {
        await prepareSuggestion();
        const vote1 = await testHelper.makeVoteRequest(suggestions_json.suggestion_id_1, suggestions_json.for_user_id_1, suggestions_json.voted_user_id_1, 'n', firstManToken);
        testHelper.expectRequestSuccess(vote1);
        const users = [
            {id: suggestions_json.voted_user_id_2, vote: 'n'}
            ,{id: suggestions_json.voted_user_id_3, vote: 'n'}
            ,{id: suggestions_json.voted_user_id_4, vote: 'n'}
            ,{id: suggestions_json.voted_user_id_5, vote: 'n'}
        ];
        await testHelper.batchVoteRequest(suggestions_json.suggestion_id_1, suggestions_json.for_user_id_1, users, firstManToken);
        const no_competition = await testHelper.makeGetCompetitionRequest(firstManToken);
        testHelper.expectRequestFailure(no_competition, 'no_current_competition', 200);
    });

    it("should error when trying to get new suggestions", async () => {
        const res = await testHelper.makeGetSuggestionsRequest(firstManToken);
        testHelper.expectRequestFailure(res, 'wait_until_next_suggestion', 200);
        testHelper.expectGetSuggestionsFailure(res, 'wait_until_next_suggestion', true);
    });
});

describe(`Vote OK for only one person`, () => {
    it("should get error no_current_competition if voted OK only for one user", async () => {
        await prepareSuggestion();
        const users = [
            {id: suggestions_json.voted_user_id_1, vote: 'y'}
            ,{id: suggestions_json.voted_user_id_2, vote: 'n'}
            ,{id: suggestions_json.voted_user_id_3, vote: 'n'}
            ,{id: suggestions_json.voted_user_id_4, vote: 'n'}
        ];
        await testHelper.batchVoteRequest(suggestions_json.suggestion_id_1, suggestions_json.for_user_id_1, users, firstManToken);
        const no_competition = await testHelper.makeGetCompetitionRequest(firstManToken);
        testHelper.expectRequestFailure(no_competition, 'no_current_competition', 200);
    });
    it("should error when trying to get new suggestions", async () => {
        const res = await testHelper.makeGetSuggestionsRequest(firstManToken);
        testHelper.expectRequestFailure(res, 'wait_until_next_suggestion', 200);
        testHelper.expectGetSuggestionsFailure(res, 'wait_until_next_suggestion', true);
    });
    it("should call the winner endpoint and assure it contains the user that won previously", async () => {
        const res = await testHelper.makeGetWinnersRequest(firstManToken);
        testHelper.expectRequestSuccess(res);
        const winner = res.body.winners[0];
        expect(winner.winner_id).toBe(mongoose.Types.ObjectId(suggestions_json.voted_user_id_1).valueOf());
    });
});

describe(`Voting user getting a match when only voting yes for one user`, () => {
    it("should update the match field for both users", async () => {
        await prepareSuggestion();
        const users = [
            {id: suggestions_json.voted_user_id_1, vote: 'y'}
            ,{id: suggestions_json.voted_user_id_2, vote: 'n'}
            ,{id: suggestions_json.voted_user_id_3, vote: 'n'}
            ,{id: suggestions_json.voted_user_id_4, vote: 'n'}
        ];
        await testHelper.batchVoteRequest(suggestions_json.suggestion_id_1, suggestions_json.for_user_id_1, users, firstManToken);
        const voting_user_id = suggestions_json.voted_user_id_1;
        currentRequesterToken = await testHelper.getTokenById(voting_user_id);
        await testHelper.setArbitrarySuggestions(voting_user_id, [secondTestUser._id, firstManUser._id]);
        const suggestions = await Suggestion.findOne({for_user_id: voting_user_id});
        const vote1 = await testHelper.makeVoteRequest(suggestions._id, voting_user_id, secondTestUser._id, 'n', currentRequesterToken);
        testHelper.expectRequestSuccess(vote1);
        const vote2 = await testHelper.makeVoteRequest(suggestions._id, voting_user_id, firstManUser._id, 'y', currentRequesterToken);
        testHelper.expectRequestSuccess(vote2);
        testHelper.expectYouGotAMatch(vote2, firstManUser._id);
        const res_winner = await testHelper.makeGetWinnersRequest(currentRequesterToken);
        testHelper.expectRequestSuccess(res_winner);
        const winner = res_winner.body.winners[0];
        expect(winner.winner_id).toBe(mongoose.Types.ObjectId(firstManUser._id).valueOf());
        await testHelper.expectThereIsAMatch(firstManUser._id, voting_user_id, firstManToken, currentRequesterToken);
    });
    it("should NOT update the match field for both users as user1 already has a match", async () => {
        const voting_user_id = suggestions_json.voted_user_id_2;
        currentRequesterToken = await testHelper.getTokenById(voting_user_id);
        await testHelper.setArbitrarySuggestions(voting_user_id, [secondTestUser._id, firstManUser._id]);
        const suggestions = await Suggestion.findOne({for_user_id: voting_user_id});
        const vote1 = await testHelper.makeVoteRequest(suggestions._id, voting_user_id, secondTestUser._id, 'n', currentRequesterToken);
        testHelper.expectRequestSuccess(vote1);
        const vote2 = await testHelper.makeVoteRequest(suggestions._id, voting_user_id, firstManUser._id, 'y', currentRequesterToken);
        testHelper.expectRequestSuccess(vote2);
        const res_winner = await testHelper.makeGetWinnersRequest(currentRequesterToken);
        testHelper.expectRequestSuccess(res_winner);
        const winner = res_winner.body.winners[0];
        expect(winner.winner_id).toBe(mongoose.Types.ObjectId(firstManUser._id).valueOf());
        await testHelper.expectThereIsNotAMatch(firstManUser._id, voting_user_id, firstManToken, currentRequesterToken);
    });
    it("should return error when trying to get suggestion (as user already has a match)", async () => {
        const res = await testHelper.makeGetSuggestionsRequest(firstManToken);
        testHelper.expectRequestFailure(res, "currently_in_a_match", 200);
    });
    it("should not have a current competition", async () => {
        const no_competition = await testHelper.makeGetCompetitionRequest(firstManToken);
        testHelper.expectRequestFailure(no_competition, 'no_current_competition', 200);
    });
});
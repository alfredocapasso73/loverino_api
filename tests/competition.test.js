const mongoose = require("mongoose");
require("dotenv").config();
const User = require('../models/user');
const testHelper = require('../test-helper/helper');
const helper = require('../helpers/helper');
const Suggestion = require("../models/suggestion");
let firstManToken, firstManUser, secondTestUser, currentRequesterToken = undefined;
let successfulCompetitionId = undefined;
let suggestions_json = {};

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

describe(`GET current competition before any was created`, () => {
    it("should get error message because no competition has been created yet", async () => {
        const res = await testHelper.makeGetCompetitionRequest(firstManToken);
        testHelper.expectRequestFailure(res, 'no_current_competition', 200);
    });
});

describe(`GET current competition after it was created`, () => {
    it("should get info about competition", async () => {
        await testHelper.setUserField(firstManUser, 'suggestions_completed_at', helper.date9HoursAgo());
        const res2 = await testHelper.makeGetSuggestionsRequest(firstManToken);
        testHelper.expectRequestSuccess(res2);
        testHelper.expectGetSuggestionsSuccess(res2, true, true);
        suggestions_json = await testHelper.setInitialSuggestions(firstManUser._id);

        await testHelper.makeVoteRequest(suggestions_json.suggestion_id_1, suggestions_json.for_user_id_1, suggestions_json.voted_user_id_1, 'y', firstManToken);
        await testHelper.makeVoteRequest(suggestions_json.suggestion_id_1, suggestions_json.for_user_id_1, suggestions_json.voted_user_id_2, 'y', firstManToken);
        await testHelper.makeVoteRequest(suggestions_json.suggestion_id_1, suggestions_json.for_user_id_1, suggestions_json.voted_user_id_3, 'n', firstManToken);
        await testHelper.makeVoteRequest(suggestions_json.suggestion_id_1, suggestions_json.for_user_id_1, suggestions_json.voted_user_id_4, 'n', firstManToken);
        await testHelper.makeVoteRequest(suggestions_json.suggestion_id_1, suggestions_json.for_user_id_1, suggestions_json.voted_user_id_5, 'n', firstManToken);

        const res = await testHelper.makeGetCompetitionRequest(firstManToken);
        testHelper.expectRequestSuccess(res);
        testHelper.expectGetCompetitionSuccess(res);
        testHelper.expectUserInCompetition(res, suggestions_json.voted_user_id_1);
        testHelper.expectUserInCompetition(res, suggestions_json.voted_user_id_2);
        testHelper.expectUserInCompetition(res, suggestions_json.voted_user_id_3);
        successfulCompetitionId = res.body.competition_id;
    });
});

describe(`POST competition result`, () => {
    it("should fail if empty id is sent", async () => {
        const res = await testHelper.makePostCompetitionRequest('', '', firstManToken);
        testHelper.expectRequestFailure(res, 'missing_param_competition_id');
    });
    it("should fail if empty winner parameter is sent", async () => {
        const res = await testHelper.makePostCompetitionRequest(successfulCompetitionId, '', firstManToken);
        testHelper.expectRequestFailure(res, 'missing_param_user_id');
    });
    it("should fail if bad competition parameter is sent", async () => {
        const res = await testHelper.makePostCompetitionRequest(suggestions_json.voted_user_id_1, successfulCompetitionId, firstManToken);
        testHelper.expectRequestFailure(res, 'competition_not_found');
    });
    it("should fail if bad winner parameter is sent", async () => {
        const res = await testHelper.makePostCompetitionRequest(successfulCompetitionId, successfulCompetitionId, firstManToken);
        testHelper.expectRequestFailure(res, 'competition_not_found');
    });
    it("should succeed if correct parameters are sent", async () => {
        const res = await testHelper.makePostCompetitionRequest(successfulCompetitionId, suggestions_json.voted_user_id_1, firstManToken);
        testHelper.expectRequestSuccess(res);
        const user = await User.findOne({_id: firstManUser._id});
    });
});


describe(`GET current competition after it was ended`, () => {
    it("should fail because competition has ended", async () => {
        const res = await testHelper.makeGetCompetitionRequest(firstManToken);
        testHelper.expectRequestFailure(res, 'no_current_competition', 200);
    });
});

describe(`User selects as winner a user that also selected the user as a winner`, () => {
    it("should expect a match when competition is over", async () => {
        await prepareSuggestion();
        const users = [
            {id: suggestions_json.voted_user_id_1, vote: 'y'}
            ,{id: suggestions_json.voted_user_id_2, vote: 'n'}
            ,{id: suggestions_json.voted_user_id_3, vote: 'n'}
            ,{id: suggestions_json.voted_user_id_4, vote: 'n'}
            ,{id: suggestions_json.voted_user_id_5, vote: 'n'}
        ];
        await testHelper.batchVoteRequest(suggestions_json.suggestion_id_1, suggestions_json.for_user_id_1, users, firstManToken);
        const voting_user_id = suggestions_json.voted_user_id_1;
        currentRequesterToken = await testHelper.getTokenById(voting_user_id);
        await testHelper.setArbitrarySuggestions(voting_user_id, [secondTestUser._id, firstManUser._id]);
        const suggestions = await Suggestion.findOne({for_user_id: voting_user_id});
        const vote1 = await testHelper.makeVoteRequest(suggestions._id, voting_user_id, secondTestUser._id, 'y', currentRequesterToken);
        testHelper.expectRequestSuccess(vote1);
        const vote2 = await testHelper.makeVoteRequest(suggestions._id, voting_user_id, firstManUser._id, 'y', currentRequesterToken);
        testHelper.expectRequestSuccess(vote2);
        const res = await testHelper.makeGetCompetitionRequest(currentRequesterToken);
        testHelper.expectRequestSuccess(res);
        const res_posted_competition = await testHelper.makePostCompetitionRequest(res.body.competition_id, firstManUser._id, currentRequesterToken);
        testHelper.expectRequestSuccess(res_posted_competition);
        testHelper.expectYouGotAMatch(res_posted_competition, firstManUser._id);
    });
});

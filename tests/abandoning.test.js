const mongoose = require("mongoose");
require("dotenv").config();
const Suggestion = require('../models/suggestion');
const User = require('../models/user');
const RefusedUser = require('../models/refused_user');
const CanceledMatch = require('../models/canceled_match');
const testHelper = require('../test-helper/helper');
const helper = require('../helpers/helper');
let firstManToken, firstManUser, secondTestUser, currentRequesterToken = undefined;
let suggestions_json = {};
let suggestion_fake = new Suggestion();

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

describe(`Abandoning a match by canceling it`, () => {
    it("should get error message if no current match exists", async () => {
        const res = await testHelper.makeCancelCurrentMatch(firstManToken);
        testHelper.expectRequestFailure(res, 'no_current_match');
    });
    it("should succeed if match existed", async () => {
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
        const res_cancel = await testHelper.makeCancelCurrentMatch(firstManToken);
        testHelper.expectRequestSuccess(res_cancel);
        const user1 = await User.findOne({_id: firstManUser._id});
        const user2 = await User.findOne({_id: voting_user_id});
        expect(user1.current_match).toBeNull();
        expect(user2.current_match).toBeNull();
        const refused = await RefusedUser.findOne({for_user_id: firstManUser._id, users: {"$in": voting_user_id}});
        expect(refused).not.toBeNull();
    });
    it("should be possible to get new suggestions", async () => {
        const res = await testHelper.makeGetSuggestionsRequest(firstManToken);
        testHelper.expectRequestSuccess(res);
        testHelper.expectGetSuggestionsSuccess(res, true);
    });
    it("should get the field has_been_canceled when requesting current match", async () => {
        const res = await testHelper.makeGetCurrentMatch(currentRequesterToken);
        testHelper.expectRequestSuccess(res);
        testHelper.expectJustBeenCanceled(res, true);
        const canceled = await CanceledMatch.findOne({for_user_id: suggestions_json.voted_user_id_1, has_been_read: false});
        expect(canceled).toBeNull();
    });
    it("should NOT get the field has_been_canceled when requesting current match", async () => {
        const res = await testHelper.makeGetCurrentMatch(firstManToken);
        testHelper.expectRequestSuccess(res);
        testHelper.expectJustBeenCanceled(res, false);
    });
    it("should succeed when user deletes accounts", async () => {
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
        const vote1 = await testHelper.makeVoteRequest(suggestions._id, voting_user_id, secondTestUser._id, 'y', currentRequesterToken);
        testHelper.expectRequestSuccess(vote1);
        const vote2 = await testHelper.makeVoteRequest(suggestions._id, voting_user_id, firstManUser._id, 'y', currentRequesterToken);
        testHelper.expectRequestSuccess(vote2);
        const res = await testHelper.makeGetCompetitionRequest(currentRequesterToken);
        testHelper.expectRequestSuccess(res);
        const res_posted_competition = await testHelper.makePostCompetitionRequest(res.body.competition_id, firstManUser._id, currentRequesterToken);
        testHelper.expectRequestSuccess(res_posted_competition);
        testHelper.expectYouGotAMatch(res_posted_competition, firstManUser._id);

        const res_close_account = await testHelper.makeDeleteAccount(firstManToken);
        testHelper.expectRequestSuccess(res_close_account);
        const singin_res = await testHelper.signinByEmail(firstManUser.email);
        testHelper.expectRequestFailure(singin_res, 'wrong_email_or_password', 401);

        const res_current_match = await testHelper.makeGetCurrentMatch(currentRequesterToken);
        testHelper.expectRequestSuccess(res_current_match);
        testHelper.expectNullField(res_current_match, 'current_match');
    });
});
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

const cleanUp = async () => {
    const data = await testHelper.createStartUsers();
    firstManToken = data.firstManToken;
    firstManUser = data.firstManUser;
    secondTestUser = data.secondTestUser;
}

beforeAll(async () => {
    await testHelper.beforeAll();
    await cleanUp();
});

afterAll(async () => {
    await testHelper.resetDatabase();
    await mongoose.connection.close();
});

const doArraysIntersect = (array1, array2) => array1.some(item1 => array2.includes(item1));

describe(`Advanced suggestions`, () => {
    it("should only give suggestions according to criteria", async () => {
        const res = await testHelper.makeGetSuggestionsRequest(firstManToken);
        testHelper.expectRequestSuccess(res);
        testHelper.expectGetSuggestionsSuccess(res, true);
        const humanReadableFirstMan = testHelper.humanReadableUser(firstManUser);
        const users_translated = await testHelper.translateUserIdsToHumanReadable(res.body.suggestions.users);
        const refused_ids = [];
        const users_to_vote = [];
        let counter = 0;
        users_translated.map(el => {
            testHelper.expectUserGenderIsSearchedGender(el, humanReadableFirstMan);
            testHelper.expectSuggestedUserLikesUserGender(el, humanReadableFirstMan);
            testHelper.expectUserAgeIsSearchedAge(el, humanReadableFirstMan);
            if(counter === 0){
                users_to_vote.push({id: el._id, vote: 'y'});
            }
            else{
                users_to_vote.push({id: el._id, vote: 'n'});
                refused_ids.push(mongoose.Types.ObjectId(el._id).valueOf());
            }
            counter++;
        });
        users_to_vote[0].vote = 'y';
        const suggestion_id = res.body.suggestions._id;
        await testHelper.batchVoteRequest(suggestion_id, firstManUser._id, users_to_vote, firstManToken);
        await testHelper.setUserField(firstManUser, 'suggestions_completed_at', helper.date9HoursAgo())
        const new_suggestions = await testHelper.makeGetSuggestionsRequest(firstManToken);
        const new_suggested_users = new_suggestions.body.suggestions.users;
        const users_translated2 = await testHelper.translateUserIdsToHumanReadable(new_suggested_users);
        const suggested_users = new_suggested_users.map(el => el.user_id);
        expect(doArraysIntersect(refused_ids, suggested_users)).toBe(false);
        const winners = await testHelper.makeGetWinnersRequest(firstManToken);
        const winner_users = winners.body.winners.map(el => el.winner_id);
        expect(doArraysIntersect(winner_users, suggested_users)).toBe(false);

    });
});
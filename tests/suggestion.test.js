const mongoose = require("mongoose");
require("dotenv").config();
const Suggestion = require('../models/suggestion');
const testHelper = require('../test-helper/helper');
const helper = require('../helpers/helper');
const configuration = require('../config/config.json');
let firstManToken, firstManUser, secondTestUser = undefined;

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

describe(`GET Suggestions`, () => {
    it("should fail if user not active yet", async () => {
        await testHelper.setUserField(firstManUser, 'active', false);
        const res = await testHelper.makeGetSuggestionsRequest(firstManToken);
        testHelper.expectRequestFailure(res, 'user_not_active_yet', 200);
        await testHelper.setUserField(firstManUser, 'active', true);
    });
    it("should get new suggestions first time", async () => {
        const res = await testHelper.makeGetSuggestionsRequest(firstManToken);
        testHelper.expectRequestSuccess(res);
        testHelper.expectGetSuggestionsSuccess(res, true);
    });
    it("should get old suggestions second time", async () => {
        const res = await testHelper.makeGetSuggestionsRequest(firstManToken);
        testHelper.expectRequestSuccess(res);
        testHelper.expectGetSuggestionsSuccess(res, false);
    });
    it("should give error if not enough time has passed since generation of suggestions", async () => {
        await Suggestion.deleteMany({for_user_id: firstManUser._id});
        await testHelper.setUserField(firstManUser, 'suggestions_completed_at', helper.date2HoursAgo());
        const res = await testHelper.makeGetSuggestionsRequest(firstManToken);
        testHelper.expectRequestFailure(res, 'wait_until_next_suggestion', 200);
        testHelper.expectGetSuggestionsFailure(res, 'wait_until_next_suggestion', true);
    });
    it("should give error if not enough time has passed since generation of suggestions when NON paying customer", async () => {
        await Suggestion.deleteMany({for_user_id: firstManUser._id});
        await testHelper.setUserField(firstManUser, 'is_paying_user', false);
        await testHelper.setUserField(firstManUser, 'suggestions_completed_at', helper.dateXHoursAgo(4));
        const res = await testHelper.makeGetSuggestionsRequest(firstManToken);
        testHelper.expectRequestFailure(res, 'wait_until_next_suggestion', 200);
        testHelper.expectGetSuggestionsFailure(res, 'wait_until_next_suggestion', true);
    });
    it(`should give max ${configuration.max_number_of_suggestion} suggestions`, async () => {
        await testHelper.setUserField(firstManUser, 'suggestions_completed_at', helper.date9HoursAgo());
        const res = await testHelper.makeGetSuggestionsRequest(firstManToken);
        testHelper.expectRequestSuccess(res);
        testHelper.expectGetSuggestionsSuccess(res, true, true);
    });
});
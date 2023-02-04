const request = require("supertest");
const app = require("../app");
const urls_config = require('../config/urls.json');
const testDataUser = require("../tests-data/users.json");
const testUsers = require("../tests-data/test-users.json");
const config = require('../config/config.json');
const fs = require('fs');
const User = require('../models/user');
const Suggestion = require('../models/suggestion');
const SuggestionUser = require('../models/suggestion_user');
const LikedUser = require('../models/liked_user');
const PerhapsUser = require('../models/perhaps_user');
const RefusedUser = require('../models/refused_user');
const Competition = require('../models/competition');
const WinnerUser = require('../models/winner_user');
const ArchivedCompetition = require('../models/archived_competition');
const ArchivedSuggestion = require('../models/archived_suggestion');
const CanceledMatch = require('../models/canceled_match');
const bcrypt = require("bcrypt");
const City = require("../models/city");
const Region = require("../models/region");
const helper = require('../helpers/helper');
const mongoose = require("mongoose");
const configuration = require("../config/config.json");

const uriPrefix = `${urls_config.URI_PREFIX}${urls_config.USER_URI_PREFIX}`;
const urlSignup = `${uriPrefix}${urls_config.USER_SIGNUP}`;
const urlSignin = `${uriPrefix}${urls_config.USER_SIGNIN}`;
const urlCancelCurrentMatch = `${urls_config.URI_PREFIX}${urls_config.USER_URI_PREFIX}${urls_config.USER_CANCEL_CURRENT_MATCH}`;
const urlCloseAccount = `${urls_config.URI_PREFIX}${urls_config.USER_URI_PREFIX}${urls_config.USER_CLOSE_ACCOUNT}`;
const urlActivationBasePath = `${uriPrefix}${urls_config.USER_ACTIVATE}`;
const urlCurrentMatch = `${uriPrefix}${urls_config.USER_CURRENT_MATCH}`;
const userName = testDataUser.TEST_NAME;
const userEmail = testDataUser.TEST_EMAIL;
const userPassword = testDataUser.TEST_PASSWORD;
const urlPostCompetition = `${urls_config.URI_PREFIX}${urls_config.SUGGESTION_URI_PREFIX}${urls_config.SUGGESTION_POST_COMPETITION}`;
const urlSetVote = `${urls_config.URI_PREFIX}${urls_config.SUGGESTION_URI_PREFIX}${urls_config.SUGGESTION_SET_VOTE}`;
const urlGetWinners = `${urls_config.URI_PREFIX}${urls_config.SUGGESTION_URI_PREFIX}${urls_config.SUGGESTION_GET_WINNERS}`;
const urlGetSuggestions = `${urls_config.URI_PREFIX}${urls_config.SUGGESTION_URI_PREFIX}${urls_config.SUGGESTION_GET_MINE}`;
const urlGetCompetition = `${urls_config.URI_PREFIX}${urls_config.SUGGESTION_URI_PREFIX}${urls_config.SUGGESTION_GET_COMPETITION}`;

exports.signinByEmail = async (email) => {
    return await request(app).post(urlSignin).send({
        email: email,
        password: "monogomic"
    });
}

exports.beforeAll = async () => {
    await mongoose.connect(`mongodb+srv://monogomic:MSL7IHt6I7VWJFrN@cluster0.bgduwkc.mongodb.net/${process.env.MONGODB_TEST_URI}`, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
}

exports.getRandomNumberOfCharacters = (nr) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const result = [];
    for(let i = 0; i<=nr; i++){
        result.push(characters.charAt(Math.floor(Math.random() * characters.length)));
    }
    return result.join('');
}

exports.getTokenByEmail = async (email) => {
    const signin = await request(app).post(urlSignin).send({
        email: email,
        password: "monogomic"
    });
    return signin.body.accessToken;
}

exports.getTokenById = async (id) => {
    const user = await User.findOne({_id: id});
    const signin = await request(app).post(urlSignin).send({
        email: user.email,
        password: "monogomic"
    });
    return signin.body.accessToken;
}

const _createUserLoginAndGetToken = async () => {
    const signup = await request(app).post(urlSignup).send({
        name: userName,
        email: userEmail,
        password: userPassword
    });
    const activationLink = `${urlActivationBasePath}/${signup.body.returnUser._id}/${signup.body.returnUser.activation_string}`;
    await request(app).get(activationLink);
    const signin = await request(app).post(urlSignin).send({
        email: userEmail,
        password: userPassword
    });
    return signin.body.accessToken;
}

exports.createUserLoginAndGetToken = async () => {
    return await _createUserLoginAndGetToken();
}

exports.expectSuggestedUserLikesUserGender = (suggested_user, for_user) => {
    if(suggested_user.search_gender === 'a'){
        expect(true).toBe(true);
        return;
    }
    expect(suggested_user.search_gender).toBe(for_user.gender);
}

exports.expectUserGenderIsSearchedGender = (suggested_user, for_user) => {
    if(for_user.search_gender === 'a'){
        expect(true).toBe(true);
        return;
    }
    expect(suggested_user.gender).toBe(for_user.search_gender);
}

exports.expectUserAgeIsSearchedAge = (suggested_user, for_user) => {
    expect(suggested_user.age).toBeGreaterThanOrEqual(for_user.search_min_age);
    expect(suggested_user.age).toBeLessThanOrEqual(for_user.search_max_age);
}

exports.createUserLoginGetTokenAndUploadPicture = async () => {
    return '';
}

exports.humanReadableUser = (user) => {
    user.age = helper.ageFromBirthday(user.birthday);
    let {
        search_gender: search_gender
        , search_min_age: search_min_age
        , search_max_age: search_max_age
        , name: name
        , age: age
        , gender: gender
        , _id: _id
    } = user;
    return {
        search_gender: search_gender
        , search_min_age: search_min_age
        , search_max_age: search_max_age
        , name: name
        , age: age
        , gender: gender
        , _id: _id
    }
}

exports.translateUserIdsToHumanReadable = async (users) => {
    const humanReadableUsers = [];
    for await (user of users){
        const found_user = await User.findOne({_id: user.user_id});
        humanReadableUsers.push(this.humanReadableUser(found_user));
    }
    return humanReadableUsers;
}

exports.deleteTestImage = async (filename) => {
    for await(name of config.picture_name_format){
        const full_filename = `${process.env.IMAGE_UPLOAD_PATH}/${name}-${filename}`;
        fs.unlinkSync(full_filename);
    }
};

exports.batchCreateTestUsers = async () => {
    const password = bcrypt.hashSync('monogomic', 8);
    for await(user of testUsers){
        try{
            const city = await City.find({name: user.city});
            const city_id = city.length ? city[0]._id : '';
            const region_id = city.length ? city[0].region : '';
            const picture = `${user.email}.png`;
            const newUser = new User({
                name: user.name
                ,email: `${user.email}@monogomic.com`
                ,password: password
                ,activation_string: 'monogomic'
                ,active: true
                ,current_step: 'done'
                ,status: 'complete'
                ,pictures: [picture]
                ,region: region_id
                ,city: city_id
                ,search_distance: user.search_distance
                ,gender: user.gender
                ,search_gender: user.search_gender
                ,birthday: helper.birthdayFromAge(user.age)
                ,search_min_age: user.search_min_age
                ,search_max_age: user.search_max_age
                ,height: user.height
                ,body_type: user.body_type
            });
            await newUser.save();
        }
        catch(exception){
            console.log('exception:',exception);
        }
    }
    return true;
};

exports.testHelperFunc = () => {
    return 2;
};

exports.resetDatabase = async () => {
    await User.deleteMany({});
    await Suggestion.deleteMany({});
    await LikedUser.deleteMany({});
    await PerhapsUser.deleteMany({});
    await RefusedUser.deleteMany({});
    await Competition.deleteMany({});
    await WinnerUser.deleteMany({});
    await ArchivedCompetition.deleteMany({});
    await ArchivedSuggestion.deleteMany({});
    await CanceledMatch.deleteMany({});
};

exports.makeDeleteAccount = async (token) => {
    return await request(app)
        .delete(urlCloseAccount)
        .set('Authorization', 'Bearer ' + token);
};

exports.makePostCompetitionRequest = async (competition_id, winner_id, token) => {
    const body = {
        competition_id:competition_id
        , winner_id: winner_id
    };
    return await request(app)
        .post(urlPostCompetition)
        .set('Authorization', 'Bearer ' + token)
        .send(body);
};

exports.makeCancelCurrentMatch = async (token) => {
    return await request(app)
        .put(urlCancelCurrentMatch)
        .set('Authorization', 'Bearer ' + token);
};

exports.makeVoteRequest = async (suggestion_id, for_user_id, voted_user_id, vote, token) => {
    const body = {
        suggestion_id:suggestion_id
        , for_user_id: for_user_id
        , voted_user_id: voted_user_id
        , vote: vote
    };
    return await request(app)
        .post(urlSetVote)
        .set('Authorization', 'Bearer ' + token)
        .send(body);
};

exports.makeGetWinnersRequest = async (token) => {
    const res = await request(app).get(urlGetWinners).set('Authorization', 'Bearer ' + token);
    return res;
};

exports.makeGetSuggestionsRequest = async (token) => {
    const res = await request(app).get(urlGetSuggestions).set('Authorization', 'Bearer ' + token);
    return res;
};

exports.makeGetCompetitionRequest = async (token) => {
    const res = await request(app).get(urlGetCompetition).set('Authorization', 'Bearer ' + token);
    return res;
};

exports.makeGetCurrentMatch = async (token) => {
    const res = await request(app).get(urlCurrentMatch).set('Authorization', 'Bearer ' + token);
    return res;
}

exports.expectNullField = (res, field) => {
    expect(res.body).toHaveProperty(field);
    expect(res.body[field]).toBeNull();
}

exports.expectJustBeenCanceled = async (res, flag) => {
    expect(res.body).toHaveProperty('just_been_canceled');
    if(flag){
        expect(res.body.just_been_canceled).toBeTruthy();
    }
    else{
        expect(res.body.just_been_canceled).toBeFalsy();
    }
}

exports.expectThereIsNotAMatch = async (id1, id2, token1, token2) => {
    const res_user1 = await request(app).get(urlCurrentMatch).set('Authorization', 'Bearer ' + token1);
    expect(res_user1.body).toHaveProperty('current_match');
    expect(res_user1.body.current_match).not.toBeNull();

    const res_user2 = await request(app).get(urlCurrentMatch).set('Authorization', 'Bearer ' + token2);
    expect(res_user2.body).toHaveProperty('current_match');
    expect(res_user2.body.current_match).toBeNull();

    expect(mongoose.Types.ObjectId(res_user1.body.current_match).valueOf()).not.toBe(mongoose.Types.ObjectId(id2).valueOf());
}

exports.expectThereIsAMatch = async (id1, id2, token1, token2) => {
    const res_user1 = await request(app).get(urlCurrentMatch).set('Authorization', 'Bearer ' + token1);
    expect(res_user1.body).toHaveProperty('current_match');
    expect(res_user1.body.current_match).not.toBeNull();

    const res_user2 = await request(app).get(urlCurrentMatch).set('Authorization', 'Bearer ' + token2);
    expect(res_user2.body).toHaveProperty('current_match');
    expect(res_user2.body.current_match).not.toBeNull();

    expect(mongoose.Types.ObjectId(res_user1.body.current_match).valueOf()).toBe(mongoose.Types.ObjectId(id2).valueOf());
    expect(mongoose.Types.ObjectId(res_user2.body.current_match).valueOf()).toBe(mongoose.Types.ObjectId(id1).valueOf());
}

exports.setUserField = async (user, field, value) => {
    user[field] = value;
    await user.save();
}

exports.expectRequestSuccess = (res) => {
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toBe('ok');
}

exports.expectYouGotAMatch = (res, match_id) => {
    expect(res.body).toHaveProperty('you_got_a_match');
    expect(mongoose.Types.ObjectId(res.body.you_got_a_match).valueOf()).toBe(mongoose.Types.ObjectId(match_id).valueOf());
}

exports.expectRequestFailure = (res, error, code=500) => {
    expect(res.statusCode).toBe(code);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toBe(error);
}

exports.expectGetCompetitionSuccess = (res) => {
    expect(res.body).toHaveProperty('competition_id');
    expect(res.body.competition_id).not.toBe('');
}

exports.expectUserInCompetition = (res, user_id) => {
    const found = res.body.users.find(el => mongoose.Types.ObjectId(el.user_id).valueOf() === mongoose.Types.ObjectId(user_id).valueOf());
    expect(found).not.toBeNull();
}

exports.expectGetSuggestionsFailure = (res, error, minutes_to_next_suggestions = false) => {
    expect(res.body).toHaveProperty('next_suggestion_possible_within_minutes');
    if(minutes_to_next_suggestions){
        expect(typeof res.body.next_suggestion_possible_within_minutes).toBe('number');
    }
}

exports.expectGetSuggestionsSuccess = (res, new_suggestions, has_users= false) => {
    expect(res.body).toHaveProperty('suggestions');
    expect(res.body).toHaveProperty('new_suggestions');
    expect(res.body.suggestions).not.toBeNull();
    if(has_users){
        expect(res.body.suggestions).toHaveProperty('users');
        expect(Array.isArray(res.body.suggestions.users)).toBe(true);
        expect(res.body.suggestions.users.length).toBeGreaterThan(0);
        expect(res.body.suggestions.users.length).toBeLessThan((Number(configuration.max_number_of_suggestion)+1));
    }
    if(new_suggestions){
        expect(res.body.new_suggestions).toBeTruthy();
    }
    else{
        expect(res.body.new_suggestions).toBeFalsy();
    }
}

exports.shouldHaveStatusInSuggestion = async (suggestion_id, for_user_id, voted_user_id, status) => {
    const where_in_suggestion = {
        _id: suggestion_id
        , for_user_id: for_user_id
        , "users.user_id": voted_user_id
    };
    const found_in_suggestions = await Suggestion.findOne(where_in_suggestion);
    expect(Array.isArray(found_in_suggestions.users)).toBe(true);
    const found = found_in_suggestions.users.find(el => mongoose.Types.ObjectId(el.user_id).valueOf() === mongoose.Types.ObjectId(voted_user_id).valueOf());
    expect(found.status).toBe(status);
}

exports.shouldBeInLiked = async (for_user_id, voted_user_id) => {
    const where_found_in_liked_users = {"for_user_id": for_user_id, "$in": {"users": voted_user_id}};
    const found_in_liked_users = await LikedUser.findOne(where_found_in_liked_users);
    expect(found_in_liked_users).toHaveProperty("for_user_id");
}

const shouldHaveNrOfUsersInTable = (row, length) => {
    expect(row).toHaveProperty("for_user_id");
    expect(row).toHaveProperty("users");
    expect(Array.isArray(row.users)).toBe(true);
    expect(row.users.length).toBe(length);
}

exports.shouldHaveNrOfUsersInLiked = async (for_user_id, length) => {
    const found_in_liked_users = await LikedUser.findOne({"for_user_id": for_user_id});
    shouldHaveNrOfUsersInTable(found_in_liked_users, length);
}

exports.shouldHaveNrOfUsersInPerhaps = async (for_user_id, length) => {
    const found_in_liked_users = await PerhapsUser.findOne({"for_user_id": for_user_id});
    shouldHaveNrOfUsersInTable(found_in_liked_users, length);
}

exports.shouldHaveNrOfUsersInRefused = async (for_user_id, length) => {
    const found_in_liked_users = await RefusedUser.findOne({"for_user_id": for_user_id});
    shouldHaveNrOfUsersInTable(found_in_liked_users, length);
}

exports.setInitialSuggestions = async (for_user_id) => {
    let suggestions_json = {};
    suggestions_json.suggestion_1 = await Suggestion.findOne({for_user_id: for_user_id});
    suggestions_json.suggestion_id_1 = suggestions_json.suggestion_1._id;
    suggestions_json.for_user_id_1 = for_user_id;
    suggestions_json.voted_user_id_1 = suggestions_json.suggestion_1.users[0].user_id;
    suggestions_json.voted_user_id_2 = suggestions_json.suggestion_1.users[1].user_id;
    suggestions_json.voted_user_id_3 = suggestions_json.suggestion_1.users[2].user_id;
    suggestions_json.voted_user_id_4 = suggestions_json.suggestion_1.users[3].user_id;
    //suggestions_json.voted_user_id_5 = suggestions_json.suggestion_1.users[4].user_id;
    return suggestions_json;
}

exports.createStartUsers = async () => {
    const data = {
        firstManToken: ''
        ,firstManUser: ''
        ,secondTestUser: ''
    };
    await this.batchCreateTestUsers();
    const test_user_email = `${testUsers[0].email}@monogomic.com`;
    data.firstManToken = await this.getTokenByEmail(test_user_email);
    data.firstManUser = await User.findOne({email: test_user_email});
    const second_test_user_email = `${testUsers[1].email}@monogomic.com`;
    data.secondTestUser = await User.findOne({email: second_test_user_email});
    return data;
}

exports.setArbitrarySuggestions = async (for_user_id, users) => {
    const suggestion_users = [];
    users.map(el => {
        suggestion_users.push(new SuggestionUser({user_id: el}));
    });
    const suggestion = new Suggestion({for_user_id: for_user_id, users: suggestion_users});
    await suggestion.save();
}

exports.batchVoteRequest = async (suggestion_id, for_user_id, voted_users, token) => {
    for await(voted_user of voted_users){
        await this.makeVoteRequest(suggestion_id, for_user_id, voted_user.id, voted_user.vote, token);
    }
}
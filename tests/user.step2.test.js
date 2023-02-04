const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../app");
require("dotenv").config();
const User = require('../models/user');
const urls_config = require("../config/urls.json");
const testHelper = require('../test-helper/helper');

const uriPrefix = `${urls_config.URI_PREFIX}${urls_config.USER_URI_PREFIX}`;
const uriPrefixGeo = `${urls_config.URI_PREFIX}${urls_config.GET_URI_PREFIX}`;
const urlPostStep2 = `${uriPrefix}${urls_config.USER_POST_STEP_2}`;
const urlGetRegions = `${uriPrefixGeo}${urls_config.GEO_GET_REGIONS}`;
const urlBasePathGetCities = `${uriPrefixGeo}${urls_config.GEO_GET_CITIES}`;
let regionId = undefined;
let cityId = undefined;
let urlGetCities = '';
let validAccessToken = undefined;

beforeAll(async () => {
    await testHelper.beforeAll();
});

afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
});

describe(`POST ${urlPostStep2}`, () => {
    it("should fail if parameter gender is missing", async () => {
        validAccessToken = await testHelper.createUserLoginAndGetToken();
        const res = await request(app)
            .post(urlPostStep2)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                nothing: "nothing"
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toContain('missing_parameter_gender');
    });
    it("should fail if parameter gender is incorrect", async () => {
        const res = await request(app)
            .post(urlPostStep2)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                gender: "z"
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toContain('invalid_gender');
    });
    it("should fail if parameter search_gender is missing", async () => {
        const res = await request(app)
            .post(urlPostStep2)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                gender: "m"
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toContain('missing_parameter_search_gender');
    });
    it("should fail if parameter search_gender is incorrect", async () => {
        const res = await request(app)
            .post(urlPostStep2)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                gender: "m",
                search_gender: "r"
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toContain('invalid_search_gender');
    });
    it("should fail if parameter birthday is missing", async () => {
        const res = await request(app)
            .post(urlPostStep2)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                gender: "m",
                search_gender: "a"
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toContain('missing_parameter_birthday');
    });
    it("should fail if parameter birthday is incorrect, i.e. not a date at all", async () => {
        const res = await request(app)
            .post(urlPostStep2)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                gender: "m",
                search_gender: "a",
                birthday: "fff"
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toContain('invalid_birthday');
    });
    it("should fail if parameter birthday is incorrect, i.e. a non existent date", async () => {
        const res = await request(app)
            .post(urlPostStep2)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                gender: "m",
                search_gender: "a",
                birthday: "2015-13-09"
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toContain('invalid_birthday');
    });
    it("should fail if parameter search_min_age is missing", async () => {
        const res = await request(app)
            .post(urlPostStep2)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                gender: "m",
                search_gender: "a",
                birthday: "2000-12-09"
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toContain('missing_parameter_search_min_age');
    });
    it("should fail if parameter search_min_age is invalid", async () => {
        const res = await request(app)
            .post(urlPostStep2)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                gender: "m",
                search_gender: "a",
                birthday: "2000-12-09",
                search_min_age: '8K'
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toContain('invalid_search_min_age');
    });
    it("should fail if parameter search_max_age is missing", async () => {
        const res = await request(app)
            .post(urlPostStep2)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                gender: "m",
                search_gender: "a",
                birthday: "2000-12-09",
                search_min_age: '20'
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toContain('missing_parameter_search_max_age');
    });
    it("should fail if parameter search_max_age is invalid", async () => {
        const res = await request(app)
            .post(urlPostStep2)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                gender: "m",
                search_gender: "a",
                birthday: "2000-12-09",
                search_min_age: '20',
                search_max_age: '20P'
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toContain('invalid_search_max_age');
    });
    it("should fail if search_min_age is bigger than search_max_age", async () => {
        const res = await request(app)
            .post(urlPostStep2)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                gender: "m",
                search_gender: "a",
                birthday: "2000-12-09",
                search_min_age: '20',
                search_max_age: '19'
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toContain('invalid_range_for_search_age');
    });
    it("should fail if no region is sent", async () => {
        const resRegions = await request(app).get(urlGetRegions);
        urlGetCities = `${urlBasePathGetCities}/${resRegions.body.regions[0]._id}`;
        regionId = resRegions.body.regions[0]._id;
        const resCities = await request(app).get(urlGetCities);
        cityId = resCities.body.cities[0]._id;
        const res = await request(app)
            .post(urlPostStep2)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                gender: "m",
                search_gender: "a",
                birthday: "2000-12-09",
                search_min_age: '20',
                search_max_age: '30'
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toContain('missing_parameter_region');
    });
    it("should fail if no region is sent", async () => {
        const res = await request(app)
            .post(urlPostStep2)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                gender: "m",
                search_gender: "a",
                birthday: "2000-12-09",
                search_min_age: '20',
                search_max_age: '30',
                region: 'zzz'
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toContain('invalid_region_parameter');
    });
    it("should fail if unexisting region is sent", async () => {
        const res = await request(app)
            .post(urlPostStep2)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                gender: "m",
                search_gender: "a",
                birthday: "2000-12-09",
                search_min_age: '20',
                search_max_age: '30',
                region: '507f191e810c19729de860ea'
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toContain('region_not_found');
    });
    it("should fail if no city is sent", async () => {
        const res = await request(app)
            .post(urlPostStep2)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                gender: "m",
                search_gender: "a",
                birthday: "2000-12-09",
                search_min_age: '20',
                search_max_age: '30',
                region: regionId
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toContain('missing_parameter_city');
    });
    it("should fail if invalid city is sent", async () => {
        const res = await request(app)
            .post(urlPostStep2)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                gender: "m",
                search_gender: "a",
                birthday: "2000-12-09",
                search_min_age: '20',
                search_max_age: '30',
                region: regionId,
                city: '444'
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toContain('invalid_city_parameter');
    });
    it("should fail if unexisting city is sent", async () => {
        const res = await request(app)
            .post(urlPostStep2)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                gender: "m",
                search_gender: "a",
                birthday: "2000-12-09",
                search_min_age: '20',
                search_max_age: '30',
                region: regionId,
                city: '507f191e810c19729de860ea'
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toContain('city_not_found');
    });
    it("should fail if no search_distance is sent", async () => {
        const res = await request(app)
            .post(urlPostStep2)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                gender: "m",
                search_gender: "a",
                birthday: "2000-12-09",
                search_min_age: '20',
                search_max_age: '30',
                region: regionId,
                city: cityId
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toContain('missing_parameter_search_distance');
    });
    it("should fail if invalid search_distance is sent", async () => {
        const res = await request(app)
            .post(urlPostStep2)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                gender: "m",
                search_gender: "a",
                birthday: "2000-12-09",
                search_min_age: '20',
                search_max_age: '30',
                region: regionId,
                city: cityId,
                search_distance: 'gt'
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toContain('invalid_search_distance');
    });
    it("should fail if height parameter is missing", async () => {
        const res = await request(app)
            .post(urlPostStep2)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                gender: "m",
                search_gender: "a",
                birthday: "2000-12-09",
                search_min_age: '20',
                search_max_age: '30',
                region: regionId,
                city: cityId,
                search_distance: 'all'
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toContain('missing_parameter_height');
    });
    it("should fail if height parameter is missing", async () => {
        const res = await request(app)
            .post(urlPostStep2)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                gender: "m",
                search_gender: "a",
                birthday: "2000-12-09",
                search_min_age: '20',
                search_max_age: '30',
                region: regionId,
                city: cityId,
                search_distance: 'all',
                height: 'a4'
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toContain('invalid_height');
    });
    it("should fail if body type parameter is missing", async () => {
        const res = await request(app)
            .post(urlPostStep2)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                gender: "m",
                search_gender: "a",
                birthday: "2000-12-09",
                search_min_age: '20',
                search_max_age: '30',
                region: regionId,
                city: cityId,
                search_distance: 'all',
                height: 33
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toContain('missing_parameter_body_type');
    });
    it("should fail if body type parameter is missing", async () => {
        const res = await request(app)
            .post(urlPostStep2)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                gender: "m",
                search_gender: "a",
                birthday: "2000-12-09",
                search_min_age: '20',
                search_max_age: '30',
                region: regionId,
                city: cityId,
                search_distance: 'all',
                height: 33,
                body_type: 'fat'
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors).toContain('invalid_body_type');
    });
    it("should succeed if all parameters are correct", async () => {
        let description_part1 = testHelper.getRandomNumberOfCharacters(100);
        const res = await request(app)
            .post(urlPostStep2)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                gender: "m",
                search_gender: "a",
                birthday: "2000-12-09",
                search_min_age: '20',
                search_max_age: '30',
                region: regionId,
                city: cityId,
                search_distance: 'all',
                height: 33,
                body_type: 'm',
                description: description_part1
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toContain('ok');
        expect(res.body).toHaveProperty('updated');
        expect(res.body.message).toBeTruthy();
    });
});
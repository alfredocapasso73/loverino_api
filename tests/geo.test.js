const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../app");
require("dotenv").config();
const City = require("../models/city");
const Region = require("../models/region");
const urls_config = require('../config/urls.json');
const testHelper = require("../test-helper/helper");

const uriPrefix = `${urls_config.URI_PREFIX}${urls_config.GET_URI_PREFIX}`;
const urlGetRegions = `${uriPrefix}${urls_config.GEO_GET_REGIONS}`;
const urlBasePathGetCities = `${uriPrefix}${urls_config.GEO_GET_CITIES}`;
let urlGetCities = '';

beforeAll(async () => {
    await testHelper.beforeAll();
});

afterAll(async () => {
    await mongoose.connection.close();
});

describe(`GET ${urlGetRegions}`, () => {
    it("should return all the regions", async () => {
        const res = await request(app).get(urlGetRegions);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('message');
        expect(res.body).toHaveProperty('regions');
        urlGetCities = `${urlBasePathGetCities}/${res.body.regions[0]._id}`;
    });
});

describe(`GET ${urlGetCities}`, () => {
    it("should return all the cities", async () => {
        const res = await request(app).get(urlGetCities);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('message');
        expect(res.body).toHaveProperty('cities');
    });
});
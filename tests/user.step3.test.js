const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../app");
require("dotenv").config();
const User = require('../models/user');
const urls_config = require('../config/urls.json');
const testHelper = require('../test-helper/helper');


beforeAll(async () => {
    await testHelper.beforeAll();
});

afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
});


const uriPrefix = `${urls_config.URI_PREFIX}${urls_config.USER_URI_PREFIX}`;
const urlUploadImage = `${uriPrefix}${urls_config.USER_UPLOAD_PICTURE}`;
const urlDeleteImage = `${uriPrefix}${urls_config.USER_DELETE_PICTURE}`;
let validToken = '';
let uploadedImageId = '';
let uploadedImageFilename = '';

describe(`POST ${urlUploadImage}`, () => {
    it("should upload an image successfully", async () => {
        validToken = await testHelper.createUserLoginAndGetToken();
        //const filePath = `${__dirname}/../tests-data/light-image.jpeg`;
        const filePath = process.env.TEST_IMAGE_LIGHT_PATH;
        const res = await request(app)
            .post(urlUploadImage)
            .set('Authorization', 'Bearer ' + validToken)
            .attach('picture', filePath);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('ok');
        expect(res.body).toHaveProperty('filename');
        expect(res.body).toHaveProperty('pictures');
        expect(res.body.pictures).toContain(res.body.filename);
        uploadedImageId = res.body.pictures[0];
        uploadedImageFilename = res.body.filename;
    });
    it("should fail if a non image is uploaded", async () => {
        const filePath = `${__dirname}/../tests-data/pdffile.pdf`;
        const res = await request(app)
            .post(urlUploadImage)
            .set('Authorization', 'Bearer ' + validToken)
            .attach('picture', filePath);
        expect(res.statusCode).toBe(500);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toBe('only_images_allowed');
    });
    it("should fail if no file has been sent", async () => {
        const res = await request(app)
            .post(urlUploadImage)
            .set('Authorization', 'Bearer ' + validToken);
        expect(res.statusCode).toBe(500);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toBe('no_image_sent');
    });
    it("should fail if too big image is uploaded", async () => {
        const filePath = `${__dirname}/../tests-data/bigpicture.jpg`;
        const res = await request(app)
            .post(urlUploadImage)
            .set('Authorization', 'Bearer ' + validToken)
            .attach('picture', filePath);
        expect(res.statusCode).toBe(500);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toBe('file_too_large');
    });
});

describe(`POST ${urlUploadImage}`, () => {
    it("should delete an image successfully", async () => {
        const res = await request(app)
            .delete(urlDeleteImage)
            .set('Authorization', 'Bearer ' + validToken)
            .send({
                picture_id: uploadedImageId,
            });

        expect(res.statusCode).toBe(200);
    });
});

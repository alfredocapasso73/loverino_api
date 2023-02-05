const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../app");
require("dotenv").config();
const User = require('../models/user');
const urls_config = require('../config/urls.json');
const testDataUser = require('../tests-data/users.json');
const testHelper = require('../test-helper/helper');

const userName = testDataUser.TEST_USER_NAME;
const userEmail = testDataUser.TEST_USER_EMAIL;
const userPassword = testDataUser.TEST_USER_PASSWORD;

const changedUserName = `Another name`;
const changedUserEmail = `info@monogomic.se`;
const newUserPassword = `mynewpassword`;

beforeAll(async () => {
    await testHelper.beforeAll();
});

afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
});

const uriPrefix = `${urls_config.URI_PREFIX}${urls_config.USER_URI_PREFIX}`;
const urlPublicTest = `${uriPrefix}${urls_config.USER_PUBLIC_TEST}`;
const urlPrivateTest = `${uriPrefix}${urls_config.USER_PRIVATE_TEST}`;
const urlSignup = `${uriPrefix}${urls_config.USER_SIGNUP}`;
const urlSignin = `${uriPrefix}${urls_config.USER_SIGNIN}`;
const urlMe = `${uriPrefix}${urls_config.USER_ME}`;
const urlForgotPassword = `${uriPrefix}${urls_config.USER_FORGOT_PASSWORD}`;
const urlUpdate = `${uriPrefix}${urls_config.USER_UPDATE}`;
const urlUpdateEmail = `${uriPrefix}${urls_config.USER_CHANGE_EMAIL}`;
const urlUpdatePassword = `${uriPrefix}${urls_config.USER_CHANGE_PASSWORD}`;
const urlRestorePasswordBasePath = `${uriPrefix}${urls_config.USER_RESTORE}`;
const urlActivationBasePath = `${uriPrefix}${urls_config.USER_ACTIVATE}`;
let urlRestorePasswordSuccess = `${urlRestorePasswordBasePath}`;
let urlRestorePasswordFailure = `${urlRestorePasswordBasePath}`;
let urlActivationSuccess = `${urlActivationBasePath}`;
let urlActivationFailure = `${urlActivationBasePath}`;
let validUserId = undefined;
let validRestorePasswordString = undefined;
let validAccessToken = undefined;


//TEST
describe(`GET ${urlPublicTest}`, () => {
    it("should return string publicTest", async () => {
        const res = await request(app).get(urlPublicTest);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('publicTest');
    });
});
describe(`GET ${urlPrivateTest}`, () => {
    it("should return string publicTest", async () => {
        const res = await request(app).get(urlPrivateTest);
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('unauthorized');
    });
});
//TEST

//SIGNUP
describe(`POST ${urlSignup}`, () => {
    it("should fail if parameter name is missing", async () => {
        const res = await request(app).post(urlSignup).send({
            lastname: "Last name"
        });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toBe('missing_parameter_name');
    });
    it("should fail if parameter email is missing", async () => {
        const res = await request(app).post(urlSignup).send({
            name: userName,
            mail: userEmail
        });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toBe('missing_parameter_email');
    });
    it("should fail if email is invalid", async () => {
        const res = await request(app).post(urlSignup).send({
            name: userName,
            email: 'abcd',
            password: "123123"
        });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toBe('invalid_email');
    });
    it("should fail if parameter password is missing", async () => {
        const res = await request(app).post(urlSignup).send({
            name: userName,
            email: userEmail
        });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toBe('missing_parameter_password');
    });
    it("should fail if parameter password does not meet the rules", async () => {
        const res = await request(app).post(urlSignup).send({
            name: userName,
            email: userEmail,
            password: '123'
        });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toBe('password_rule_failed');
    });
    it("should succeed if parameters are correct", async () => {
        const res = await request(app).post(urlSignup).send({
            name: userName,
            email: userEmail,
            password: userPassword
        });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('message');
        expect(res.body).toHaveProperty('returnUser');
        expect(res.body).toHaveProperty('returnUser.activation_string');
        expect(res.body.message).toBe('signup_ok');
        validUserId = res.body.returnUser._id;
        //urlActivationSuccess = `${urlActivationSuccess}/${validUserId}/${res.body.returnUser.activation_string}`;
        urlActivationSuccess = `${urlActivationSuccess}/${validUserId}/${res.body.returnUser.activation_string}`;
        urlActivationFailure = `${urlActivationSuccess}/${validUserId}/fail_here`;
        urlRestorePasswordFailure = `${urlRestorePasswordFailure}/${validUserId}/fail_here`;
    });
    it("should fail if email already exists", async () => {
        const bad_res = await request(app).post(urlSignup).send({
            name: userName,
            email: userEmail,
            password: userPassword
        });
        expect(bad_res.statusCode).toBe(400);
        expect(bad_res.body).toHaveProperty('error');
        expect(bad_res.body.error).toBe('email_already_in_use');
    });
});

//Signin before activation
describe(`POST ${urlSignin}`, () => {
    it("should fail if user is not active yet", async () => {
        const res = await request(app).post(urlSignin).send({
            email: userEmail,
            password: userPassword
        });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toBe('not_activate_yet');
    });
});


//ACTIVATION
describe(`GET ${urlActivationSuccess}`, () => {
    it("should succeed when activation link is valid", async () => {
        const resActivation = await request(app).get(urlActivationSuccess);
        expect(resActivation.statusCode).toBe(200);
        expect(resActivation.body).toHaveProperty('message');
        expect(resActivation.body.message).toBe('activated');
    });
    it("should fail when activation link is invalid", async () => {
        const res = await request(app).get(urlActivationFailure);
        expect(res.statusCode).toBe(404);
    });
});

//FORGOT PASSWORD
describe(`POST ${urlForgotPassword}`, () => {
    it("should fail if email param not sent", async () => {
        const res = await request(app).post(urlForgotPassword).send({
            name: userName,
        });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toBe('missing_parameter_email');
    });
    it("should fail if email does not exist", async () => {
        const res = await request(app).post(urlForgotPassword).send({
            email: "nomail",
        });
        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toBe('user_not_found');
    });
    it("should succeed if user exists", async () => {
        const res = await request(app).post(urlForgotPassword).send({
            email: userEmail,
        });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('password_restored');
        expect(res.body).toHaveProperty('restorePasswordString');
        urlRestorePasswordSuccess = `${urlRestorePasswordSuccess}/${validUserId}/${res.body.restorePasswordString}`;
        validRestorePasswordString = res.body.restorePasswordString;
    });
});

//RESTORE PASSWORD
describe(`GET ${urlRestorePasswordFailure}`, () => {
    it("should fail if restore string is incorrect", async () => {
        const res = await request(app).get(urlRestorePasswordFailure);
        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('restored_string_not_found');
    });
    it("should succeed if restore string is correct", async () => {
        const res = await request(app).get(urlRestorePasswordSuccess);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('restore');
    });
});

//CHANGE RESTORED PASSWORD
describe(`PUT ${urlRestorePasswordBasePath}`, () => {
    it("should fail if password has not been sent", async () => {
        const res = await request(app).put(urlRestorePasswordBasePath).send({
            restorePasswordString: 'restorePasswordString',
            userId: 'userId'
        });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toBe('missing_parameter_password');
    });
    it("should fail if restorePasswordString has not been sent", async () => {
        const res = await request(app).put(urlRestorePasswordBasePath).send({
            password: 'password',
            userId: 'userId'
        });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toBe('missing_parameter_restorePasswordString');
    });
    it("should fail if userId has not been sent", async () => {
        const res = await request(app).put(urlRestorePasswordBasePath).send({
            password: 'password',
            restorePasswordString: 'restorePasswordString'
        });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toBe('missing_parameter_userId');
    });
    it("should fail if parameters are incorrect", async () => {
        const res = await request(app).put(urlRestorePasswordBasePath).send({
            password: 'password',
            restorePasswordString: 'restorePasswordString',
            userId: 'userId'
        });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toBe('restored_string_not_found');
    });
    it("should succeed if parameters are correct", async () => {
        const res = await request(app).put(urlRestorePasswordBasePath).send({
            password: userPassword,
            restorePasswordString: validRestorePasswordString,
            userId: validUserId
        });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('password_changed');
    });
});

//SIGNIN
describe(`POST ${urlSignin}`, () => {
    it("should fail if email is not sent", async () => {
        const res = await request(app).post(urlSignin).send({
            password: userPassword
        });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toBe('missing_parameter_email');
    });
    it("should fail if password is not sent", async () => {
        const res = await request(app).post(urlSignin).send({
            email: userEmail
        });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toBe('missing_parameter_password');
    });
    it("should fail if email is incorrect", async () => {
        const res = await request(app).post(urlSignin).send({
            email: 'test',
            password: userPassword
        });
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toBe('wrong_email_or_password');
    });
    it("should fail if password is incorrect", async () => {
        const res = await request(app).post(urlSignin).send({
            email: userEmail,
            password: 'test'
        });
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toBe('wrong_email_or_password');
    });
    it("should succeed if email and password are correct", async () => {
        const res = await request(app).post(urlSignin).send({
            email: userEmail,
            password: userPassword
        });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('login_ok');
        expect(res.body).toHaveProperty('accessToken');
        validAccessToken = res.body.accessToken;
    });
});

//ME
describe(`GET ${urlMe}`, () => {
    it("should return data about myself", async () => {
        const res = await request(app).get(urlMe).set('Authorization', 'Bearer ' + validAccessToken);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('me');
        expect(res.body).toHaveProperty('user');
    });
});

//Update
describe(`PATCH ${urlUpdate}`, () => {
    it("should update name", async () => {
        const res = await request(app)
            .patch(urlUpdate)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                name: changedUserName
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('updated');
        expect(res.body).toHaveProperty('user');
        expect(res.body.user.name).toBe(changedUserName);
    });
});

//Change Email
describe(`/api/user/updateEmail`, () => {
    it("should fail updating email if parameter is missing", async () => {
        const res = await request(app)
            .put(urlUpdateEmail)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                nothing: "nothing"
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toBe('missing_parameter_email');
    });
    it("should update email", async () => {
        const res = await request(app)
            .put(urlUpdateEmail)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                email: changedUserEmail
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('email_updated');
    });
    it("should not update email if already in use", async () => {
        //const anotherToken = await createLoginAnotherUserAndReturnToken();
        const anotherToken = await testHelper.createUserLoginAndGetToken();
        const res = await request(app)
            .put(urlUpdateEmail)
            .set('Authorization', 'Bearer ' + anotherToken)
            .send({
                email: changedUserEmail
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toBe('email_already_in_use');
    });
});

//Change Password
describe(`PUT ${urlUpdatePassword}`, () => {
    it("should fail updating password if parameter is missing", async () => {
        const res = await request(app)
            .put(urlUpdatePassword)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                nothing: "nothing"
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toBe('missing_parameter_password');
    });
    it("should fail updating password if password does not meet the rules", async () => {
        const res = await request(app)
            .put(urlUpdatePassword)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                password: "123"
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toBe('password_rule_failed');
    });
    it("should update password if correct parameter is sent", async () => {
        const res = await request(app)
            .put(urlUpdatePassword)
            .set('Authorization', 'Bearer ' + validAccessToken)
            .send({
                password: newUserPassword
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('password_updated');
    });
});
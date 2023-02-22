const express = require("express");
const router = express.Router();
const authJWT = require('../middlewares/authJWT');
const userController = require('../controllers/user');
const urls_config = require('../config/urls.json')
const texasController = require("../controllers/texas");

router.get(`/user/dbTest`, userController.dbTest);
router.post(`/user/dbTest`, authJWT.verifyToken, userController.dbTest);

router.post(`${urls_config.USER_URI_PREFIX}${urls_config.USER_ADD_PICTURE}`, authJWT.verifyToken, authJWT.verifyEndToEnd, userController.addPicture);
router.post(`${urls_config.USER_URI_PREFIX}${urls_config.USER_API_TOKEN}`, authJWT.verifyToken, authJWT.verifyEndToEnd, userController.apiToken);
router.post(`${urls_config.USER_URI_PREFIX}${urls_config.USER_REFRESH_TOKEN}`, userController.refreshToken);
router.post(`${urls_config.USER_URI_PREFIX}${urls_config.USER_RESTORE_REFUSED_USER}`, authJWT.verifyToken, userController.restoreRefusedUser);
router.post(`${urls_config.USER_URI_PREFIX}${urls_config.USER_RESTORE_FAVORITE_USER}`, authJWT.verifyToken, userController.restoreFavoriteUser);
router.post(`${urls_config.USER_URI_PREFIX}${urls_config.USER_GET_FAVORITE_USERS}`, authJWT.verifyToken, userController.getFavoriteUsers);
router.post(`${urls_config.USER_URI_PREFIX}${urls_config.USER_GET_REFUSED_USERS}`, authJWT.verifyToken, userController.getRefusedUsers);
router.post(`${urls_config.USER_URI_PREFIX}${urls_config.USER_UNREAD_MESSAGES}`, authJWT.verifyToken, userController.unreadChatMessages);
router.post(`${urls_config.USER_URI_PREFIX}${urls_config.USER_READ_MESSAGES}`, authJWT.verifyToken, userController.readChatMessages);
router.post(`${urls_config.USER_URI_PREFIX}${urls_config.USER_GET_MESSAGE_HISTORY}`, authJWT.verifyToken, userController.getChatHistory);
router.post(`${urls_config.USER_URI_PREFIX}${urls_config.USER_GET_MESSAGES}`, authJWT.verifyToken, userController.getChatMessages);
router.get(`${urls_config.USER_URI_PREFIX}/foto`, userController.publicTestImage);
router.get(`${urls_config.USER_URI_PREFIX}${urls_config.USER_GET_IMAGE}/:image`, userController.getImage);
router.delete(`${urls_config.USER_URI_PREFIX}${urls_config.USER_CLOSE_ACCOUNT}`, authJWT.verifyToken, userController.closeAccount);
router.put(`${urls_config.USER_URI_PREFIX}${urls_config.USER_CANCEL_CURRENT_MATCH}`, authJWT.verifyToken, userController.cancelCurrentMatch);
router.delete(`${urls_config.USER_URI_PREFIX}${urls_config.USER_DELETE_PICTURE}`, authJWT.verifyToken, userController.deletePicture);
router.post(`${urls_config.USER_URI_PREFIX}${urls_config.USER_UPLOAD_PICTURE}`, authJWT.verifyToken, userController.uploadPicture);
router.post(`${urls_config.USER_URI_PREFIX}${urls_config.USER_POST_STEP_2}`, authJWT.verifyToken, userController.runStep2);
router.post(`${urls_config.USER_URI_PREFIX}${urls_config.USER_UPDATE_MY_PROFILE}`, authJWT.verifyToken, userController.updateMyProfile);
router.put(`${urls_config.USER_URI_PREFIX}${urls_config.USER_CHANGE_PASSWORD}`, authJWT.verifyToken, userController.updatePassword);
router.put(`${urls_config.USER_URI_PREFIX}${urls_config.USER_CHANGE_EMAIL}`, authJWT.verifyToken, userController.updateEmail);
router.put(`${urls_config.USER_URI_PREFIX}${urls_config.USER_UPDATE_NOTIFICATIONS}`, authJWT.verifyToken, userController.updateNotifications);
router.patch(`${urls_config.USER_URI_PREFIX}${urls_config.USER_UPDATE}`, authJWT.verifyToken, userController.update);
router.get(`${urls_config.USER_URI_PREFIX}${urls_config.USER_ME}`, authJWT.verifyToken, userController.me);
router.get(`${urls_config.USER_URI_PREFIX}${urls_config.USER_GET_USER}/:user_id`, authJWT.verifyToken, userController.getUser);
router.get(`${urls_config.USER_URI_PREFIX}${urls_config.USER_CURRENT_MATCH}`, authJWT.verifyToken, userController.current_match);
router.post(`${urls_config.USER_URI_PREFIX}${urls_config.USER_SIGNUP}`, userController.signup);
router.post(`${urls_config.USER_URI_PREFIX}${urls_config.USER_SIGNIN}`, userController.signin);
router.post(`${urls_config.USER_URI_PREFIX}${urls_config.USER_RESEND_ACTIVATION_LINK}`, userController.resendActivationLink);
router.get(`${urls_config.USER_URI_PREFIX}${urls_config.USER_ACTIVATE}/:userId/:activation_string`, userController.activate);
router.get(`${urls_config.USER_URI_PREFIX}${urls_config.USER_RESTORE}/:userId/:restorePasswordString`, userController.restore);
router.put(`${urls_config.USER_URI_PREFIX}${urls_config.USER_RESTORE}`, userController.changeRestoredPassword);
router.get(`${urls_config.USER_URI_PREFIX}${urls_config.USER_PRIVATE_TEST}`, authJWT.verifyToken, userController.privateTest);
router.get(`${urls_config.USER_URI_PREFIX}${urls_config.USER_PUBLIC_TEST}`, userController.publicTest);
router.post(`${urls_config.USER_URI_PREFIX}${urls_config.USER_FORGOT_PASSWORD}`, userController.forgotPassword);

module.exports = router;
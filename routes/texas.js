const express = require("express");
const router = express.Router();
const authJWT = require('../middlewares/authJWT');
const texasController = require("../controllers/texas");

router.get(`/texas/authTest`, authJWT.verifyAdminToken, texasController.authTest);
router.get(`/texas/nonAuthTest`, texasController.nonAuthTest);
router.post(`/texas/signin`, texasController.signin);
router.delete(`/texas/deleteUser`, authJWT.verifyAdminToken, texasController.deleteUser);
router.post(`/texas/getUsers`, authJWT.verifyAdminToken, texasController.getUsers);
router.get(`/texas/user/:id`, authJWT.verifyAdminToken, texasController.getUser);
router.post(`/texas/user`, authJWT.verifyAdminToken, texasController.saveUser);
router.post(`/texas/searchUser`, authJWT.verifyAdminToken, texasController.searchUser);
router.post(`/texas/deletePicture`, authJWT.verifyAdminToken, texasController.deletePicture);
router.post(`/texas/uploadPictureAdmin`, authJWT.verifyAdminToken, texasController.uploadPictureAdmin);

module.exports = router;
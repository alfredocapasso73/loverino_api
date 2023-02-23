const express = require("express");
const router = express.Router();
const authJWT = require('../middlewares/authJWT');
const texasController = require("../controllers/texas");

/*
END TO END
 */
router.post(`/texas/addPicture`, authJWT.verifyAdminToken, authJWT.verifyEndToEnd, texasController.addPicture);
router.delete(`/texas/deletePicture`, authJWT.verifyAdminToken, authJWT.verifyEndToEnd, texasController.deletePicture);
router.post(`/texas/apiToken`, authJWT.verifyAdminToken, authJWT.verifyEndToEnd, texasController.apiToken);
/*
END TO END
 */


router.post(`/texas/signin`, texasController.signin);
router.delete(`/texas/deleteUser`, authJWT.verifyAdminToken, texasController.deleteUser);
router.post(`/texas/getUsers`, authJWT.verifyAdminToken, texasController.getUsers);
router.get(`/texas/user/:id`, authJWT.verifyAdminToken, texasController.getUser);
router.post(`/texas/user`, authJWT.verifyAdminToken, texasController.saveUser);
router.post(`/texas/searchUser`, authJWT.verifyAdminToken, texasController.searchUser);

module.exports = router;
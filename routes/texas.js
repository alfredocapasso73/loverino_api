const express = require("express");
const router = express.Router();
const authJWT = require('../middlewares/authJWT');
const texasController = require("../controllers/texas");

router.get(`/texas/authTest`, authJWT.verifyAdminToken, texasController.authTest);
router.get(`/texas/nonAuthTest`, texasController.nonAuthTest);
router.post(`/texas/signin`, texasController.signin);
router.post(`/texas/getUsers`, authJWT.verifyAdminToken, texasController.getUsers);

module.exports = router;
const express = require("express");
const router = express.Router();
const authJWT = require('../middlewares/authJWT');
const suggestionController = require('../controllers/suggestion');
const urls_config = require('../config/urls.json')

router.get(`${urls_config.SUGGESTION_URI_PREFIX}${urls_config.SUGGESTION_GET_WINNERS}`, authJWT.verifyToken, suggestionController.getWinners);
router.get(`${urls_config.SUGGESTION_URI_PREFIX}${urls_config.SUGGESTION_GET_MINE}`, authJWT.verifyToken, suggestionController.getSuggestions);
router.post(`${urls_config.SUGGESTION_URI_PREFIX}${urls_config.SUGGESTION_SET_VOTE}`, authJWT.verifyToken, suggestionController.voteSuggestion);
router.post(`${urls_config.SUGGESTION_URI_PREFIX}${urls_config.SUGGESTION_POST_COMPETITION}`, authJWT.verifyToken, suggestionController.postCompetition);
router.get(`${urls_config.SUGGESTION_URI_PREFIX}${urls_config.SUGGESTION_GET_COMPETITION}`, authJWT.verifyToken, suggestionController.getCompetition);

module.exports = router;
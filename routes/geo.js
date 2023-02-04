const express = require("express");
const router = express.Router();
const geoController = require('../controllers/geo');
const urls_config = require('../config/urls.json')

router.get(`${urls_config.GET_URI_PREFIX}${urls_config.GEO_GET_REGIONS}`, geoController.getRegions);
router.get(`${urls_config.GET_URI_PREFIX}${urls_config.GEO_GET_CITIES}/:region_id`, geoController.getCities);

module.exports = router;
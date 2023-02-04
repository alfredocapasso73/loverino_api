const City = require("../models/city");
const Region = require("../models/region");
const validation = require('../helpers/validation');

exports.getRegions = async (req, res) => {
    try{
        const regions = await Region.find({});
        res.status(200).json({message: 'ok', regions: regions});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: 'something_went_wrong'});
    }
};

exports.getCities = async (req, res) => {
    try{
        const region_id = req.params.region_id;
        if(!region_id){
            res.status(400).json({message: 'missing_parameter_region'});
        }
        const cities = await City.find({region: region_id});
        if(!cities.length){
            res.status(400).json({message: 'no_cities_found_for_region'});
        }
        res.status(200).json({message: 'ok', cities: cities});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: 'something_went_wrong'});
    }
};
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Region = require('./region');

const citySchema = new Schema({
    name: {
        type: String
        ,required: [true, "name_required"]
    },
    region: {
        type: mongoose.Types.ObjectId
        ,required: [true, "region_required"]
    }
});

module.exports = mongoose.model('City', citySchema);
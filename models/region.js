const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const regionSchema = new Schema({
    name: {
        type: String
        ,required: [true, "name_required"]
    },
    country: {
        type: String
        ,default: 'se'
    },
});

module.exports = mongoose.model('Region', regionSchema);
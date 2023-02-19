const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const btsCounterSchema = new Schema({
    counter: {
        type: Number
    },
});

module.exports = mongoose.model('BtsCounter', btsCounterSchema);
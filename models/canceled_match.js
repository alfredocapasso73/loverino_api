const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const canceledMatchSchema = new Schema({
    for_user_id: {
        type: mongoose.Types.ObjectId
        ,required: true
    },
    canceling_id: {
        type: mongoose.Types.ObjectId
        ,required: true
    },
    has_been_read: {
        type: Boolean
        ,default: false
    },
}, { timestamps: true });

module.exports = mongoose.model('CanceledMatch', canceledMatchSchema);
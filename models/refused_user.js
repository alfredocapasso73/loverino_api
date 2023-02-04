const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const refusedUserSchema = new Schema({
    for_user_id: {
        type: mongoose.Types.ObjectId
        ,required: true
    },
    users: {
        type: Array
    },
}, { timestamps: true });

module.exports = mongoose.model('RefusedUser', refusedUserSchema);
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const winnerUserSchema = new Schema({
    for_user_id: {
        type: mongoose.Types.ObjectId
        ,required: true
    },
    winner_id: {
        type: mongoose.Types.ObjectId
        ,required: true
    },
}, { timestamps: true });

module.exports = mongoose.model('WinnerUser', winnerUserSchema);
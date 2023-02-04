const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const CompetitionUser = require('./competition_user').schema;

const competitionSchema = new Schema({
    for_user_id: {
        type: mongoose.Types.ObjectId
        ,required: true
    },
    status: {
        type: String, enum: ['awaiting','in_progress','ended']
        ,default: 'awaiting'
    },
    users: {
        type: [CompetitionUser]
    },
}, { timestamps: true });

module.exports = mongoose.model('Competition', competitionSchema);
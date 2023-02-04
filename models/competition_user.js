const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const competitionUserSchema = new Schema({
    user_id: {
        type: mongoose.Types.ObjectId
        ,required: true
    },
    status: {
        type: String, enum: ['unused','won','lost']
        ,default: 'unused'
    },
}, { timestamps: true });

module.exports = mongoose.model('CompetitionUser', competitionUserSchema);

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const SuggestionUser = require('./suggestion_user').schema;

const archivedSuggestionSchema = new Schema({
    for_user_id: {
        type: mongoose.Types.ObjectId
        ,required: true
    },
    created: {
        type: Date
        ,default: Date.now
    },
    status: {
        type: String, enum: ['unread','read','voted','ended']
        ,required: true
        ,default: 'unread'
    },
    users: {
        type: [SuggestionUser]
        ,required: true
    },
}, { timestamps: true });

module.exports = mongoose.model('ArchivedSuggestion', archivedSuggestionSchema);
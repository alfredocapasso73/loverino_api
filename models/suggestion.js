const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const SuggestionUser = require('./suggestion_user').schema;

const suggestionSchema = new Schema({
    for_user_id: {
        type: mongoose.Types.ObjectId
        ,required: true
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

module.exports = mongoose.model('Suggestion', suggestionSchema);
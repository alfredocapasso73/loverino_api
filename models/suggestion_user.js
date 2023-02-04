const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const suggestionUserSchema = new Schema({
    user_id: {
        type: mongoose.Types.ObjectId
        ,required: true
    },
    status: {
        type: String, enum: ['unread','refused','perhaps','liked','chosen']
        ,default: 'unread'
    },
    data: {
        type: Object
    }
}, { timestamps: true });

module.exports = mongoose.model('SuggestionUser', suggestionUserSchema);

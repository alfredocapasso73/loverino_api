const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: {
        type: String
        ,required: [true, "name_required"]
    },
    email: {
        type: String,
        unique: [true, "email_alreadyexists"],
        lowercase: true,
        trim: true,
        required: [true, "email_required"],
    },
    access_token: {
        type: String
    },
    password: {
        type: String,
        required: true
    },
    active: {
        type: Boolean,
        default: false
    },
    is_paying_user: {
        type: Boolean,
        default: true
    },
    current_step: {
        type: String,
        default: "step2"
    },
    status: {
        type: String,
        default: "in_progress"
    },
    activation_string: {
        type: String,
        required: true
    },
    restorePasswordString: {
        type: String,
        required: false
    },
    pictures: {
        type: [String],
        required: false
    },
    deletedAt: {
        type: Date,
        default: undefined
    },
    language: {
        type: String,
        default: 'se'
    },
    country: {
        type: String,
        default: 'se'
    },
    region: {
        type: mongoose.Types.ObjectId
    },
    city: {
        type: mongoose.Types.ObjectId
    },
    search_distance: {
        type: String
    },
    gender: {
        type: String, enum: ['m', 'f']
    },
    search_gender: {
        type: String, enum: ['m', 'f', 'a']
    },
    description: {
        type: String
    },
    birthday: {
        type: Date
    },
    search_min_age: {
        type: Number
    },
    search_max_age: {
        type: Number
    },
    height: {
        type: Number
    },
    body_type: {
        type: String, enum: ['xs','s','m','l','xl','xll']
    },
    suggestions_completed_at: {
        type: Date
    },
    current_match: {
        type: mongoose.Types.ObjectId,
        default: null
    },
    notify_new_match: {
        type: Boolean,
        default: true
    },
    notify_new_suggestions: {
        type: Boolean,
        default: true
    },
    logged_in_at: {
        type: Date
    },
    room: {
        type: String
    },
    signup_ip_address: {
        type: String
    },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
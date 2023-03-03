const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PartnerSchema = new Schema({
    users: [mongoose.Types.ObjectId]
}, { timestamps: true });

module.exports = mongoose.model('Partner', PartnerSchema);

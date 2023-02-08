require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");
const fs = require('fs');
const admin_helper = require('./admin_helper');

const ArchivedCompetitions = require("../models/archived_competition");
const ArchivedSuggestion = require("../models/archived_suggestion");
const CanceledMatch = require("../models/canceled_match");
const Chats = require("../models/chat");
const City = require("../models/city");
const Competition = require("../models/competition");
const LikedUser = require("../models/liked_user");
const PerhapsUser = require("../models/perhaps_user");
const RefusedUser = require("../models/refused_user");
const Region = require("../models/region");
const Suggestion = require("../models/suggestion");
const User = require("../models/user");
const WinnerUser = require("../models/winner_user");

const connectToDb = async () => {
    try{
        mongoose.set('strictQuery', false);
        await mongoose.connect(process.env.MONGO_DB, {useNewUrlParser: true,useUnifiedTopology: true,});
        console.log(`Connected to database ${process.env.MONGO_DB}`);
    }
    catch(ex){
        throw new Error(`Could not connect to database: ${ex}`);
    }
}

const connectToTestDb = async () => {
    try{
        mongoose.set('strictQuery', false);
        await mongoose.connect(process.env.MONGO_DB_TEST, {useNewUrlParser: true,useUnifiedTopology: true,});
        console.log(`Connected to database ${process.env.MONGO_DB_TEST}`);
    }
    catch(ex){
        throw new Error(`Could not connect to database: ${ex}`);
    }
}

const installRegionsAndCities = async () => {
    try{
        console.log(`Running geo_install`);
        await Region.deleteMany({});
        await City.deleteMany({});
        console.log(`Deleted regions and cities`);
        const data = fs.readFileSync(path.resolve(__dirname, './data/cities.json'));
        const all = JSON.parse(data);
        for await (el of all){
            const newRegion = new Region({name: el.name});
            await newRegion.save();
            const newRegionId = newRegion._id;
            for await (ct of el.cities){
                const newCity = new City({region: newRegionId, name: ct});
                await newCity.save();
            }
        }
        console.log(`Cities and regions inserted`);
    }
    catch(ex){
        throw new Error(`Something went wrong: ${ex}`);
    }
}

const geo_install_test = async () => {
    try{
        await connectToTestDb();
        await installRegionsAndCities();
        console.log("geo_install_test DONE");
        process.exit(1);
    }
    catch(ex){
        throw new Error(`Something went wrong: ${ex}`);
    }
}

const geo_install = async () => {
    try{
        await connectToDb();
        await installRegionsAndCities();
        console.log("geo_install DONE");
        process.exit(1);
    }
    catch(ex){
        throw new Error(`Something went wrong: ${ex}`);
    }
}

const clear_db = async () => {
    try{
        await connectToDb();
        await clear_collections();
        console.log(`All collections truncated`);
        process.exit(1);
    }
    catch(ex){
        throw new Error(`Something went wrong: ${ex}`);
    }
}

const bots = async () => {
    try{
        await connectToDb();
        console.log(`Running bots`);
        await admin_helper.deleteBots();
        await clear_collections();
        await installRegionsAndCities();
        await admin_helper.createBots();
        console.log("bots DONE");
        process.exit(1);
    }
    catch(ex){
        throw new Error(`Something went wrong: ${ex}`);
    }
}

const clear_collections = async () => {
    await ArchivedCompetitions.deleteMany({});
    await ArchivedSuggestion.deleteMany({});
    await CanceledMatch.deleteMany({});
    await Chats.deleteMany({});
    await City.deleteMany({});
    await Competition.deleteMany({});
    await LikedUser.deleteMany({});
    await PerhapsUser.deleteMany({});
    await RefusedUser.deleteMany({});
    await Region.deleteMany({});
    await Suggestion.deleteMany({});
    await User.deleteMany({});
    await WinnerUser.deleteMany({});
}

/*
node admin.js bots

node admin.js geo_install

node admin.js geo_install_test

node admin.js clear_db
 */

const usage = 'usage: node admin.js [geo_install,geo_install_test,clear_db, bots]';
if(process.argv < 3){
    return console.log(usage);
}
switch(process.argv[2]){
    case 'geo_install': geo_install().catch(console.log); break;
    case 'geo_install_test': geo_install_test().catch(console.log); break;
    case 'clear_db': clear_db().catch(console.log); break;
    case 'bots': bots().catch(console.log); break;

    default: console.log(usage);
}
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
let db_connection;

const connectToDb = async () => {
    try{
        mongoose.set('strictQuery', false);
        db_connection = await mongoose.connect(process.env.MONGO_DB, {useNewUrlParser: true,useUnifiedTopology: true,});
        console.log(`Connected to database ${process.env.MONGO_DB}`);
        return db_connection;
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

const populate_bts = async () => {
    if(process.argv.length !== 6){
        return console.log('usage: node admin.js populate_bts [age_category, gender,search_gender]');
    }
    const age_category = process.argv[3];
    const gender = process.argv[4];
    const search_gender = process.argv[5];
    try{
        await connectToDb();
        await admin_helper.populate_bts(age_category,gender,search_gender);
        process.exit(1);
    }
    catch(ex){
        throw new Error(`Something went wrong: ${ex}`);
    }
}

const single_bot = async () => {
    if(process.argv.length !== 7){
        return console.log('usage: node admin.js bot [name,age_category, gender,search_gender]');
    }
    const name = process.argv[3];
    const age_category = process.argv[4];
    const gender = process.argv[5];
    const search_gender = process.argv[6];
    console.log('name:',name);
    console.log('age_category:',age_category);
    console.log('gender:',gender);
    console.log('search_gender:',search_gender);
    try{
        await connectToDb();
        await admin_helper.createSingleBot(name, age_category, gender, search_gender);
        console.log("bot CREATED");
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

const generateBots = async () => {
    try{
        await connectToDb();
        await admin_helper.generateBots();
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

const test = async () => {
    admin_helper.testNames();
}


/*
node admin.js bots

node admin.js geo_install

node admin.js geo_install_test

node admin.js clear_db

node admin.js test



node admin.js bot alice 1830 f m
node admin.js bot alma 1830 f m
node admin.js bot selma 1830 f m
node admin.js bot elsa 1830 f m
node admin.js bot vera 1830 f m

node admin.js bot william 1830 m f
node admin.js bot noah 1830 m f
node admin.js bot hugo 1830 m f
node admin.js bot liam 1830 m f
node admin.js bot adam 1830 m f

node admin.js bot anna 4150 f m


node admin.js populate_bts 1830 f f

node admin.js populate_bts 3140 f f

node admin.js populate_bts 4150 f f

node admin.js populate_bts 5060 f f


node admin.js clear_db

node admin.js geo_install

node admin.js generateBots

*/

const usage = 'usage: node admin.js [geo_install,geo_install_test,clear_db, bots, test, populate_bts, generateBots]';
if(process.argv < 3){
    return console.log(usage);
}
switch(process.argv[2]){
    case 'geo_install': geo_install().catch(console.log); break;
    case 'geo_install_test': geo_install_test().catch(console.log); break;
    case 'clear_db': clear_db().catch(console.log); break;
    case 'bots': bots().catch(console.log); break;
    case 'test': test().catch(console.log); break;
    case 'bot': single_bot().catch(console.log); break;
    case 'populate_bts': populate_bts().catch(console.log); break;
    case 'generateBots': generateBots().catch(console.log); break;



    default: console.log(usage);
}
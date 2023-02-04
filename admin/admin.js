require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");
const fs = require('fs');
const Region = require("../models/region");
const City = require("../models/city");
const admin_helper = require('./admin_helper');

const connectToDb = async () => {
    try{
        await mongoose.connect(process.env.MONGO_DB, {useNewUrlParser: true,useUnifiedTopology: true,});
        console.log(`Connected to database ${process.env.MONGO_DB}`);
    }
    catch(ex){
        throw new Error(`Could not connect to database: ${ex}`);
    }
}

const geo_install = async () => {
    try{
        console.log(`Running geo_install`);
        await connectToDb();
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
        process.exit(0);
    }
    catch(ex){
        throw new Error(`Something went wrong: ${ex}`);
    }
}

const clear_db = async () => {
    try{
        console.log(`Running clear_db`);
        await connectToDb();
        const collections = mongoose.connection.collections;
        await Promise.all(Object.values(collections).map(async (collection) => {
            console.log(`Truncating collection ${collection.name}`);
            await collection.deleteMany({}); // an empty mongodb selector object ({}) must be passed as the filter argument
        }));
        console.log(`All collections truncated`);
        await geo_install();
        process.exit(0);
    }
    catch(ex){
        throw new Error(`Something went wrong: ${ex}`);
    }
}

const bots = async () => {
    try{
        console.log(`Running bots`);
        await connectToDb();
        await admin_helper.deleteBots();
        await admin_helper.createBots();
        process.exit(0);
    }
    catch(ex){
        throw new Error(`Something went wrong: ${ex}`);
    }
}

const usage = 'usage: node admin.js [geo_install,clear_db, bots]';
if(process.argv < 3){
    return console.log(usage);
}
switch(process.argv[2]){
    case 'geo_install': geo_install().catch(console.log); break;
    case 'clear_db': clear_db().catch(console.log); break;
    case 'bots': bots().catch(console.log); break;
    default: console.log(usage);
}
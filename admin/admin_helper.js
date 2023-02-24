const mongoose = require('mongoose');
const Region = require("../models/region");
const City = require("../models/city");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const User = require("../models/user");
const BtsCounter = require("../models/bts_counter");
const men_names = require('./data/men_names.json');
const men_descriptions = require('./data/men_descriptions.json');
const women_names = require('./data/women_names.json');
const women_descriptions = require('./data/women_descriptions.json');
const bcrypt = require("bcrypt");
const helper = require("../helpers/helper");

const findDuplicates = (arr) => {
    return arr.filter((currentValue, currentIndex) =>
        arr.indexOf(currentValue) !== currentIndex);
}

exports.testNames = () => {
    const arr = men_names.concat(women_names);
    const duplicates = findDuplicates(arr);
    console.log("duplicates",duplicates);
}

const getAgeCategories = () => {
    return [
        {name: '1830', from: 18, to: 30}
        ,{name: '3140', from: 31, to: 40}
        ,{name: '4150', from: 41, to: 50}
        ,{name: '5160', from: 51, to: 60}
    ];
};

const getRandomAge = (age_obj) => {
    const min = Math.ceil(age_obj.from);
    const max = Math.floor(age_obj.to);
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getRandomHeight = (gender) => {
    const from = gender === 'f' ? 155 : 170;
    const to = gender === 'f' ? 175 : 190;
    const min = Math.ceil(from);
    const max = Math.floor(to);
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getRandomBodyType = () => {
    const min = Math.ceil(0);
    const max = Math.floor(1);
    const result = Math.floor(Math.random() * (max - min + 1)) + min;
    return result === 1 ? 'm' : 'l';
};

const getRandomCityAndRegion = async () => {
    const min = Math.ceil(0);
    const max = Math.floor(2);
    const result = Math.floor(Math.random() * (max - min + 1)) + min;
    let region_name = '';
    switch(result){
        case 0: region_name = 'Stockholm'; break;
        case 1: region_name = 'Västra Götaland'; break;
        case 2: region_name = 'Skåne'; break;
    }
    const region = await Region.findOne({name: region_name});
    const region_id = region._id;
    const all_cities = await City.find({region: region_id});
    const randomCities = all_cities.sort(() => Math.random() - 0.5);
    const city = randomCities[0];
    return {region: region, city: city};
};

/*const  savePictures = async (nr) => {
    try{
        const from_dirname = `./pics/${nr}`;
        const to_dirname = '../upload';
        const filenames = fs.readdirSync(from_dirname);
        const pictures = [];
        for await (const file of filenames){
            await new Promise(resolve => setTimeout(resolve, 500));
            const name = new Date().getTime() + path.extname(file);
            const picture_name = 'picture-' + name;
            const from_name = path.join(from_dirname, file);
            const to_name = path.join(to_dirname, picture_name);
            await sharp(from_name).resize(50, 50).toFile(to_dirname + '/tiny-picture-' + name);
            await sharp(from_name).resize(200, 200).toFile(to_dirname + '/small-picture-' + name);
            fs.copyFileSync(from_name, to_name);
            pictures.push(name);
            console.log("name: ",name);
        }
        return pictures;
    }
    catch(ex){
        console.log("Error occurred: ",ex);
    }
};*/

const numberOfBots = async () => {
    try{
        const from_dirname = `./pics/`;
        const filenames = fs.readdirSync(from_dirname);
        let nr_of_dirs = 0;
        for await (const file of filenames){
            const as_int = parseInt(file);
            if(!isNaN(as_int)){
                nr_of_dirs++;
            }
        }
        return nr_of_dirs;
    }
    catch(exception){
        console.log("Error occurred: ",exception);
    }
};

exports.createSingleBot = async (name, age_category, gender, search_gender) => {
    try{
        const email = `${name}@loverino.se`;
        const password = bcrypt.hashSync(`loverino`, 8);
        const current_step = `done`;
        const status = `complete`;
        const activation_string = `none`;
        const search_min_age = 18;
        const search_max_age = 60;
        const search_distance = 'all';
        const active = true;
        const city_and_region = await getRandomCityAndRegion();

        const age_categories = getAgeCategories();
        const age_obj = age_categories.find(el => el.name === age_category);
        const birthday = helper.birthdayFromAge(getRandomAge(age_obj));
        const height = getRandomHeight(gender);
        const body_type = getRandomBodyType();
        const region = city_and_region.region;
        const city = city_and_region.city;
        console.log("birthday",birthday);
        const user = {
            name: name
            ,email: email
            ,password: password
            ,current_step: current_step
            ,status: status
            ,gender: gender
            ,search_gender: search_gender
            ,search_min_age: search_min_age
            ,search_max_age: search_max_age
            ,search_distance: search_distance
            ,active: active
            ,birthday: birthday
            ,height: height
            ,body_type: body_type
            ,activation_string: activation_string
            ,region: region._id
            ,city: city._id
            , description: ''
        };
        const new_user = new User(user);
        console.log(new_user);
        await new_user.save();
    }
    catch(ex){
        console.log("Error occurred: ",ex);
    }
}

exports.deleteBots = async () => {
    try{
        console.log("Deleting bots");
        const users_to_delete = await User.find({email: { $regex: 'loverino.se'}});
        const dirname = '../upload';
        for await (const user of users_to_delete){
            const pictures = user.pictures;
            for await (const pic of pictures){
                if(fs.existsSync(`${dirname}/picture-${pic}`)){
                    fs.unlinkSync(`${dirname}/picture-${pic}`);
                }
                if(fs.existsSync(`${dirname}/small-picture-${pic}`)){
                    fs.unlinkSync(`${dirname}/small-picture-${pic}`);
                }
                if(fs.existsSync(`${dirname}/tiny-picture-${pic}`)){
                    fs.unlinkSync(`${dirname}/tiny-picture-${pic}`);
                }
            }
        }

        const result = await User.deleteMany({email: { $regex: 'loverino.se'}});
        console.log(`Deleted ${result.deletedCount} bots`);
    }
    catch(ex){
        console.log("Error occurred: ",ex);
    }
};

exports.createBotsOLD = async () => {
    try{
        console.log("Creating bots");
        men_names.sort(function() {return 0.5 - Math.random()});
        women_names.sort(function() {return 0.5 - Math.random()});
        men_descriptions.sort(function() {return 0.5 - Math.random()});
        women_descriptions.sort(function() {return 0.5 - Math.random()});
        const nr_of_bots = await numberOfBots();
        const age_categories = getAgeCategories();
        const nr_of_loops = Array.from({length: nr_of_bots}, (_, i) => i + 1);
        const age_steps = ((nr_of_bots/age_categories.length)/4);
        let current_age_step = 0;
        let current_age_steps_counter = 0;
        let image_counter = 1;
        const password = bcrypt.hashSync(`loverino`, 8);
        const current_step = `done`;
        const status = `complete`;
        const activation_string = `none`;
        const search_min_age = 18;
        const search_max_age = 60;
        const search_distance = 'all';
        const active = true;

        for await (const i of nr_of_loops){
            const age_category = age_categories[current_age_step];
            console.log('age_categories[current_age_step]:',age_categories[current_age_step]);
            const city_and_region = await getRandomCityAndRegion();
            const gender = i <= (nr_of_bots/2) ? 'm' : 'f';
            const name = i <= (nr_of_bots/2) ? men_names[men_names.length-1] : women_names[women_names.length-1];
            const description = i <= (nr_of_bots/2) ? men_descriptions[men_descriptions.length-1] : women_descriptions[women_descriptions.length-1];
            const email = `${name}@loverino.se`;
            let search_gender = '';
            if(i <= (nr_of_bots/2)){
                if(i <= (nr_of_bots/4)){
                    search_gender = 'f';
                }
                else{
                    search_gender = 'm';
                }
            }
            else{
                if(i <= ((nr_of_bots/4)+nr_of_bots/2)){
                    search_gender = 'm';
                }
                else{
                    search_gender = 'f';
                }
            }

            const birthday = helper.birthdayFromAge(getRandomAge(age_category));
            const height = getRandomHeight(gender);
            const body_type = getRandomBodyType();
            const region = city_and_region.region;
            const city = city_and_region.city;

            const pictures = await savePictures(image_counter);
            if(pictures?.length){
                const user = {
                    name: name
                    ,email: email
                    ,password: password
                    ,current_step: current_step
                    ,status: status
                    ,gender: gender
                    ,search_gender: search_gender
                    ,search_min_age: search_min_age
                    ,search_max_age: search_max_age
                    ,search_distance: search_distance
                    ,active: active
                    ,birthday: birthday
                    ,height: height
                    ,body_type: body_type
                    ,activation_string: activation_string
                    ,region: region._id
                    ,city: city._id
                    , description: description
                    , pictures: pictures
                };
                const new_user = new User(user);
                await new_user.save();
                console.log(`Saving `,user.email);
                console.log(`counter: `,image_counter);
                //console.log(`user: `,user);
                //console.log(``);
            }
            gender === 'm' ? men_names.pop() : women_names.pop();
            gender === 'm' ? men_descriptions.pop() : women_descriptions.pop();
            image_counter++;
            if(current_age_steps_counter >= (age_steps-1)){
                current_age_steps_counter = 0;
                if((current_age_step+1) > age_categories.length-1){
                    current_age_step = 0;
                }
                else{
                    current_age_step++;
                }
            }
            else{
                current_age_steps_counter++;
            }
        }
    }
    catch(ex){
        console.log("Error occurred: ",ex);
    }
};


exports.createBots = async (gender, age_category) => {
    try{
        console.log("Creating bots");
        men_names.sort(function() {return 0.5 - Math.random()});
        women_names.sort(function() {return 0.5 - Math.random()});
        men_descriptions.sort(function() {return 0.5 - Math.random()});
        women_descriptions.sort(function() {return 0.5 - Math.random()});
        const nr_of_bots = await numberOfBots();
        const nr_of_loops = Array.from({length: nr_of_bots}, (_, i) => i + 1);
        const age_steps = ((nr_of_bots/age_categories.length)/4);
        let current_age_step = 0;
        let current_age_steps_counter = 0;
        let image_counter = 1;
        const password = bcrypt.hashSync(`loverino`, 8);
        const current_step = `done`;
        const status = `complete`;
        const activation_string = `none`;
        const search_min_age = 18;
        const search_max_age = 60;
        const search_distance = 'all';
        const active = true;

        for await (const i of nr_of_loops){
            const city_and_region = await getRandomCityAndRegion();
            const gender = i <= (nr_of_bots/2) ? 'm' : 'f';
            const name = i <= (nr_of_bots/2) ? men_names[men_names.length-1] : women_names[women_names.length-1];
            const description = '';
            const email = `${name}@loverino.se`;
            let search_gender = '';
            if(i <= (nr_of_bots/2)){
                if(i <= (nr_of_bots/4)){
                    search_gender = 'f';
                }
                else{
                    search_gender = 'm';
                }
            }
            else{
                if(i <= ((nr_of_bots/4)+nr_of_bots/2)){
                    search_gender = 'm';
                }
                else{
                    search_gender = 'f';
                }
            }

            const birthday = helper.birthdayFromAge(getRandomAge(age_category));
            const height = getRandomHeight(gender);
            const body_type = getRandomBodyType();
            const region = city_and_region.region;
            const city = city_and_region.city;

            const pictures = await savePictures(image_counter);
            if(pictures?.length){
                const user = {
                    name: name
                    ,email: email
                    ,password: password
                    ,current_step: current_step
                    ,status: status
                    ,gender: gender
                    ,search_gender: search_gender
                    ,search_min_age: search_min_age
                    ,search_max_age: search_max_age
                    ,search_distance: search_distance
                    ,active: active
                    ,birthday: birthday
                    ,height: height
                    ,body_type: body_type
                    ,activation_string: activation_string
                    ,region: region._id
                    ,city: city._id
                    , description: description
                    , pictures: pictures
                };
                const new_user = new User(user);
                await new_user.save();
                console.log(`Saving `,user.email);
                console.log(`counter: `,image_counter);
                //console.log(`user: `,user);
                //console.log(``);
            }
            image_counter++;
            if(current_age_steps_counter >= (age_steps-1)){
                current_age_steps_counter = 0;
                if((current_age_step+1) > age_categories.length-1){
                    current_age_step = 0;
                }
                else{
                    current_age_step++;
                }
            }
            else{
                current_age_steps_counter++;
            }
        }
    }
    catch(ex){
        console.log("Error occurred: ",ex);
    }
};


//db.btscounters.updateOne({_id: ObjectId('63f09c066f0de612106caea8')},{$set: {counter: 0}});
exports.populate_bts = async (age_category,gender,search_gender) => {
    try{
        const max_counter_per_category = 50;
        const counter_id = mongoose.Types.ObjectId('63f09c066f0de612106caea8');
        console.log("populate_bts");
        const counter_object = await BtsCounter.findOne({_id: counter_id});
        if(counter_object.counter === max_counter_per_category){
            await BtsCounter.updateOne({_id: counter_id}, {$set: {counter: 0}});
            console.log('MAX USER PER CATEGORY REACHED!');
            return;
        }
        const counter = counter_object.counter+1;
        const screenshot_folder = `/Users/alfredocapasso/screenshots`;
        const bts_folder = `/Users/alfredocapasso/loverino/loverino_api/admin/bts/${gender}${search_gender}${age_category}`;
        const bts_counter_folder = `${bts_folder}/${counter}`;
        if (!fs.existsSync(bts_folder)) {
            console.log('creating folder:',bts_folder);
            fs.mkdirSync(bts_folder);
        }
        if (!fs.existsSync(bts_counter_folder)) {
            console.log('creating folder:',bts_counter_folder);
            fs.mkdirSync(bts_counter_folder);
        }
        const screenshot_filenames = fs.readdirSync(screenshot_folder);
        for await (const file of screenshot_filenames){
            const from_name = path.join(screenshot_folder, file);
            const to_name = path.join(bts_counter_folder, file);
            fs.copyFileSync(from_name, to_name);
            fs.unlinkSync(from_name);
        }
        console.log('Screen DONE');
        await BtsCounter.updateOne({_id: counter_id}, {$set: {counter: counter}});
    }
    catch(ex){
        console.log("Error occurred: ",ex);
    }
};





exports.generateBots = async () => {
    const structure = [
        {name: 'ff1830', from: 18, to: 30, gender: 'f', search_gender: 'f'}
        ,{name: 'ff3140', from: 31, to: 40, gender: 'f', search_gender: 'f'}
        ,{name: 'ff4150', from: 41, to: 50, gender: 'f', search_gender: 'f'}
        ,{name: 'ff5160', from: 51, to: 60, gender: 'f', search_gender: 'f'}

        ,{name: 'fm1830', from: 18, to: 30, gender: 'f', search_gender: 'm'}
        ,{name: 'fm3140', from: 31, to: 40, gender: 'f', search_gender: 'm'}
        ,{name: 'fm4150', from: 41, to: 50, gender: 'f', search_gender: 'm'}
        ,{name: 'fm5160', from: 51, to: 60, gender: 'f', search_gender: 'm'}

        ,{name: 'mm1830', from: 18, to: 30, gender: 'm', search_gender: 'm'}
        ,{name: 'mm3140', from: 31, to: 40, gender: 'm', search_gender: 'm'}
        ,{name: 'mm4150', from: 41, to: 50, gender: 'm', search_gender: 'm'}
        ,{name: 'mm5160', from: 51, to: 60, gender: 'm', search_gender: 'm'}

        ,{name: 'mf1830', from: 18, to: 30, gender: 'm', search_gender: 'f'}
        ,{name: 'mf3140', from: 31, to: 40, gender: 'm', search_gender: 'f'}
        ,{name: 'mf4150', from: 41, to: 50, gender: 'm', search_gender: 'f'}
        ,{name: 'mf5160', from: 51, to: 60, gender: 'm', search_gender: 'f'}
    ];
    console.log("generateBots");
    try{
        men_names.sort(function() {return 0.5 - Math.random()});
        women_names.sort(function() {return 0.5 - Math.random()});
        const password = bcrypt.hashSync(`loverino`, 8);
        const current_step = `done`;
        const status = `complete`;
        const activation_string = `none`;
        const search_min_age = 18;
        const search_max_age = 60;
        const search_distance = 'all';
        const active = true;
        const description = '';

        const bts_folder = `/Users/alfredocapasso/loverino/api/admin/bts`;
        console.log("bts_folder",bts_folder);
        const bts_folder_dirs = fs.readdirSync(bts_folder);

        for await (const dir of bts_folder_dirs){
            console.log("dir:",dir);
            const found = structure.find(el => el.name === dir);
            if(found && dir !== '.DS_Store'){
                const structure_folder = `${bts_folder}/${dir}`;
                const structure_folder_dirs = fs.readdirSync(structure_folder);
                console.log("found:",found);
                for await (const inner_dir of structure_folder_dirs){
                    console.log("inner_dir:",inner_dir);
                    if(inner_dir !== '.DS_Store'){
                        const inner_dir_folder = `${structure_folder}/${inner_dir}`;
                        const pictures = await storePictures(inner_dir_folder);
                        if(pictures && pictures?.length){
                            const name = found.gender === 'm' ? men_names[0] : women_names[0];
                            found.gender === 'm' ? men_names.shift() : women_names.shift();
                            const email = `${name}@loverino.se`;
                            const gender = found.gender;
                            const search_gender = found.search_gender;
                            const height = getRandomHeight(gender);
                            const body_type = getRandomBodyType();
                            const city_and_region = await getRandomCityAndRegion();
                            const region = city_and_region.region;
                            const city = city_and_region.city;
                            const birthday = helper.birthdayFromAge(getRandomAge(found));

                            const user = {
                                name: name
                                ,email: email
                                ,password: password
                                ,current_step: current_step
                                ,status: status
                                ,gender: gender
                                ,search_gender: search_gender
                                ,search_min_age: search_min_age
                                ,search_max_age: search_max_age
                                ,search_distance: search_distance
                                ,active: active
                                ,birthday: birthday
                                ,height: height
                                ,body_type: body_type
                                ,activation_string: activation_string
                                ,region: region._id
                                ,city: city._id
                                , description: description
                                , pictures: pictures
                            };
                            console.log(`Saving `,user.email);
                            console.log("user",user);
                            const new_user = new User(user);
                            await new_user.save();
                        }
                    }
                }
            }
        }
    }
    catch(exception){
        console.log("exception:",exception);
    }
};

const  storePictures = async (from_dirname) => {
    try{
        const to_dirname = '../upload';
        const filenames = fs.readdirSync(from_dirname);
        const pictures = [];
        for await (const file of filenames){
            await new Promise(resolve => setTimeout(resolve, 500));
            const name = new Date().getTime() + path.extname(file);
            const picture_name = 'picture-' + name;
            const from_name = path.join(from_dirname, file);
            const to_name = path.join(to_dirname, picture_name);
            const resize_tiny = { width: 50, height: 50, fit: 'contain' };
            const resize_small = { width: 200, height: 200, fit: 'contain' };
            const resize_big = { width: 800, fit: 'contain' };
            await sharp(from_name).resize(resize_tiny).toFile(to_dirname + '/tiny-picture-' + name);
            await sharp(from_name).resize(resize_small).toFile(to_dirname + '/small-picture-' + name);
            await sharp(from_name).resize(resize_big).toFile(to_dirname + '/big-picture-' + name);
            fs.copyFileSync(from_name, to_name);
            pictures.push(name);
            console.log("name: ",name);
        }
        return pictures;
    }
    catch(ex){
        console.log("Error occurred: ",ex);
    }
};
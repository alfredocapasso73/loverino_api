const jwt = require("jsonwebtoken");
const User = require('../models/user');
const Partner = require('../models/partners');
const Region = require('../models/region');
const City = require('../models/city');
const user_handler = require('../helpers/user_handler');

/*
END TO END
 */
exports.addPicture = async (req, res) => {
    return user_handler.addPicture(req, res, req.body.user_id);
};

exports.deletePicture = async (req, res) => {
    if(!req.body.picture_id){
        return res.status(500).send({message: 'no_image_to_remove'});
    }
    return user_handler.deletePicture(req, res, req.body.user_id, req.body.picture_id);
};

exports.apiToken = async (req, res) => {
    try{
        return res.status(200).send({message: "ok"});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};
/*
END TO END
 */

exports.signin = async (req, res) => {
    try{
        const username = req.body.username || '';
        const password = req.body.password || '';
        if(
            username !== process.env.ADMIN_USERNAME
            || password !== process.env.ADMIN_PASSWORD
        ){
            return res.status(500).send({error: "login_failed"});
        }
        const admin_token = jwt.sign({username: process.env.ADMIN_USERNAME}, process.env.ADMIN_API_SECRET, {expiresIn: 86400});
        return res.status(200).send({message: "ok", admin_token: admin_token});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};

exports.getMatches = async (req, res) => {
    try{
        const matches_per_page = req?.body?.matches_per_page || 10;
        const current_page = req?.body?.current_page || 10;
        const count = await Partner.count({});
        const skip = (matches_per_page*current_page)-(matches_per_page);
        const tmp_partners = await Partner.find({}).limit(matches_per_page).skip(skip).lean();
        const partners = [];
        for await (const prtn of tmp_partners){
            if(prtn?.users?.length === 2){
                const user1_id = prtn.users[0];
                const user2_id = prtn.users[1];
                const user1 = await User.findOne({_id: user1_id});
                const user2 = await User.findOne({_id: user2_id});
                partners.push({user1: user1,user2: user2});
            }
        }
        return res.status(200).send({message: "ok", count: count, partners: partners});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};

exports.getUsers = async (req, res) => {
    try{
        const users_per_page = req?.body?.users_per_page;
        const current_page = req.body.current_page;
        const sort_by = req.body.sort_by;
        const sort_dir = req.body.sort_dir;
        const where = {};
        const count = await User.count(where);
        const skip = (users_per_page*current_page)-(users_per_page);
        const sort = sort_dir === 'asc' ? {[sort_by]: 1} : {[sort_by]: -1};
        console.log('sort:',sort);
        const users = await User.find(where).limit(users_per_page).sort(sort).skip(skip).lean();
        for await (const user of users){
            const city = await City.findOne({_id: user.city});
            if(city){
                user.city_name = city.name;
            }
            const region = await Region.findOne({_id: user.region});
            if(region){
                user.region_name = region.name;
            }
        }
        return res.status(200).send({message: "ok", users: users, count: count});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};

exports.getUser = async (req, res) => {
    try{
        const user_id = req.params.id;
        const user = await User.findOne({_id: user_id});
        return res.status(200).send({message: "ok", user: user});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};

exports.saveUser = async (req, res) => {
    try{
        const user_param = req.body.user;
        const user = await User.findOne({_id: user_param._id});
        user.name = user_param.name;
        user.active = user_param.active;
        user.is_paying_user = user_param.is_paying_user;
        user.search_distance = user_param.search_distance;
        user.gender = user_param.gender;
        user.search_gender = user_param.search_gender;
        user.description = user_param.description;
        user.birthday = user_param.birthday;
        user.search_min_age = user_param.search_min_age;
        user.search_max_age = user_param.search_max_age;
        user.height = user_param.height;
        user.body_type = user_param.body_type;
        user.region = user_param.region;
        user.city = user_param.city;
        await user.save();
        return res.status(200).send({message: "ok"});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};

exports.searchUser = async (req, res) => {
    try{
        const query = req.body.query;
        const user_by_email = await User.findOne({email: query});
        if(user_by_email){
            return res.status(200).send({message: "ok", user: user_by_email});
        }
        const user_by_id = await User.findOne({_id: query});
        if(user_by_id){
            return res.status(200).send({message: "ok", user: user_by_id});
        }
        return res.status(500).send({message: "user_not_found"});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};

exports.deleteUser = async (req, res) => {
    try{
        const user_id = req.body.user_id;
        const user = await User.findOne({_id: user_id});
        if(!user){
            return res.status(500).send({error: 'user_not_found'});
        }
        await user_handler.manageUserClosingAccount(user);
        return res.status(200).send({message: "user_removed"});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};
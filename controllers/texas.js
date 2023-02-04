const jwt = require("jsonwebtoken");
const User = require('../models/user');
const Region = require('../models/region');
const City = require('../models/city');

exports.authTest = async (req, res) => {
    try{
        return res.status(200).send({message: "authTest"});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};

exports.nonAuthTest = async (req, res) => {
    try{
        console.log('are we here');
        return res.status(200).send({message: "nonAuthTest"});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};

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

exports.getUsers = async (req, res) => {
    try{
        const users_per_page = req?.body?.users_per_page;
        const current_page = req.body.current_page;
        const where = {};
        const count = await User.count(where);
        const skip = (users_per_page*current_page)-(users_per_page);
        const users = await User.find(where).limit(users_per_page).skip(skip).lean();
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

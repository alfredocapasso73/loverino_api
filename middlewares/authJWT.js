const jwt = require("jsonwebtoken");
const User = require("../models/user");

exports.verifyToken = (req, res, next) => {
    if (req.headers && req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        jwt.verify(req.headers.authorization.split(' ')[1], process.env.API_SECRET, async function (err, decode) {
            if (err){
                return res.status(500).send({message: "jwt_expired"});
            }
            try{
                const user = await User.findOne({_id: decode.id}).lean();
                req.user = user;
                next();
            }
            catch(exception){
                console.log("exception:",exception);
                return res.status(500).send({message: err});
            }
        });
    }
    else{
        res.status(401).send({message: 'unauthorized'});
    }
}

exports.verifyAdminToken = (req, res, next) => {
    if (req.headers && req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        jwt.verify(req.headers.authorization.split(' ')[1], process.env.ADMIN_API_SECRET, async function (err, decode) {
            if (err){
                return res.status(500).send({message: err});
            }
            try{
                next();
            }
            catch(exception){
                return res.status(500).send({message: exception});
            }
        });
    }
    else{
        res.status(401).send({message: 'unauthorized'});
    }
}

exports.verifyEndToEnd = (req, res, next) => {
    try{
        const allowed_ips = process.env.ALLOWED_END_TO_END_IP;
        const ip = req.socket.remoteAddress;
        if(!allowed_ips.includes(ip)){
            console.log("allowed_ips:",allowed_ips);
            console.log("ip:",ip);
            console.log("unauthorized");
            return res.status(401).send({message: 'unauthorized'});
        }
        next();
    }
    catch(exception){
        return res.status(500).send({message: err});
    }
}
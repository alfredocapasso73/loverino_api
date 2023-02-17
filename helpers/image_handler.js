const User = require("../models/user");
const path = require('path');
const sharp = require('sharp');
const multer  = require('multer');
const fs = require('fs');
const helper = require("./helper");

const storeUserImage = async (req, user_id) => {
    const resize_tiny = { width: 50, height: 50, fit: 'contain' };
    const resize_small = { width: 200, height: 200, fit: 'contain' };
    const resize_big = { width: 800, fit: 'contain' };

    await sharp(req.file.path).resize(resize_tiny).toFile(process.env.IMAGE_UPLOAD_PATH + '/tiny-' + req.file.filename);
    await sharp(req.file.path).resize(resize_small).toFile(process.env.IMAGE_UPLOAD_PATH + '/small-' + req.file.filename);
    await sharp(req.file.path).resize(resize_big).toFile(process.env.IMAGE_UPLOAD_PATH + '/big-' + req.file.filename);
    const filename = req.file.filename.replace('picture-', '');
    await User.updateOne({_id: user_id},  {$addToSet: {"pictures": [filename]}});
    const foundUser = await User.find({_id: user_id});
    const pictures = foundUser[0].pictures;
    await User.updateOne({_id: user_id},  {$set: {"current_step": "done", "status": "complete"}});
    return pictures;
}

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, process.env.IMAGE_UPLOAD_PATH);
    },
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});


const imageFilter = function(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|webp|WEBP)$/)) {
        req.fileValidationError = 'only_images_allowed';
        return cb(new Error('only_images_allowed'), false);
    }
    /*if (!file.size > 100000000) {
        req.fileValidationError = 'max_size_10_mb';
        return cb(new Error('max_size_10_mb'), false);
    }*/
    if (file.size > 1048576) {
        req.fileValidationError = 'max_size_10_mb';
        return cb(new Error('max_size_10_mb'), false);
    }
    cb(null, true);
};

exports.deletePicture = async (req, res) => {
    try{
        if(!req.body.picture_id){
            return res.status(500).json({error: 'no_image_sent'});
        }
        if(!req.body.user_id && !req.user._id){
            return res.status(500).json({error: 'no_user_id_sent'});
        }
        const user_id = req?.user?._id ? req.user._id : req.body.user_id;
        const picture_deleted = await helper.deleteUserPicture(req.body.picture_id, user_id);
        if(!picture_deleted){
            return res.status(500).json({error: 'unknown_error'});
        }
        return res.status(200).send({message: "ok"});
    }
    catch(exception){
        console.log(exception);
        return res.status(500).send({message: exception});
    }
};

exports.uploadPicture = async (req, res) => {
    let upload = multer({ storage: storage, fileFilter: imageFilter, limits: { fileSize: 10485760 }  }).single('picture');
    upload(req, res, async function(err) {
        if(!req?.user?._id && !req?.body?.user_id){
            return res.status(500).json({error: "missing_user"});
        }
        const user_id = req?.user?._id ? req.user._id : req.body.user_id;
        if (err instanceof multer.MulterError) {
            if(err.code === 'LIMIT_FILE_SIZE'){
                return res.status(500).json({error: "file_too_large"});
            }
            else{
                return res.status(500).json({error: err});
            }
        }
        if (req.fileValidationError) {
            return res.status(500).json({error: 'only_images_allowed'});
        }
        if (!req.file) {
            return res.status(500).json({error: 'no_image_sent'});
        }
        if (err) {
            return res.status(500).json({error: err});
        }

        try {
            const pictures = await storeUserImage(req, user_id);
            const filename = req.file.filename.replace('picture-', '');
            return res.json({message: "ok", pictures: pictures, filename: filename});
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({error: 'image_thumb_error'});
        }
    });
};

exports.getImage = async (req, res) => {
    try{
        const image = req.params.image;
        //const image_not_found = 'image_not_found.png';
        const image_not_found = 'no-photo.png';
        //const no_photo = '/images/no-photo.png';

        let imgPath = `${process.env.IMAGE_UPLOAD_PATH}/${image}`;
        if(!fs.existsSync(imgPath)){
            imgPath = `${process.env.IMAGES_PATH}/${image_not_found}`;
        }
        const img_file = fs.readFileSync(imgPath);
        const img = Buffer.from(img_file, 'base64');
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': img.length
        });
        res.end(img);
    }
    catch(exception){
        return res.status(500).send({error: exception});
    }
}

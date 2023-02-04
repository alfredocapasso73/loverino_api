const express = require("express");
const cors = require('cors');

const userRoute = require("./routes/user");
const geoRoute = require("./routes/geo");
const suggestionRoute = require("./routes/suggestion");
const texasRoute = require("./routes/texas");

const app = express();
//app.use(express.static('tmp_images'))


//app.use(express.json());
app.use(express.json({limit: '50mb'}));

app.use(cors())

const multer  = require('multer');
const upload = multer({ dest: './tmp_images/' })

app.get("/", (req, res) => {
    res.status(200).json({ alive: "True" });
});

app.post('/stats', upload.single('uploaded_file'), function (req, res) {
    // req.file is the name of your file in the form above, here 'uploaded_file'
    // req.body will hold the text fields, if there were any
    console.log(req.file, req.body);
    res.status(200).json({ fatto: "giafatto" });
});


app.get("/api/v1/alive", (req, res) => {
    res.status(200).json({alive: true});
});

app.use("/api/v1", userRoute);
app.use("/api/v1", geoRoute);
app.use("/api/v1", suggestionRoute);
app.use("/api/v1", texasRoute);


module.exports = app;
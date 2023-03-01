const express = require("express");
const cors = require('cors');
const app = express();
app.use(express.json({limit: '50mb'}));

const cors_origins =
    [
        "https://localoverino.se:8080"
        ,"https://texas.localoverino.se:8080"
        ,"https://loverino.se"
        ,"https://www.loverino.se"
        ,"https://texas.loverino.se"
    ];

app.use(cors({
    origin: cors_origins,
    methods: ['GET','POST','DELETE','UPDATE','PUT','PATCH']
}));

const userRoute = require("./routes/user");
const geoRoute = require("./routes/geo");
const suggestionRoute = require("./routes/suggestion");
const texasRoute = require("./routes/texas");

app.get("/", (req, res) => {
    res.status(200).json({ alive: "True" });
});

app.use("/api/v1", userRoute);
app.use("/api/v1", geoRoute);
app.use("/api/v1", suggestionRoute);
app.use("/api/v1", texasRoute);

module.exports = app;
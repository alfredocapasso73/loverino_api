const mongoose = require("mongoose");
const app = require("./app");
require("dotenv").config();

console.log(`api server - process.env.MONGO_DB ${process.env.MONGO_DB}`);
mongoose.set('strictQuery', false);
mongoose
    .connect(process.env.MONGO_DB, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => {
        app.listen(process.env.PORT, console.log(`Server started on port ${process.env.PORT}`));
    })
    .catch((err) => {
        console.log(err);
    });
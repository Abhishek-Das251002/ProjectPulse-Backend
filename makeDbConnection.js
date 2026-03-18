const mongoose = require("mongoose")
require("dotenv").config()

const connectionUri = process.env.MONGODB 
const makeConnection = async () => {
    await mongoose
    .connect(connectionUri)
    .then(() => {console.log('connected to database')})
    .catch((error) => {console.log(error.message)})
}

module.exports = {makeConnection}
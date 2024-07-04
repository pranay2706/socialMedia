const mongoose = require('mongoose')
function mongoConnection() {

    const DB_URL = process.env.DB_URL.replace('<password>', process.env.DB_PASSWORD)

    mongoose.connect(DB_URL)
        .then(() => console.log('database connected successfully'))
}

module.exports = mongoConnection
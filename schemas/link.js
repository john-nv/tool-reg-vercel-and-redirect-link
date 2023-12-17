const mongoose = require('mongoose')
const Schema = mongoose.Schema

const link = new Schema({
    link: String,
    domain: String,
})

module.exports = mongoose.model('links', link)
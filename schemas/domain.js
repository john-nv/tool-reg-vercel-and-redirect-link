const mongoose = require('mongoose')
const Schema = mongoose.Schema

const domain = new Schema({
    domain: String,
})

module.exports = mongoose.model('domains', domain)
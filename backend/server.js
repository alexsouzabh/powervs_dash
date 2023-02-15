const express = require('express')
const app = express()
const cors = require('cors');

require('dotenv').config()

app.use(cors())
app.use(express.json())
app.use('/api', require('./routes'))

app.use('/home', express.static(__dirname + '/public'))
app.use('/instance', express.static(__dirname + '/public'))
// app.use('/users', express.static(__dirname + '/public'))
app.use(express.static(__dirname + '/public'))

app.listen(3000)
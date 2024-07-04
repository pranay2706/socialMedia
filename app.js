const express = require('express')
const morgan = require('morgan')

const userRouter = require('./routes/userRoutes')
const globleErrorhandler = require('./controllers/errorController')

const app = express()

app.use(express.json())

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'))
}

app.use('/api/v1/user', userRouter)

app.use(globleErrorhandler)

module.exports = app
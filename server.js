const dotenv = require('dotenv')
dotenv.config({ path: './config.env' })

const app = require('./app')
const connectMongoDB = require('./mongoConnection')

const port = process.env.PORT || 8080

try {
    connectMongoDB()
    app.listen(port, () => {
        console.log('server running on port : ', port)
    })
} catch (err) {
    console.log(err.name, err.message)
}

const AppError = require("../utils/AppError")

const sendErrorDev = (err, res) => {
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        })
    } else {
        res.status(500).json({
            status: "error",
            message: err.message,
        })
    }
}

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500
    err.status = err.status || 'error'
    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res)
    }
}
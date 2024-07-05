const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')

const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const Email = require('../utils/email')

function removeInvalidFields(excludedFields, reqData) {
    Object.keys(reqData).forEach(key => {
        if (excludedFields.includes(key)) {
            delete reqData[key];
        }
    });
}

function generateRadomSixDigitCode() {
    return Math.floor(Math.random() * 900000) + 100000;
}

async function createAndSendToken(user, statusCode, res) {
    let token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' })

    const cookieOptions = {
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        httpOnly: true,
        sameSite: 'None',
    }

    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true

    res.cookie('jwt', token, cookieOptions)

    res.status(statusCode).json({
        status: "success",
        data: {
            user
        }
    })
}

exports.protect = catchAsync(async (req, res, next) => {

    let token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1]
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt
    }

    if (!token) {
        return next(new AppError('You are not logged in! Please login', 401))
    }

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    console.log(decoded)

    const currentUser = await User.findById(decoded.id)

    if (!currentUser) {
        return next(new AppError('User no longer exists', 401))
    }

    if (currentUser.changePasswordAfter(decoded.iat)) {
        return next(new AppError('User recently changed password! please login in again', 401))
    }

    req.user = currentUser;

    next()
})

exports.signUp = catchAsync(async (req, res, next) => {
    excludedFields = ['role']
    removeInvalidFields(excludedFields, req.body);

    let user = await User.findOne({
        email: req.body.email,
        phoneNumber: req.body.phoneNumber
    })

    if (user) {
        return next(new AppError('user already exists with this email or phone number', 400))
    }

    let additionalUserDetails = {
        emailVerificationCode: generateRadomSixDigitCode(),
        phoneNumberVerificationCode: generateRadomSixDigitCode(),
        emailVerificationCodeExp: Date.now() + 24 * 60 * 60 * 1000,
        phoneNumberVerificationCodeExp: Date.now() + 24 * 60 * 60 * 1000
    }

    const newUser = await User.create({ ...req.body, ...additionalUserDetails })
    // await new Email(newUser).sendEmailVerificationCode(additionalUserDetails.emailVerificationCode)

    createAndSendToken(newUser, 201, res)
})

exports.emailVerification = catchAsync(async (req, res, next) => {
    const verificationCode = req.body.verificationCode
    const dataBaseEmailVerificationCode = (await User.findById(req.user.id)).emailVerificationCode

    if (!verificationCode) return next(new AppError('Enter a valid verificationCode', 404))

    if (verificationCode !== dataBaseEmailVerificationCode) {
        return next(new AppError('Invalid verification code.Please Chekc your validaton code and try again.', 422))
    }

    await User.findByIdAndUpdate(req.user.id, {
        emailVerificationCode: undefined,
        emailVerificationCodeExp: undefined,
        isEmailVerified: undefined
    })

    res.status(200).json({
        status: 'suucess',
    })
})

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body

    if (!email || !password) {
        return next(new AppError('Please enter a email and password', 400))
    }

    const user = await User.findOne({ email }).select('+password')

    if (!user.active) {
        return next(new AppError('user no longer active', 400))
    }

    if (!user || !await user.correctPassword(password, user.password)) {
        return next(new AppError('Incorect email and password', 401))
    }




    createAndSendToken(user, 200, res)
})
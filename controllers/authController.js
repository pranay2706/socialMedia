const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const { promisify } = require('util')


const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const Email = require('../utils/email');
const { unlink } = require('../app');

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

    user.password = undefined

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
    const emailVerificationURL = `${req.protocol}://${req.get('host')}/api/v1/user/verifyEmail/${additionalUserDetails.emailVerificationCode}`
    await new Email(newUser, emailVerificationURL).sendEmailVerificationCode()
    createAndSendToken(newUser, 201, res)
})

exports.emailVerification = catchAsync(async (req, res, next) => {
    const verificationCode = req.params.token
    const user = await User.findById(req.user.id)

    if (!user.emailVerificationCode) {
        return next(new AppError('email already verified please login to continue', 400))
    }

    if (!verificationCode) return next(new AppError('Enter a valid verification Code', 404))

    if (Number(verificationCode) !== Number(user.emailVerificationCode)) {
        return next(new AppError('Invalid verification code.Please Check your validaton code and try again.', 422))
    }

    if (Date.now() > user.emailVerificationCodeExp) {
        return new AppError('Email verification code expires.Generate a new verification code', 400)
    }

    await User.findByIdAndUpdate(req.user.id, {
        $unset: {
            emailVerificationCode: 1,
            emailVerificationCodeExp: 1,
        }
    })

    res.status(200).json({
        status: 'success',
        messege: "Email verified successfully"
    })
})

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body

    if (!email || !password) {
        return next(new AppError('Please enter a valid email and password', 400))
    }

    const user = await User.findOne({ email }).select('+password')


    if (!user || !await user.correctPassword(password, user.password)) {
        return next(new AppError('Incorect email id and password', 401))
    }

    createAndSendToken(user, 200, res)
})

exports.logout = (req, res) => {
    res.cookie('jwt', 'logged-out', {
        expires: new Date(Date.now()),
        httpOnly: true
    })
    res.status(200).json()
}

exports.forgotPassword = catchAsync(async (req, res, next) => {
    const user = await User.find({ email: req.body.email })

    if (!user) {
        return new AppError('No user found with this mail id.Provide a valid email id', 404)
    }

    const resetToken = user.createPasswordResetToken()
    await user.save({ validateBeforeSave: false })

    try {
        const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
        await new Email(user, resetURL).sendPasswordReset()
        res.status(200).json({
            status: "success",
            message: "token sent to email!"
        })
    } catch (err) {
        user.passwordResetToken = undefined
        user.passwordResetExpires = undefined
        await user.save({ validateBeforeSave: false })
        return next(new AppError('There was an error in sending the email.Try again later!', 500))
    }
})

exports.resetPasword = catchAsync(async (req, res, next) => {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex')

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    })

    if (!user) {
        return next(new AppError('Token is invalid or has expired', 400))
    }

    user.password = req.body.password
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save()

    createAndSendToken(user, 200, res)
})

exports.updatePassword = catchAsync(async (req, res, next) => {
    const user = User.findById(req.user.id).select('+password')

    if (!await user.correctPassword(req.body.passwordCurrent, user.password)) {
        return next(new AppError('Your password is wrong', 401))
    }

    user.password = req.body.password
    await user.save();

    createAndSendToken(user, 201, res)
})


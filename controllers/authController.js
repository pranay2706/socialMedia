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

    res.status(statusCode).json({
        status: "success",
        token
    })
}


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
    await new Email(newUser).sendEmailVerificationCode(additionalUserDetails.emailVerificationCode)

    res.status(201).json({
        status: "success"
    })
})
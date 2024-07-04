const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcrypt')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'user must have a name'],
        validate: {
            validator: function (value) {
                return validator.isLength(value, { min: 3, max: undefined }) && validator.isAlpha(value);
            },
            message: 'User name must contain min 3 letters and no special characters are allowed'
        }
    },
    email: {
        type: String,
        required: [true, 'user must have a email'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'user must have a password'],
        select: false,
        minlength: 8
    },
    phoneNumber: {
        type: String,
        required: [true, 'user must have a mobile number'],
        unique: true,
        validate: {
            validator: function (value) {
                const regex = /^\d{10}$/;
                return regex.test(value);
            },
            message: "Enter a valid 10 digit mobile number"
        }
    },
    dob: {
        type: Date,
        requried: [true, 'user must have a date of birth']
    },
    gender: String,
    profilePhoto: {
        type: String,
        default: ''
    },
    address: {
        type: String,
        required: [true, 'user must requrired a address']
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    active: {
        type: Boolean,
        default: true,
        select: false
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isPhoneNumberVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationCode: Number,
    phoneNumberVerificationCode: Number,
    emailVerificationCodeExp: Date,
    phoneNumberVerificationCodeExp: Date
}, {
    timestamps: true
})


userSchema.pre('save', async function (next) {

    if (!this.isModified('password')) return next();

    this.password = await bcrypt.hash(this.password, 12)
    next()
})


userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || this.isNew) return next()
    this.passwordChangedAt = Date.now() - 1000;
    next()
})

const User = mongoose.model('User', userSchema)
module.exports = User
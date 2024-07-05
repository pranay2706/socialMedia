const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')

router.route('/signUp')
    .post(authController.signUp)


router.route('/verifyEmail')
    .patch(
        authController.protect,
        authController.emailVerification
    )


router.route('/login')
    .post(
        authController.login
    )


module.exports = router
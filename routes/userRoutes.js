const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')

router.post('/signUp', authController.signUp)


router.route('/verifyEmail/:token').patch(
    authController.protect,
    authController.emailVerification
)


router.post('/login', authController.login)
router.get('/logout', authController.protect, authController.logout)
router.post('/forgotPassword', authController.forgotPassword)
router.patch('/resetPassword/:token', authController.resetPasword)
router.patch('/updatePassword', authController.protect, authController.updatePassword)
module.exports = router
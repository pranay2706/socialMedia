const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')

router.post('signUp', authController.signUp)


router.route('/verifyEmail')
    .patch(
        authController.protect,
        authController.emailVerification
    )


router.post('/login', authController.login)
router.get('/logout', authController.protect, authController.logout)




module.exports = router
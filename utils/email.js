const nodemailer = require('nodemailer')
const htmlToText = require('html-to-text')

module.exports = class Email {
    constructor(user, url) {
        this.to = user.email,
            this.firstName = user.name.split(' ')[0]
        this.url = url,
            this.from = `Pranay Dak <${process.env.EMAIL_FROM}>`
    }

    newTransporter() {
        if (process.env.NODE_ENV === 'production') {

        }

        return nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }

    async send(subject, verificationCode) {
        const html = `<h1>Welcome</h1> ${this.firstName} your email verification code is : ${verificationCode}`

        const mailOptions = {
            from: this.from,
            to: this.to,
            subject,
            html,
            text: htmlToText.htmlToText(html)
        }

        await this.newTransporter().sendMail(mailOptions)
    }

    async sendWelcome() {
        await this.send('Welcome to our family!')
    }

    async sendPasswordReset() {
        this.send('Your password reset token(valid for only 10 min) ')
    }

    async sendEmailVerificationCode(verificationCode) {
        this.send('Your Email Verifiction Code(Valid for only 1 day)', verificationCode)
    }
}
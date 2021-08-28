const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const mailer = require('../../modules/mailer')

const authConfig = require('../../config/auth.json')

const User = require('../models/user')
const handlebars = require('handlebars');
const path = require('path')
const reader = require('../../utils/reader')

const router = express.Router()

function generateToken(params = { }) {
    return jwt.sign(params, authConfig.secret, {
        expiresIn: 86400
    })
}

router.post('/register', async (req, res) => {
    const { email } = req.body
    try {
        if (await User.findOne({ email })) {
            return res.status(400).send({ error: 'User already exists' })
        }

        const user = await User.create(req.body)

        user.password = undefined

        return res.send({
            user,
            token: generateToken({ id: user.id })
        })
    } catch (err) {
        return res.status(400).send({ error: 'Registration failed' + err })
    }
})

router.post('/authenticate', async (req, res) => {
    const { email, password } = req.body

    try {
        const user = await User.findOne({ email }).select('+password')

        if (!user) {
            return res.status(400).send({ error: 'User not found' })
        }

        if (!await bcrypt.compare(password, user.password)) {
            return res.status(400).send({ error: 'Invalid password' })
        }

        user.password = undefined

        const token = jwt.sign({ id: user.id }, authConfig.secret, {
            expiresIn: 86400
        })

        res.send({
            user,
            token: generateToken({ id: user.id })
        })
    } catch (err) {
        res.status(400).send({ error: 'Error on authenticate, try again' })
    }
})

router.post('/forgot_password', async (req, res) => {
    var { email } = req.body

    try {
        const user = await User.findOne({ email })

        if (!user) {
            return res.status(400).send({ error: 'User not found' })
        }

        const token = crypto.randomBytes(20).toString('hex')

        const now = new Date()
        now.setHours(now.getHours() + 1)

        await User.findByIdAndUpdate(user.id, {
            '$set': {
                passwordResetToken: token,
                passwordResetExpires: now
            }
        })

        reader.readHTML(path.resolve('./src/resources/mail/forgot_password.html'), function (err, html) {
            if (err) {
                res.status(401).send({ error: 'Error on send email, try again' })
            }
            var template = handlebars.compile(html)
            var replacements = {
                token: token
            }

            var htmlToSend = template(replacements)
            var mailOptions = {
                from: 'raphael@staff.com',
                to: email,
                subject: 'Recovery',
                html: htmlToSend
            }
            mailer.sendMail(mailOptions, (err, result) => {
                if (err) {
                    res.status(401).send({ error: 'Error on send email, try again' })
                } else {
                    res.send()
                }
            })
        })
    } catch (err) {
        res.status(400).send({ error: 'Error on forgot password, try again' })
    } 
})

router.post('/reset_password', async (req, res) => {
    const { email, token, password } = req.body

    try {
        const user = await User
            .findOne({ email }).select('+passwordResetToken passwordResetExpires')

        if (!user) {
            return res.status(400).send({ error: 'User not found' })
        }
        
        if (token !== user.passwordResetToken) {
            return res.status(400).send({ error: 'Token invalid' })
        }
        const now = new Date()
        if (now > user.passwordResetExpires) {
            return res.status(400).send({ error: 'Token expired, generate a new one' })
        }

        user.password = password

        await user.save()
        res.send()
    } catch(err) {
        console.log(err)
        res.status(400).send({ error: 'Cannot reset password, try again'})
    }
})

module.exports = app => app.use('/auth', router)
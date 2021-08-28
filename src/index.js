const express = require('express')

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// require('./app/controllers/authController')(app)
// require('./app/controllers/projectController')(app)

require('./app/controllers/index')(app)

app.get('/teste', (req, res) => {
    res.send('Ok')
})

app.listen(3000)
console.log('Application started')
console.log('Port: 3000')

/*
E-mail

spark post
mailchipion
send grid 
mandril
*/
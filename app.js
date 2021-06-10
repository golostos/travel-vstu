// @ts-check
const express = require('express')
const { Sequelize, DataTypes, Model } = require('sequelize');
const app = express()
const validator = require('validator').default;
const cors = require('cors')
const { createToken, verifyToken, createPasswordHash, comparePassword } = require('./auth-service')
const path = require('path')

const port = process.env.PORT || 3000

const sequelize = new Sequelize('global_trip', 'trip_user', 'user12345', {
    host: 'localhost',
    dialect: 'mysql'
});

class Trip extends Model { }
class Admin extends Model { }

function stringType() {
    return {
        type: DataTypes.STRING,
        allowNull: false
    }
}

Trip.init({
    fio: stringType(),
    phone: stringType(),
    country: stringType(),
    info: {
        type: DataTypes.TEXT,
        allowNull: false
    },
}, {
    modelName: 'Trip',
    sequelize
})

Admin.init({
    name: stringType(),
    password: stringType(),
}, {
    modelName: 'Admin',
    sequelize
})

start()

async function start() {
    try {
        await sequelize.authenticate()
        await sequelize.sync()
        console.log('Successful db connection');
        startApp()
    } catch (error) {
        console.error(error)
    }
}

function startApp() {
    app.use(cors())
    app.use(express.json())

    app.post('/api/admin', async function (req, res) {
        const passwordHash = createPasswordHash(req.body.password)
        const newAdmin = await Admin.create({
            name: req.body.name,
            password: passwordHash
        })
        res.send(newAdmin)
    })

    app.post('/api/login', async function (req, res) {
        const userFromDB = await Admin.findOne({ where: { name: req.body.name } })
        // @ts-ignore
        if (comparePassword(req.body.password, userFromDB.password)) {
            const token = createToken(userFromDB)
            res.send({
                token
            })
        } else {
            res.status(403).send({
                message: 'Wrong password'
            })
        }
    })

    app.get('/api/trip', verifyToken, async function (req, res) {
        const orders = await Trip.findAll()
        res.send(orders)
    })

    app.post('/api/trip', async function (req, res) {
        const tripInfo = req.body
        let validationError = []
        if (!validator.isMobilePhone(tripInfo.phone.replace(/\D/g, ''), ['ru-RU']))
            validationError.push('Wrong phone number')
        if (!validator.isLength(tripInfo.fio, { min: 4, max: 80 }))
            validationError.push('Wrong fio')
        if (!validator.isIn(tripInfo.country, ['Turkey', 'Italy', 'Greece']))
            validationError.push('Wrong country')
        if (!validator.isLength(tripInfo.info, { min: 0, max: 2000 }))
            validationError.push('Wrong info')

        if (validationError.length) {
            res.status(400).send({ messages: validationError })
        } else {
            const tripFromDB = await Trip.create(tripInfo)
            res.send(tripFromDB)
        }
    })

    app.use(express.static(path.join(__dirname, 'public')))

    app.listen(port, function () {
        console.log('Server started at http://localhost:' + port);
    })
}
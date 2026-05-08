const express = require('express')
const { coachPlaceholder } = require('../controllers/ai.controller')

const router = express.Router()

router.post('/coach', coachPlaceholder)

module.exports = router

const express = require('express')
const { coach, roadmap, chat } = require('../controllers/ai.controller')

const router = express.Router()

router.post('/coach', coach)
router.post('/roadmap', roadmap)
router.post('/chat', chat)

module.exports = router

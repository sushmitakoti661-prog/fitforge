const express = require('express')
const { coach, dailyTip, roadmap, chat } = require('../controllers/ai.controller')

const router = express.Router()

router.post('/coach', coach)
router.post('/daily-tip', dailyTip)
router.post('/roadmap', roadmap)
router.post('/chat', chat)

module.exports = router

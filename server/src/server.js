const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const aiRoutes = require('./routes/ai.routes')

dotenv.config()

const app = express()
const port = process.env.PORT || 5000
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'

app.use(cors({ origin: clientUrl }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.use('/api/ai', aiRoutes)

app.listen(port, () => {
  console.log(`FitForge server running on port ${port}`)
})

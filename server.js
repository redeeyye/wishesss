require("dotenv").config()

const crypto = require("crypto")
const express = require("express")
const { MongoClient } = require("mongodb")
const path = require("path")

const app = express()
const port = Number(process.env.PORT || 3000)
const publicDir = __dirname
const visitorCookieName = "rashi_wish_visitor"
const maxRequestsPerWindow = 40
const rateLimitWindowMs = 60 * 1000

let mongoClient
let wishesCollection
let indexesReady = false
const rateLimitBuckets = new Map()

function getRequiredEnv(name) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
}

async function getWishesCollection() {
  if (!mongoClient) {
    mongoClient = new MongoClient(getRequiredEnv("MONGODB_URI"), {
      serverSelectionTimeoutMS: 10000,
    })
    await mongoClient.connect()
  }

  if (!wishesCollection) {
    const db = mongoClient.db(process.env.MONGODB_DB || "birthday_wishes")
    wishesCollection = db.collection(process.env.MONGODB_COLLECTION || "wishes")
  }

  if (!indexesReady) {
    await wishesCollection.createIndex({ visitorHash: 1 }, {
      unique: true,
      partialFilterExpression: { visitorHash: { $type: "string" } },
    })
    await wishesCollection.createIndex({ ipHash: 1 }, {
      unique: true,
      partialFilterExpression: { ipHash: { $type: "string" } },
    })
    await wishesCollection.createIndex({ createdAt: -1 })
    indexesReady = true
  }

  return wishesCollection
}

function getCookie(req, name) {
  return String(req.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1)
}

function createVisitorToken() {
  return crypto.randomBytes(32).toString("base64url")
}

function hashValue(label, value) {
  return crypto.createHmac("sha256", getRequiredEnv("COOKIE_SECRET")).update(`${label}:${value}`).digest("hex")
}

function setVisitorCookie(res, token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
  res.setHeader(
    "Set-Cookie",
    `${visitorCookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}`,
  )
}

function getOrCreateVisitorToken(req, res) {
  const existingToken = getCookie(req, visitorCookieName)

  if (existingToken && /^[A-Za-z0-9_-]{32,128}$/.test(existingToken)) {
    return existingToken
  }

  const token = createVisitorToken()
  setVisitorCookie(res, token)
  return token
}

function getClientIp(req) {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "")
    .split(",")
    .map((ip) => ip.trim())
    .find(Boolean)

  return forwardedFor || req.ip || req.socket.remoteAddress || "unknown"
}

function getRequestIdentity(req, res) {
  const visitorToken = getOrCreateVisitorToken(req, res)
  const ip = getClientIp(req)

  return {
    visitorHash: hashValue("visitor", visitorToken),
    ipHash: hashValue("ip", ip),
  }
}

function validateWish(input) {
  const name = String(input.name || "").trim()
  const message = String(input.message || "").trim()

  if (name.length < 2) {
    return { error: "Please enter a valid name (at least 2 characters)." }
  }

  if (message.length < 5) {
    return { error: "Please write a meaningful message (at least 5 characters)." }
  }

  if (name.length > 80) {
    return { error: "Name must be 80 characters or fewer." }
  }

  if (message.length > 1000) {
    return { error: "Message must be 1000 characters or fewer." }
  }

  return { value: { name, message } }
}

function securityHeaders(req, res, next) {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'",
  )
  res.setHeader("Referrer-Policy", "no-referrer")
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader("X-Frame-Options", "DENY")
  next()
}

function rateLimit(req, res, next) {
  const ip = getClientIp(req)
  const now = Date.now()
  const bucket = rateLimitBuckets.get(ip) || { count: 0, resetAt: now + rateLimitWindowMs }

  if (now > bucket.resetAt) {
    bucket.count = 0
    bucket.resetAt = now + rateLimitWindowMs
  }

  bucket.count += 1
  rateLimitBuckets.set(ip, bucket)

  if (bucket.count > maxRequestsPerWindow) {
    res.status(429).json({ error: "Too many requests. Please try again later." })
    return
  }

  next()
}

async function hasExistingWish(collection, identity) {
  return collection.findOne(
    {
      $or: [
        { visitorHash: identity.visitorHash },
        { ipHash: identity.ipHash },
      ],
    },
    { projection: { _id: 1 } },
  )
}

app.disable("x-powered-by")
app.set("trust proxy", 1)
app.use(securityHeaders)
app.use(rateLimit)
app.use(express.json({ limit: "16kb" }))

app.get("/api/health", async (req, res) => {
  try {
    const identity = getRequestIdentity(req, res)
    const collection = await getWishesCollection()
    const existingWish = await hasExistingWish(collection, identity)

    res.json({ databaseConnected: true, hasSubmittedWish: Boolean(existingWish) })
  } catch (error) {
    res.status(503).json({ databaseConnected: false, error: error.message })
  }
})

app.post("/api/wishes", async (req, res) => {
  const validation = validateWish(req.body || {})

  if (validation.error) {
    res.status(400).json({ error: validation.error })
    return
  }

  try {
    const identity = getRequestIdentity(req, res)
    const collection = await getWishesCollection()
    const existingWish = await hasExistingWish(collection, identity)

    if (existingWish) {
      res.status(409).json({ error: "You have already sent a wish for Rashi." })
      return
    }

    await collection.insertOne({
      ...validation.value,
      visitorHash: identity.visitorHash,
      ipHash: identity.ipHash,
      createdAt: new Date(),
    })

    res.status(201).json({ ok: true })
  } catch (error) {
    if (error.code === 11000) {
      res.status(409).json({ error: "You have already sent a wish for Rashi." })
      return
    }

    console.error("Failed to save wish:", error)
    res.status(500).json({ error: "Failed to save wish." })
  }
})

app.use(express.static(publicDir))

app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"))
})

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Birthday wishes app listening on http://localhost:${port}`)
  })
}

module.exports = app

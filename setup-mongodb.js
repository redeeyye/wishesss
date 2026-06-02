require("dotenv").config()

const { MongoClient } = require("mongodb")

async function main() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017"
  const dbName = process.env.MONGODB_DB || "birthday_wishes"
  const collectionName = process.env.MONGODB_COLLECTION || "wishes"
  const client = new MongoClient(uri)

  await client.connect()

  const collection = client.db(dbName).collection(collectionName)

  await collection.createIndex({ visitorHash: 1 }, {
    unique: true,
    partialFilterExpression: { visitorHash: { $type: "string" } },
  })
  await collection.createIndex({ ipHash: 1 }, {
    unique: true,
    partialFilterExpression: { ipHash: { $type: "string" } },
  })
  await collection.createIndex({ createdAt: -1 })

  const seeds = [
    {
      name: "Vansh",
      message: "Hbd Rashi",
    },
    {
      name: "redeye",
      message: "Happy Birthday Rashi! Hope you have an amazing day!",
    },
    {
      name: "piyush",
      message: "Happy Birthday to the most wonderful person! May all your dreams come true!",
    },
  ]

  for (const seed of seeds) {
    await collection.updateOne(
      { name: seed.name, message: seed.message },
      { $setOnInsert: { ...seed, createdAt: new Date() } },
      { upsert: true },
    )
  }

  await client.close()
  console.log(`MongoDB setup complete for ${dbName}.${collectionName}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

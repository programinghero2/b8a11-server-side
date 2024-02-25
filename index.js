const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const app = express()
require('dotenv').config()
// middleware 
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://hirepark-36234.web.app",
    "https://hirepark-36234.firebaseapp.com"
  ],
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wxrtt5h.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" })
    }
    req.user = decoded
    next()
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const jobsCollection = client.db("HireParkDB").collection("jobs")
    const bidsCollection = client.db("HireParkDB").collection("bidJob")
    app.post("/api/v1/access-token", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res
        .cookie("token", token, {
          // httpOnly: true,
          // secure: false
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })
    app.get("/api/v1/jobs", async (req, res) => {
      const category = req.query.category;
      let query = { category }
      const result = await jobsCollection.find(query).toArray()
      res.send(result)
    })
    app.get("/api/v1/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await jobsCollection.findOne(query)
      res.send(result)
    })
    app.post("/api/v1/addjob", async (req, res) => {
      const job = req.body;
      const result = await jobsCollection.insertOne(job)
      res.send(result)
    })
    app.post("/api/v1/bidJob", async (req, res) => {
      const bidJob = req.body;
      const result = await bidsCollection.insertOne(bidJob)
      res.send(result)
    })
    app.get("/api/v1/bidJob", verifyToken, async (req, res) => {
      const email = req.query?.email;
      let query = {}
      if (email) {
        if (req.user.email !== req.query.email) {
          return res.status(403).send({ message: "forbidden access" })
        }
        query = { email }
      }
      const result = await bidsCollection.find(query).toArray()
      res.send(result)
    })
    app.patch("/api/v1/bidJob/update/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateInfo = req.body;
      const bidStatusUpdate = {
        $set: {
          status: updateInfo?.status
        }
      }
      const result = await bidsCollection.updateOne(filter, bidStatusUpdate)
      res.send(result)
    })
    app.delete("/api/v1/cancel-postedjob/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await jobsCollection.deleteOne(query)
      res.send(result)
    })
    app.put("/api/v1/post-update/:id", async (req, res) => {
      const id = req.params.id;
      const updatedPostInfo = req.body;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const postUpdate = {
        $set: {
          email: updatedPostInfo.email,
          job_title: updatedPostInfo.job_title,
          deadline: updatedPostInfo.deadline,
          short_description: updatedPostInfo.short_description,
          category: updatedPostInfo.category,
          minimumPrice: updatedPostInfo.minimumPrice,
          maximumPrice: updatedPostInfo.maximumPrice,
        }
      }
      const result = await jobsCollection.updateOne(filter, postUpdate, options)
      res.send(id)
    })
    app.get("/api/v1/postedJob", verifyToken, async (req, res) => {
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "forbidden access" })
      }
      const email = req.query.email;
      const query = { email }
      const result = await jobsCollection.find(query).toArray()
      res.send(result)
    })
    app.get("/api/v1/postedJob/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await jobsCollection.findOne(query)
      res.send(result)

    })
    // Send a ping to confirm a successfull connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client willa close you finish/error
  }
}
run().catch(console.dir);


app.get("/", (req, res) => {
  res.send("hirepark marketplace is running")
})
app.listen(port, () => {
  console.log(`hirepark marketplace is running on port ${port}`)
})
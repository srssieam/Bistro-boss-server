const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000

// middleware
app.use(cors());
app.use(express.json());

// middleware for token verification 
const verifyToken = (req, res, next) =>{
    console.log('inside verifyToken middleware', req.headers.authorization);
    if(!req.headers.authorization){
        return res.status(401).send({ message: 'forbidden access' })
    }
    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
        if(err){
            return res.status(401).send({message: 'forbidden access'})
        }
        req.decoded = decoded;
    next();
    })
    
}



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xjpiwvy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();


        const menuCollection = client.db("bistroDB").collection("menu");
        const reviewsCollection = client.db("bistroDB").collection("reviews");
        const cartCollection = client.db("bistroDB").collection("carts");
        const userCollection = client.db("bistroDB").collection("users");

        // jwt related api
        app.post('/jwt', async(req, res) =>{
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '2h'});
            res.send({ token })
        })

        app.get('/menu', async(req, res) =>{
            const result = await menuCollection.find().toArray();
            res.send(result);
        })


        app.get('/reviews', async(req, res) =>{
            const result = await reviewsCollection.find().toArray();
            res.send(result);
        })

        // store a item in carts collection
        app.post('/carts', async(req, res) =>{
            const cartItem = req.body;
            const result = await cartCollection.insertOne(cartItem)
            res.send(result)
        })

        // carts of a user
        app.get('/carts', async(req, res) =>{
            const email = req.query.email;
            const query = {email: email};
            const result = await cartCollection.find(query).toArray();
            res.send(result)
        })

        // delete item from users cart
        app.delete('/carts/:id', async(req, res) =>{
            const id = req.params.id;
            console.log(id)
            const query = { _id: new ObjectId(id) };
            const result = await cartCollection.deleteOne(query);
            res.send(result);
        })

        // store a user info in users collection
        app.post('/users', async(req, res) =>{
            const user = req.body;
            // insert email if user doesn't exists;
            const query = {email: user.email}
            const existingUser = await userCollection.findOne(query);
            if(existingUser){
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        // get user from db
        app.get('/users', verifyToken, async(req, res) =>{
            const result = await userCollection.find().toArray();
            res.send(result)
        })

        // delete a user
        app.delete('/users/:id', async(req, res) =>{
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query);
            res.send(result)
        })

        // update user to admin
        app.patch('/users/admin/:id', async (req, res) =>{
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })

        app.get('/users/admin/:email', verifyToken, async(req, res)=>{
            const email = req.params.email;
            if(email !== req.decoded.email){
                return res.status(403).send({message: 'unauthorized access'})
            }

            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if(user){  //  if user.role === admin then result will be true
                admin = user?.role === 'admin';
            }
            res.send({ admin })
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('boss is sitting')
})

app.listen(port, () => {
    console.log(`Bistro boss is sitting in port: http://localhost:${port}`)
})
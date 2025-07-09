import { MongoClient } from 'mongodb'

const client = new MongoClient('mongodb://localhost:27017')
const usersCollection = client.db('MotoTime').collection('Users')
const motosCollection = client.db('MotoTime').collection('Motorbike')

console.log(results)

await client.close()


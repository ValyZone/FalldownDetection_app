import { MongoClient } from 'mongodb'

export async function connectToMongo(dbUrl) {
    
    const usersCollection = new MongoClient(dbUrl)
    .db('MotoTime')
    .collection('Users')

    const motosCollection = new MongoClient(dbUrl)
        .db('MotoTime')
        .collection('Motorbike')
    
    await motosCollection.createIndex({ model: 1 }, { unique: true })
    return {
        loadMotos: async () => {
            return motosCollection.find({}).toArray()
        },
        saveMoto: async (moto) => {
            if (moto.hasOwnProperty('deleted')) await motosCollection.insertOne(moto)
            else await motosCollection.insertOne(
                {
                    ownerId: moto.ownerId,
                    type: moto.type,
                    brand: moto.brand,
                    model: moto.model,
                    cc: moto.cc,
                    year: moto.year,
                    deleted: "1900-01-01"
                })
        },
        updateMoto: (moto) => {
            const { ownerId, type, brand, model, cc, year, deleted } = moto
            motosCollection.updateOne({ model },
                {
                    $set: {
                        ownerId,
                        type,
                        brand,
                        cc,
                        year,
                        deleted
                    },
                }
            )
        },
        removeMoto: async (model) => {
            await motosCollection.deleteOne(model)
        },
        getMotoByModel(model) {
            return motosCollection.findOne({ model }, { projection: { _id: 0 } })
        },


        async getUsers() {
            return usersCollection.find({}).toArray()
        },
        saveUser: async (user) => {
            console.log(user)
            await usersCollection.insertOne(
                {
                    id: "id" + Math.random().toString(16).slice(2),
                    name: user.name,
                    mail: user.mail,
                    password: user.password,
                    regdate: "user.regdate",
                    regip: "user.regip",
                    regserver: "user.regserver",
                    birthday: "userdate",
                    county: "number0_3",
                    gender: "number0_3",
                    deletedUser: "date",
                    admin: "bool",
                    newPasswordDate: "date",
                    lastLoginDate: "date",
                    confirmed: "bool",
                    firstName: "varchar2",
                    lastName: "varchar2"
                })
        },
    }
}
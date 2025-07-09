import express from 'express'
import { addUserZodSchema } from './../mongo/database_tables/user.js'
import { parser } from './../parser-middleware.js'

function CreateUserRouter(dependencies){

    const {saveUser, getUsers, updateUser, removeUser, getUserByName} = dependencies
    const userRouter = express.Router()

    userRouter.get('', (req, res, next) => {
        getUsers().then(moto => {
            res.status(200).json(moto)
        }).catch(next)
    })

    userRouter.get('/:name', async (req, res) => {
        const user = await getUserByName(getUsers, req.params.name)
        res.json(user)
    })

    userRouter.delete('/:name', async (req, res) => {
        await removeUser(getUsers, saveUser, req.params.name)
        console.log(req.params.name, "Törölve.")
        res.sendStatus(204)
    })

    userRouter.post('', parser(addUserZodSchema), async (req, res, next) => { 
        try {
            await saveUser(res.locals.parsed)
            res.sendStatus(201)
        } catch (err) {
            next(err)
        }
    })


    return userRouter
}
export default CreateUserRouter
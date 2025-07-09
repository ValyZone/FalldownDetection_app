import express from 'express'
import { addMotorbikeZodSchema, updateMotorbikeZodSchema /*, addMotoJsonSchema*/ } from '../mongo/database_tables/motorbike.js'
import { parser } from '../parser-middleware.js'

function CreateMotosRouter(dependencies){

    const {saveMoto, loadMotos, updateMoto, removeMoto, getMotoByModel} = dependencies
    const motosRouter = express.Router()

    motosRouter.get('', (req, res, next) => {
        loadMotos(/*{filter, skip, limit, sortBy}*/).then(moto => {
            res.status(200).json(moto)
        }).catch(next)
    })

    motosRouter.get('/:model', async (req, res) => {
        const moto = await getMotoByModel(loadMotos, req.params.model)
        res.json(moto)
    })

    motosRouter.get('/err', (req, res) => {
        throw new Error('Ez egy error, majd kesobb modositani.')
    })

    motosRouter.delete('/:model', async (req, res) => {
        await removeMoto(loadMotos, saveMoto, req.params.model)
        console.log(req.params.model, "Törölve.")
        res.sendStatus(204)
    })

    motosRouter.post('', parser(addMotorbikeZodSchema), async (req, res, next) => { 
        console.log("asd")
        try {
            await saveMoto(res.locals.parsed)
            res.sendStatus(201)
        } catch (err) {
            next(err)
        }
    })

    motosRouter.put('/:model', parser(updateMotorbikeZodSchema), async (req, res, next) => {
        try {
            await updateMoto({ownerId: res.locals.parsed.ownerId, deleted: res.locals.parsed.deleted, model: req.params.model})
            res.sendStatus(204)
        } catch(err){
            next(err)
        }
    
    })
    return motosRouter
}
export default CreateMotosRouter
import Ajv from 'ajv'
const ajv = new Ajv()

export function validator(schema){
    const validate = ajv.compile(schema)


    return (req, res, next) => {
        const isValid = validate(req.body)
        if (!isValid){
            next(new Error(JSON.stringify(validate.errors)))
        }

        next()
    }
}
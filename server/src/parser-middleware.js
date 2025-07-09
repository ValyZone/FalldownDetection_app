export function parser(schema){
    return (req, res, next) => {
        res.locals.parsed = schema.parse(req.body)
        next()
    }
}
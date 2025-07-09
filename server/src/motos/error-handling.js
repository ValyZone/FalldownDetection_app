export class NotFoundError extends Error{
    constructor(message){
        super(message)
        this.name = this.constructor.name
        if (Error.captureStackTrace)
        {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export class NotAuthorized extends Error {
    constructor(message) {
        super(message)
        this.name = this.constructor.name
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

function mapErrorToStatusCode(err){
    switch(err.name){
        case 'NotFoundError':
            return 404
        default:
            return 500
    }
}

export function errorHandler(err, req, res, next){
    console.log('There is an error: ', err)
    const code = mapErrorToStatusCode(err)
    res.status(code).send(err.message)
}
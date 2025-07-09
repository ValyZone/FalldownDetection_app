import z from 'zod'
import { binaryid, date, text } from './schema.js'

export const addApplicantsZodSchema = z.object({
    whichEventId: binaryid,
    whoId: binaryid,
    left: date,
    kicked: date,
    kickedInfo: text
}).strict()

export const updateApplicantsZodSchema = z.object({
    whichEventId: binaryid.Optional(),
    whoId: binaryid.Optional(),
    left: date.Optional(),
    kicked: date.Optional(),
    kickedInfo: text.Optional()
}).strict()
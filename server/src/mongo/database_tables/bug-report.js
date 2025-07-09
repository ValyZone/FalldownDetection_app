import z from 'zod'
import { binaryid, date, varchar0, bool, text } from './schema.js'

export const addBugReportZodSchema = z.object({
    reporterId: binaryid,
    theme: varchar0,
    text: text,
    finishedDate: date,
    duplicate: bool
}).strict()

export const updateBugReportZodSchema = z.object({
    reporterId: binaryid.Optional(),
    theme: varchar0.Optional(),
    text: text.Optional(),
    finishedDate: date.Optional(),
    duplicate: bool.Optional()
}).strict()
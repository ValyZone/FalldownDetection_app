import z from 'zod'
import { binaryid, date, number0_6 } from './schema.js'

export const addMessageZodSchema = z.object({
    forId: binaryid,
    theme: number0_6,
    deleted: date,
    sent: date
}).strict()

export const updateMessegeZodSchema = z.object({
    forId: binaryid.Optional(),
    theme: number0_6.Optional(),
    deleted: date.Optional(),
    sent: date.Optional()
}).strict()
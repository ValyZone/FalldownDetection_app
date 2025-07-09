import z from 'zod'
import { binaryid, number0_6, text } from './schema.js'

export const addDataChangeZodSchema = z.object({
    where: number0_6,
    oldData: text,
    whoId: binaryid
}).strict()

export const updateDataChangeZodSchema = z.object({
    where: number0_6.Optional(),
    oldData: text.Optional(),
    whoId: binaryid.Optional()
}).strict()
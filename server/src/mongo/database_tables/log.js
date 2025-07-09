import z from 'zod'
import { binaryid, number0_10, varchar7, varchar0 } from './schema.js'

export const addDataChangeZodSchema = z.object({
    whoId: binaryid,
    whatsite: number0_10,
    ip: varchar7,
    server: varchar0
}).strict()

export const updateDataChangeZodSchema = z.object({
    whoId: binaryid.Optional(),
    whatsite: number0_10.Optional(),
    ip: varchar7.Optional(),
    server: varchar0.Optional()
}).strict()
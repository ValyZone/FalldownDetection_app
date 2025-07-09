import z from 'zod'
import { binaryid, number0_6, number0_10 } from './schema.js'

export const addLevelZodSchema = z.object({
    whoId: binaryid,
    xp: number0_10,
    why: number0_6
}).strict()

export const updateLevelZodSchema = z.object({
    whoId: binaryid.Optional(),
    xp: number0_10.Optional(),
    why: number0_6.Optional()
}).strict()
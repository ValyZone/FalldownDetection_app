import z from 'zod'
import { binaryid, date, varchar0, number0_4, number0_6, number1_10, number3_5 } from './schema.js'

export const addMotorbikeZodSchema = z.object({
    ownerId: binaryid,
    type: number0_4,
    brand: number0_6,
    model: varchar0,
    cc: number1_10,
    year: number3_5,
    deleted: date
}).strict()

export const updateMotorbikeZodSchema = z.object({
    ownerId: binaryid,
    type: number0_4.optional(),
    brand: number0_6.optional(),
    model: varchar0.optional(),
    cc: number1_10.optional(),
    year: number3_5.optional(),
    deleted: date.optional()
}).strict()
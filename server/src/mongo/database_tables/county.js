import z from 'zod'
import { varchar2, number0_3 } from './schema.js'

export const addCountyZodSchema = z.object({
    id: number0_3,
    countyName: varchar2,
}).strict()

export const updateCountyZodSchema = z.object({
    id: number0_3.optional(),
    countyName: varchar2.optional(),
}).strict()
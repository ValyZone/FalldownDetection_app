import z from 'zod'
import { varchar0, number0_6 } from './schema.js'

export const addMotorbikeBrandZodSchema = z.object({
    id: number0_6,
    exportName: varchar0
}).strict()

export const updateMotorbikeBrandZodSchema = z.object({
    id: number0_6.Optional(),
    exportName: varchar0.Optional()
}).strict()
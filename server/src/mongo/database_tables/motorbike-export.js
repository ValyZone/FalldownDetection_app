import z from 'zod'
import { varchar0, number0_4 } from './schema.js'

export const addMotorbikeExportZodSchema = z.object({
    id: number0_4,
    exportName: varchar0
}).strict()

export const updateMotorbikeExportZodSchema = z.object({
    id: number0_4.Optional(),
    exportName: varchar0.Optional()
}).strict()
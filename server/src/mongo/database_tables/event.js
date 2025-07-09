import z from 'zod'
import { binaryid, date, varchar0, bool, text, number0_6, number0_4, number0_3, number0_10 } from './schema.js'

export const addEventZodSchema = z.object({
    creatorId: binaryid,
    createdDate: date,
    closingDate: date,
    startDate: date,
    endDate: date,
    startAddress: varchar0,
    endAddress: varchar0,
    theme: varchar0,
    info: text,
    ccStart: number0_6,
    ccEnd: number0_6,
    motorbikeExport: number0_4,
    ageStart: number0_4,
    ageEnd: number0_4,
    county: number0_3,
    limit: number0_10,
    motorbikeBrand: number0_6,
    highlight: bool,
    deleted: date
}).strict()

export const updateEventZodSchema = z.object({
    creatorId: binaryid.Optional(),
    createdDate: date.Optional(),
    closingDate: date.Optional(),
    startDate: date.Optional(),
    endDate: date.Optional(),
    startAddress: varchar0.Optional(),
    endAddress: varchar0.Optional(),
    theme: varchar0.Optional(),
    info: text.Optional(),
    ccStart: number0_6.Optional(),
    ccEnd: number0_6.Optional(),
    motorbikeExport: number0_4.Optional(),
    ageStart: number0_4.Optional(),
    ageEnd: number0_4.Optional(),
    county: number0_3.Optional(),
    limit: number0_10.Optional(),
    motorbikeBrand: number0_6.Optional(),
    highlight: bool.Optional(),
    deleted: date.Optional()
}).strict()
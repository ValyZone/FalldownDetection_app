import z from 'zod'
import { binaryid, number0_3, text } from './schema.js'

export const addEventFeedbackZodSchema = z.object({
    eventId: binaryid,
    whoId: binaryid,
    rate: number0_3,
    text: text,
}).strict()

export const updateEventFeedbackZodSchema = z.object({
    eventId: binaryid.Optional(),
    whoId: binaryid.Optional(),
    rate: number0_3.Optional(),
    text: text.Optional(),
}).strict()
import z from 'zod'
import { varchar2, varchar7, date, varchar0, number0_3, bool } from './schema.js'

export const addUserZodSchema = z.object({
    name: varchar2,
    mail: varchar2,
    password: varchar7,
    regdate: date,
    regip: varchar7,
    regserver: varchar0,
    birthday: date,
    county: number0_3,
    gender: number0_3,
    deletedUser: date,
    admin: bool,
    newPasswordDate: date,
    lastLoginDate: date,
    confirmed: bool,
    firstName: varchar2,
    lastName: varchar2
})

export const updateUserZodSchema = z.object({
    name: varchar2.optional(),
    mail: varchar2.optional(),
    password: varchar7.optional(),
    regdate: date,
    regip: varchar7,
    regserver: varchar0,
    birthday: date.optional(),
    county: number0_3.optional(),
    gender: number0_3.optional(),
    deletedUser: date.optional(),
    admin: bool.optional(),
    newPasswordDate: date.optional(),
    lastLoginDate: date.optional(),
    confirmed: bool.optional(),
    firstName: varchar2.optional(),
    lastName: varchar2.optional()
}).strict()
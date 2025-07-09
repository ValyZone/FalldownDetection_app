import z from 'zod'

export const varchar7 = z.string().min(7);
export const varchar2 = z.string().min(2);
export const varchar0 = z.string().min(0);
export const binaryid = z.string().min(1).max(50);
export const date = z.string().refine(value => /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "The date value must be in the format YYYY-MM-DD",
}).optional(); //format YYYY-MM-DD, it is given as string
export const number0_4 = z.number().min(0).max(10000);
export const number0_3 = z.number().min(0).max(1000);
export const number0_6 = z.number().min(0).max(1000000);
export const number0_10 = z.number().min(0).max(10000000000);
export const number1_10 = z.number().min(1).max(10000000000);
export const number3_5 = z.number().min(3).max(100000);
export const bool = z.boolean();
export const text = z.string();
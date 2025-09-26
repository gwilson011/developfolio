import { z } from "zod";

export const GrocerySchema = z.record(z.string(), z.array(z.string()));
export const DaySchema = z.object({
    day: z.string(),
    meals: z.object({
        breakfast: z.string(),
        lunch: z.string(),
        dinner: z.string(),
    }),
    calories_estimate: z.number().optional(),
});
export const PlanSchema = z.object({
    week: z.string(), // ISO date for Monday
    days: z.array(DaySchema).length(7),
    grocery_list: GrocerySchema,
});
export type Plan = z.infer<typeof PlanSchema>;
export type Day = z.infer<typeof DaySchema>;
export type GroceryList = z.infer<typeof GrocerySchema>;

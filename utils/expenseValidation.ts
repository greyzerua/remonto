import { z } from 'zod';

export const normalizeAmount = (value: string) => {
  if (value === undefined || value === null) {
    return NaN;
  }

  const normalized = value.replace(',', '.');
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const amountField = z
  .string()
  .trim()
  .refine((val) => val === '' || !Number.isNaN(normalizeAmount(val)), {
    message: 'Некоректне число',
  })
  .refine((val) => val === '' || normalizeAmount(val) >= 0, {
    message: 'Сума не може бути відʼємною',
  });

export const expenseSchema = z
  .object({
    categoryName: z.string().trim().min(1, 'Введіть назву категорії'),
    labor: amountField,
    materials: amountField,
  })
  .superRefine((data, ctx) => {
    const laborValue = normalizeAmount(data.labor);
    const materialsValue = normalizeAmount(data.materials);
    const safeLabor = Number.isNaN(laborValue) ? 0 : laborValue;
    const safeMaterials = Number.isNaN(materialsValue) ? 0 : materialsValue;

    if (safeLabor <= 0 && safeMaterials <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['materials'],
        message: 'Введіть хоча б одну суму',
      });
    }
  });

export type ExpenseFormValues = z.infer<typeof expenseSchema>;


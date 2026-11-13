import { z } from 'zod';

export function businessDate(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(d);
}

export type FinancePeriod = 'month' | 'year' | 'custom';

export function currentMonth(): string {
  return businessDate().slice(0, 7);
}

export function currentYear(): string {
  return businessDate().slice(0, 4);
}

export function monthRange(month: string): { startDate: string; endDate: string } {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const endDate =
    month === currentMonth() ? businessDate() : month + '-' + String(lastDay).padStart(2, '0');
  return { startDate: month + '-01', endDate };
}

export function yearRange(year: string): { startDate: string; endDate: string } {
  return {
    startDate: year + '-01-01',
    endDate: year === currentYear() ? businessDate() : year + '-12-31',
  };
}

const dateRangeSchema = z
  .object({
    startDate: z.string().min(1, '开始日期不能为空'),
    endDate: z.string().min(1, '结束日期不能为空'),
  })
  .refine((v) => v.startDate <= v.endDate, {
    path: ['endDate'],
    message: '结束日期不能早于开始日期',
  })
  .refine((v) => v.endDate <= businessDate(), {
    path: ['endDate'],
    message: '结束日期不能晚于今天',
  })
  .refine((v) => (Date.parse(v.endDate) - Date.parse(v.startDate)) / 86400000 <= 365, {
    path: ['endDate'],
    message: '日期范围不能超过366天',
  });

export const financeFilterSchema = z
  .object({
    period: z.enum(['month', 'year', 'custom']),
    month: z.string(),
    year: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  })
  .superRefine((values, context) => {
    if (values.period === 'month') {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(values.month)) {
        context.addIssue({ code: 'custom', path: ['month'], message: '请选择月份' });
      } else if (values.month > currentMonth()) {
        context.addIssue({ code: 'custom', path: ['month'], message: '月份不能晚于本月' });
      }
    } else if (values.period === 'year') {
      if (!/^\d{4}$/.test(values.year) || Number(values.year) < 1 || values.year > currentYear()) {
        context.addIssue({ code: 'custom', path: ['year'], message: '请选择有效年度' });
      }
    } else {
      const result = dateRangeSchema.safeParse(values);
      if (!result.success) {
        result.error.issues.forEach((issue) =>
          context.addIssue({ code: 'custom', path: issue.path, message: issue.message }),
        );
      }
    }
  });
export const settlementSchema = z.object({
  storeId: z.string().min(1, '门店不能为空'),
  businessDate: z
    .string()
    .min(1, '营业日期不能为空')
    .refine((v) => v < businessDate(), '仅能结算已结束的营业日'),
  remark: z.string().trim().max(500, '备注最多500字'),
});
export type SettlementValues = z.infer<typeof settlementSchema>;

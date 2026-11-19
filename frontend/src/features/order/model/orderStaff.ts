import type { OrderItemVO, OrderStaffOption } from './orderTypes';
import { orderStaffAssignmentSchema, type OrderStaffCorrectionValues } from './orderSchemas';

export interface StaffAssignment {
  staffId: string;
  assistantId: string;
}

/** 更正表单始终回显订单原分配，原ID同时用于并发校验。 */
export function createStaffCorrectionValues(items: OrderItemVO[]): OrderStaffCorrectionValues {
  return {
    reason: '',
    items: items.map((item) => ({
      orderItemId: String(item.id),
      staffId: item.staffId == null ? '' : String(item.staffId),
      assistantId: item.assistantId == null ? '' : String(item.assistantId),
      expectedStaffId: item.staffId == null ? '' : String(item.staffId),
      expectedAssistantId: item.assistantId == null ? '' : String(item.assistantId),
    })),
  };
}

/** 多条明细仅在人员一致时预选，避免默认拿首条覆盖其他原分配。 */
export function commonStaffAssignment(rows: StaffAssignment[]): StaffAssignment {
  return {
    staffId: rows.length && rows.every((row) => row.staffId === rows[0].staffId) ? rows[0].staffId : '',
    assistantId: rows.length && rows.every((row) => row.assistantId === rows[0].assistantId) ? rows[0].assistantId : '',
  };
}

export function defaultStaffAssignment(userId: string | undefined, options: OrderStaffOption[]): StaffAssignment {
  const user = options.find((option) => userId != null && String(option.id) === String(userId));
  return {
    staffId: user && user.defaultType !== 'ASSISTANT' ? String(user.id) : '',
    assistantId: user?.defaultType === 'ASSISTANT' ? String(user.id) : '',
  };
}

export function staffAssignmentError(row: StaffAssignment, options: OrderStaffOption[]): string | undefined {
  const parsed = orderStaffAssignmentSchema.safeParse(row);
  if (!parsed.success) return parsed.error.issues[0]?.message;
  if (!options.some((option) => String(option.id) === row.staffId)) return '服务人员已停用或不属于本门店，请重新选择';
  if (row.assistantId && !options.some((option) => String(option.id) === row.assistantId)) return '助理已停用或不属于本门店，请重新选择';
  return undefined;
}

export function assignStaff<T extends StaffAssignment>(rows: T[], staffId: string, assistantId: string): T[] {
  return rows.map((row) => ({
    ...row,
    staffId,
    assistantId,
  }));
}

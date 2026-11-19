package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_order_staff_change")
public class SalonOrderStaffChange extends BaseTenantEntity<Long> {
    /** 订单ID */
    private Long orderId;
    /** 订单明细ID */
    private Long orderItemId;
    /** 明细名称快照 */
    private String itemName;
    /** 原主服务人员ID */
    private Long beforeStaffId;
    /** 新主服务人员ID */
    private Long afterStaffId;
    /** 原助理ID */
    private Long beforeAssistantId;
    /** 新助理ID */
    private Long afterAssistantId;
    /** 原主服务人员姓名快照 */
    private String beforeStaffName;
    /** 新主服务人员姓名快照 */
    private String afterStaffName;
    /** 原助理姓名快照 */
    private String beforeAssistantName;
    /** 新助理姓名快照 */
    private String afterAssistantName;
    /** 更正原因 */
    private String reason;
    /** 操作人姓名快照 */
    private String operatorName;
}

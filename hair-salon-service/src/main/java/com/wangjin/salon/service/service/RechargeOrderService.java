package com.wangjin.salon.service.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.salon.service.model.form.RechargeCreateForm;
import com.wangjin.salon.service.model.query.RechargeOrderPageQuery;
import com.wangjin.salon.service.model.vo.RechargeOrderDetailVO;
import com.wangjin.salon.service.model.vo.RechargeOrderPageVO;
import com.wangjin.salon.service.model.vo.RechargePreviewVO;

import java.math.BigDecimal;

public interface RechargeOrderService {

    Page<RechargeOrderPageVO> getPage(RechargeOrderPageQuery query);

    RechargeOrderDetailVO getDetail(Long id);

    /**
     * 赠送预览：按金额匹配活动（门槛最高优先），无活动走等级赠送率兜底。
     * <p>
     * 服务端计算口径，充值弹窗实时预览与下单共用。
     */
    RechargePreviewVO preview(Long memberId, BigDecimal amount);

    /**
     * 发起充值（手动确认收款模式）：写充值单 -> 本金/赠送余额流水（活动赠送冻结至次月）-> 累计充值 -> 等级升级检查。
     *
     * @return 充值单ID
     */
    Long create(RechargeCreateForm form);

    /**
     * 活动赠送解冻（定时任务）：create_time 在本月 1 号之前、gift_frozen=1 且未解冻的充值单，
     * 条件更新占坑（幂等）后解冻至赠送桶。须在目标租户上下文内调用。
     *
     * @return 本租户本次解冻笔数
     */
    int unfreezeDue();

    /**
     * 跨租户解冻编排（定时任务入口）：逐启用租户切换上下文执行 {@link #unfreezeDue()}。
     *
     * @return 全租户解冻总笔数
     */
    int unfreezeDueAll();
}

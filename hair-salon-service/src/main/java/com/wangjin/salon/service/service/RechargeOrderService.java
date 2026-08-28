package com.wangjin.salon.service.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.salon.service.model.entity.SalonRechargeOrder;
import com.wangjin.salon.service.model.form.RechargeCreateForm;
import com.wangjin.salon.service.model.query.RechargeOrderPageQuery;
import com.wangjin.salon.service.model.vo.RechargeOrderDetailVO;
import com.wangjin.salon.service.model.vo.RechargeOrderPageVO;
import com.wangjin.salon.service.model.vo.RechargePayStatusVO;
import com.wangjin.salon.service.model.vo.RechargePreviewVO;
import com.wangjin.salon.service.model.vo.RechargePrepayVO;

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
     * 发起充值（手动确认收款模式）：写充值单（即时已支付）-> 本金/赠送余额流水（活动赠送冻结至次月）-> 累计充值 -> 等级升级检查。
     *
     * @return 充值单ID
     */
    Long create(RechargeCreateForm form);

    /**
     * 扫码预下单（直连模式，wxpay/alipay）：写充值单（待支付，不入账）+ 落支付流水 pending + 渠道下单出码。
     * <p>
     * 支付确认由回调/查单补偿驱动（入账逻辑与手动确认共用）；须在租户上下文内调用。
     *
     * @return 预下单结果（二维码内容，前端渲染成二维码）
     */
    RechargePrepayVO prepayScan(String channel, RechargeCreateForm form);

    /**
     * 充值单支付状态（前端轮询扫码结果）。
     */
    RechargePayStatusVO getPayStatus(Long rechargeId);

    /**
     * 取消待支付充值单（条件更新 0->2 占坑防并发；支付流水同步置 failed）。
     * <p>
     * 已支付/已取消的单不可取消；须在租户上下文内调用。
     */
    void cancel(Long rechargeId);

    /**
     * 支付确认后入账（手动确认 create 与渠道回调确认共用）：本金/赠送余额流水（活动赠送冻结至次月）
     * + 累计充值 + 等级升级检查。渠道确认链路在 {@code RechargePayConfirmExecutor} 事务内调用。
     */
    void settleRecharge(SalonRechargeOrder order);

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

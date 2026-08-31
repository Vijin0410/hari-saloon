package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 支付流水（渠道直连，docs/payment-design.md §7.2）。
 * <p>
 * 下单即落 pending（含租户/业务单据映射，回调按 out_trade_no 反查）；
 * 回调或查单补偿确认后置 paid，P8 对账依据。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_pay_record")
public class SalonPayRecord extends BaseTenantEntity<Long> {

    /** 业务类型：充值订单 */
    public static final int BIZ_TYPE_RECHARGE = 1;
    /** 业务类型：收银订单（预留） */
    public static final int BIZ_TYPE_ORDER = 2;

    /** 流水状态：已下单待支付 */
    public static final String STATUS_PENDING = "pending";
    /** 流水状态：已支付 */
    public static final String STATUS_PAID = "paid";
    /** 流水状态：已退款（P6） */
    public static final String STATUS_REFUNDED = "refunded";
    /** 流水状态：失败/超时关闭 */
    public static final String STATUS_FAILED = "failed";

    /** 确认来源：实时回调 */
    public static final String SOURCE_REALTIME_CALLBACK = "realtime_callback";
    /** 确认来源：查单补偿 */
    public static final String SOURCE_QUERY_COMPENSATE = "query_compensate";

    /** 业务类型（1=充值订单 2=收银订单，预留） */
    private Integer bizType;
    /** 业务单据ID（biz_type 对应表主键） */
    private Long bizId;
    /** 关联收银订单ID（收银场景） */
    private Long orderId;
    /** 关联退款单ID（渠道流水被退款全额退光置 refunded 时记录首次触发的退款单；精确分摊见 salon_refund_payment.pay_record_id） */
    private Long refundId;
    /** 支付渠道（字典 pay_channel：wxpay 等） */
    private String channel;
    /** 结算模式（字典 pay_settle_type：self_merchant 直连） */
    private String settleType;
    /** 系统内部交易单号（租户内唯一，下单传渠道；回调反查键） */
    private String outTradeNo;
    /** 渠道交易单号（微信 transaction_id；回调/查单回填） */
    private String transactionId;
    /** 订单金额（商家应收，元；渠道下单金额，入账与回调校验锚点） */
    private BigDecimal amount;
    /** 用户实付金额（元；微信 payer_total / 支付宝 buyer_pay_amount，平台补贴优惠时小于订单金额，仅留痕解释不参与入账） */
    private BigDecimal payerAmount;
    /** 渠道手续费（元；直连回调无此字段由 P8 对账单回填，服务商（收钱吧/富掌柜）回调可带） */
    private BigDecimal feeAmount;
    /** 商家实收金额（元 = 订单金额 - 商家侧优惠 - 手续费；直连对账回填，服务商回调可带，老板到手口径） */
    private BigDecimal merchantAmount;
    /** 结算到账日期（服务商 D+1 等；直连对账回填） */
    private LocalDate settleDate;
    /** 手续费来源（callback=回调实时获取 bill=对账单回填） */
    private String feeSource;
    /** 业务支付表单快照（JSON；订单扫码两阶段确认反序列化重放结算，充值等单据自含场景为空） */
    private String bizForm;
    /** 流水状态（pending/paid/refunded/failed） */
    private String status;
    /** 确认来源（realtime_callback/query_compensate/aggregate_pull/manual_input） */
    private String source;
    /** 支付完成时间（渠道口径） */
    private LocalDateTime paidAt;
    /** 回调/查单原始报文（JSON 留痕，可审计） */
    private String rawPayload;
    /** 备注 */
    private String remark;
}

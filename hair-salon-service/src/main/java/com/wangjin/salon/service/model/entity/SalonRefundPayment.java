package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

/**
 * 退款分摊明细（P6）：退款按原支付方式贪心分摊（先系统内后外部），每方式一行；对称 salon_order_payment。
 * <p>
 * 外部渠道行（channel 非空）绑定原支付流水调渠道退款 API 原路退回；系统内退回行
 * （现金/银行卡/其他/余额/线下退款）渠道为空，在退款单确认时一并置成功。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_refund_payment")
public class SalonRefundPayment extends BaseTenantEntity<Long> {

    /** 退款处理状态：处理中 */
    public static final String CHANNEL_STATUS_PROCESSING = "processing";
    /** 退款处理状态：已生效 */
    public static final String CHANNEL_STATUS_SUCCESS = "success";
    /** 退款处理状态：失败 */
    public static final String CHANNEL_STATUS_FAILED = "failed";

    /** 退款单ID */
    private Long refundId;
    /** 退回支付方式（字典 pay_method；7积分退回记退款单头不落行） */
    private Integer payMethod;
    /** 本行退款金额 */
    private BigDecimal amount;
    /** 绑定的原支付流水ID（渠道退款的调用依据；系统内退回/线下退款为空） */
    private Long payRecordId;
    /** 退款渠道（wxpay/alipay 调渠道原路退回；系统内退回为空） */
    private String channel;
    /** 商户退款单号（渠道幂等键，=退款单号；微信 out_refund_no / 支付宝 out_request_no） */
    private String outRefundNo;
    /** 渠道退款单号（微信 refund_id / 支付宝 trade_no；回调/查单回填） */
    private String channelRefundNo;
    /** 退款处理状态（processing=处理中 success=已生效 failed=失败；系统内退回在退款单确认时置 success） */
    private String channelStatus;
    /** 渠道退款手续费（元；直连退款响应无此数据由 P8 对账单回填） */
    private BigDecimal feeAmount;
    /** 手续费是否返还（0=否 1=是；直连退款手续费不返还属常态，商家承担，默认 0） */
    private Integer feeReturned;
    /** 渠道退款响应原始报文（JSON 留痕） */
    private String rawPayload;
    /** 备注（如：线下退款-无系统支付流水） */
    private String remark;
}

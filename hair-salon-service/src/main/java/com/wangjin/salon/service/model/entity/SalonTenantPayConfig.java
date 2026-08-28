package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 租户支付配置（渠道参数，见 docs/payment-design.md §7.1；一租户一渠道一条）。
 * <p>
 * 敏感字段（apiV3Key/privateKey/platformPublicKey/authToken）SM4 加密存储；
 * 证书文件走 MinIO 私有桶，本表只存 object_key。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_tenant_pay_config")
public class SalonTenantPayConfig extends BaseTenantEntity<Long> {

    /** 支付渠道（字典 pay_channel：wxpay/alipay/shouqianba/saibe/fuzhanggui/manual） */
    private String channel;
    /** 结算模式（字典 pay_settle_type：self_merchant直连/aggregate_pull聚合拉单/manual手动） */
    private String settleType;
    /** 是否启用（1=启用 0=停用） */
    private Integer enabled;
    /** 直连：AppID（微信公众号/小程序或支付宝应用） */
    private String appId;
    /** 直连：商户号（微信mch_id/支付宝合作者身份ID） */
    private String mchId;
    /** 直连：微信APIv3密钥（SM4加密存储） */
    private String apiV3Key;
    /** 直连：商户证书序列号（微信） */
    private String certSerialNo;
    /** 直连：商户/应用私钥PEM全文（SM4加密存储） */
    private String privateKey;
    /** 直连：平台公钥（支付宝公钥，SM4加密存储） */
    private String platformPublicKey;
    /** 聚合：服务商商户号/子商户号 */
    private String subMchId;
    /** 聚合：门店号/终端号 */
    private String storeNo;
    /** 聚合：开放平台授权token（SM4加密存储） */
    private String authToken;
    /** 营业执照文件MinIO object_key（私有桶） */
    private String licenseObjectKey;
    /** 证书/密钥文件MinIO object_key（私有桶，如微信apiclient_cert.p12） */
    private String certObjectKey;
    /** 聚合拉单间隔（秒，如120） */
    private Integer pullIntervalSec;
    /** 配置状态（字典 pay_config_status：pending待验证/active验证通过/invalid验证失败） */
    private String status;
    /** 备注 */
    private String remark;
}

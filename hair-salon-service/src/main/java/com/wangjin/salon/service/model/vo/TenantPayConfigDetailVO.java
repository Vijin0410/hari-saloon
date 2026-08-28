package com.wangjin.salon.service.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 租户支付配置详情（编辑回显用）。
 * <p>
 * 敏感字段不回显明文：APIv3 密钥只给尾 4 位（apiV3KeyTail），私钥/公钥/token 只给是否已配置；
 * 前端编辑时输入框留空 = 保持原值。
 */
@Data
@Schema(description = "租户支付配置详情")
public class TenantPayConfigDetailVO {

    @Schema(description = "配置ID")
    private Long id;
    @Schema(description = "支付渠道：wxpay/alipay/shouqianba/saibe/fuzhangui/manual")
    private String channel;
    @Schema(description = "结算模式：self_merchant/aggregate_pull/manual")
    private String settleType;
    @Schema(description = "是否启用（1=启用 0=停用）")
    private Integer enabled;
    @Schema(description = "AppID")
    private String appId;
    @Schema(description = "商户号")
    private String mchId;
    @Schema(description = "APIv3密钥尾4位（明文不回显）")
    private String apiV3KeyTail;
    @Schema(description = "是否已配置APIv3密钥")
    private Boolean apiV3KeySet;
    @Schema(description = "商户证书序列号")
    private String certSerialNo;
    @Schema(description = "是否已配置商户/应用私钥")
    private Boolean privateKeySet;
    @Schema(description = "是否已配置平台公钥（支付宝）")
    private Boolean platformPublicKeySet;
    @Schema(description = "服务商商户号/子商户号")
    private String subMchId;
    @Schema(description = "门店号/终端号")
    private String storeNo;
    @Schema(description = "是否已配置授权token")
    private Boolean authTokenSet;
    @Schema(description = "营业执照文件MinIO object_key")
    private String licenseObjectKey;
    @Schema(description = "证书/密钥文件MinIO object_key")
    private String certObjectKey;
    @Schema(description = "聚合拉单间隔（秒）")
    private Integer pullIntervalSec;
    @Schema(description = "配置状态：pending/active/invalid")
    private String status;
    @Schema(description = "备注")
    private String remark;
    @Schema(description = "更新时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updateTime;
}

package com.wangjin.salon.service.model.form;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 租户支付配置表单。
 * <p>
 * 敏感字段（apiV3Key/privateKey/platformPublicKey/authToken）：新增按渠道必填（Service 合并校验），
 * 编辑留空 = 保持原值（不回显明文）；其余字段为 null 时同样不更新（部分更新契约见 CLAUDE.md 2.1）。
 */
@Data
@Schema(description = "租户支付配置表单")
public class TenantPayConfigForm {

    @Schema(description = "配置ID")
    private Long id;

    @Schema(description = "支付渠道：wxpay/alipay/shouqianba/saibe/fuzhangui/manual")
    @NotBlank(message = "支付渠道不能为空")
    @Pattern(regexp = "^(wxpay|alipay|shouqianba|saibe|fuzhangui|manual)$", message = "支付渠道不合法")
    private String channel;

    @Schema(description = "结算模式：self_merchant/aggregate_pull/manual")
    @NotBlank(message = "结算模式不能为空")
    @Pattern(regexp = "^(self_merchant|aggregate_pull|manual)$", message = "结算模式不合法")
    private String settleType;

    @Schema(description = "是否启用：1启用 0停用")
    @Min(value = 0, message = "是否启用取值不合法")
    @Max(value = 1, message = "是否启用取值不合法")
    private Integer enabled;

    @Schema(description = "直连：AppID（微信公众号/小程序或支付宝应用）")
    @Size(max = 64, message = "AppID长度不能超过64")
    private String appId;

    @Schema(description = "直连：商户号（微信mch_id/支付宝合作者身份ID）")
    @Size(max = 32, message = "商户号长度不能超过32")
    private String mchId;

    @Schema(description = "直连：微信APIv3密钥（32位；编辑留空=保持原值）")
    @Size(max = 64, message = "APIv3密钥长度不能超过64")
    private String apiV3Key;

    @Schema(description = "直连：商户证书序列号（微信）")
    @Size(max = 64, message = "商户证书序列号长度不能超过64")
    private String certSerialNo;

    @Schema(description = "直连：商户/应用私钥PEM全文（编辑留空=保持原值）")
    private String privateKey;

    @Schema(description = "直连：支付宝公钥（编辑留空=保持原值）")
    private String platformPublicKey;

    @Schema(description = "聚合：服务商商户号/子商户号")
    @Size(max = 64, message = "服务商商户号长度不能超过64")
    private String subMchId;

    @Schema(description = "聚合：门店号/终端号")
    @Size(max = 64, message = "门店号长度不能超过64")
    private String storeNo;

    @Schema(description = "聚合：开放平台授权token（编辑留空=保持原值）")
    @Size(max = 2048, message = "授权token长度不能超过2048")
    private String authToken;

    @Schema(description = "营业执照文件MinIO object_key（前端上传后回填）")
    @Size(max = 255, message = "营业执照object_key长度不能超过255")
    private String licenseObjectKey;

    @Schema(description = "证书/密钥文件MinIO object_key（前端上传后回填）")
    @Size(max = 255, message = "证书文件object_key长度不能超过255")
    private String certObjectKey;

    @Schema(description = "聚合拉单间隔（秒，如120）")
    @Min(value = 30, message = "拉单间隔不能少于30秒")
    @Max(value = 3600, message = "拉单间隔不能超过3600秒")
    private Integer pullIntervalSec;

    @Schema(description = "备注")
    @Size(max = 255, message = "备注长度不能超过255")
    private String remark;
}

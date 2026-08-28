import { z } from 'zod';
import { PAY_CHANNELS } from '@/features/pay-config/model/payConfigTypes';

/**
 * 支付配置表单校验。
 * 敏感字段（apiV3Key/privateKey/platformPublicKey/authToken）：新增按渠道必填；
 * 编辑留空 = 保持原值（库中已配置），必填兜底由后端合并校验完成。
 */
export function buildPayConfigSchema(isCreate: boolean) {
  return z
    .object({
      channel: z.enum(['wxpay', 'alipay', 'shouqianba', 'saibe', 'fuzhanggui', 'manual']),
      settleType: z.enum(['self_merchant', 'aggregate_pull', 'manual']),
      enabled: z.union([z.literal(0), z.literal(1)]),
      appId: z.string().trim().max(64, 'AppID长度不能超过64'),
      mchId: z.string().trim().max(32, '商户号长度不能超过32'),
      apiV3Key: z.string().trim().max(64, 'APIv3密钥长度不能超过64'),
      certSerialNo: z.string().trim().max(64, '商户证书序列号长度不能超过64'),
      privateKey: z.string(),
      platformPublicKey: z.string(),
      subMchId: z.string().trim().max(64, '服务商商户号长度不能超过64'),
      storeNo: z.string().trim().max(64, '门店号长度不能超过64'),
      authToken: z.string().trim().max(2048, '授权token长度不能超过2048'),
      licenseObjectKey: z.string(),
      certObjectKey: z.string(),
      pullIntervalSec: z.string().trim().refine((v) => !v || /^\d{1,4}$/.test(v), '拉单间隔须为30-3600的整数（秒）'),
      remark: z.string().trim().max(255, '备注长度不能超过255'),
    })
    .superRefine((v, ctx) => {
      // 渠道与结算模式匹配
      const expected = PAY_CHANNELS.find((c) => c.value === v.channel)?.settleType;
      if (expected && v.settleType !== expected) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['settleType'], message: '支付渠道与结算模式不匹配' });
      }
      if (v.pullIntervalSec && Number(v.pullIntervalSec) < 30) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pullIntervalSec'], message: '拉单间隔不能少于30秒' });
      }
      if (v.pullIntervalSec && Number(v.pullIntervalSec) > 3600) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pullIntervalSec'], message: '拉单间隔不能超过3600秒' });
      }
      if (!isCreate) {
        return;
      }
      const requireField = (field: 'appId' | 'mchId' | 'apiV3Key' | 'certSerialNo' | 'privateKey' | 'platformPublicKey' | 'subMchId' | 'authToken', label: string) => {
        if (!v[field].trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `${label}不能为空` });
        }
      };
      if (v.channel === 'wxpay') {
        requireField('appId', 'AppID');
        requireField('mchId', '商户号');
        requireField('apiV3Key', 'APIv3密钥');
        requireField('certSerialNo', '商户证书序列号');
        requireField('privateKey', '商户私钥');
        if (v.apiV3Key.trim().length > 0 && v.apiV3Key.trim().length !== 32) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['apiV3Key'], message: 'APIv3密钥须为32位字符' });
        }
      } else if (v.channel === 'alipay') {
        requireField('appId', 'AppID');
        requireField('mchId', '合作者身份ID');
        requireField('privateKey', '应用私钥');
        requireField('platformPublicKey', '支付宝公钥');
      } else if (v.channel === 'shouqianba' || v.channel === 'saibe' || v.channel === 'fuzhanggui') {
        requireField('subMchId', '服务商商户号');
        requireField('authToken', '授权token');
      }
    });
}

export type PayConfigFormValues = z.infer<ReturnType<typeof buildPayConfigSchema>>;

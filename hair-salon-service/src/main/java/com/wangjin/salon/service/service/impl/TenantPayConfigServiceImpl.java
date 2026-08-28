package com.wangjin.salon.service.service.impl;

import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.common.exception.BizException;
import com.wangjin.salon.service.converter.TenantPayConfigConverter;
import com.wangjin.salon.service.mapper.SalonTenantPayConfigMapper;
import com.wangjin.salon.service.model.entity.SalonTenantPayConfig;
import com.wangjin.salon.service.model.form.TenantPayConfigForm;
import com.wangjin.salon.service.model.query.TenantPayConfigPageQuery;
import com.wangjin.salon.service.model.vo.TenantPayConfigDetailVO;
import com.wangjin.salon.service.model.vo.TenantPayConfigOptionVO;
import com.wangjin.salon.service.model.vo.TenantPayConfigPageVO;
import com.wangjin.salon.service.model.vo.TenantPayConfigVerifyVO;
import com.wangjin.salon.service.pay.AlipayParamVerifier;
import com.wangjin.salon.service.pay.WxpayV3Verifier;
import com.wangjin.salon.service.service.TenantPayConfigService;
import com.wangjin.salon.service.util.Sm4Cipher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.function.Function;

@Slf4j
@Service
@RequiredArgsConstructor
public class TenantPayConfigServiceImpl extends ServiceImpl<SalonTenantPayConfigMapper, SalonTenantPayConfig>
        implements TenantPayConfigService {

    private static final String CHANNEL_WXPAY = "wxpay";
    private static final String CHANNEL_ALIPAY = "alipay";
    private static final String CHANNEL_MANUAL = "manual";
    private static final String SETTLE_SELF_MERCHANT = "self_merchant";
    private static final String SETTLE_AGGREGATE_PULL = "aggregate_pull";
    private static final String SETTLE_MANUAL = "manual";
    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_ACTIVE = "active";
    private static final String STATUS_INVALID = "invalid";

    private final TenantPayConfigConverter converter;
    private final Sm4Cipher sm4Cipher;
    private final WxpayV3Verifier wxpayV3Verifier;
    private final AlipayParamVerifier alipayParamVerifier;

    @Override
    public Page<TenantPayConfigPageVO> getPage(TenantPayConfigPageQuery query) {
        Page<SalonTenantPayConfig> page = this.page(
                new Page<>(query.getPageNum(), query.getPageSize()),
                Wrappers.<SalonTenantPayConfig>lambdaQuery()
                        .eq(StrUtil.isNotBlank(query.getChannel()), SalonTenantPayConfig::getChannel, query.getChannel())
                        .eq(StrUtil.isNotBlank(query.getStatus()), SalonTenantPayConfig::getStatus, query.getStatus())
                        .orderByDesc(SalonTenantPayConfig::getUpdateTime));
        Page<TenantPayConfigPageVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(converter::entity2PageVo).toList());
        return result;
    }

    @Override
    public TenantPayConfigDetailVO getDetail(Long id) {
        SalonTenantPayConfig entity = this.getById(id);
        Assert.notNull(entity, "支付配置不存在");
        TenantPayConfigDetailVO detail = converter.entity2DetailVo(entity);
        detail.setApiV3KeySet(StrUtil.isNotBlank(entity.getApiV3Key()));
        detail.setApiV3KeyTail(maskTail(entity.getApiV3Key()));
        detail.setPrivateKeySet(StrUtil.isNotBlank(entity.getPrivateKey()));
        detail.setPlatformPublicKeySet(StrUtil.isNotBlank(entity.getPlatformPublicKey()));
        detail.setAuthTokenSet(StrUtil.isNotBlank(entity.getAuthToken()));
        return detail;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long save(TenantPayConfigForm form) {
        assertChannelSettleMatch(form.getChannel(), form.getSettleType());
        assertChannelUnique(form.getChannel(), null);
        assertRequiredParams(form, null);
        SalonTenantPayConfig entity = converter.form2Entity(form);
        encryptSecrets(entity);
        if (entity.getEnabled() == null) {
            entity.setEnabled(1);
        }
        entity.setStatus(STATUS_PENDING);
        this.save(entity);
        return entity.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean update(Long id, TenantPayConfigForm form) {
        SalonTenantPayConfig old = this.getById(id);
        Assert.notNull(old, "支付配置不存在");
        if (!Objects.equals(old.getChannel(), form.getChannel())) {
            throw new BizException("支付渠道不允许修改（渠道变更请删除后重新配置）");
        }
        assertChannelSettleMatch(form.getChannel(), form.getSettleType());
        assertRequiredParams(form, old);
        SalonTenantPayConfig entity = converter.form2Entity(form);
        entity.setId(id);
        // 敏感字段留空 = 保持原值：Entity null 字段走 NOT_NULL 更新策略自动跳过
        encryptSecrets(entity);
        // 参与验参的输入发生变更 -> 状态回 pending 重新验证
        if (verifyInputChanged(form, old)) {
            entity.setStatus(STATUS_PENDING);
        }
        return this.updateById(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean delete(String ids) {
        Assert.isTrue(StrUtil.isNotBlank(ids), "删除ID不能为空");
        List<Long> idList = Arrays.stream(ids.split(",")).map(Long::parseLong).toList();
        return this.removeByIds(idList);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public TenantPayConfigVerifyVO verify(Long id) {
        SalonTenantPayConfig config = this.getById(id);
        Assert.notNull(config, "支付配置不存在");
        TenantPayConfigVerifyVO vo = new TenantPayConfigVerifyVO();
        vo.setId(id);

        if (CHANNEL_MANUAL.equals(config.getChannel())) {
            updateStatus(id, STATUS_ACTIVE);
            vo.setPass(true);
            vo.setStatus(STATUS_ACTIVE);
            vo.setMessage("手动录入渠道无需验参，已置为验证通过");
            return vo;
        }
        if (CHANNEL_WXPAY.equals(config.getChannel()) && SETTLE_SELF_MERCHANT.equals(config.getSettleType())) {
            return verifyWxpay(id, config, vo);
        }
        if (CHANNEL_ALIPAY.equals(config.getChannel()) && SETTLE_SELF_MERCHANT.equals(config.getSettleType())) {
            return verifyAlipay(id, config, vo);
        }
        // 聚合渠道：三期聚合拉单接入后支持在线验参，当前只做本地完整性确认
        String missing = missingParams(config);
        if (missing != null) {
            updateStatus(id, STATUS_INVALID);
            vo.setPass(false);
            vo.setStatus(STATUS_INVALID);
            vo.setMessage("缺少必填参数：" + missing);
            return vo;
        }
        vo.setPass(false);
        vo.setStatus(STATUS_PENDING);
        vo.setMessage("该渠道在线验参将在直连 SDK 接入后支持，参数已保存为待验证");
        return vo;
    }

    @Override
    public List<TenantPayConfigOptionVO> options() {
        return this.list(Wrappers.<SalonTenantPayConfig>lambdaQuery()
                        .eq(SalonTenantPayConfig::getEnabled, 1)
                        .eq(SalonTenantPayConfig::getStatus, STATUS_ACTIVE))
                .stream()
                .map(converter::entity2OptionVo)
                .toList();
    }

    @Override
    public SalonTenantPayConfig requireActiveConfig(String channel) {
        SalonTenantPayConfig cfg = this.getOne(Wrappers.<SalonTenantPayConfig>lambdaQuery()
                .eq(SalonTenantPayConfig::getChannel, channel)
                .eq(SalonTenantPayConfig::getEnabled, 1)
                .eq(SalonTenantPayConfig::getStatus, STATUS_ACTIVE)
                .last("LIMIT 1"));
        if (cfg == null) {
            throw new BizException("未配置可用的支付渠道：" + channel + "（需在支付配置中完成验参）");
        }
        return cfg;
    }

    // ==================== 私有工具 ====================

    /** 微信直连验参：V3 只读接口（GET /v3/certificates）验三元组 */
    private TenantPayConfigVerifyVO verifyWxpay(Long id, SalonTenantPayConfig config, TenantPayConfigVerifyVO vo) {
        String missing = missingParams(config);
        if (missing != null) {
            updateStatus(id, STATUS_INVALID);
            vo.setPass(false);
            vo.setStatus(STATUS_INVALID);
            vo.setMessage("缺少必填参数：" + missing);
            return vo;
        }
        String privateKey;
        try {
            privateKey = sm4Cipher.decrypt(config.getPrivateKey());
        } catch (BizException e) {
            log.error("微信验参解密私钥失败 configId={}", id, e);
            vo.setPass(false);
            vo.setStatus(STATUS_PENDING);
            vo.setMessage("私钥解密失败，请联系平台管理员检查加密密钥配置");
            return vo;
        }
        WxpayV3Verifier.VerifyOutcome outcome =
                wxpayV3Verifier.verify(config.getMchId(), config.getCertSerialNo(), privateKey);
        String status = outcome.pass() ? STATUS_ACTIVE : (outcome.networkError() ? STATUS_PENDING : STATUS_INVALID);
        updateStatus(id, status);
        vo.setPass(outcome.pass());
        vo.setStatus(status);
        vo.setMessage(outcome.message());
        return vo;
    }

    /** 支付宝直连验参：只读接口 trade.query 查哑单号，返回 ACQ.TRADE_NOT_EXIST 即四元组（网关/AppID/应用私钥/支付宝公钥）全通 */
    private TenantPayConfigVerifyVO verifyAlipay(Long id, SalonTenantPayConfig config, TenantPayConfigVerifyVO vo) {
        String missing = missingParams(config);
        if (missing != null) {
            updateStatus(id, STATUS_INVALID);
            vo.setPass(false);
            vo.setStatus(STATUS_INVALID);
            vo.setMessage("缺少必填参数：" + missing);
            return vo;
        }
        String privateKey;
        String alipayPublicKey;
        try {
            privateKey = sm4Cipher.decrypt(config.getPrivateKey());
            alipayPublicKey = sm4Cipher.decrypt(config.getPlatformPublicKey());
        } catch (BizException e) {
            log.error("支付宝验参解密密钥失败 configId={}", id, e);
            vo.setPass(false);
            vo.setStatus(STATUS_PENDING);
            vo.setMessage("密钥解密失败，请联系平台管理员检查加密密钥配置");
            return vo;
        }
        AlipayParamVerifier.VerifyOutcome outcome =
                alipayParamVerifier.verify(config.getAppId(), privateKey, alipayPublicKey);
        String status = outcome.pass() ? STATUS_ACTIVE : (outcome.networkError() ? STATUS_PENDING : STATUS_INVALID);
        updateStatus(id, status);
        vo.setPass(outcome.pass());
        vo.setStatus(status);
        vo.setMessage(outcome.message());
        return vo;
    }

    /** 渠道与结算模式合法组合：直连渠道(self_merchant) / 聚合渠道(aggregate_pull) / manual(manual) */
    private void assertChannelSettleMatch(String channel, String settleType) {
        boolean matched = switch (channel) {
            case CHANNEL_WXPAY, CHANNEL_ALIPAY -> SETTLE_SELF_MERCHANT.equals(settleType);
            case "shouqianba", "saibe", "fuzhanggui" -> SETTLE_AGGREGATE_PULL.equals(settleType);
            case CHANNEL_MANUAL -> SETTLE_MANUAL.equals(settleType);
            default -> false;
        };
        if (!matched) {
            throw new BizException("支付渠道与结算模式不匹配（直连渠道选商户直连，聚合渠道选聚合拉单，手动录入选手动录入）");
        }
    }

    /** 同租户同渠道仅一条（逻辑删除不计） */
    private void assertChannelUnique(String channel, Long excludeId) {
        Long count = this.count(Wrappers.<SalonTenantPayConfig>lambdaQuery()
                .eq(SalonTenantPayConfig::getChannel, channel)
                .ne(excludeId != null, SalonTenantPayConfig::getId, excludeId));
        if (count != null && count > 0) {
            throw new BizException("该支付渠道已存在配置，请直接编辑原配置");
        }
    }

    /**
     * 按渠道校验必填参数；编辑场景表单空值回落库中原值合并判断（敏感字段留空 = 保持原值）。
     */
    private void assertRequiredParams(TenantPayConfigForm form, SalonTenantPayConfig old) {
        switch (form.getChannel()) {
            case CHANNEL_WXPAY -> {
                assertNotBlank(merge(form.getAppId(), old, SalonTenantPayConfig::getAppId), "AppID（与商户号绑定的公众号/小程序）");
                assertNotBlank(merge(form.getMchId(), old, SalonTenantPayConfig::getMchId), "商户号");
                String apiV3Key = merge(form.getApiV3Key(), old, SalonTenantPayConfig::getApiV3Key);
                assertNotBlank(apiV3Key, "APIv3密钥");
                if (StrUtil.isNotBlank(form.getApiV3Key()) && form.getApiV3Key().length() != 32) {
                    throw new BizException("APIv3密钥须为32位字符");
                }
                assertNotBlank(merge(form.getCertSerialNo(), old, SalonTenantPayConfig::getCertSerialNo), "商户证书序列号");
                assertNotBlank(merge(form.getPrivateKey(), old, SalonTenantPayConfig::getPrivateKey), "商户私钥");
            }
            case CHANNEL_ALIPAY -> {
                assertNotBlank(merge(form.getAppId(), old, SalonTenantPayConfig::getAppId), "AppID");
                assertNotBlank(merge(form.getMchId(), old, SalonTenantPayConfig::getMchId), "合作者身份ID");
                assertNotBlank(merge(form.getPrivateKey(), old, SalonTenantPayConfig::getPrivateKey), "应用私钥");
                assertNotBlank(merge(form.getPlatformPublicKey(), old, SalonTenantPayConfig::getPlatformPublicKey), "支付宝公钥");
            }
            case "shouqianba", "saibe", "fuzhanggui" -> {
                assertNotBlank(merge(form.getSubMchId(), old, SalonTenantPayConfig::getSubMchId), "服务商商户号");
                assertNotBlank(merge(form.getAuthToken(), old, SalonTenantPayConfig::getAuthToken), "授权token");
            }
            default -> {
                // manual 无必填参数                
            }
        }
    }

    /** 表单值优先，空则回落库中原值（新增时原值为 null） */
    private String merge(String formValue, SalonTenantPayConfig old, Function<SalonTenantPayConfig, String> getter) {
        if (StrUtil.isNotBlank(formValue)) {
            return formValue;
        }
        return old == null ? null : getter.apply(old);
    }

    /** 基于库中配置（实体）的缺失必填参数清单；齐全返回 null */
    private String missingParams(SalonTenantPayConfig config) {
        List<String> missing = new ArrayList<>();
        switch (config.getChannel()) {
            case CHANNEL_WXPAY -> {
                addIfBlank(missing, config.getAppId(), "AppID");
                addIfBlank(missing, config.getMchId(), "商户号");
                addIfBlank(missing, config.getApiV3Key(), "APIv3密钥");
                addIfBlank(missing, config.getCertSerialNo(), "商户证书序列号");
                addIfBlank(missing, config.getPrivateKey(), "商户私钥");
            }
            case CHANNEL_ALIPAY -> {
                addIfBlank(missing, config.getAppId(), "AppID");
                addIfBlank(missing, config.getMchId(), "合作者身份ID");
                addIfBlank(missing, config.getPrivateKey(), "应用私钥");
                addIfBlank(missing, config.getPlatformPublicKey(), "支付宝公钥");
            }
            case "shouqianba", "saibe", "fuzhanggui" -> {
                addIfBlank(missing, config.getSubMchId(), "服务商商户号");
                addIfBlank(missing, config.getAuthToken(), "授权token");
            }
            default -> {
                // manual 无必填参数
            }
        }
        return missing.isEmpty() ? null : String.join("、", missing);
    }

    private void assertNotBlank(String value, String label) {
        if (StrUtil.isBlank(value)) {
            throw new BizException(label + "不能为空");
        }
    }

    private void addIfBlank(List<String> missing, String value, String label) {
        if (StrUtil.isBlank(value)) {
            missing.add(label);
        }
    }

    /** 参与验参的输入是否发生变化（变化则回 pending 重新验证；enabled/备注/证照文件不计） */
    private boolean verifyInputChanged(TenantPayConfigForm form, SalonTenantPayConfig old) {
        return !Objects.equals(old.getSettleType(), form.getSettleType())
                || !Objects.equals(old.getAppId(), form.getAppId())
                || !Objects.equals(old.getMchId(), form.getMchId())
                || !Objects.equals(old.getCertSerialNo(), form.getCertSerialNo())
                || !Objects.equals(old.getSubMchId(), form.getSubMchId())
                || !Objects.equals(old.getStoreNo(), form.getStoreNo())
                || StrUtil.isNotBlank(form.getApiV3Key())
                || StrUtil.isNotBlank(form.getPrivateKey())
                || StrUtil.isNotBlank(form.getPlatformPublicKey())
                || StrUtil.isNotBlank(form.getAuthToken());
    }

    /** 敏感字段加密（空值原样保留，配合 NOT_NULL 更新策略即「留空不改」） */
    private void encryptSecrets(SalonTenantPayConfig entity) {
        entity.setApiV3Key(sm4Cipher.encrypt(entity.getApiV3Key()));
        entity.setPrivateKey(sm4Cipher.encrypt(entity.getPrivateKey()));
        entity.setPlatformPublicKey(sm4Cipher.encrypt(entity.getPlatformPublicKey()));
        entity.setAuthToken(sm4Cipher.encrypt(entity.getAuthToken()));
    }

    /** 只更新状态，避免覆盖加密字段 */
    private void updateStatus(Long id, String status) {
        this.update(Wrappers.<SalonTenantPayConfig>lambdaUpdate()
                .eq(SalonTenantPayConfig::getId, id)
                .set(SalonTenantPayConfig::getStatus, status));
    }

    /** 明文尾4位掩码（解密失败降级为空，不阻断详情） */
    private String maskTail(String encrypted) {
        if (StrUtil.isBlank(encrypted)) {
            return null;
        }
        try {
            String plain = sm4Cipher.decrypt(encrypted);
            return StrUtil.isBlank(plain) ? null : StrUtil.sub(plain, -4, plain.length());
        } catch (Exception e) {
            log.warn("掩码展示时解密失败，忽略尾4位展示", e);
            return null;
        }
    }
}

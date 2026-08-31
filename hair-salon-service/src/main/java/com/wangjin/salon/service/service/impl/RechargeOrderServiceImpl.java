package com.wangjin.salon.service.service.impl;

import cn.hutool.core.lang.Assert;
import cn.hutool.core.date.DateUtil;
import cn.hutool.core.util.RandomUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.common.exception.BizException;
import com.wangjin.common.security.util.SecurityUtils;
import com.wangjin.salon.service.config.PayProperties;
import com.wangjin.salon.service.mapper.SalonMemberLevelMapper;
import com.wangjin.salon.service.mapper.SalonMemberMapper;
import com.wangjin.salon.service.mapper.SalonPayRecordMapper;
import com.wangjin.salon.service.mapper.SalonRechargeOrderMapper;
import com.wangjin.salon.service.model.entity.SalonMember;
import com.wangjin.salon.service.model.entity.SalonMemberLevel;
import com.wangjin.salon.service.model.entity.SalonPayRecord;
import com.wangjin.salon.service.model.entity.SalonRechargeActivity;
import com.wangjin.salon.service.model.entity.SalonRechargeOrder;
import com.wangjin.salon.service.model.entity.SalonTenantPayConfig;
import com.wangjin.salon.service.model.form.RechargeCreateForm;
import com.wangjin.salon.service.model.query.RechargeOrderPageQuery;
import com.wangjin.salon.service.model.vo.RechargeOrderDetailVO;
import com.wangjin.salon.service.model.vo.RechargeOrderPageVO;
import com.wangjin.salon.service.model.vo.RechargePayStatusVO;
import com.wangjin.salon.service.model.vo.RechargePreviewVO;
import com.wangjin.salon.service.model.vo.RechargePrepayVO;
import com.wangjin.salon.service.pay.AlipayChannelService;
import com.wangjin.salon.service.pay.PayChannel;
import com.wangjin.salon.service.pay.PayPrepayCommand;
import com.wangjin.salon.service.pay.WxpayChannelService;
import com.wangjin.salon.service.service.MemberAssetService;
import com.wangjin.salon.service.service.MemberLevelService;
import com.wangjin.salon.service.service.RechargeActivityService;
import com.wangjin.salon.service.service.RechargeOrderService;
import com.wangjin.salon.service.service.SalonStorePermissionService;
import com.wangjin.salon.service.service.TenantPayConfigService;
import com.wangjin.salon.system.model.entity.SysTenant;
import com.wangjin.salon.system.service.SysTenantService;
import com.wangjin.salon.system.util.TenantContextRunner;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class RechargeOrderServiceImpl implements RechargeOrderService {

    private final SalonRechargeOrderMapper rechargeOrderMapper;
    private final SalonMemberMapper memberMapper;
    private final SalonMemberLevelMapper levelMapper;
    private final MemberAssetService memberAssetService;
    private final MemberLevelService memberLevelService;
    private final RechargeActivityService rechargeActivityService;
    private final SalonStorePermissionService storePermissionService;
    private final SysTenantService sysTenantService;
    private final RechargeGiftUnfreezeExecutor unfreezeExecutor;
    private final SalonPayRecordMapper payRecordMapper;
    private final TenantPayConfigService tenantPayConfigService;
    private final List<PayChannel> payChannels;
    private final PayProperties payProperties;

    /** 余额桶：1本金 2赠送 3冻结 */
    private static final int BUCKET_PRINCIPAL = 1;
    private static final int BUCKET_GIFT = 2;
    private static final int BUCKET_FROZEN = 3;
    /** 余额变动类型：1充值 2充值赠送 8冻结 */
    private static final int CT_RECHARGE = 1;
    private static final int CT_RECHARGE_GIFT = 2;
    private static final int CT_FREEZE = 8;

    /** 充值可用支付方式（字典 pay_method：1现金 2微信 3支付宝 4银行卡 8其他；不允许余额/积分） */
    private static final Set<Integer> RECHARGE_PAY_METHODS = Set.of(1, 2, 3, 4, 8);

    @Override
    public Page<RechargeOrderPageVO> getPage(RechargeOrderPageQuery query) {
        storePermissionService.apply(query);
        return rechargeOrderMapper.getRechargePage(new Page<>(query.getPageNum(), query.getPageSize()), query);
    }

    @Override
    public RechargeOrderDetailVO getDetail(Long id) {
        SalonRechargeOrder order = rechargeOrderMapper.selectById(id);
        Assert.notNull(order, "充值单不存在");
        SalonMember member = memberMapper.selectById(order.getMemberId());
        Assert.notNull(member, "会员不存在");
        storePermissionService.assertStoreAccessible(member.getStoreId(), "无权限查看该充值单");
        RechargeOrderDetailVO vo = new RechargeOrderDetailVO();
        RechargeOrderPageVO base = rechargeOrderMapper.getRechargeById(order.getId());
        if (base != null) {
            org.springframework.beans.BeanUtils.copyProperties(base, vo);
        }
        vo.setUnfrozenTime(order.getUnfrozenTime());
        vo.setPayTime(order.getPayTime());
        vo.setStoreId(order.getStoreId());
        vo.setActivityId(order.getActivityId());
        return vo;
    }

    @Override
    public RechargePreviewVO preview(Long memberId, BigDecimal amount) {
        Assert.isTrue(amount != null && amount.compareTo(BigDecimal.ZERO) > 0, "充值金额必须大于0");
        SalonMember member = memberMapper.selectById(memberId);
        Assert.notNull(member, "会员不存在");
        return calcGiftPlan(member, amount);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long create(RechargeCreateForm form) {
        if (!RECHARGE_PAY_METHODS.contains(form.getPayMethod())) {
            throw new BizException("充值不支持该支付方式（不允许使用余额/积分）");
        }
        SalonMember member = memberMapper.selectById(form.getMemberId());
        Assert.notNull(member, "会员不存在");
        storePermissionService.assertStoreAccessible(member.getStoreId(), "无权限为该会员充值");

        RechargePreviewVO plan = calcGiftPlan(member, form.getAmount());
        LocalDateTime now = LocalDateTime.now();
        SalonRechargeOrder order = new SalonRechargeOrder();
        order.setStoreId(member.getStoreId());
        order.setRechargeNo(generateNo());
        order.setMemberId(member.getId());
        order.setActivityId(plan.getActivityId());
        order.setPrincipalAmount(form.getAmount());
        order.setGiftAmount(plan.getGiftAmount());
        order.setGiftSource(plan.getGiftSource());
        order.setGiftFrozen(plan.getGiftFrozen());
        order.setPayMethod(form.getPayMethod());
        // 手动确认模式：单据即建即已支付
        order.setStatus(SalonRechargeOrder.STATUS_PAID);
        order.setPayTime(now);
        order.setOperatorId(SecurityUtils.getUserId());
        order.setRemark(form.getRemark());
        rechargeOrderMapper.insert(order);
        settleRecharge(order);
        return order.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public RechargePrepayVO prepayScan(String channel, RechargeCreateForm form) {
        // 渠道与支付方式联动校验（pay_method 字典：2=微信 3=支付宝）
        Integer expectedPayMethod = switch (channel) {
            case WxpayChannelService.CHANNEL -> 2;
            case AlipayChannelService.CHANNEL -> 3;
            default -> null;
        };
        if (expectedPayMethod == null) {
            throw new BizException("不支持的扫码支付渠道：" + channel);
        }
        if (!expectedPayMethod.equals(form.getPayMethod())) {
            throw new BizException("扫码充值支付方式与渠道不匹配（微信选微信、支付宝选支付宝）");
        }
        SalonMember member = memberMapper.selectById(form.getMemberId());
        Assert.notNull(member, "会员不存在");
        storePermissionService.assertStoreAccessible(member.getStoreId(), "无权限为该会员充值");

        SalonTenantPayConfig payConfig = tenantPayConfigService.requireActiveConfig(channel);
        PayChannel payChannel = payChannels.stream()
                .filter(c -> c.channel().equals(channel))
                .findFirst()
                .orElseThrow(() -> new BizException("支付渠道未接入：" + channel));
        RechargePreviewVO plan = calcGiftPlan(member, form.getAmount());
        SalonRechargeOrder order = new SalonRechargeOrder();
        order.setStoreId(member.getStoreId());
        order.setRechargeNo(generateNo());
        order.setMemberId(member.getId());
        order.setActivityId(plan.getActivityId());
        order.setPrincipalAmount(form.getAmount());
        order.setGiftAmount(plan.getGiftAmount());
        order.setGiftSource(plan.getGiftSource());
        order.setGiftFrozen(plan.getGiftFrozen());
        order.setPayMethod(form.getPayMethod());
        // 扫码模式：待支付，入账由回调/查单补偿驱动（RechargePayConfirmExecutor）
        order.setStatus(SalonRechargeOrder.STATUS_PENDING);
        order.setOperatorId(SecurityUtils.getUserId());
        order.setRemark(form.getRemark());
        rechargeOrderMapper.insert(order);

        // 支付流水：下单即 pending；out_trade_no=充值单号（租户内唯一），回调按租户参数反查
        String outTradeNo = order.getRechargeNo();
        SalonPayRecord record = new SalonPayRecord();
        record.setBizType(SalonPayRecord.BIZ_TYPE_RECHARGE);
        record.setBizId(order.getId());
        record.setChannel(channel);
        record.setSettleType(payConfig.getSettleType());
        record.setOutTradeNo(outTradeNo);
        record.setAmount(form.getAmount());
        record.setStatus(SalonPayRecord.STATUS_PENDING);
        payRecordMapper.insert(record);

        // 渠道扫码下单（HTTP 调用在事务内：失败整体回滚，无脏单；充值低频可接受）
        String codeUrl = payChannel.nativePrepay(
                new PayPrepayCommand(outTradeNo, form.getAmount(),
                        "会员充值-" + member.getName(),
                        payProperties.buildNotifyUrl(channel, SecurityUtils.getTenantId())),
                payConfig);

        RechargePrepayVO vo = new RechargePrepayVO();
        vo.setRechargeId(order.getId());
        vo.setOutTradeNo(outTradeNo);
        vo.setCodeUrl(codeUrl);
        vo.setAmount(form.getAmount());
        return vo;
    }

    @Override
    public RechargePayStatusVO getPayStatus(Long rechargeId) {
        SalonRechargeOrder order = rechargeOrderMapper.selectById(rechargeId);
        Assert.notNull(order, "充值单不存在");
        RechargePayStatusVO vo = new RechargePayStatusVO();
        vo.setRechargeId(order.getId());
        vo.setStatus(order.getStatus());
        vo.setPayTime(order.getPayTime());
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void cancel(Long rechargeId) {
        SalonRechargeOrder order = rechargeOrderMapper.selectById(rechargeId);
        Assert.notNull(order, "充值单不存在");
        storePermissionService.assertStoreAccessible(order.getStoreId(), "无权限取消该充值单");
        // 条件更新 0->2 占坑：已支付/已取消（并发回调确认、重复点击）时更新数为 0
        int claimed = rechargeOrderMapper.update(null, Wrappers.<SalonRechargeOrder>lambdaUpdate()
                .set(SalonRechargeOrder::getStatus, SalonRechargeOrder.STATUS_CANCELLED)
                .eq(SalonRechargeOrder::getId, rechargeId)
                .eq(SalonRechargeOrder::getStatus, SalonRechargeOrder.STATUS_PENDING));
        if (claimed == 0) {
            throw new BizException("仅待支付的充值单可取消");
        }
        // 支付流水同步关闭（渠道侧订单留待自然过期；若顾客随后仍支付成功，回调无 pending 流水不入账，P8 对账处理）
        payRecordMapper.update(null, Wrappers.<SalonPayRecord>lambdaUpdate()
                .set(SalonPayRecord::getStatus, SalonPayRecord.STATUS_FAILED)
                .set(SalonPayRecord::getRemark, "人工取消充值单")
                .eq(SalonPayRecord::getBizType, SalonPayRecord.BIZ_TYPE_RECHARGE)
                .eq(SalonPayRecord::getBizId, rechargeId)
                .eq(SalonPayRecord::getStatus, SalonPayRecord.STATUS_PENDING));
        log.info("充值单已取消 rechargeId={} rechargeNo={}", rechargeId, order.getRechargeNo());
    }

    @Override
    public int unfreezeDue() {
        LocalDateTime monthStart = YearMonth.now().atDay(1).atStartOfDay();
        List<SalonRechargeOrder> dueOrders = rechargeOrderMapper.selectList(
                Wrappers.<SalonRechargeOrder>lambdaQuery()
                        .eq(SalonRechargeOrder::getGiftFrozen, 1)
                        .isNull(SalonRechargeOrder::getUnfrozenTime)
                        .lt(SalonRechargeOrder::getCreateTime, monthStart)
                        .gt(SalonRechargeOrder::getGiftAmount, BigDecimal.ZERO));
        int count = 0;
        for (SalonRechargeOrder order : dueOrders) {
            try {
                if (unfreezeExecutor.unfreeze(order)) {
                    count++;
                }
            } catch (Exception e) {
                log.warn("充值赠送解冻失败 rechargeNo={}", order.getRechargeNo(), e);
            }
        }
        return count;
    }

    @Override
    public int unfreezeDueAll() {
        // sys_tenant 在 ignore-tables，跨租户可查；只处理启用租户
        List<Long> tenantIds = sysTenantService.lambdaQuery()
                .select(SysTenant::getId)
                .eq(SysTenant::getStatus, 1)
                .list()
                .stream().map(SysTenant::getId).toList();
        int total = 0;
        for (Long tenantId : tenantIds) {
            // 定时任务无登录态，须逐租户切换上下文（TenantLine 才能落对租户）
            total += TenantContextRunner.run(tenantId, this::unfreezeDue);
        }
        return total;
    }

    /**
     * 支付确认后入账（手动确认与渠道回调确认共用链路）：
     * 本金入账（预收款）-> 赠送入账（活动赠送冻结至次月，三行流水可审计）-> 累计充值 -> 等级升级检查。
     */
    @Override
    public void settleRecharge(SalonRechargeOrder order) {
        String bizNo = order.getRechargeNo();
        memberAssetService.changeBalance(order.getMemberId(), BUCKET_PRINCIPAL, order.getPrincipalAmount(),
                CT_RECHARGE, "RECHARGE", order.getId(), bizNo, order.getRemark());
        BigDecimal gift = order.getGiftAmount();
        if (gift != null && gift.compareTo(BigDecimal.ZERO) > 0) {
            memberAssetService.changeBalance(order.getMemberId(), BUCKET_GIFT, gift,
                    CT_RECHARGE_GIFT, "RECHARGE", order.getId(), bizNo, "充值赠送");
            if (order.getGiftFrozen() != null && order.getGiftFrozen() == 1) {
                memberAssetService.changeBalance(order.getMemberId(), BUCKET_FROZEN, gift,
                        CT_FREEZE, "RECHARGE", order.getId(), bizNo, "活动赠送冻结至次月");
            }
        }
        // 累计充值（本金口径）+ 等级升级检查
        memberMapper.update(null, Wrappers.<SalonMember>lambdaUpdate()
                .setSql("total_recharge_amount = COALESCE(total_recharge_amount, 0) + " + order.getPrincipalAmount())
                .eq(SalonMember::getId, order.getMemberId()));
        memberLevelService.checkAndUpgrade(order.getMemberId());
    }

    /** 赠送计算：活动优先（门槛最高档），无活动走会员等级 rechargeGiftRate 兜底（向下取整到分） */
    private RechargePreviewVO calcGiftPlan(SalonMember member, BigDecimal amount) {
        RechargePreviewVO vo = new RechargePreviewVO();
        vo.setGiftAmount(BigDecimal.ZERO);
        vo.setGiftSource(SalonRechargeOrder.GIFT_SOURCE_NONE);
        vo.setGiftFrozen(0);
        SalonRechargeActivity activity = rechargeActivityService.matchBest(amount);
        if (activity != null) {
            vo.setActivityId(activity.getId());
            vo.setActivityName(activity.getName());
            vo.setGiftAmount(activity.getGiftAmount());
            vo.setGiftSource(SalonRechargeOrder.GIFT_SOURCE_ACTIVITY);
            vo.setGiftFrozen(1);
            return vo;
        }
        if (member.getLevelId() != null) {
            SalonMemberLevel level = levelMapper.selectById(member.getLevelId());
            if (level != null && level.getRechargeGiftRate() != null
                    && level.getRechargeGiftRate().compareTo(BigDecimal.ZERO) > 0) {
                vo.setGiftAmount(amount.multiply(level.getRechargeGiftRate()).setScale(2, RoundingMode.DOWN));
                vo.setGiftSource(SalonRechargeOrder.GIFT_SOURCE_LEVEL);
            }
        }
        return vo;
    }

    /** 充值单号：RC+yyMMddHHmmss+3位随机。ponytail: 展示用无唯一约束，P10 编号规则服务落地时统一替换 */
    private String generateNo() {
        return "RC" + DateUtil.format(new java.util.Date(), "yyMMddHHmmss") + RandomUtil.randomNumbers(3);
    }
}

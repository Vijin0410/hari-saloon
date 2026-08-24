package com.wangjin.salon.service.service.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.wangjin.salon.service.mapper.SalonRechargeOrderMapper;
import com.wangjin.salon.service.model.entity.SalonRechargeOrder;
import com.wangjin.salon.service.service.MemberAssetService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 充值赠送解冻单笔执行器。
 * <p>
 * 独立 bean 的原因：占坑更新（unfrozen_time 条件置位）与解冻流水必须在同一事务，
 * 若放在 {@code RechargeOrderServiceImpl} 内被同类自调用，@Transactional 不走代理、事务失效。
 */
@Service
@RequiredArgsConstructor
public class RechargeGiftUnfreezeExecutor {

    private final SalonRechargeOrderMapper rechargeOrderMapper;
    private final MemberAssetService memberAssetService;

    /** 余额桶：2赠送 3冻结；变动类型 9=解冻 */
    private static final int BUCKET_GIFT = 2;
    private static final int BUCKET_FROZEN = 3;
    private static final int CT_UNFREEZE = 9;

    /**
     * 单笔解冻：条件更新占坑（幂等，rows=0 表示已被处理），成功后冻结桶 -> 赠送桶两行流水，同一事务。
     *
     * @return 是否实际执行了解冻
     */
    @Transactional(rollbackFor = Exception.class)
    public boolean unfreeze(SalonRechargeOrder order) {
        int rows = rechargeOrderMapper.update(null, Wrappers.<SalonRechargeOrder>lambdaUpdate()
                .set(SalonRechargeOrder::getUnfrozenTime, LocalDateTime.now())
                .eq(SalonRechargeOrder::getId, order.getId())
                .isNull(SalonRechargeOrder::getUnfrozenTime));
        if (rows == 0) {
            return false;
        }
        BigDecimal gift = order.getGiftAmount();
        memberAssetService.changeBalance(order.getMemberId(), BUCKET_FROZEN, gift.negate(),
                CT_UNFREEZE, "RECHARGE", order.getId(), order.getRechargeNo(), "活动赠送次月解冻");
        memberAssetService.changeBalance(order.getMemberId(), BUCKET_GIFT, gift,
                CT_UNFREEZE, "RECHARGE", order.getId(), order.getRechargeNo(), "活动赠送次月解冻");
        return true;
    }
}

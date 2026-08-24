package com.wangjin.salon.service.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangjin.salon.service.model.entity.SalonMemberLevel;
import com.wangjin.salon.service.model.form.MemberLevelForm;
import com.wangjin.salon.service.model.query.MemberLevelPageQuery;
import com.wangjin.salon.service.model.vo.MemberLevelOptionVO;
import com.wangjin.salon.service.model.vo.MemberLevelPageVO;

import java.util.List;

public interface MemberLevelService extends IService<SalonMemberLevel> {

    Page<MemberLevelPageVO> getPage(MemberLevelPageQuery query);

    MemberLevelForm getForm(Long id);

    Long save(MemberLevelForm form);

    boolean update(Long id, MemberLevelForm form);

    boolean delete(String ids);

    List<MemberLevelOptionVO> options();

    /**
     * 等级升级检查：按 max(累计充值, 累计消费) 与启用等级 upgradeThreshold 比较，达标的最高档且高于当前等级则升级（只升不降）。
     * <p>
     * P4 充值完成 / P5 订单支付完成后在同一事务内调用。
     *
     * @param memberId 会员ID
     */
    void checkAndUpgrade(Long memberId);
}

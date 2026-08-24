package com.wangjin.salon.service.service.impl;

import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.common.exception.BizException;
import com.wangjin.salon.service.converter.RechargeActivityConverter;
import com.wangjin.salon.service.mapper.SalonRechargeActivityMapper;
import com.wangjin.salon.service.model.entity.SalonRechargeActivity;
import com.wangjin.salon.service.model.form.RechargeActivityForm;
import com.wangjin.salon.service.model.query.RechargeActivityPageQuery;
import com.wangjin.salon.service.model.vo.RechargeActivityOptionVO;
import com.wangjin.salon.service.model.vo.RechargeActivityPageVO;
import com.wangjin.salon.service.service.RechargeActivityService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RechargeActivityServiceImpl extends ServiceImpl<SalonRechargeActivityMapper, SalonRechargeActivity> implements RechargeActivityService {

    private final RechargeActivityConverter rechargeActivityConverter;

    @Override
    public Page<RechargeActivityPageVO> getPage(RechargeActivityPageQuery query) {
        Page<SalonRechargeActivity> page = this.page(
                new Page<>(query.getPageNum(), query.getPageSize()),
                Wrappers.<SalonRechargeActivity>lambdaQuery()
                        .like(StrUtil.isNotBlank(query.getName()), SalonRechargeActivity::getName, query.getName())
                        .eq(query.getStatus() != null, SalonRechargeActivity::getStatus, query.getStatus())
                        .orderByAsc(SalonRechargeActivity::getSort));
        Page<RechargeActivityPageVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(rechargeActivityConverter::entity2PageVo).toList());
        return result;
    }

    @Override
    public RechargeActivityForm getForm(Long id) {
        SalonRechargeActivity entity = this.getById(id);
        Assert.notNull(entity, "充值活动不存在");
        return rechargeActivityConverter.entity2Form(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long save(RechargeActivityForm form) {
        assertTimeWindow(form);
        SalonRechargeActivity entity = rechargeActivityConverter.form2Entity(form);
        if (entity.getStatus() == null) {
            entity.setStatus(1);
        }
        this.save(entity);
        return entity.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean update(Long id, RechargeActivityForm form) {
        assertTimeWindow(form);
        SalonRechargeActivity entity = rechargeActivityConverter.form2Entity(form);
        entity.setId(id);
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
    public List<RechargeActivityOptionVO> options() {
        return this.listEffective().stream().map(rechargeActivityConverter::entity2OptionVo).toList();
    }

    @Override
    public SalonRechargeActivity matchBest(BigDecimal amount) {
        return this.listEffective().stream()
                .filter(a -> amount.compareTo(a.getThresholdAmount()) >= 0)
                .max(Comparator.comparing(SalonRechargeActivity::getThresholdAmount)
                        .thenComparing(SalonRechargeActivity::getGiftAmount))
                .orElse(null);
    }

    /** 生效中活动：启用且当前时间在窗口内（start 空=立即，end 空=长期） */
    private List<SalonRechargeActivity> listEffective() {
        LocalDateTime now = LocalDateTime.now();
        return this.list(Wrappers.<SalonRechargeActivity>lambdaQuery()
                .eq(SalonRechargeActivity::getStatus, 1)
                .and(w -> w.isNull(SalonRechargeActivity::getStartTime).or().le(SalonRechargeActivity::getStartTime, now))
                .and(w -> w.isNull(SalonRechargeActivity::getEndTime).or().gt(SalonRechargeActivity::getEndTime, now))
                .orderByAsc(SalonRechargeActivity::getSort));
    }

    private void assertTimeWindow(RechargeActivityForm form) {
        if (form.getStartTime() != null && form.getEndTime() != null
                && !form.getEndTime().isAfter(form.getStartTime())) {
            throw new BizException("失效时间必须晚于生效时间");
        }
    }
}

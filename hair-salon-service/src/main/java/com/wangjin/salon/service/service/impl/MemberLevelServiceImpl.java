package com.wangjin.salon.service.service.impl;

import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.salon.service.converter.MemberLevelConverter;
import com.wangjin.salon.service.mapper.SalonMemberLevelMapper;
import com.wangjin.salon.service.model.entity.SalonMemberLevel;
import com.wangjin.salon.service.model.form.MemberLevelForm;
import com.wangjin.salon.service.model.query.MemberLevelPageQuery;
import com.wangjin.salon.service.model.vo.MemberLevelOptionVO;
import com.wangjin.salon.service.model.vo.MemberLevelPageVO;
import com.wangjin.salon.service.service.MemberLevelService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MemberLevelServiceImpl extends ServiceImpl<SalonMemberLevelMapper, SalonMemberLevel> implements MemberLevelService {

    private final MemberLevelConverter levelConverter;

    @Override
    public Page<MemberLevelPageVO> getPage(MemberLevelPageQuery query) {
        Page<SalonMemberLevel> page = this.page(
                new Page<>(query.getPageNum(), query.getPageSize()),
                Wrappers.<SalonMemberLevel>lambdaQuery()
                        .like(StrUtil.isNotBlank(query.getName()), SalonMemberLevel::getName, query.getName())
                        .eq(query.getStatus() != null, SalonMemberLevel::getStatus, query.getStatus())
                        .orderByAsc(SalonMemberLevel::getLevelNo));
        Page<MemberLevelPageVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(levelConverter::entity2PageVo).toList());
        return result;
    }

    @Override
    public MemberLevelForm getForm(Long id) {
        SalonMemberLevel entity = this.getById(id);
        Assert.notNull(entity, "等级不存在");
        return levelConverter.entity2Form(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long save(MemberLevelForm form) {
        SalonMemberLevel entity = levelConverter.form2Entity(form);
        if (entity.getStatus() == null) {
            entity.setStatus(1);
        }
        if (entity.getPointRate() == null) {
            entity.setPointRate(BigDecimal.ONE);
        }
        if (entity.getRechargeGiftRate() == null) {
            entity.setRechargeGiftRate(BigDecimal.ZERO);
        }
        this.save(entity);
        return entity.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean update(Long id, MemberLevelForm form) {
        SalonMemberLevel entity = levelConverter.form2Entity(form);
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
    public List<MemberLevelOptionVO> options() {
        return this.list(Wrappers.<SalonMemberLevel>lambdaQuery()
                        .eq(SalonMemberLevel::getStatus, 1)
                        .orderByAsc(SalonMemberLevel::getLevelNo))
                .stream().map(levelConverter::entity2OptionVo).toList();
    }
}

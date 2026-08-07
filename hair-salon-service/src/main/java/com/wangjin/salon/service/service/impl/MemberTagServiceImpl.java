package com.wangjin.salon.service.service.impl;

import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.salon.service.converter.MemberTagConverter;
import com.wangjin.salon.service.mapper.SalonMemberTagMapper;
import com.wangjin.salon.service.model.entity.SalonMemberTag;
import com.wangjin.salon.service.model.form.MemberTagForm;
import com.wangjin.salon.service.model.query.MemberTagPageQuery;
import com.wangjin.salon.service.model.vo.MemberTagOptionVO;
import com.wangjin.salon.service.model.vo.MemberTagVO;
import com.wangjin.salon.service.service.MemberTagService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MemberTagServiceImpl extends ServiceImpl<SalonMemberTagMapper, SalonMemberTag> implements MemberTagService {

    private final MemberTagConverter tagConverter;

    @Override
    public Page<MemberTagVO> getPage(MemberTagPageQuery query) {
        Page<SalonMemberTag> page = this.page(
                new Page<>(query.getPageNum(), query.getPageSize()),
                Wrappers.<SalonMemberTag>lambdaQuery()
                        .like(StrUtil.isNotBlank(query.getName()), SalonMemberTag::getName, query.getName())
                        .eq(query.getStatus() != null, SalonMemberTag::getStatus, query.getStatus())
                        .orderByAsc(SalonMemberTag::getSort));
        Page<MemberTagVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(tagConverter::entity2Vo).toList());
        return result;
    }

    @Override
    public MemberTagForm getForm(Long id) {
        SalonMemberTag entity = this.getById(id);
        Assert.notNull(entity, "标签不存在");
        return tagConverter.entity2Form(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long save(MemberTagForm form) {
        SalonMemberTag entity = tagConverter.form2Entity(form);
        if (entity.getStatus() == null) {
            entity.setStatus(1);
        }
        this.save(entity);
        return entity.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean update(Long id, MemberTagForm form) {
        SalonMemberTag entity = tagConverter.form2Entity(form);
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
    public List<MemberTagOptionVO> options() {
        return this.list(Wrappers.<SalonMemberTag>lambdaQuery()
                        .eq(SalonMemberTag::getStatus, 1)
                        .orderByAsc(SalonMemberTag::getSort))
                .stream().map(tagConverter::entity2OptionVo).toList();
    }
}

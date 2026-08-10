package com.wangjin.salon.service.service.impl;

import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.salon.service.converter.GoodsCategoryConverter;
import com.wangjin.salon.service.mapper.SalonGoodsCategoryMapper;
import com.wangjin.salon.service.model.entity.SalonGoodsCategory;
import com.wangjin.salon.service.model.form.GoodsCategoryForm;
import com.wangjin.salon.service.model.query.GoodsCategoryPageQuery;
import com.wangjin.salon.service.model.vo.GoodsCategoryOptionVO;
import com.wangjin.salon.service.model.vo.GoodsCategoryPageVO;
import com.wangjin.salon.service.service.GoodsCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GoodsCategoryServiceImpl extends ServiceImpl<SalonGoodsCategoryMapper, SalonGoodsCategory> implements GoodsCategoryService {

    private final GoodsCategoryConverter goodsCategoryConverter;

    @Override
    public Page<GoodsCategoryPageVO> getPage(GoodsCategoryPageQuery query) {
        Page<SalonGoodsCategory> page = this.page(
                new Page<>(query.getPageNum(), query.getPageSize()),
                Wrappers.<SalonGoodsCategory>lambdaQuery()
                        .like(StrUtil.isNotBlank(query.getName()), SalonGoodsCategory::getName, query.getName())
                        .eq(query.getStatus() != null, SalonGoodsCategory::getStatus, query.getStatus())
                        .orderByAsc(SalonGoodsCategory::getSort));
        Page<GoodsCategoryPageVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(goodsCategoryConverter::entity2PageVo).toList());
        return result;
    }

    @Override
    public GoodsCategoryForm getForm(Long id) {
        SalonGoodsCategory entity = this.getById(id);
        Assert.notNull(entity, "商品分类不存在");
        return goodsCategoryConverter.entity2Form(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long save(GoodsCategoryForm form) {
        SalonGoodsCategory entity = goodsCategoryConverter.form2Entity(form);
        if (entity.getStatus() == null) {
            entity.setStatus(1);
        }
        this.save(entity);
        return entity.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean update(Long id, GoodsCategoryForm form) {
        SalonGoodsCategory entity = goodsCategoryConverter.form2Entity(form);
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
    public List<GoodsCategoryOptionVO> options() {
        return this.list(Wrappers.<SalonGoodsCategory>lambdaQuery()
                        .eq(SalonGoodsCategory::getStatus, 1)
                        .orderByAsc(SalonGoodsCategory::getSort))
                .stream().map(goodsCategoryConverter::entity2OptionVo).toList();
    }
}

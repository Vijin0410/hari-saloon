package com.wangjin.salon.service.service.impl;

import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.salon.service.converter.GoodsConverter;
import com.wangjin.salon.service.mapper.SalonGoodsMapper;
import com.wangjin.salon.service.model.entity.SalonGoods;
import com.wangjin.salon.service.model.form.GoodsForm;
import com.wangjin.salon.service.model.query.GoodsPageQuery;
import com.wangjin.salon.service.model.vo.GoodsOptionVO;
import com.wangjin.salon.service.model.vo.GoodsPageVO;
import com.wangjin.salon.service.service.GoodsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GoodsServiceImpl extends ServiceImpl<SalonGoodsMapper, SalonGoods> implements GoodsService {

    private final GoodsConverter goodsConverter;

    @Override
    public Page<GoodsPageVO> getPage(GoodsPageQuery query) {
        Page<SalonGoods> page = this.page(
                new Page<>(query.getPageNum(), query.getPageSize()),
                Wrappers.<SalonGoods>lambdaQuery()
                        .like(StrUtil.isNotBlank(query.getName()), SalonGoods::getName, query.getName())
                        .eq(query.getCategoryId() != null, SalonGoods::getCategoryId, query.getCategoryId())
                        .eq(query.getStatus() != null, SalonGoods::getStatus, query.getStatus())
                        .orderByAsc(SalonGoods::getSort));
        Page<GoodsPageVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(goodsConverter::entity2PageVo).toList());
        return result;
    }

    @Override
    public GoodsForm getForm(Long id) {
        SalonGoods entity = this.getById(id);
        Assert.notNull(entity, "商品不存在");
        return goodsConverter.entity2Form(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long save(GoodsForm form) {
        SalonGoods entity = goodsConverter.form2Entity(form);
        if (entity.getStatus() == null) {
            entity.setStatus(1);
        }
        if (entity.getDiscountable() == null) {
            entity.setDiscountable(1);
        }
        if (entity.getCommissionable() == null) {
            entity.setCommissionable(1);
        }
        if (entity.getStockQuantity() == null) {
            entity.setStockQuantity(0);
        }
        this.save(entity);
        return entity.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean update(Long id, GoodsForm form) {
        SalonGoods entity = goodsConverter.form2Entity(form);
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
    public List<GoodsOptionVO> options() {
        return this.list(Wrappers.<SalonGoods>lambdaQuery()
                        .eq(SalonGoods::getStatus, 1)
                        .orderByAsc(SalonGoods::getSort))
                .stream().map(goodsConverter::entity2OptionVo).toList();
    }
}

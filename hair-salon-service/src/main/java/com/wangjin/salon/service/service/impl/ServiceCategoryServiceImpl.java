package com.wangjin.salon.service.service.impl;

import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.salon.service.converter.ServiceCategoryConverter;
import com.wangjin.salon.service.mapper.SalonServiceCategoryMapper;
import com.wangjin.salon.service.model.entity.SalonServiceCategory;
import com.wangjin.salon.service.model.form.ServiceCategoryForm;
import com.wangjin.salon.service.model.query.ServiceCategoryPageQuery;
import com.wangjin.salon.service.model.vo.ServiceCategoryOptionVO;
import com.wangjin.salon.service.model.vo.ServiceCategoryPageVO;
import com.wangjin.salon.service.service.ServiceCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ServiceCategoryServiceImpl extends ServiceImpl<SalonServiceCategoryMapper, SalonServiceCategory> implements ServiceCategoryService {

    private final ServiceCategoryConverter serviceCategoryConverter;

    @Override
    public Page<ServiceCategoryPageVO> getPage(ServiceCategoryPageQuery query) {
        Page<SalonServiceCategory> page = this.page(
                new Page<>(query.getPageNum(), query.getPageSize()),
                Wrappers.<SalonServiceCategory>lambdaQuery()
                        .like(StrUtil.isNotBlank(query.getName()), SalonServiceCategory::getName, query.getName())
                        .eq(query.getStatus() != null, SalonServiceCategory::getStatus, query.getStatus())
                        .orderByAsc(SalonServiceCategory::getSort));
        Page<ServiceCategoryPageVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(serviceCategoryConverter::entity2PageVo).toList());
        return result;
    }

    @Override
    public ServiceCategoryForm getForm(Long id) {
        SalonServiceCategory entity = this.getById(id);
        Assert.notNull(entity, "服务分类不存在");
        return serviceCategoryConverter.entity2Form(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long save(ServiceCategoryForm form) {
        SalonServiceCategory entity = serviceCategoryConverter.form2Entity(form);
        if (entity.getStatus() == null) {
            entity.setStatus(1);
        }
        this.save(entity);
        return entity.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean update(Long id, ServiceCategoryForm form) {
        SalonServiceCategory entity = serviceCategoryConverter.form2Entity(form);
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
    public List<ServiceCategoryOptionVO> options() {
        return this.list(Wrappers.<SalonServiceCategory>lambdaQuery()
                        .eq(SalonServiceCategory::getStatus, 1)
                        .orderByAsc(SalonServiceCategory::getSort))
                .stream().map(serviceCategoryConverter::entity2OptionVo).toList();
    }
}

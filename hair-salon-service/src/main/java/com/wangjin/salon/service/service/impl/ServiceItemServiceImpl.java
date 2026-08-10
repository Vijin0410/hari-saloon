package com.wangjin.salon.service.service.impl;

import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.salon.service.converter.ServiceItemConverter;
import com.wangjin.salon.service.mapper.SalonServiceItemMapper;
import com.wangjin.salon.service.model.entity.SalonServiceItem;
import com.wangjin.salon.service.model.form.ServiceItemForm;
import com.wangjin.salon.service.model.query.ServiceItemPageQuery;
import com.wangjin.salon.service.model.vo.ServiceItemOptionVO;
import com.wangjin.salon.service.model.vo.ServiceItemPageVO;
import com.wangjin.salon.service.service.ServiceItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ServiceItemServiceImpl extends ServiceImpl<SalonServiceItemMapper, SalonServiceItem> implements ServiceItemService {

    private final ServiceItemConverter serviceItemConverter;

    @Override
    public Page<ServiceItemPageVO> getPage(ServiceItemPageQuery query) {
        Page<SalonServiceItem> page = this.page(
                new Page<>(query.getPageNum(), query.getPageSize()),
                Wrappers.<SalonServiceItem>lambdaQuery()
                        .like(StrUtil.isNotBlank(query.getName()), SalonServiceItem::getName, query.getName())
                        .eq(query.getCategoryId() != null, SalonServiceItem::getCategoryId, query.getCategoryId())
                        .eq(query.getStatus() != null, SalonServiceItem::getStatus, query.getStatus())
                        .orderByAsc(SalonServiceItem::getSort));
        Page<ServiceItemPageVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(serviceItemConverter::entity2PageVo).toList());
        return result;
    }

    @Override
    public ServiceItemForm getForm(Long id) {
        SalonServiceItem entity = this.getById(id);
        Assert.notNull(entity, "服务项目不存在");
        return serviceItemConverter.entity2Form(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long save(ServiceItemForm form) {
        SalonServiceItem entity = serviceItemConverter.form2Entity(form);
        if (entity.getStatus() == null) {
            entity.setStatus(1);
        }
        if (entity.getDiscountable() == null) {
            entity.setDiscountable(1);
        }
        if (entity.getCommissionable() == null) {
            entity.setCommissionable(1);
        }
        this.save(entity);
        return entity.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean update(Long id, ServiceItemForm form) {
        SalonServiceItem entity = serviceItemConverter.form2Entity(form);
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
    public List<ServiceItemOptionVO> options() {
        return this.list(Wrappers.<SalonServiceItem>lambdaQuery()
                        .eq(SalonServiceItem::getStatus, 1)
                        .orderByAsc(SalonServiceItem::getSort))
                .stream().map(serviceItemConverter::entity2OptionVo).toList();
    }
}

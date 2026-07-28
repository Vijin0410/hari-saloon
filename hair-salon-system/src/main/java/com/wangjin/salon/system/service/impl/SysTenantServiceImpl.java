package com.wangjin.salon.system.service.impl;

import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.common.constant.SystemConstants;
import com.wangjin.common.enums.StatusEnum;
import com.wangjin.common.web.model.Option;
import com.wangjin.salon.system.converter.TenantConverter;
import com.wangjin.salon.system.mapper.SysTenantMapper;
import com.wangjin.salon.system.model.entity.SysTenant;
import com.wangjin.salon.system.model.form.TenantForm;
import com.wangjin.salon.system.model.query.TenantPageQuery;
import com.wangjin.salon.system.model.vo.TenantPageVO;
import com.wangjin.salon.system.service.SysTenantService;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
public class SysTenantServiceImpl extends ServiceImpl<SysTenantMapper, SysTenant> implements SysTenantService {

    private final TenantConverter tenantConverter;

    public SysTenantServiceImpl(TenantConverter tenantConverter) {
        this.tenantConverter = tenantConverter;
    }

    @Override
    public Page<TenantPageVO> getTenantPage(TenantPageQuery query) {
        Page<SysTenant> page = this.page(
                new Page<>(query.getPageNum(), query.getPageSize()),
                new LambdaQueryWrapper<SysTenant>()
                        .and(StrUtil.isNotBlank(query.getKeywords()), w -> w
                                .like(SysTenant::getName, query.getKeywords())
                                .or()
                                .like(SysTenant::getCode, query.getKeywords()))
                        .eq(query.getStatus() != null, SysTenant::getStatus, query.getStatus())
                        .orderByDesc(SysTenant::getCreateTime)
        );
        return tenantConverter.entity2Page(page);
    }

    @Override
    public TenantForm getTenantForm(Long id) {
        SysTenant entity = this.getById(id);
        Assert.notNull(entity, "租户不存在");
        return tenantConverter.entity2Form(entity);
    }

    @Override
    public boolean saveTenant(TenantForm form) {
        long count = this.count(new LambdaQueryWrapper<SysTenant>().eq(SysTenant::getCode, form.getCode()));
        Assert.isTrue(count == 0, "租户编码已存在");
        SysTenant entity = tenantConverter.form2Entity(form);
        if (entity.getStatus() == null) {
            entity.setStatus(StatusEnum.ENABLE.getValue());
        }
        return this.save(entity);
    }

    @Override
    public boolean updateTenant(Long id, TenantForm form) {
        SysTenant exist = this.getById(id);
        Assert.notNull(exist, "租户不存在");
        if (!exist.getCode().equals(form.getCode())) {
            long count = this.count(new LambdaQueryWrapper<SysTenant>()
                    .eq(SysTenant::getCode, form.getCode())
                    .ne(SysTenant::getId, id));
            Assert.isTrue(count == 0, "租户编码已存在");
        }
        SysTenant entity = tenantConverter.form2Entity(form);
        entity.setId(id);
        return this.updateById(entity);
    }

    @Override
    public boolean deleteTenants(String ids) {
        Assert.isTrue(StrUtil.isNotBlank(ids), "删除数据为空");
        List<Long> idList = Arrays.stream(ids.split(",")).map(Long::parseLong).toList();
        Assert.isFalse(idList.contains(SystemConstants.DEFAULT_TENANT_ID), "默认租户不可删除");
        return this.removeByIds(idList);
    }

    @Override
    public boolean updateStatus(Long id, Integer status) {
        Assert.isFalse(SystemConstants.DEFAULT_TENANT_ID.equals(id) && StatusEnum.DISABLE.getValue().equals(status),
                "默认租户不可禁用");
        return this.update(new LambdaUpdateWrapper<SysTenant>()
                .eq(SysTenant::getId, id)
                .set(SysTenant::getStatus, status));
    }

    @Override
    public List<Option<Long>> listOptions() {
        return this.list(new LambdaQueryWrapper<SysTenant>()
                        .eq(SysTenant::getStatus, StatusEnum.ENABLE.getValue())
                        .orderByAsc(SysTenant::getId))
                .stream()
                .map(t -> new Option<>(t.getId(), t.getName()))
                .toList();
    }
}

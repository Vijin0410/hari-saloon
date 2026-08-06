package com.wangjin.salon.system.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.common.security.util.SecurityUtils;
import com.wangjin.salon.system.cache.SystemCacheService;
import com.wangjin.salon.system.converter.DictTypeConverter;
import com.wangjin.salon.system.mapper.SysDictTypeMapper;
import com.wangjin.salon.system.model.entity.SysDict;
import com.wangjin.salon.system.model.entity.SysDictType;
import com.wangjin.salon.system.model.form.DictTypeForm;
import com.wangjin.salon.system.model.query.DictTypePageQuery;
import com.wangjin.salon.system.model.vo.DictTypePageVO;
import com.wangjin.salon.system.service.SysDictService;
import com.wangjin.salon.system.service.SysDictTypeService;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

@Service
public class SysDictTypeServiceImpl extends ServiceImpl<SysDictTypeMapper, SysDictType>
        implements SysDictTypeService {

    private final SysDictService dictService;
    private final SystemCacheService systemCacheService;
    private final DictTypeConverter dictTypeConverter;

    public SysDictTypeServiceImpl(SysDictService dictService,
                                  @Lazy SystemCacheService systemCacheService,
                                  DictTypeConverter dictTypeConverter) {
        this.dictService = dictService;
        this.systemCacheService = systemCacheService;
        this.dictTypeConverter = dictTypeConverter;
    }

    @Override
    public Page<DictTypePageVO> getDictTypePage(DictTypePageQuery queryParams) {
        // 字典全局共享（ignore-tables），TenantLine 不再按租户过滤；ROOT 可按 tenantId 筛选，其余忽略防越权
        if (!SecurityUtils.isRoot()) {
            queryParams.setTenantId(null);
        }
        Page<SysDictType> page = this.page(
                new Page<>(queryParams.getPageNum(), queryParams.getPageSize()),
                new LambdaQueryWrapper<SysDictType>()
                        .and(StrUtil.isNotBlank(queryParams.getKeywords()), w -> w
                                .like(SysDictType::getName, queryParams.getKeywords())
                                .or()
                                .like(SysDictType::getCode, queryParams.getKeywords()))
                        .eq(queryParams.getTenantId() != null, SysDictType::getTenantId, queryParams.getTenantId())
        );
        return dictTypeConverter.entity2Page(page);
    }

    @Override
    public DictTypeForm getDictTypeForm(Long id) {
        SysDictType entity = this.getById(id);
        Assert.notNull(entity, "字典类型不存在");
        return dictTypeConverter.entity2Form(entity);
    }

    @Override
    public boolean saveDictType(DictTypeForm form) {
        Assert.isTrue(SecurityUtils.isRoot(), "字典为全局共享数据，仅系统管理员可维护");
        boolean ok = this.save(dictTypeConverter.form2Entity(form));
        if (ok) {
            systemCacheService.refreshDictCache();
        }
        return ok;
    }

    @Override
    public boolean updateDictType(Long id, DictTypeForm form) {
        Assert.isTrue(SecurityUtils.isRoot(), "字典为全局共享数据，仅系统管理员可维护");
        SysDictType old = this.getById(id);
        Assert.notNull(old, "字典类型不存在");
        SysDictType entity = dictTypeConverter.form2Entity(form);
        entity.setId(id);
        boolean ok = this.updateById(entity);
        if (ok && !StrUtil.equals(old.getCode(), form.getCode())) {
            dictService.update(new LambdaUpdateWrapper<SysDict>()
                    .eq(SysDict::getTypeCode, old.getCode())
                    .set(SysDict::getTypeCode, form.getCode()));
        }
        if (ok) {
            systemCacheService.refreshDictCache();
        }
        return ok;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean deleteDictTypes(String ids) {
        Assert.isTrue(SecurityUtils.isRoot(), "字典为全局共享数据，仅系统管理员可维护");
        Assert.isTrue(StrUtil.isNotBlank(ids), "删除数据为空");
        List<Long> idList = Arrays.stream(ids.split(",")).map(Long::parseLong).toList();
        List<String> codes = this.list(new LambdaQueryWrapper<SysDictType>()
                        .in(SysDictType::getId, idList)
                        .select(SysDictType::getCode))
                .stream().map(SysDictType::getCode).toList();
        if (CollUtil.isNotEmpty(codes)) {
            dictService.remove(new LambdaQueryWrapper<SysDict>().in(SysDict::getTypeCode, codes));
        }
        boolean ok = this.removeByIds(idList);
        if (ok) {
            systemCacheService.refreshDictCache();
        }
        return ok;
    }

    @Override
    public List<DictTypeForm> listByGroupCode(String groupCode) {
        List<SysDictType> list = this.list(new LambdaQueryWrapper<SysDictType>()
                .eq(SysDictType::getGroupCode, groupCode)
                .eq(SysDictType::getStatus, 1));
        return dictTypeConverter.entity2Form(list);
    }
}

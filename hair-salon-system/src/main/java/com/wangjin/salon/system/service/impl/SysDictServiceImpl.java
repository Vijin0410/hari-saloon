package com.wangjin.salon.system.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.common.constant.CacheConstants;
import com.wangjin.common.redis.service.RedisService;
import com.wangjin.common.security.util.SecurityUtils;
import com.wangjin.common.web.model.Option;
import com.wangjin.salon.system.cache.SystemCacheService;
import com.wangjin.salon.system.converter.DictConverter;
import com.wangjin.salon.system.mapper.SysDictMapper;
import com.wangjin.salon.system.model.entity.SysDict;
import com.wangjin.salon.system.model.entity.SysDictType;
import com.wangjin.salon.system.model.form.DictForm;
import com.wangjin.salon.system.model.query.DictPageQuery;
import com.wangjin.salon.system.model.vo.DictPageVO;
import com.wangjin.salon.system.service.SysDictService;
import com.wangjin.salon.system.service.SysDictTypeService;
import com.wangjin.salon.system.util.TenantContextRunner;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class SysDictServiceImpl extends ServiceImpl<SysDictMapper, SysDict> implements SysDictService {

    private final RedisService redisService;
    private final SystemCacheService systemCacheService;
    private final DictConverter dictConverter;
    private final SysDictTypeService dictTypeService;

    public SysDictServiceImpl(RedisService redisService,
                              @Lazy SystemCacheService systemCacheService,
                              DictConverter dictConverter,
                              @Lazy SysDictTypeService dictTypeService) {
        this.redisService = redisService;
        this.systemCacheService = systemCacheService;
        this.dictConverter = dictConverter;
        this.dictTypeService = dictTypeService;
    }

    @Override
    public Page<DictPageVO> getDictPage(DictPageQuery queryParams) {
        // 非 ROOT 忽略 tenantId：TenantLine 已自动按本租户过滤，防止越权指定它租户
        if (!SecurityUtils.isRoot()) {
            queryParams.setTenantId(null);
        }
        Page<SysDict> page = this.page(
                new Page<>(queryParams.getPageNum(), queryParams.getPageSize()),
                new LambdaQueryWrapper<SysDict>()
                        .like(StrUtil.isNotBlank(queryParams.getKeywords()), SysDict::getName, queryParams.getKeywords())
                        .eq(StrUtil.isNotBlank(queryParams.getTypeCode()), SysDict::getTypeCode, queryParams.getTypeCode())
                        .eq(queryParams.getTenantId() != null, SysDict::getTenantId, queryParams.getTenantId())
                        .orderByAsc(SysDict::getSort)
        );
        return dictConverter.entity2Page(page);
    }

    @Override
    public DictForm getDictForm(Long id) {
        SysDict entity = this.getById(id);
        Assert.notNull(entity, "字典数据项不存在");
        return dictConverter.entity2Form(entity);
    }

    @Override
    public boolean saveDict(DictForm form) {
        boolean ok = this.save(dictConverter.form2Entity(form));
        if (ok) {
            systemCacheService.refreshDictCache(SecurityUtils.getTenantId());
        }
        return ok;
    }

    @Override
    public boolean updateDict(Long id, DictForm form) {
        SysDict entity = dictConverter.form2Entity(form);
        entity.setId(id);
        boolean ok = this.updateById(entity);
        if (ok) {
            systemCacheService.refreshDictCache(SecurityUtils.getTenantId());
        }
        return ok;
    }

    @Override
    public boolean deleteDict(String ids) {
        Assert.isTrue(StrUtil.isNotBlank(ids), "删除数据为空");
        List<Long> idList = Arrays.stream(ids.split(",")).map(Long::parseLong).toList();
        boolean ok = this.removeByIds(idList);
        if (ok) {
            systemCacheService.refreshDictCache(SecurityUtils.getTenantId());
        }
        return ok;
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<Option<String>> listDictOptions(String typeCode) {
        Long tenantId = SecurityUtils.getTenantId();
        List<Option<String>> cached = redisService.getCacheList(CacheConstants.SYS_DICT_KEY + tenantId + ":" + typeCode);
        if (CollUtil.isNotEmpty(cached)) {
            return cached;
        }
        List<SysDict> dictList = this.list(new LambdaQueryWrapper<SysDict>()
                .eq(SysDict::getTypeCode, typeCode)
                .eq(SysDict::getStatus, 1)
                .orderByAsc(SysDict::getSort));
        return dictList.stream()
                .map(d -> new Option<>(d.getValue(), d.getName(), d.getRemark()))
                .toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void copyFromTenant(Long fromTenantId) {
        // 读模板租户的全部字典类型与项（切到源租户上下文）
        List<SysDictType> types = TenantContextRunner.run(fromTenantId, () ->
                dictTypeService.list(new LambdaQueryWrapper<>()));
        Map<String, List<SysDict>> itemsByCode = TenantContextRunner.run(fromTenantId, () ->
                this.list(new LambdaQueryWrapper<SysDict>()).stream()
                        .collect(Collectors.groupingBy(SysDict::getTypeCode)));
        // 写当前租户上下文（须由调用方 TenantContextRunner 进入目标租户）；已存在的 code 跳过，幂等
        for (SysDictType t : types) {
            long exists = dictTypeService.count(new LambdaQueryWrapper<SysDictType>()
                    .eq(SysDictType::getCode, t.getCode()));
            if (exists > 0) {
                continue;
            }
            SysDictType nt = new SysDictType();
            nt.setName(t.getName());
            nt.setCode(t.getCode());
            nt.setStatus(t.getStatus());
            nt.setRemark(t.getRemark());
            nt.setGroupCode(t.getGroupCode());
            dictTypeService.save(nt);
            List<SysDict> items = itemsByCode.getOrDefault(t.getCode(), List.of());
            if (!items.isEmpty()) {
                List<SysDict> toSave = items.stream().map(d -> {
                    SysDict nd = new SysDict();
                    nd.setTypeCode(d.getTypeCode());
                    nd.setName(d.getName());
                    nd.setValue(d.getValue());
                    nd.setSort(d.getSort());
                    nd.setStatus(d.getStatus());
                    nd.setDefaulted(d.getDefaulted());
                    nd.setRemark(d.getRemark());
                    return nd;
                }).toList();
                this.saveBatch(toSave);
            }
        }
    }
}

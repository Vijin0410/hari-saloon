package com.wangjin.salon.system.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.common.constant.CacheConstants;
import com.wangjin.common.constant.SystemConstants;
import com.wangjin.common.redis.service.RedisService;
import com.wangjin.common.security.util.SecurityUtils;
import com.wangjin.common.web.model.Option;
import com.wangjin.salon.system.cache.SystemCacheService;
import com.wangjin.salon.system.converter.DictConverter;
import com.wangjin.salon.system.mapper.SysDictMapper;
import com.wangjin.salon.system.mapper.SysDictTypeMapper;
import com.wangjin.salon.system.model.entity.SysDict;
import com.wangjin.salon.system.model.entity.SysDictType;
import com.wangjin.salon.system.model.form.DictForm;
import com.wangjin.salon.system.model.query.DictPageQuery;
import com.wangjin.salon.system.model.vo.DictPageVO;
import com.wangjin.salon.system.service.SysDictService;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class SysDictServiceImpl extends ServiceImpl<SysDictMapper, SysDict> implements SysDictService {

    private final RedisService redisService;
    private final SystemCacheService systemCacheService;
    private final DictConverter dictConverter;
    private final SysDictTypeMapper dictTypeMapper;

    public SysDictServiceImpl(RedisService redisService,
                              @Lazy SystemCacheService systemCacheService,
                              DictConverter dictConverter,
                              SysDictTypeMapper dictTypeMapper) {
        this.redisService = redisService;
        this.systemCacheService = systemCacheService;
        this.dictConverter = dictConverter;
        this.dictTypeMapper = dictTypeMapper;
    }

    @Override
    public Page<DictPageVO> getDictPage(DictPageQuery queryParams) {
        // 字典通用（默认租户1）+ 租户覆盖；ROOT 可按 tenantId 筛选，其余锁定本租户防混排/越权
        if (!SecurityUtils.isRoot()) {
            queryParams.setTenantId(SecurityUtils.getTenantId());
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
        Assert.isTrue(SecurityUtils.isRoot(), "字典为全局共享数据，仅系统管理员可维护");
        boolean ok = this.save(dictConverter.form2Entity(form));
        if (ok) {
            systemCacheService.refreshDictCache();
        }
        return ok;
    }

    @Override
    public boolean updateDict(Long id, DictForm form) {
        Assert.isTrue(SecurityUtils.isRoot(), "字典为全局共享数据，仅系统管理员可维护");
        SysDict entity = dictConverter.form2Entity(form);
        entity.setId(id);
        boolean ok = this.updateById(entity);
        if (ok) {
            systemCacheService.refreshDictCache();
        }
        return ok;
    }

    @Override
    public boolean deleteDict(String ids) {
        Assert.isTrue(SecurityUtils.isRoot(), "字典为全局共享数据，仅系统管理员可维护");
        Assert.isTrue(StrUtil.isNotBlank(ids), "删除数据为空");
        List<Long> idList = Arrays.stream(ids.split(",")).map(Long::parseLong).toList();
        boolean ok = this.removeByIds(idList);
        if (ok) {
            systemCacheService.refreshDictCache();
        }
        return ok;
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<Option<String>> listDictOptions(String typeCode) {
        // 与 wj-framework DictAspect 翻译逻辑对齐：通用（默认租户1）+ 当前租户覆盖，同 value 租户覆盖通用；ROOT 只看通用
        Map<String, Option<String>> merged = new LinkedHashMap<>();
        mergeOptions(merged, redisService.getCacheList(CacheConstants.SYS_DICT_KEY + typeCode));
        if (!SecurityUtils.isRoot()) {
            mergeOptions(merged, redisService.getCacheList(
                    CacheConstants.SYS_DICT_KEY + typeCode + ":" + SecurityUtils.getTenantId()));
        }
        if (!merged.isEmpty()) {
            return new ArrayList<>(merged.values());
        }
        // 缓存未命中回退 DB：默认租户为通用基底，非 ROOT 叠加本租户覆盖（后写覆盖先写）
        fillOptionsFromDb(merged, typeCode, SystemConstants.DEFAULT_TENANT_ID);
        if (!SecurityUtils.isRoot()) {
            fillOptionsFromDb(merged, typeCode, SecurityUtils.getTenantId());
        }
        return new ArrayList<>(merged.values());
    }

    private void fillOptionsFromDb(Map<String, Option<String>> merged, String typeCode, Long tenantId) {
        this.list(new LambdaQueryWrapper<SysDict>()
                        .eq(SysDict::getTypeCode, typeCode)
                        .eq(SysDict::getTenantId, tenantId)
                        .eq(SysDict::getStatus, 1)
                        .orderByAsc(SysDict::getSort))
                .forEach(d -> merged.put(d.getValue(), new Option<>(d.getValue(), d.getName(), d.getRemark())));
    }

    private void mergeOptions(Map<String, Option<String>> merged, List<?> options) {
        if (CollUtil.isEmpty(options)) {
            return;
        }
        for (Object option : options) {
            if (option instanceof Option<?> opt) {
                merged.put(String.valueOf(opt.getValue()), (Option<String>) opt);
            }
        }
    }

    @Override
    public void copyFromDefaultTenant(Long targetTenantId, List<String> typeCodes) {
        if (targetTenantId == null || CollUtil.isEmpty(typeCodes)) {
            return;
        }
        Long sourceTenantId = SystemConstants.DEFAULT_TENANT_ID;
        // 幂等：目标租户已有字典项的类型整体跳过（部分同步过视为已同步）
        List<String> existedTypeCodes = this.list(new LambdaQueryWrapper<SysDict>()
                        .eq(SysDict::getTenantId, targetTenantId)
                        .in(SysDict::getTypeCode, typeCodes))
                .stream().map(SysDict::getTypeCode).distinct().toList();
        List<String> syncCodes = typeCodes.stream()
                .filter(code -> !existedTypeCodes.contains(code))
                .toList();
        if (CollUtil.isEmpty(syncCodes)) {
            return;
        }
        // 字典类型副本（目标已有同 code 跳过）
        List<SysDictType> sourceTypes = dictTypeMapper.selectList(new LambdaQueryWrapper<SysDictType>()
                .eq(SysDictType::getTenantId, sourceTenantId)
                .in(SysDictType::getCode, syncCodes)
                .eq(SysDictType::getStatus, 1));
        Set<String> targetTypeCodes = new HashSet<>(dictTypeMapper.selectList(new LambdaQueryWrapper<SysDictType>()
                        .eq(SysDictType::getTenantId, targetTenantId)
                        .in(SysDictType::getCode, syncCodes))
                .stream().map(SysDictType::getCode).toList());
        sourceTypes.stream()
                .filter(t -> !targetTypeCodes.contains(t.getCode()))
                .forEach(t -> {
                    SysDictType copy = new SysDictType();
                    copy.setName(t.getName());
                    copy.setCode(t.getCode());
                    copy.setStatus(t.getStatus());
                    copy.setRemark(t.getRemark());
                    copy.setGroupCode(t.getGroupCode());
                    copy.setTenantId(targetTenantId);
                    dictTypeMapper.insert(copy);
                });
        // 字典项副本（值与通用模板一致）
        List<SysDict> sourceItems = this.list(new LambdaQueryWrapper<SysDict>()
                .eq(SysDict::getTenantId, sourceTenantId)
                .in(SysDict::getTypeCode, syncCodes)
                .eq(SysDict::getStatus, 1)
                .orderByAsc(SysDict::getSort));
        if (CollUtil.isEmpty(sourceItems)) {
            systemCacheService.refreshDictCache();
            return;
        }
        List<SysDict> copies = sourceItems.stream().map(d -> {
            SysDict copy = new SysDict();
            copy.setTypeCode(d.getTypeCode());
            copy.setName(d.getName());
            copy.setValue(d.getValue());
            copy.setSort(d.getSort());
            copy.setStatus(d.getStatus());
            copy.setDefaulted(d.getDefaulted());
            copy.setRemark(d.getRemark());
            copy.setTenantId(targetTenantId);
            return copy;
        }).toList();
        this.saveBatch(copies);
        systemCacheService.refreshDictCache();
    }
}

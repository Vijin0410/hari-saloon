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
import com.wangjin.salon.system.model.form.DictForm;
import com.wangjin.salon.system.model.query.DictPageQuery;
import com.wangjin.salon.system.model.vo.DictPageVO;
import com.wangjin.salon.system.service.SysDictService;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
public class SysDictServiceImpl extends ServiceImpl<SysDictMapper, SysDict> implements SysDictService {

    private final RedisService redisService;
    private final SystemCacheService systemCacheService;
    private final DictConverter dictConverter;

    public SysDictServiceImpl(RedisService redisService,
                              @Lazy SystemCacheService systemCacheService,
                              DictConverter dictConverter) {
        this.redisService = redisService;
        this.systemCacheService = systemCacheService;
        this.dictConverter = dictConverter;
    }

    @Override
    public Page<DictPageVO> getDictPage(DictPageQuery queryParams) {
        // 字典全局共享（ignore-tables），TenantLine 不再按租户过滤；ROOT 可按 tenantId 筛选，其余忽略防越权
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
        List<Option<String>> cached = redisService.getCacheList(CacheConstants.SYS_DICT_KEY + typeCode);
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
}

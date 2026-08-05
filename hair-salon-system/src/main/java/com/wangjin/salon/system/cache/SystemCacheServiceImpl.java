package com.wangjin.salon.system.cache;

import cn.hutool.core.bean.BeanUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.wangjin.common.constant.CacheConstants;
import com.wangjin.common.redis.service.RedisService;
import com.wangjin.common.web.model.Option;
import com.wangjin.salon.system.model.entity.SysDept;
import com.wangjin.salon.system.model.entity.SysDict;
import com.wangjin.salon.system.model.entity.SysTenant;
import com.wangjin.salon.system.model.entity.SysUser;
import com.wangjin.salon.system.service.SysDeptService;
import com.wangjin.salon.system.service.SysDictService;
import com.wangjin.salon.system.service.SysTenantService;
import com.wangjin.salon.system.service.SysUserService;
import com.wangjin.salon.system.util.TenantContextRunner;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Slf4j
public class SystemCacheServiceImpl implements SystemCacheService {

    private final RedisService redisService;
    private final SysDictService dictService;
    private final SysUserService userService;
    private final SysDeptService deptService;
    private final SysTenantService tenantService;

    public SystemCacheServiceImpl(RedisService redisService,
                                  @Lazy SysDictService dictService,
                                  @Lazy SysUserService userService,
                                  @Lazy SysDeptService deptService,
                                  @Lazy SysTenantService tenantService) {
        this.redisService = redisService;
        this.dictService = dictService;
        this.userService = userService;
        this.deptService = deptService;
        this.tenantService = tenantService;
    }

    @Override
    public void refreshDictCache(Long tenantId) {
        // 仅清当前租户的字典缓存（key 含 tenantId 前缀，避免误清它租户）
        redisService.deleteByPrefix(CacheConstants.SYS_DICT_KEY + tenantId + ":");
        TenantContextRunner.run(tenantId, () -> {
            List<SysDict> list = dictService.list(new LambdaQueryWrapper<SysDict>()
                    .eq(SysDict::getStatus, 1)
                    .orderByAsc(SysDict::getSort));
            Map<String, List<SysDict>> grouped = list.stream()
                    .collect(Collectors.groupingBy(SysDict::getTypeCode));
            grouped.forEach((typeCode, items) -> {
                List<Option<String>> options = items.stream()
                        .sorted(Comparator.comparing(d -> d.getSort() == null ? 0 : d.getSort()))
                        .map(d -> new Option<>(d.getValue(), d.getName(), d.getRemark()))
                        .toList();
                redisService.setCacheList(CacheConstants.SYS_DICT_KEY + tenantId + ":" + typeCode, options);
            });
            log.info("字典缓存已刷新，tenantId={}, 类型数={}", tenantId, grouped.size());
        });
    }

    @Override
    public void refreshUserCache() {
        redisService.deleteByPrefix(CacheConstants.SYS_USER_KEY);
        List<SysUser> users = userService.list();
        for (SysUser user : users) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", user.getId());
            map.put("username", user.getUsername());
            map.put("nickname", user.getNickname());
            map.put("phone", user.getPhone());
            map.put("deptId", user.getDeptId());
            redisService.setCacheMap(CacheConstants.SYS_USER_KEY + user.getId(), map);
        }
        log.info("用户缓存已刷新，用户数={}", users.size());
    }

    @Override
    public void refreshDeptCache() {
        redisService.deleteByPrefix(CacheConstants.SYS_DEPT_KEY);
        List<SysDept> depts = deptService.list();
        for (SysDept dept : depts) {
            redisService.setCacheMap(CacheConstants.SYS_DEPT_KEY + dept.getId(), BeanUtil.beanToMap(dept));
        }
        log.info("部门缓存已刷新，部门数={}", depts.size());
    }

    @Override
    public void refreshAll() {
        // 全清字典缓存前缀（含历史无租户 key 残留），再按租户逐个重建
        redisService.deleteByPrefix(CacheConstants.SYS_DICT_KEY);
        refreshUserCache();
        refreshDeptCache();
        List<SysTenant> tenants = tenantService.list(new LambdaQueryWrapper<>());
        for (SysTenant tenant : tenants) {
            refreshDictCache(tenant.getId());
        }
    }
}

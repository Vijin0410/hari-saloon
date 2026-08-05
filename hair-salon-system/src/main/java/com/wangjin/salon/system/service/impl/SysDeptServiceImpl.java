package com.wangjin.salon.system.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.common.constant.SystemConstants;
import com.wangjin.common.enums.StatusEnum;
import com.wangjin.common.security.util.SecurityUtils;
import com.wangjin.common.web.model.Option;
import com.wangjin.salon.system.cache.SystemCacheService;
import com.wangjin.salon.system.converter.DeptConverter;
import com.wangjin.salon.system.mapper.SysDeptMapper;
import com.wangjin.salon.system.model.entity.SysDept;
import com.wangjin.salon.system.model.form.DeptForm;
import com.wangjin.salon.system.model.query.DeptQuery;
import com.wangjin.salon.system.model.vo.DeptVO;
import com.wangjin.salon.system.service.SysDeptService;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class SysDeptServiceImpl extends ServiceImpl<SysDeptMapper, SysDept> implements SysDeptService {

    private final SystemCacheService systemCacheService;
    private final DeptConverter deptConverter;

    public SysDeptServiceImpl(@Lazy SystemCacheService systemCacheService, DeptConverter deptConverter) {
        this.systemCacheService = systemCacheService;
        this.deptConverter = deptConverter;
    }

    @Override
    public List<DeptVO> listDepartments(DeptQuery queryParams) {
        // 非 ROOT 忽略 tenantId：TenantLine 已自动按本租户过滤，防止越权指定它租户
        if (!SecurityUtils.isRoot()) {
            queryParams.setTenantId(null);
        }
        List<SysDept> deptList = this.list(new LambdaQueryWrapper<SysDept>()
                .like(StrUtil.isNotBlank(queryParams.getKeywords()), SysDept::getName, queryParams.getKeywords())
                .eq(queryParams.getStatus() != null, SysDept::getStatus, queryParams.getStatus())
                .eq(queryParams.getTenantId() != null, SysDept::getTenantId, queryParams.getTenantId())
                .orderByAsc(SysDept::getSort));
        return buildTree(deptList);
    }

    @Override
    public List<Option<Long>> listDeptOptions() {
        List<SysDept> deptList = this.list(new LambdaQueryWrapper<SysDept>()
                .eq(SysDept::getStatus, StatusEnum.ENABLE.getValue())
                .orderByAsc(SysDept::getSort));
        return buildOptions(SystemConstants.ROOT_NODE_ID, deptList);
    }

    @Override
    public DeptForm getDeptForm(Long deptId) {
        SysDept entity = this.getById(deptId);
        Assert.notNull(entity, "部门不存在");
        return deptConverter.entity2Form(entity);
    }

    @Override
    public Long saveDept(DeptForm form) {
        SysDept entity = deptConverter.form2Entity(form);
        entity.setTreePath(generateTreePath(form.getParentId()));
        this.save(entity);
        systemCacheService.refreshDeptCache();
        return entity.getId();
    }

    @Override
    public Long updateDept(Long deptId, DeptForm form) {
        SysDept entity = deptConverter.form2Entity(form);
        entity.setId(deptId);
        entity.setTreePath(generateTreePath(form.getParentId()));
        this.updateById(entity);
        systemCacheService.refreshDeptCache();
        return deptId;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean deleteByIds(String ids) {
        Assert.isTrue(StrUtil.isNotBlank(ids), "删除数据为空");
        List<Long> idList = Arrays.stream(ids.split(",")).map(Long::parseLong).toList();
        List<Long> toDelete = new ArrayList<>(idList);
        for (Long id : idList) {
            List<SysDept> children = this.list(new LambdaQueryWrapper<SysDept>()
                    .apply("tree_path LIKE CONCAT('%,', {0}, ',%') OR tree_path LIKE CONCAT({0}, ',%') OR tree_path LIKE CONCAT('%,', {0})", id));
            toDelete.addAll(children.stream().map(SysDept::getId).toList());
        }
        boolean ok = this.removeByIds(toDelete.stream().distinct().toList());
        if (ok) {
            systemCacheService.refreshDeptCache();
        }
        return ok;
    }

    @Override
    public Set<Long> listDeptAndChildIds(Long deptId) {
        if (deptId == null) {
            return Set.of();
        }
        Set<Long> ids = new HashSet<>();
        ids.add(deptId);
        List<SysDept> children = this.list(new LambdaQueryWrapper<SysDept>()
                .apply("tree_path LIKE CONCAT('%,', {0}, ',%') OR tree_path LIKE CONCAT({0}, ',%') OR tree_path LIKE CONCAT('%,', {0}) OR tree_path = CAST({0} AS TEXT)", deptId));
        for (SysDept child : children) {
            ids.add(child.getId());
        }
        return ids;
    }

    private String generateTreePath(Long parentId) {
        if (parentId == null || SystemConstants.ROOT_NODE_ID.equals(parentId)) {
            return String.valueOf(SystemConstants.ROOT_NODE_ID);
        }
        SysDept parent = this.getById(parentId);
        Assert.notNull(parent, "父部门不存在");
        return parent.getTreePath() + "," + parent.getId();
    }

    private List<DeptVO> buildTree(List<SysDept> deptList) {
        Set<Long> ids = deptList.stream().map(SysDept::getId).collect(Collectors.toSet());
        Set<Long> parentIds = deptList.stream().map(SysDept::getParentId).collect(Collectors.toSet());
        List<Long> roots = CollUtil.subtractToList(parentIds, ids);
        List<DeptVO> result = new ArrayList<>();
        for (Long rootId : roots) {
            result.addAll(recur(rootId, deptList));
        }
        return result;
    }

    private List<DeptVO> recur(Long parentId, List<SysDept> deptList) {
        return deptList.stream()
                .filter(d -> parentId != null && parentId.equals(d.getParentId()))
                .map(d -> {
                    DeptVO vo = deptConverter.entity2Vo(d);
                    vo.setChildren(recur(d.getId(), deptList));
                    return vo;
                }).toList();
    }

    private List<Option<Long>> buildOptions(Long parentId, List<SysDept> deptList) {
        List<Option<Long>> options = new ArrayList<>();
        for (SysDept dept : deptList) {
            if (parentId.equals(dept.getParentId())) {
                Option<Long> opt = new Option<>(dept.getId(), dept.getName());
                List<Option<Long>> children = buildOptions(dept.getId(), deptList);
                if (CollUtil.isNotEmpty(children)) {
                    opt.setChildren(children);
                }
                options.add(opt);
            }
        }
        return options;
    }
}

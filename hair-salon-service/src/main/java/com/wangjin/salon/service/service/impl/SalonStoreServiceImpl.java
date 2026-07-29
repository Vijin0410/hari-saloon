package com.wangjin.salon.service.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.common.constant.SystemConstants;
import com.wangjin.common.enums.StatusEnum;
import com.wangjin.common.security.util.SecurityUtils;
import com.wangjin.salon.service.converter.StoreConverter;
import com.wangjin.salon.service.mapper.SalonStoreMapper;
import com.wangjin.salon.service.model.entity.SalonStore;
import com.wangjin.salon.service.model.form.StoreForm;
import com.wangjin.salon.service.model.query.StorePageQuery;
import com.wangjin.salon.service.model.vo.StoreDetailVO;
import com.wangjin.salon.service.model.vo.StorePageVO;
import com.wangjin.salon.service.service.SalonStoreService;
import com.wangjin.salon.system.model.entity.SysDept;
import com.wangjin.salon.system.service.SysDeptService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SalonStoreServiceImpl extends ServiceImpl<SalonStoreMapper, SalonStore> implements SalonStoreService {

    private final StoreConverter storeConverter;
    private final SysDeptService deptService;

    @Override
    public Page<StorePageVO> getStorePage(StorePageQuery query) {
        return this.baseMapper.getStorePage(new Page<>(query.getPageNum(), query.getPageSize()), query);
    }

    @Override
    public StoreDetailVO getDetail(Long id) {
        SalonStore entity = this.getById(id);
        Assert.notNull(entity, "门店不存在");
        assertDeptVisible(entity.getDeptId());
        return storeConverter.entity2DetailVo(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long saveStore(StoreForm form) {
        if (StrUtil.isNotBlank(form.getCode())) {
            long c = this.count(new LambdaQueryWrapper<SalonStore>().eq(SalonStore::getCode, form.getCode()));
            Assert.isTrue(c == 0, "门店编码已存在");
        }

        Long deptId = form.getDeptId();
        if (deptId == null) {
            deptId = createStoreDept(form);
        } else {
            SysDept dept = deptService.getById(deptId);
            Assert.notNull(dept, "绑定部门不存在");
            assertDeptVisible(deptId);
            long bound = this.count(new LambdaQueryWrapper<SalonStore>().eq(SalonStore::getDeptId, deptId));
            Assert.isTrue(bound == 0, "该部门已绑定其他门店");
        }

        SalonStore entity = storeConverter.form2Entity(form);
        entity.setDeptId(deptId);
        if (entity.getStatus() == null) {
            entity.setStatus(StatusEnum.ENABLE.getValue());
        }
        if (entity.getSort() == null) {
            entity.setSort(0);
        }
        if (StrUtil.isBlank(entity.getBusinessHours()) && entity.getOpenTime() != null && entity.getCloseTime() != null) {
            entity.setBusinessHours(entity.getOpenTime() + "-" + entity.getCloseTime());
        }
        this.save(entity);
        return entity.getId();
    }

    private Long createStoreDept(StoreForm form) {
        Long parentId = form.getParentDeptId();
        if (parentId == null) {
            parentId = SecurityUtils.getDeptId();
        }
        if (parentId == null) {
            parentId = SystemConstants.ROOT_NODE_ID;
        }
        if (!SystemConstants.ROOT_NODE_ID.equals(parentId)) {
            assertDeptVisible(parentId);
        }

        SysDept dept = new SysDept();
        dept.setName(form.getName());
        dept.setParentId(parentId);
        if (SystemConstants.ROOT_NODE_ID.equals(parentId)) {
            dept.setTreePath(String.valueOf(SystemConstants.ROOT_NODE_ID));
        } else {
            SysDept parent = deptService.getById(parentId);
            Assert.notNull(parent, "父部门不存在");
            dept.setTreePath(parent.getTreePath() + "," + parent.getId());
        }
        dept.setSort(form.getSort() == null ? 0 : form.getSort());
        dept.setStatus(StatusEnum.ENABLE.getValue());
        deptService.save(dept);
        return dept.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updateStore(Long id, StoreForm form) {
        SalonStore exist = this.getById(id);
        Assert.notNull(exist, "门店不存在");
        assertDeptVisible(exist.getDeptId());

        if (StrUtil.isNotBlank(form.getCode()) && !form.getCode().equals(exist.getCode())) {
            long c = this.count(new LambdaQueryWrapper<SalonStore>()
                    .eq(SalonStore::getCode, form.getCode())
                    .ne(SalonStore::getId, id));
            Assert.isTrue(c == 0, "门店编码已存在");
        }

        SalonStore entity = storeConverter.form2Entity(form);
        entity.setId(id);
        // 不允许改绑部门（避免拆数据权限锚点）；要迁店另做流程
        entity.setDeptId(exist.getDeptId());
        if (StrUtil.isBlank(entity.getBusinessHours()) && entity.getOpenTime() != null && entity.getCloseTime() != null) {
            entity.setBusinessHours(entity.getOpenTime() + "-" + entity.getCloseTime());
        }
        return this.updateById(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean deleteStores(String ids) {
        Assert.isTrue(StrUtil.isNotBlank(ids), "删除数据为空");
        List<Long> idList = Arrays.stream(ids.split(",")).map(Long::parseLong).toList();
        for (Long id : idList) {
            SalonStore store = this.getById(id);
            if (store != null) {
                assertDeptVisible(store.getDeptId());
            }
        }
        return this.removeByIds(idList);
    }

    private void assertDeptVisible(Long deptId) {
        if (deptId == null || SecurityUtils.isAllDataScope()) {
            return;
        }
        Set<Long> visible = SecurityUtils.getDataScopeDeptIds();
        Assert.isTrue(CollUtil.isNotEmpty(visible) && visible.contains(deptId), "无权操作该门店");
    }
}

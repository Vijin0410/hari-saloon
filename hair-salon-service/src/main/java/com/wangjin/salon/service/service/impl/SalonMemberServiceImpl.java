package com.wangjin.salon.service.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.common.enums.StatusEnum;
import com.wangjin.common.security.util.SecurityUtils;
import com.wangjin.salon.service.converter.MemberConverter;
import com.wangjin.salon.service.mapper.SalonMemberMapper;
import com.wangjin.salon.service.model.entity.SalonMember;
import com.wangjin.salon.service.model.form.MemberForm;
import com.wangjin.salon.service.model.query.MemberPageQuery;
import com.wangjin.salon.service.model.vo.MemberDetailVO;
import com.wangjin.salon.service.model.vo.MemberPageVO;
import com.wangjin.salon.service.service.SalonMemberService;
import com.wangjin.salon.system.model.entity.SysDept;
import com.wangjin.salon.system.service.SysDeptService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SalonMemberServiceImpl extends ServiceImpl<SalonMemberMapper, SalonMember> implements SalonMemberService {

    private final MemberConverter memberConverter;
    private final SysDeptService deptService;

    @Override
    public Page<MemberPageVO> getMemberPage(MemberPageQuery query) {
        return this.baseMapper.getMemberPage(new Page<>(query.getPageNum(), query.getPageSize()), query);
    }

    @Override
    public MemberDetailVO getDetail(Long id) {
        SalonMember entity = this.getById(id);
        Assert.notNull(entity, "会员不存在");
        assertDeptVisible(entity.getDeptId());
        return memberConverter.entity2DetailVo(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long saveMember(MemberForm form) {
        assertDeptAssignable(form.getDeptId());
        SalonMember entity = memberConverter.form2Entity(form);
        if (entity.getStatus() == null) {
            entity.setStatus(StatusEnum.ENABLE.getValue());
        }
        if (entity.getLevel() == null) {
            entity.setLevel(0);
        }
        if (entity.getPoints() == null) {
            entity.setPoints(0);
        }
        if (entity.getBalance() == null) {
            entity.setBalance(BigDecimal.ZERO);
        }
        this.save(entity);
        return entity.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updateMember(Long id, MemberForm form) {
        SalonMember exist = this.getById(id);
        Assert.notNull(exist, "会员不存在");
        assertDeptVisible(exist.getDeptId());
        assertDeptAssignable(form.getDeptId());

        SalonMember entity = memberConverter.form2Entity(form);
        entity.setId(id);
        return this.updateById(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean deleteMembers(String ids) {
        Assert.isTrue(StrUtil.isNotBlank(ids), "删除数据为空");
        List<Long> idList = Arrays.stream(ids.split(",")).map(Long::parseLong).toList();
        for (Long id : idList) {
            SalonMember m = this.getById(id);
            if (m != null) {
                assertDeptVisible(m.getDeptId());
            }
        }
        return this.removeByIds(idList);
    }

    private void assertDeptAssignable(Long deptId) {
        Assert.notNull(deptId, "所属门店/部门不能为空");
        SysDept dept = deptService.getById(deptId);
        Assert.notNull(dept, "所属部门不存在");
        assertDeptVisible(deptId);
    }

    private void assertDeptVisible(Long deptId) {
        if (deptId == null || SecurityUtils.isAllDataScope()) {
            return;
        }
        // SELF：只能操作自己创建的，详情/删除已由 create_by 在列表层过滤；写操作再校验本部门
        Set<Long> visible = SecurityUtils.getDataScopeDeptIds();
        if (CollUtil.isEmpty(visible)) {
            // SELF 无部门集合：限制在本人部门
            Long myDept = SecurityUtils.getDeptId();
            Assert.isTrue(myDept != null && myDept.equals(deptId), "无权操作该部门数据");
            return;
        }
        Assert.isTrue(visible.contains(deptId), "无权操作该部门数据");
    }
}

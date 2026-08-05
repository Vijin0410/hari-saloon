package com.wangjin.salon.service.service.impl;

import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.common.enums.StatusEnum;
import com.wangjin.common.security.util.SecurityUtils;
import com.wangjin.salon.service.converter.MemberConverter;
import com.wangjin.salon.service.mapper.SalonMemberMapper;
import com.wangjin.salon.service.model.entity.SalonMember;
import com.wangjin.salon.service.model.entity.SalonStore;
import com.wangjin.salon.service.model.form.MemberForm;
import com.wangjin.salon.service.model.query.MemberPageQuery;
import com.wangjin.salon.service.model.vo.MemberDetailVO;
import com.wangjin.salon.service.model.vo.MemberPageVO;
import com.wangjin.salon.service.service.SalonMemberService;
import com.wangjin.salon.service.service.SalonStorePermissionService;
import com.wangjin.salon.service.service.SalonStoreService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SalonMemberServiceImpl extends ServiceImpl<SalonMemberMapper, SalonMember> implements SalonMemberService {

    private final MemberConverter memberConverter;
    private final SalonStoreService storeService;
    private final SalonStorePermissionService storePermissionService;

    @Override
    public Page<MemberPageVO> getMemberPage(MemberPageQuery query) {
        // 非 ROOT 忽略 tenantId：TenantLine 已自动按本租户过滤，防止越权指定它租户
        if (!SecurityUtils.isRoot()) {
            query.setTenantId(null);
        }
        storePermissionService.apply(query);
        return this.baseMapper.getMemberPage(new Page<>(query.getPageNum(), query.getPageSize()), query);
    }

    @Override
    public MemberDetailVO getDetail(Long id) {
        SalonMember entity = this.getById(id);
        Assert.notNull(entity, "Member not found");
        storePermissionService.assertStoreAccessible(entity.getStoreId(), "No permission for this store member");
        return memberConverter.entity2DetailVo(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long saveMember(MemberForm form) {
        assertStoreAssignable(form.getStoreId());
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
        Assert.notNull(exist, "Member not found");
        storePermissionService.assertStoreAccessible(exist.getStoreId(), "No permission for this store member");
        assertStoreAssignable(form.getStoreId());

        SalonMember entity = memberConverter.form2Entity(form);
        entity.setId(id);
        return this.updateById(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean deleteMembers(String ids) {
        Assert.isTrue(StrUtil.isNotBlank(ids), "Delete ids is empty");
        List<Long> idList = Arrays.stream(ids.split(",")).map(Long::parseLong).toList();
        for (Long id : idList) {
            SalonMember member = this.getById(id);
            if (member != null) {
                storePermissionService.assertStoreAccessible(member.getStoreId(), "No permission for this store member");
            }
        }
        return this.removeByIds(idList);
    }

    private void assertStoreAssignable(Long storeId) {
        Assert.notNull(storeId, "Store is required");
        SalonStore store = storeService.getById(storeId);
        Assert.notNull(store, "Store not found");
        storePermissionService.assertStoreAccessible(storeId, "No permission for this store member");
    }
}

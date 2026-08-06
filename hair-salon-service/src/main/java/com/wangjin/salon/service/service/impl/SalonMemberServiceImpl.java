package com.wangjin.salon.service.service.impl;

import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.common.enums.StatusEnum;
import com.wangjin.common.security.util.SecurityUtils;
import com.wangjin.salon.service.converter.MemberConverter;
import com.wangjin.salon.service.mapper.SalonMemberBalanceMapper;
import com.wangjin.salon.service.mapper.SalonMemberMapper;
import com.wangjin.salon.service.mapper.SalonMemberTagMapper;
import com.wangjin.salon.service.mapper.SalonMemberTagRelMapper;
import com.wangjin.salon.service.model.entity.SalonMember;
import com.wangjin.salon.service.model.entity.SalonMemberBalance;
import com.wangjin.salon.service.model.entity.SalonMemberLevel;
import com.wangjin.salon.service.model.entity.SalonMemberTag;
import com.wangjin.salon.service.model.entity.SalonMemberTagRel;
import com.wangjin.salon.service.model.entity.SalonStore;
import com.wangjin.salon.service.model.form.MemberForm;
import com.wangjin.salon.service.model.query.MemberPageQuery;
import com.wangjin.salon.service.model.vo.MemberDetailVO;
import com.wangjin.salon.service.model.vo.MemberPageVO;
import com.wangjin.salon.service.model.vo.MemberTagOptionVO;
import com.wangjin.salon.service.service.MemberBalanceService;
import com.wangjin.salon.service.service.MemberLevelService;
import com.wangjin.salon.service.service.MemberProfileService;
import com.wangjin.salon.service.service.SalonMemberService;
import com.wangjin.salon.service.service.SalonStorePermissionService;
import com.wangjin.salon.service.service.SalonStoreService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SalonMemberServiceImpl extends ServiceImpl<SalonMemberMapper, SalonMember> implements SalonMemberService {

    private final MemberConverter memberConverter;
    private final SalonStoreService storeService;
    private final SalonStorePermissionService storePermissionService;
    private final MemberLevelService memberLevelService;
    private final MemberBalanceService memberBalanceService;
    private final MemberProfileService memberProfileService;
    private final SalonMemberBalanceMapper balanceMapper;
    private final SalonMemberTagMapper tagMapper;
    private final SalonMemberTagRelMapper tagRelMapper;

    @Override
    public Page<MemberPageVO> getMemberPage(MemberPageQuery query) {
        // 非 ROOT 忽略 tenantId：TenantLine 已自动按本租户过滤，防止越权指定它租户
        if (!SecurityUtils.isRoot()) {
            query.setTenantId(null);
        }
        storePermissionService.apply(query);
        Page<MemberPageVO> page = this.baseMapper.getMemberPage(
                new Page<>(query.getPageNum(), query.getPageSize()), query);
        // 批量补 tagNames
        List<MemberPageVO> records = page.getRecords();
        if (records != null && !records.isEmpty()) {
            List<Long> memberIds = records.stream().map(MemberPageVO::getId).toList();
            Map<Long, List<String>> tagNameMap = loadTagNames(memberIds);
            records.forEach(vo -> vo.setTagNames(tagNameMap.getOrDefault(vo.getId(), Collections.emptyList())));
        }
        return page;
    }

    @Override
    public MemberDetailVO getDetail(Long id) {
        SalonMember entity = this.getById(id);
        Assert.notNull(entity, "Member not found");
        storePermissionService.assertStoreAccessible(entity.getStoreId(), "No permission for this store member");
        MemberDetailVO vo = memberConverter.entity2DetailVo(entity);
        vo.setBalanceDetail(memberBalanceService.getDetail(id));
        vo.setTags(getMemberTags(id));
        vo.setProfile(memberProfileService.get(id));
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long saveMember(MemberForm form) {
        assertStoreAssignable(form.getStoreId());
        SalonMember entity = memberConverter.form2Entity(form);
        if (entity.getStatus() == null) {
            entity.setStatus(StatusEnum.ENABLE.getValue());
        }
        if (entity.getLevelId() == null) {
            entity.setLevelId(resolveDefaultLevelId());
        }
        if (entity.getPoints() == null) {
            entity.setPoints(0);
        }
        if (entity.getBalance() == null) {
            entity.setBalance(BigDecimal.ZERO);
        }
        this.save(entity);
        // 同步建余额档案（本金/赠送/冻结 0）
        SalonMemberBalance balance = new SalonMemberBalance();
        balance.setMemberId(entity.getId());
        balance.setPrincipalBalance(BigDecimal.ZERO);
        balance.setGiftBalance(BigDecimal.ZERO);
        balance.setFrozenBalance(BigDecimal.ZERO);
        balance.setVersion(0);
        balanceMapper.insert(balance);
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

    @Override
    public List<MemberTagOptionVO> getMemberTags(Long memberId) {
        List<SalonMemberTagRel> rels = tagRelMapper.selectList(
                Wrappers.<SalonMemberTagRel>lambdaQuery().eq(SalonMemberTagRel::getMemberId, memberId));
        if (rels.isEmpty()) {
            return Collections.emptyList();
        }
        List<Long> tagIds = rels.stream().map(SalonMemberTagRel::getTagId).toList();
        List<SalonMemberTag> tags = tagMapper.selectBatchIds(tagIds);
        return tags.stream().map(this::toTagOption).toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void setMemberTags(Long memberId, List<Long> tagIds) {
        SalonMember member = this.getById(memberId);
        Assert.notNull(member, "Member not found");
        storePermissionService.assertStoreAccessible(member.getStoreId(), "No permission for this store member");
        // 删旧
        tagRelMapper.delete(Wrappers.<SalonMemberTagRel>lambdaQuery().eq(SalonMemberTagRel::getMemberId, memberId));
        // 插新
        if (tagIds != null && !tagIds.isEmpty()) {
            tagIds.stream().distinct().forEach(tagId -> {
                SalonMemberTagRel rel = new SalonMemberTagRel();
                rel.setMemberId(memberId);
                rel.setTagId(tagId);
                tagRelMapper.insert(rel);
            });
        }
    }

    private MemberTagOptionVO toTagOption(SalonMemberTag tag) {
        MemberTagOptionVO vo = new MemberTagOptionVO();
        vo.setId(tag.getId());
        vo.setName(tag.getName());
        vo.setColor(tag.getColor());
        return vo;
    }

    private Map<Long, List<String>> loadTagNames(List<Long> memberIds) {
        List<SalonMemberTagRel> rels = tagRelMapper.selectList(
                Wrappers.<SalonMemberTagRel>lambdaQuery().in(SalonMemberTagRel::getMemberId, memberIds));
        if (rels.isEmpty()) {
            return Collections.emptyMap();
        }
        Set<Long> tagIds = rels.stream().map(SalonMemberTagRel::getTagId).collect(Collectors.toSet());
        Map<Long, String> tagNameById = tagMapper.selectBatchIds(tagIds).stream()
                .collect(Collectors.toMap(SalonMemberTag::getId, SalonMemberTag::getName));
        return rels.stream()
                .filter(r -> tagNameById.containsKey(r.getTagId()))
                .collect(Collectors.groupingBy(
                        SalonMemberTagRel::getMemberId,
                        Collectors.mapping(r -> tagNameById.get(r.getTagId()), Collectors.toList())));
    }

    /** 默认普通等级（level_no=0）ID；本租户无则置空由前端选择 */
    private Long resolveDefaultLevelId() {
        SalonMemberLevel level = memberLevelService.getOne(
                Wrappers.<SalonMemberLevel>lambdaQuery()
                        .eq(SalonMemberLevel::getLevelNo, 0)
                        .last("LIMIT 1"));
        return level == null ? null : level.getId();
    }

    private void assertStoreAssignable(Long storeId) {
        Assert.notNull(storeId, "Store is required");
        SalonStore store = storeService.getById(storeId);
        Assert.notNull(store, "Store not found");
        storePermissionService.assertStoreAccessible(storeId, "No permission for this store member");
    }
}

package com.wangjin.salon.service.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangjin.salon.service.model.entity.SalonMember;
import com.wangjin.salon.service.model.form.MemberForm;
import com.wangjin.salon.service.model.query.MemberPageQuery;
import com.wangjin.salon.service.model.vo.MemberDetailVO;
import com.wangjin.salon.service.model.vo.MemberPageVO;
import com.wangjin.salon.service.model.vo.MemberTagOptionVO;

import java.util.List;

public interface SalonMemberService extends IService<SalonMember> {

    Page<MemberPageVO> getMemberPage(MemberPageQuery query);

    MemberDetailVO getDetail(Long id);

    Long saveMember(MemberForm form);

    boolean updateMember(Long id, MemberForm form);

    boolean deleteMembers(String ids);

    /** 查会员已绑标签 */
    List<MemberTagOptionVO> getMemberTags(Long memberId);

    /** 全量设置会员标签 */
    void setMemberTags(Long memberId, List<Long> tagIds);
}

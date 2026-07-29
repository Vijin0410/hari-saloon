package com.wangjin.salon.service.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangjin.salon.service.model.entity.SalonMember;
import com.wangjin.salon.service.model.form.MemberForm;
import com.wangjin.salon.service.model.query.MemberPageQuery;
import com.wangjin.salon.service.model.vo.MemberDetailVO;
import com.wangjin.salon.service.model.vo.MemberPageVO;

public interface SalonMemberService extends IService<SalonMember> {

    Page<MemberPageVO> getMemberPage(MemberPageQuery query);

    MemberDetailVO getDetail(Long id);

    Long saveMember(MemberForm form);

    boolean updateMember(Long id, MemberForm form);

    boolean deleteMembers(String ids);
}

package com.wangjin.salon.service.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.common.mybatis.annotation.DataPermission;
import com.wangjin.salon.service.model.entity.SalonMember;
import com.wangjin.salon.service.model.query.MemberPageQuery;
import com.wangjin.salon.service.model.vo.MemberPageVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface SalonMemberMapper extends BaseMapper<SalonMember> {

    @DataPermission(deptColumn = "dept_id", userColumn = "create_by")
    Page<MemberPageVO> getMemberPage(Page<MemberPageVO> page, @Param("q") MemberPageQuery query);
}

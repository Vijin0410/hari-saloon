package com.wangjin.salon.service.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.salon.service.model.entity.SalonMemberPointLog;
import com.wangjin.salon.service.model.query.MemberPointLogPageQuery;
import com.wangjin.salon.service.model.vo.MemberPointLogVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface SalonMemberPointLogMapper extends BaseMapper<SalonMemberPointLog> {

    Page<MemberPointLogVO> getLogPage(Page<MemberPointLogVO> page, @Param("q") MemberPointLogPageQuery query);
}

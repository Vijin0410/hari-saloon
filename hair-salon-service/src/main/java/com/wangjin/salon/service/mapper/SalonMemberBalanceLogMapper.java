package com.wangjin.salon.service.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.salon.service.model.entity.SalonMemberBalanceLog;
import com.wangjin.salon.service.model.query.MemberBalanceLogPageQuery;
import com.wangjin.salon.service.model.vo.MemberBalanceLogVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface SalonMemberBalanceLogMapper extends BaseMapper<SalonMemberBalanceLog> {

    Page<MemberBalanceLogVO> getLogPage(Page<MemberBalanceLogVO> page, @Param("q") MemberBalanceLogPageQuery query);
}

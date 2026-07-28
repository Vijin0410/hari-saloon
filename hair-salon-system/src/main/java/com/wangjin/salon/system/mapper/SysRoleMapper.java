package com.wangjin.salon.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wangjin.salon.system.model.entity.SysRole;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Set;

@Mapper
public interface SysRoleMapper extends BaseMapper<SysRole> {

    Integer getMaxDataRangeDataScope(@Param("roles") Set<String> roles);
}

package com.wangjin.salon.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wangjin.salon.system.model.bo.RouteBO;
import com.wangjin.salon.system.model.entity.SysMenu;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Set;

@Mapper
public interface SysMenuMapper extends BaseMapper<SysMenu> {

    List<RouteBO> listRoutes();

    Set<String> listRolePerms(@Param("roles") Set<String> roles);
}

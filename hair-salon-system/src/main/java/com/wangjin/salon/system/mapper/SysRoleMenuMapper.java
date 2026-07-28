package com.wangjin.salon.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wangjin.salon.system.model.entity.SysRoleMenu;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface SysRoleMenuMapper extends BaseMapper<SysRoleMenu> {

    @Select("SELECT menu_id FROM sys_role_menu WHERE role_id = #{roleId} AND type = #{type}")
    List<Long> listMenuIdsByRoleId(@Param("roleId") Long roleId, @Param("type") Integer type);
}

package com.wangjin.salon.system.mapper;

import com.baomidou.mybatisplus.annotation.InterceptorIgnore;
import com.wangjin.salon.system.model.entity.SysDept;
import com.wangjin.salon.system.model.entity.SysUser;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import java.util.List;

/** 仅供内部全局 ID 翻译缓存批量重建，不作为 HTTP 数据查询入口。 */
@Mapper
@InterceptorIgnore(tenantLine = "true")
public interface SystemCacheMapper {
    @Select("SELECT id, username, nickname, phone, dept_id, tenant_id FROM sys_user WHERE deleted = 0")
    List<SysUser> listUsersForCache();

    @Select("""
            SELECT id, name, parent_id, tree_path, sort, status, leader_id, tenant_id,
                   create_by, create_time, update_by, update_time, deleted
            FROM sys_dept WHERE deleted = 0
            """)
    List<SysDept> listDeptsForCache();
}

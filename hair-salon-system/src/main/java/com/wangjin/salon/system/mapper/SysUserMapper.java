package com.wangjin.salon.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.common.mybatis.annotation.DataPermission;
import com.wangjin.salon.system.model.bo.UserBO;
import com.wangjin.salon.system.model.dto.UserAuthInfo;
import com.wangjin.salon.system.model.entity.SysUser;
import com.wangjin.salon.system.model.form.UserForm;
import com.wangjin.salon.system.model.query.UserPageQuery;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 * 系统用户 Mapper。
 */
@Mapper
public interface SysUserMapper extends BaseMapper<SysUser> {

    /**
     * 用户分页：按数据权限过滤（主表别名 u）。
     * ROOT/ALL 不加条件；部门范围过滤 u.dept_id；SELF 过滤 u.create_by。
     */
    @DataPermission(deptColumn = "dept_id", userColumn = "create_by", tableAlias = "u")
    Page<UserBO> getUserPage(Page<UserBO> page, @Param("q") UserPageQuery queryParams);

    UserForm getUserDetail(@Param("userId") Long userId);

    UserAuthInfo getUserAuthInfo(@Param("username") String username);
}

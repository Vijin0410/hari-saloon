package com.wangjin.salon.system.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangjin.salon.system.model.dto.UserAuthInfo;
import com.wangjin.salon.system.model.entity.SysUser;
import com.wangjin.salon.system.model.form.UserForm;
import com.wangjin.salon.system.model.query.UserPageQuery;
import com.wangjin.salon.system.model.vo.UserInfoVO;
import com.wangjin.salon.system.model.vo.UserPageVO;

import java.time.LocalDateTime;

public interface SysUserService extends IService<SysUser> {

    SysUser getByUsername(String username);

    IPage<UserPageVO> getUserPage(UserPageQuery queryParams);

    UserForm getUserFormData(Long userId);

    boolean saveUser(UserForm form);

    boolean updateUser(Long userId, UserForm form);

    boolean deleteUsers(String ids);

    /** 管理员重置密码（目标用户仍须改密） */
    boolean updatePassword(Long userId, String password);

    /** 当前用户修改自己的密码（清除强制改密） */
    boolean changeOwnPassword(String oldPassword, String newPassword);

    boolean updateUserStatus(Long userId, Integer status);

    UserAuthInfo getUserAuthInfo(String username);

    /**
     * 按租户加载登录鉴权信息（tenantId 空则默认租户）。
     */
    UserAuthInfo getUserAuthInfo(String username, Long tenantId);

    UserInfoVO getUserLoginInfo();

    /**
     * 是否须强制改密：last 为 null（首次/重置后）或已超过 password-expire-days。
     */
    boolean isPasswordResetRequired(LocalDateTime lastPasswordChangeTime);
}

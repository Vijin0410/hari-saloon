package com.wangjin.salon.system.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangjin.salon.system.model.dto.UserAuthInfo;
import com.wangjin.salon.system.model.entity.SysUser;
import com.wangjin.salon.system.model.form.UserForm;
import com.wangjin.salon.system.model.query.UserPageQuery;
import com.wangjin.salon.system.model.vo.UserInfoVO;
import com.wangjin.salon.system.model.vo.UserPageVO;

public interface SysUserService extends IService<SysUser> {

    SysUser getByUsername(String username);

    IPage<UserPageVO> getUserPage(UserPageQuery queryParams);

    UserForm getUserFormData(Long userId);

    boolean saveUser(UserForm form);

    boolean updateUser(Long userId, UserForm form);

    boolean deleteUsers(String ids);

    boolean updatePassword(Long userId, String password);

    boolean updateUserStatus(Long userId, Integer status);

    UserAuthInfo getUserAuthInfo(String username);

    UserInfoVO getUserLoginInfo();
}

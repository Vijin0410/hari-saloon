package com.wangjin.salon.system.converter;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.salon.system.model.bo.UserBO;
import com.wangjin.salon.system.model.entity.SysUser;
import com.wangjin.salon.system.model.form.UserForm;
import com.wangjin.salon.system.model.vo.UserInfoVO;
import com.wangjin.salon.system.model.vo.UserPageVO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * 用户对象转换器
 */
@Mapper(componentModel = "spring")
public interface UserConverter {

    UserPageVO bo2Vo(UserBO bo);

    Page<UserPageVO> bo2Vo(Page<UserBO> bo);

    UserForm entity2Form(SysUser entity);

    @Mapping(target = "password", ignore = true)
    SysUser form2Entity(UserForm form);

    UserInfoVO entity2UserInfoVo(SysUser entity);
}

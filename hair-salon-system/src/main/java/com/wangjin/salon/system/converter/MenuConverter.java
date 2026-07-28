package com.wangjin.salon.system.converter;

import com.wangjin.salon.system.model.entity.SysMenu;
import com.wangjin.salon.system.model.form.MenuForm;
import com.wangjin.salon.system.model.vo.MenuVO;
import org.mapstruct.Mapper;

/**
 * 菜单对象转换器
 */
@Mapper(componentModel = "spring")
public interface MenuConverter {

    MenuVO entity2Vo(SysMenu entity);

    MenuForm entity2Form(SysMenu entity);

    SysMenu form2Entity(MenuForm menuForm);
}

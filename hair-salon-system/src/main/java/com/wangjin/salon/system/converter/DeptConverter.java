package com.wangjin.salon.system.converter;

import com.wangjin.salon.system.model.entity.SysDept;
import com.wangjin.salon.system.model.form.DeptForm;
import com.wangjin.salon.system.model.vo.DeptVO;
import org.mapstruct.Mapper;

/**
 * 部门对象转换器
 */
@Mapper(componentModel = "spring")
public interface DeptConverter {

    DeptForm entity2Form(SysDept entity);

    DeptVO entity2Vo(SysDept entity);

    SysDept form2Entity(DeptForm deptForm);
}

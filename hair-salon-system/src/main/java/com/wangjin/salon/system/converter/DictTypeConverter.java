package com.wangjin.salon.system.converter;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.salon.system.model.entity.SysDictType;
import com.wangjin.salon.system.model.form.DictTypeForm;
import com.wangjin.salon.system.model.vo.DictTypePageVO;
import org.mapstruct.Mapper;

import java.util.List;

/**
 * 字典类型对象转换器
 */
@Mapper(componentModel = "spring")
public interface DictTypeConverter {

    Page<DictTypePageVO> entity2Page(Page<SysDictType> page);

    DictTypeForm entity2Form(SysDictType entity);

    SysDictType form2Entity(DictTypeForm form);

    List<DictTypeForm> entity2Form(List<SysDictType> entity);
}

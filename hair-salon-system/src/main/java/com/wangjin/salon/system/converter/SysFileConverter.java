package com.wangjin.salon.system.converter;

import com.wangjin.salon.system.model.entity.SysFile;
import com.wangjin.salon.system.model.vo.SysFileVO;
import org.mapstruct.Mapper;

/**
 * 文件对象转换器。
 */
@Mapper(componentModel = "spring")
public interface SysFileConverter {

    SysFileVO entity2Vo(SysFile entity);
}

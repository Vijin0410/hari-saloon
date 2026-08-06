package com.wangjin.salon.system.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangjin.common.web.model.Option;
import com.wangjin.salon.system.model.entity.SysDict;
import com.wangjin.salon.system.model.form.DictForm;
import com.wangjin.salon.system.model.query.DictPageQuery;
import com.wangjin.salon.system.model.vo.DictPageVO;

import java.util.List;

public interface SysDictService extends IService<SysDict> {

    Page<DictPageVO> getDictPage(DictPageQuery queryParams);

    DictForm getDictForm(Long id);

    boolean saveDict(DictForm form);

    boolean updateDict(Long id, DictForm form);

    boolean deleteDict(String ids);

    List<Option<String>> listDictOptions(String typeCode);
}

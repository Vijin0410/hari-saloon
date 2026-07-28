package com.wangjin.salon.system.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangjin.salon.system.model.entity.SysDictType;
import com.wangjin.salon.system.model.form.DictTypeForm;
import com.wangjin.salon.system.model.query.DictTypePageQuery;
import com.wangjin.salon.system.model.vo.DictTypePageVO;

import java.util.List;

public interface SysDictTypeService extends IService<SysDictType> {

    Page<DictTypePageVO> getDictTypePage(DictTypePageQuery queryParams);

    DictTypeForm getDictTypeForm(Long id);

    boolean saveDictType(DictTypeForm form);

    boolean updateDictType(Long id, DictTypeForm form);

    boolean deleteDictTypes(String ids);

    List<DictTypeForm> listByGroupCode(String groupCode);
}

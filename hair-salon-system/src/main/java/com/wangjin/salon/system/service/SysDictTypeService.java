package com.wangjin.salon.system.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangjin.common.web.model.Option;
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

    /** 通用（默认租户 1）启用的字典类型下拉（value=code，天然按租户去重），供开通租户勾选同步字典等场景。 */
    List<Option<String>> listTypeOptions();
}

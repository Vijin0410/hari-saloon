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

    /**
     * 开通租户时按勾选字典类型从默认租户（通用模板）复制字典类型与字典项到目标租户。
     * <p>幂等：目标租户已存在同 code 类型 / 同 type_code+value 字典项则跳过；复制后刷新字典缓存。
     *
     * @param targetTenantId 目标租户 ID
     * @param typeCodes      要同步的字典类型编码（空则不复制）
     */
    void copyFromDefaultTenant(Long targetTenantId, List<String> typeCodes);
}

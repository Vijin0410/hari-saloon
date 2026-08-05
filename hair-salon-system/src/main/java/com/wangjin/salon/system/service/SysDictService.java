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
     * 复制源租户的全部字典（类型 + 项）到当前租户上下文，供新租户开通继承初始字典。
     * <p>
     * 须在目标 tenant 的 {@code TenantContextRunner} 内调用；目标租户已存在的 type code 跳过（幂等）。
     *
     * @param fromTenantId 模板租户ID
     */
    void copyFromTenant(Long fromTenantId);
}

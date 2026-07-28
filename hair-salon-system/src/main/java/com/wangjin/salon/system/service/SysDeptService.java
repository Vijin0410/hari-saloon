package com.wangjin.salon.system.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wangjin.common.web.model.Option;
import com.wangjin.salon.system.model.entity.SysDept;
import com.wangjin.salon.system.model.form.DeptForm;
import com.wangjin.salon.system.model.query.DeptQuery;
import com.wangjin.salon.system.model.vo.DeptVO;

import java.util.List;
import java.util.Set;

public interface SysDeptService extends IService<SysDept> {

    List<DeptVO> listDepartments(DeptQuery queryParams);

    List<Option<Long>> listDeptOptions();

    DeptForm getDeptForm(Long deptId);

    Long saveDept(DeptForm form);

    Long updateDept(Long deptId, DeptForm form);

    boolean deleteByIds(String ids);

    /**
     * 本部门及所有下级部门 ID（含自身）。
     */
    Set<Long> listDeptAndChildIds(Long deptId);
}

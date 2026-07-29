package com.wangjin.salon.system.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.common.mybatis.annotation.DataPermission;
import com.wangjin.salon.system.model.entity.SysFile;
import com.wangjin.salon.system.model.query.SysFilePageQuery;
import com.wangjin.salon.system.model.vo.SysFilePageVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 * 通用文件 Mapper。
 */
@Mapper
public interface SysFileMapper extends BaseMapper<SysFile> {

    /**
     * 文件分页：按数据权限过滤（主表别名 f）。
     * ROOT/ALL 不加条件；部门范围过滤 f.dept_id；SELF 过滤 f.create_by。
     */
    @DataPermission(deptColumn = "dept_id", userColumn = "create_by", tableAlias = "f")
    Page<SysFilePageVO> getFilePage(Page<SysFilePageVO> page, @Param("q") SysFilePageQuery query);
}

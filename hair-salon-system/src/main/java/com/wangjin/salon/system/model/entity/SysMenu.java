package com.wangjin.salon.system.model.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import com.wangjin.common.enums.MenuTypeEnum;
import com.wangjin.salon.system.handler.MetaJsonTypeHandler;
import com.wangjin.salon.system.model.vo.Meta;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 菜单 / 按钮权限。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName(value = "sys_menu", autoResultMap = true)
public class SysMenu extends BaseTenantEntity<Long> {

    private Long parentId;
    private String name;
    private MenuTypeEnum type;
    private String path;
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String component;
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String redirect;
    private String treePath;
    @TableField(value = "meta", typeHandler = MetaJsonTypeHandler.class)
    private Meta meta;
    /** 权限标识，如 system:user:add */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String perm;
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String apiPath;
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String remark;
}

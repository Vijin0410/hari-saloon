package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

/**
 * 商品（租户级，收银开单可选；销售价/成本价/库存/是否折扣/是否提成）。
 * <p>
 * 当前库存数量为本表冗余值，P5 销售扣减；完整进销存（入库/出库/盘点）见 P17 暂缓。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_goods")
public class SalonGoods extends BaseTenantEntity<Long> {

    /** 商品名称 */
    private String name;
    /** 商品分类ID（关联salon_goods_category） */
    private Long categoryId;
    /** 商品条码 */
    private String barcode;
    /** 销售价格 */
    private BigDecimal salePrice;
    /** 成本价 */
    private BigDecimal costPrice;
    /** 库存数量 */
    private Integer stockQuantity;
    /** 是否参与折扣（1=是 0=否） */
    private Integer discountable;
    /** 是否计算提成（1=是 0=否） */
    private Integer commissionable;
    /** 排序 */
    private Integer sort;
    /** 状态（1=启用 0=禁用） */
    private Integer status;
    /** 备注 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String remark;
}

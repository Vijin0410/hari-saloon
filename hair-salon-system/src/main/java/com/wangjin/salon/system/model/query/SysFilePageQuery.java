package com.wangjin.salon.system.model.query;

import com.wangjin.common.base.BasePageQuery;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "文件分页查询")
public class SysFilePageQuery extends BasePageQuery {

    @Schema(description = "关键字（原始文件名）")
    private String keywords;

    @Schema(description = "业务类型")
    private String biz;

    @Schema(description = "关联业务ID")
    private Long bizId;

    @Schema(description = "是否公开（0=私有 1=公开）")
    private Integer isPublic;
}

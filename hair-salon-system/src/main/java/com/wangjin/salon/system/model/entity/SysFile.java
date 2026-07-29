package com.wangjin.salon.system.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 通用文件档案（MinIO 对象元数据落库）。
 * <p>
 * 业务表存 {@link #objectKey} 软关联；权限归属走 dept_id + create_by 的 {@code @DataPermission}。
 * tenant_id / create_by / create_time 等由 MetaObjectHandler 自动填充。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_file")
public class SysFile extends BaseTenantEntity<Long> {

    /** 桶内对象键（{tenant}/{biz}/{yyyyMMdd}/{uuid}.ext） */
    private String objectKey;

    /** 存储桶名称 */
    private String bucket;

    /** 原始文件名 */
    private String originalName;

    /** MIME 类型 */
    private String contentType;

    /** 扩展名（无点小写） */
    private String extension;

    /** 文件大小（字节） */
    private Long size;

    /** 业务类型，如 avatar/logo/product/contract */
    private String biz;

    /** 关联业务ID（上传时可能未落库，事后回填） */
    private Long bizId;

    /** 所属目录ID（一期可空，用 biz 分类） */
    private Long directoryId;

    /** 是否公开：0=私有（访问须校验归属+预签名） 1=公开（直链 publicUrl） */
    private Integer isPublic;

    /** 上传人部门ID（@DataPermission 行级过滤用） */
    private Long deptId;
}

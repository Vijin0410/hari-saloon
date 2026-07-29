package com.wangjin.salon.system.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.wangjin.salon.system.model.query.SysFilePageQuery;
import com.wangjin.salon.system.model.vo.SysFilePageVO;
import com.wangjin.salon.system.model.vo.SysFileVO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 通用文件服务：MinIO 上传 + 元数据落库 + 权限归属。
 */
public interface SysFileService {

    /**
     * 上传并落库（事务：传 MinIO -> 落 sys_file；落库失败补删 MinIO 对象，避免孤儿）。
     *
     * @param file     文件
     * @param biz      业务类型，如 avatar/logo/product
     * @param bizId    关联业务ID，可空
     * @param isPublic 0=私有 1=公开；空按 0
     */
    SysFileVO uploadAndSave(MultipartFile file, String biz, Long bizId, Integer isPublic);

    /** 批量上传并落库；任一落库失败回滚 DB 并补偿删除已传对象。 */
    List<SysFileVO> uploadAndSaveBatch(MultipartFile[] files, String biz, Long bizId, Integer isPublic);

    /** 逻辑删 sys_file + 删 MinIO 对象（限本人/ALL）。 */
    boolean delete(Long id);

    /** 批量删除。 */
    boolean deleteByIds(List<Long> ids);

    /**
     * 获取可访问 URL：私有桶下统一预签名；公开文件不校验归属，私有文件校验归属后发预签名。
     * 归属判定：ROOT/ALL 放行；本人上传放行；否则按 dataScope 可见部门集合匹配 dept_id。
     */
    String getAccessibleUrl(Long id);

    /**
     * 按对象键取可访问 URL（查 sys_file 分流：公开=预签名不校验；私有=校验归属+预签名）。
     * 私有桶下 publicUrl 已无效，统一走预签名。
     */
    String getAccessibleUrlByKey(String objectKey);

    /** 文件分页（按 @DataPermission 过滤）。 */
    IPage<SysFilePageVO> getFilePage(SysFilePageQuery query);
}

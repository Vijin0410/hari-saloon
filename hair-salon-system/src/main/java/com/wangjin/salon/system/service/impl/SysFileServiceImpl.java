package com.wangjin.salon.system.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.common.exception.BizException;
import com.wangjin.common.minio.model.FileObject;
import com.wangjin.common.minio.service.MinioService;
import com.wangjin.common.result.ResultCode;
import com.wangjin.common.security.util.SecurityUtils;
import com.wangjin.salon.system.converter.SysFileConverter;
import com.wangjin.salon.system.mapper.SysFileMapper;
import com.wangjin.salon.system.model.entity.SysFile;
import com.wangjin.salon.system.model.query.SysFilePageQuery;
import com.wangjin.salon.system.model.vo.SysFilePageVO;
import com.wangjin.salon.system.model.vo.SysFileVO;
import com.wangjin.salon.system.service.SysFileService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 通用文件服务实现。
 * <p>
 * 落库顺序：先传 MinIO（拿到 objectKey）再落 sys_file；落库失败补删 MinIO 对象，避免孤儿。
 * 权限归属：列表走 {@code @DataPermission}；私有文件单条访问用 {@link #assertAccessible}，
 * 删除用更严的 {@link #assertManageable}（限本人/ALL）。
 */
@Service
@RequiredArgsConstructor
public class SysFileServiceImpl extends ServiceImpl<SysFileMapper, SysFile> implements SysFileService {

    private final MinioService minioService;
    private final SysFileConverter sysFileConverter;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SysFileVO uploadAndSave(MultipartFile file, String biz, Long bizId, Integer isPublic) {
        // upload 内部已做空文件/扩展名/大小校验并封装为 BizException
        FileObject fo = minioService.upload(file, biz);
        SysFile entity = buildEntity(fo, biz, bizId, isPublic);
        try {
            this.save(entity);
        } catch (Exception e) {
            // 落库失败：补删已传对象，避免孤儿
            minioService.delete(fo.getObjectKey());
            throw new BizException("文件落库失败", e);
        }
        SysFileVO vo = sysFileConverter.entity2Vo(entity);
        vo.setUrl(buildUrl(entity));
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public List<SysFileVO> uploadAndSaveBatch(MultipartFile[] files, String biz, Long bizId, Integer isPublic) {
        if (files == null || files.length == 0) {
            throw new BizException("上传文件不能为空");
        }
        List<SysFileVO> result = new ArrayList<>();
        List<String> uploadedKeys = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                continue;
            }
            FileObject fo = minioService.upload(file, biz);
            uploadedKeys.add(fo.getObjectKey());
            SysFile entity = buildEntity(fo, biz, bizId, isPublic);
            try {
                this.save(entity);
            } catch (Exception e) {
                // 批量中任一落库失败：补偿删除本批已传对象，事务回滚
                minioService.delete(uploadedKeys);
                throw new BizException("文件落库失败", e);
            }
            SysFileVO vo = sysFileConverter.entity2Vo(entity);
            vo.setUrl(buildUrl(entity));
            result.add(vo);
        }
        if (result.isEmpty()) {
            if (!uploadedKeys.isEmpty()) {
                minioService.delete(uploadedKeys);
            }
            throw new BizException("上传文件不能为空");
        }
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean delete(Long id) {
        SysFile entity = this.getById(id);
        if (entity == null) {
            return false;
        }
        assertManageable(entity);
        boolean ok = this.removeById(id);
        if (ok) {
            minioService.delete(entity.getObjectKey());
        }
        return ok;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean deleteByIds(List<Long> ids) {
        if (CollUtil.isEmpty(ids)) {
            return false;
        }
        List<SysFile> files = this.listByIds(ids);
        for (SysFile file : files) {
            assertManageable(file);
        }
        boolean ok = this.removeByIds(ids);
        if (ok && CollUtil.isNotEmpty(files)) {
            minioService.delete(files.stream().map(SysFile::getObjectKey).collect(Collectors.toList()));
        }
        return ok;
    }

    @Override
    public String getAccessibleUrl(Long id) {
        SysFile entity = this.getById(id);
        Assert.notNull(entity, "文件不存在");
        // 私有桶下统一预签名；公开文件不校验归属，私有文件校验归属
        if (!Integer.valueOf(1).equals(entity.getIsPublic())) {
            assertAccessible(entity);
        }
        return minioService.getPresignedUrl(entity.getObjectKey(), 0);
    }

    @Override
    public String getAccessibleUrlByKey(String objectKey) {
        Assert.notNull(objectKey, "objectKey 不能为空");
        SysFile entity = this.getOne(new LambdaQueryWrapper<SysFile>()
                .eq(SysFile::getObjectKey, objectKey)
                .last("LIMIT 1"));
        if (entity == null) {
            // 未登记的 objectKey：私有桶下无法判定归属，拒绝
            throw new BizException(ResultCode.ACCESS_UNAUTHORIZED, "文件不存在或无权访问");
        }
        if (!Integer.valueOf(1).equals(entity.getIsPublic())) {
            assertAccessible(entity);
        }
        return minioService.getPresignedUrl(entity.getObjectKey(), 0);
    }

    @Override
    public IPage<SysFilePageVO> getFilePage(SysFilePageQuery query) {
        Page<SysFilePageVO> page = this.baseMapper.getFilePage(
                new Page<>(query.getPageNum(), query.getPageSize()), query);
        return page;
    }

    // ==================== 私有工具 ====================

    private SysFile buildEntity(FileObject fo, String biz, Long bizId, Integer isPublic) {
        SysFile entity = new SysFile();
        entity.setObjectKey(fo.getObjectKey());
        entity.setBucket(fo.getBucket());
        entity.setOriginalName(fo.getOriginalFilename());
        entity.setContentType(fo.getContentType());
        entity.setExtension(fo.getExtension());
        entity.setSize(fo.getSize());
        entity.setBiz(StrUtil.blankToDefault(biz, "common"));
        entity.setBizId(bizId);
        entity.setIsPublic(isPublic == null ? 0 : isPublic);
        entity.setDeptId(SecurityUtils.getDeptId());
        // tenantId / createBy / createTime / updateTime / deleted 由 MetaObjectHandler 自动填充
        return entity;
    }

    /** 上传后返回给上传者的 URL：私有桶下统一预签名。 */
    private String buildUrl(SysFile entity) {
        return minioService.getPresignedUrl(entity.getObjectKey(), 0);
    }

    /**
     * 私有文件访问归属校验：ROOT/ALL 放行；本人上传放行；否则按 dataScope 可见部门集合匹配 dept_id。
     * （ALL/SELF 的可见部门集合为空：ALL 已在前面放行；SELF 且非本人即拒绝。）
     */
    private void assertAccessible(SysFile entity) {
        if (SecurityUtils.isAllDataScope()) {
            return;
        }
        Long userId = SecurityUtils.getUserId();
        if (userId != null && userId.equals(entity.getCreateBy())) {
            return;
        }
        Set<Long> visibleDepts = SecurityUtils.getDataScopeDeptIds();
        if (visibleDepts.isEmpty()) {
            throw new BizException(ResultCode.ACCESS_UNAUTHORIZED, "无权访问该文件");
        }
        if (entity.getDeptId() == null || !visibleDepts.contains(entity.getDeptId())) {
            throw new BizException(ResultCode.ACCESS_UNAUTHORIZED, "无权访问该文件");
        }
    }

    /** 删除权限：限本人上传或 ALL 数据范围，比访问更严。 */
    private void assertManageable(SysFile entity) {
        if (SecurityUtils.isAllDataScope()) {
            return;
        }
        Long userId = SecurityUtils.getUserId();
        if (userId != null && userId.equals(entity.getCreateBy())) {
            return;
        }
        throw new BizException(ResultCode.ACCESS_UNAUTHORIZED, "无权删除该文件");
    }
}

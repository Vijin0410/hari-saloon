package com.wangjin.salon.service.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangjin.salon.service.model.entity.SalonTenantPayConfig;
import com.wangjin.salon.service.model.form.TenantPayConfigForm;
import com.wangjin.salon.service.model.query.TenantPayConfigPageQuery;
import com.wangjin.salon.service.model.vo.TenantPayConfigDetailVO;
import com.wangjin.salon.service.model.vo.TenantPayConfigOptionVO;
import com.wangjin.salon.service.model.vo.TenantPayConfigPageVO;
import com.wangjin.salon.service.model.vo.TenantPayConfigVerifyVO;

import java.util.List;

/**
 * 租户支付配置服务（docs/payment-design.md §7.1）。
 * <p>
 * 敏感字段（APIv3 密钥/私钥/公钥/授权 token）SM4 加密入库，详情不回显明文；
 * 保存/编辑后状态 pending，经 {@link #verify} 验参自检流转 active/invalid。
 */
public interface TenantPayConfigService extends IService<SalonTenantPayConfig> {

    /** 分页 */
    Page<TenantPayConfigPageVO> getPage(TenantPayConfigPageQuery query);

    /** 详情（敏感字段掩码，不回显明文） */
    TenantPayConfigDetailVO getDetail(Long id);

    /** 新增（敏感字段加密入库，状态 pending） */
    Long save(TenantPayConfigForm form);

    /**
     * 修改（渠道禁改；敏感字段留空 = 保持原值；参与验参的字段变更后状态回 pending）。
     */
    boolean update(Long id, TenantPayConfigForm form);

    /** 批量删除 */
    boolean delete(String ids);

    /**
     * 验参自检：manual 直通 active；微信直连调 V3 只读接口；支付宝直连调 trade.query 哑单；
     * 聚合渠道暂本地校验保持 pending。
     */
    TenantPayConfigVerifyVO verify(Long id);

    /** 启用且验证通过的渠道（收银台动态渲染可用支付方式） */
    List<TenantPayConfigOptionVO> options();

    /**
     * 取当前租户指定渠道启用且验证通过的直连配置；未配置时抛业务异常（调用方先行渲染手动兜底）。
     * <p>
     * 须在租户上下文内调用（salon_tenant_pay_config 走租户行级过滤）。
     */
    SalonTenantPayConfig requireActiveConfig(String channel);
}

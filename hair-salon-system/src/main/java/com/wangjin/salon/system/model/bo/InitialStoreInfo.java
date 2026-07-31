package com.wangjin.salon.system.model.bo;

/**
 * 开通租户时联合创建的初始门店信息（可选；name 为空则不创建门店）。
 *
 * @param name    门店名称
 * @param code    门店编码
 * @param phone   联系电话
 * @param address 详细地址
 */
public record InitialStoreInfo(
        String name,
        String code,
        String phone,
        String address
) {
}

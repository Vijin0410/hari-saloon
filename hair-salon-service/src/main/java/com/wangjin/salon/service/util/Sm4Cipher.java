package com.wangjin.salon.service.util;

import cn.hutool.core.codec.Base64;
import cn.hutool.core.util.HexUtil;
import cn.hutool.core.util.RandomUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.Mode;
import cn.hutool.crypto.Padding;
import cn.hutool.crypto.symmetric.SM4;
import com.wangjin.common.exception.BizException;
import com.wangjin.salon.service.config.PayProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

/**
 * SM4 加解密工具（渠道支付密钥入库加密，密钥见 {@link PayProperties}）。
 * <p>
 * 算法：SM4/CBC/PKCS5Padding + 每次加密随机 IV（禁止 ECB：相同明文密文相同，可被分组重放比对）。
 * 密文格式：Base64(IV(16字节) || 密文)，解密时取前 16 字节作 IV。
 * 密钥惰性校验：未配置/非 32 位 hex 时首次调用即失败，不影响未使用支付功能的环境启动。
 */
@Component
@RequiredArgsConstructor
public class Sm4Cipher {

    /** IV 长度 = SM4 分组大小（128bit） */
    private static final int IV_LENGTH = 16;

    private final PayProperties properties;

    /**
     * 加密明文，返回 Base64(IV || 密文)；入参空白原样返回（调用方约定：敏感字段空 = 未填写）。
     */
    public String encrypt(String plain) {
        if (StrUtil.isBlank(plain)) {
            return plain;
        }
        byte[] iv = RandomUtil.randomBytes(IV_LENGTH);
        SM4 sm4 = new SM4(Mode.CBC, Padding.PKCS5Padding, loadKey(), iv);
        byte[] cipher = sm4.encrypt(plain.getBytes(StandardCharsets.UTF_8));
        byte[] out = new byte[IV_LENGTH + cipher.length];
        System.arraycopy(iv, 0, out, 0, IV_LENGTH);
        System.arraycopy(cipher, 0, out, IV_LENGTH, cipher.length);
        return Base64.encode(out);
    }

    /**
     * 解密 {@link #encrypt} 输出的密文；入参空白原样返回。
     */
    public String decrypt(String encoded) {
        if (StrUtil.isBlank(encoded)) {
            return encoded;
        }
        byte[] all = Base64.decode(encoded);
        if (all == null || all.length <= IV_LENGTH) {
            throw new BizException("密文格式不正确");
        }
        byte[] iv = Arrays.copyOfRange(all, 0, IV_LENGTH);
        byte[] cipher = Arrays.copyOfRange(all, IV_LENGTH, all.length);
        try {
            SM4 sm4 = new SM4(Mode.CBC, Padding.PKCS5Padding, loadKey(), iv);
            return new String(sm4.decrypt(cipher), StandardCharsets.UTF_8);
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            throw new BizException("密文解密失败（加密密钥可能已变更）");
        }
    }

    /** 密钥校验 + 解码：32 位 hex（128bit），与 Hutool SM4 要求一致 */
    private byte[] loadKey() {
        String key = properties.getSm4Key();
        if (StrUtil.isBlank(key) || !key.matches("[0-9a-fA-F]{32}")) {
            throw new BizException("支付加密密钥未配置或格式不正确（wj.salon.pay.sm4-key，须为32位hex）");
        }
        return HexUtil.decodeHex(key);
    }
}

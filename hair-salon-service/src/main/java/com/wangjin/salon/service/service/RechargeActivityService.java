package com.wangjin.salon.service.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangjin.salon.service.model.entity.SalonRechargeActivity;
import com.wangjin.salon.service.model.form.RechargeActivityForm;
import com.wangjin.salon.service.model.query.RechargeActivityPageQuery;
import com.wangjin.salon.service.model.vo.RechargeActivityOptionVO;
import com.wangjin.salon.service.model.vo.RechargeActivityPageVO;

import java.math.BigDecimal;
import java.util.List;

public interface RechargeActivityService extends IService<SalonRechargeActivity> {

    Page<RechargeActivityPageVO> getPage(RechargeActivityPageQuery query);

    RechargeActivityForm getForm(Long id);

    Long save(RechargeActivityForm form);

    boolean update(Long id, RechargeActivityForm form);

    boolean delete(String ids);

    /**
     * 生效中活动下拉（充值弹窗档位展示；status=1 且当前时间在生效窗口内）。
     */
    List<RechargeActivityOptionVO> options();

    /**
     * 充值金额匹配最优活动：门槛可享活动中门槛最高者优先（同门槛取赠送额最大）。
     *
     * @param amount 充值金额
     * @return 命中活动（无则 null）
     */
    SalonRechargeActivity matchBest(BigDecimal amount);
}

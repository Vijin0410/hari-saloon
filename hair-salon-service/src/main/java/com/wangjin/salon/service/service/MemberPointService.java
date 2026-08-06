package com.wangjin.salon.service.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.salon.service.model.form.MemberPointAdjustForm;
import com.wangjin.salon.service.model.query.MemberPointLogPageQuery;
import com.wangjin.salon.service.model.vo.MemberPointLogVO;

public interface MemberPointService {

    Page<MemberPointLogVO> getLogPage(MemberPointLogPageQuery query);

    void adjust(Long memberId, MemberPointAdjustForm form);

    /**
     * 扫描所有启用租户，清零已到期积分批次并生成过期清零流水（定时任务入口）。
     * <p>
     * 逐租户切换上下文（{@link com.wangjin.salon.system.util.TenantContextRunner}），逐会员独立事务，
     * 单会员失败不影响其余。返回实际产生清零流水的会员数。
     *
     * @return 实际清零的会员数
     */
    int expireDuePoints();
}

package com.wangjin.salon.service.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.salon.service.model.form.MemberBalanceAdjustForm;
import com.wangjin.salon.service.model.query.MemberBalanceLogPageQuery;
import com.wangjin.salon.service.model.vo.MemberBalanceLogVO;
import com.wangjin.salon.service.model.vo.MemberBalanceVO;

public interface MemberBalanceService {

    MemberBalanceVO getDetail(Long memberId);

    Page<MemberBalanceLogVO> getLogPage(MemberBalanceLogPageQuery query);

    void adjust(Long memberId, MemberBalanceAdjustForm form);
}

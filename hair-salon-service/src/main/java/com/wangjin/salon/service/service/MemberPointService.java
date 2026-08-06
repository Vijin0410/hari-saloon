package com.wangjin.salon.service.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.salon.service.model.form.MemberPointAdjustForm;
import com.wangjin.salon.service.model.query.MemberPointLogPageQuery;
import com.wangjin.salon.service.model.vo.MemberPointLogVO;

public interface MemberPointService {

    Page<MemberPointLogVO> getLogPage(MemberPointLogPageQuery query);

    void adjust(Long memberId, MemberPointAdjustForm form);
}

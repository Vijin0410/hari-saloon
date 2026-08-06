package com.wangjin.salon.service.service;

import com.wangjin.salon.service.model.form.MemberProfileForm;
import com.wangjin.salon.service.model.vo.MemberProfileVO;

public interface MemberProfileService {

    MemberProfileVO get(Long memberId);

    void update(Long memberId, MemberProfileForm form);
}

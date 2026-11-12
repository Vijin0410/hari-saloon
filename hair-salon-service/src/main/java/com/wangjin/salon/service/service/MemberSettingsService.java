package com.wangjin.salon.service.service;

import com.wangjin.salon.service.model.form.MemberSettingsForm;
import com.wangjin.salon.service.model.vo.MemberSettingsVO;

public interface MemberSettingsService {
    boolean pointsEnabled();
    boolean pointsEnabled(Long tenantId);
    MemberSettingsVO getSettings(boolean includeAssets);
    void update(MemberSettingsForm form);
}

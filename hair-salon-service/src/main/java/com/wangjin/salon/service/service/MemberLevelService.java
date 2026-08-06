package com.wangjin.salon.service.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangjin.salon.service.model.entity.SalonMemberLevel;
import com.wangjin.salon.service.model.form.MemberLevelForm;
import com.wangjin.salon.service.model.query.MemberLevelPageQuery;
import com.wangjin.salon.service.model.vo.MemberLevelOptionVO;
import com.wangjin.salon.service.model.vo.MemberLevelPageVO;

import java.util.List;

public interface MemberLevelService extends IService<SalonMemberLevel> {

    Page<MemberLevelPageVO> getPage(MemberLevelPageQuery query);

    MemberLevelForm getForm(Long id);

    Long save(MemberLevelForm form);

    boolean update(Long id, MemberLevelForm form);

    boolean delete(String ids);

    List<MemberLevelOptionVO> options();
}

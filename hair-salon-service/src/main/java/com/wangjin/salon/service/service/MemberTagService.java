package com.wangjin.salon.service.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangjin.salon.service.model.entity.SalonMemberTag;
import com.wangjin.salon.service.model.form.MemberTagForm;
import com.wangjin.salon.service.model.query.MemberTagPageQuery;
import com.wangjin.salon.service.model.vo.MemberTagOptionVO;
import com.wangjin.salon.service.model.vo.MemberTagVO;

import java.util.List;

public interface MemberTagService extends IService<SalonMemberTag> {

    Page<MemberTagVO> getPage(MemberTagPageQuery query);

    MemberTagForm getForm(Long id);

    Long save(MemberTagForm form);

    boolean update(Long id, MemberTagForm form);

    boolean delete(String ids);

    List<MemberTagOptionVO> options();
}

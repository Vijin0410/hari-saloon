package com.wangjin.salon.service.service;

import com.wangjin.salon.service.model.entity.SalonOrder;
import com.wangjin.salon.service.model.form.OrderStaffCorrectionForm;
import com.wangjin.salon.service.model.vo.OrderStaffChangeVO;
import com.wangjin.salon.service.model.vo.OrderStaffOptionVO;
import java.util.List;

public interface OrderStaffService {
    List<OrderStaffOptionVO> listOptions(Long storeId);
    void assertReadyForPayment(SalonOrder order);
    void correct(Long orderId, OrderStaffCorrectionForm form);
    List<OrderStaffChangeVO> listChanges(Long orderId);
}

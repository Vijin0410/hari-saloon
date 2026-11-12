package com.wangjin.salon.service.service;

import com.wangjin.salon.service.model.entity.SalonOrder;
import com.wangjin.salon.service.model.entity.SalonRefundOrder;

public interface RefundPointService {
    void preview(SalonOrder order, SalonRefundOrder refund);
    void confirm(SalonOrder order, SalonRefundOrder refund);
}

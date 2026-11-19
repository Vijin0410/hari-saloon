package com.wangjin.salon.service.mapper;

import com.wangjin.salon.service.model.vo.OrderStaffOptionVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface OrderStaffMapper {
    /** 门店权限在 Service 校验，SQL 显式限制同租户启用人员。 */
    List<OrderStaffOptionVO> listOptions(@Param("tenantId") Long tenantId, @Param("storeId") Long storeId);
}

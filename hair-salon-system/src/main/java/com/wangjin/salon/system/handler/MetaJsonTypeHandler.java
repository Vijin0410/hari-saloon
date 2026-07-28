package com.wangjin.salon.system.handler;

import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import com.wangjin.salon.system.model.vo.Meta;
import org.apache.ibatis.type.JdbcType;
import org.apache.ibatis.type.MappedJdbcTypes;
import org.apache.ibatis.type.MappedTypes;

/**
 * 菜单 meta JSON 字段处理器。
 */
@MappedTypes(Meta.class)
@MappedJdbcTypes(JdbcType.VARCHAR)
public class MetaJsonTypeHandler extends JacksonTypeHandler {

    public MetaJsonTypeHandler() {
        super(Meta.class);
    }

    /** MyBatis 解析 XML/resultMap 时按属性类型调用此构造 */
    public MetaJsonTypeHandler(Class<?> type) {
        super(type);
    }
}

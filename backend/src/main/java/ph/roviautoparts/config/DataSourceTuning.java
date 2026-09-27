package ph.roviautoparts.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.stereotype.Component;

/** Removes round trips to a far-away PostgreSQL (Supabase) database. */
@Component
public class DataSourceTuning implements BeanPostProcessor {

    static {
        if (System.getProperty("com.zaxxer.hikari.aliveBypassWindowMs") == null) {
            System.setProperty("com.zaxxer.hikari.aliveBypassWindowMs", "30000");
        }
    }

    @Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) {
        if (bean instanceof HikariDataSource ds && ds.getJdbcUrl() != null && ds.getJdbcUrl().startsWith("jdbc:postgresql:")) {
            ds.addDataSourceProperty("readOnlyMode", "ignore");
        }
        return bean;
    }
}

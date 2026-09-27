package ph.roviautoparts.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Forwards SPA deep links (paths without a dot) to the app shell so client-side routing works. */
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/app").setViewName("forward:/app/index.html");
        registry.addViewController("/app/").setViewName("forward:/app/index.html");
        registry.addViewController("/app/{a:[^.]*}").setViewName("forward:/app/index.html");
        registry.addViewController("/app/{a:[^.]*}/{b:[^.]*}").setViewName("forward:/app/index.html");
        registry.addViewController("/app/{a:[^.]*}/{b:[^.]*}/{c:[^.]*}").setViewName("forward:/app/index.html");
    }
}

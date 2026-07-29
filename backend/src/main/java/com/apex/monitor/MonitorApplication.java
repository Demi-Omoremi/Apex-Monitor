package com.apex.monitor;

import com.apex.monitor.config.DevEnvironment;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class MonitorApplication {

	public static void main(String[] args) {
		DevEnvironment.resetDockerIfRequested();
		SpringApplication.run(MonitorApplication.class, args);
	}

}

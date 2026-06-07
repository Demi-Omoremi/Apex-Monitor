package com.apex.monitor.service;

import com.apex.monitor.model.TriggeredAlert;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class NotificationConsumerService {

    private SseService service;

    public NotificationConsumerService(SseService service) {
        this.service = service;
    }

    @KafkaListener(
            topics = "triggered-alerts",
            groupId = "apex-notification-group",
            containerFactory = "triggeredAlertListenerContainerFactory"
    )
    public void handleTriggeredAlert(TriggeredAlert alert) {
        System.out.println("\n📣 📣 📣 NEW NOTIFICATION WORKER TASK 📣 📣 📣");
        System.out.printf("Processing notification for Rule: %s%n", alert.id());
        System.out.printf("MESSAGE: %s hit $%.2f (Target was %s $%.2f at %s)%n",
                alert.symbol(), alert.triggeredPrice(), alert.condition(), alert.targetPrice(), alert.timestamp());
        System.out.println("--------------------------------------------------\n");

        log.info("Kafka interceptor captured triggered alert for symbol: {}", alert.symbol());

        try {
            service.broadcast("alert-update", alert);

            log.debug("Successfully broadcasted alert ID {} to active dashboard clients", alert.id());
        } catch (Exception error) {
            log.error("Failed to stream alert. Error: {}", error.getMessage());
        }

    }



}

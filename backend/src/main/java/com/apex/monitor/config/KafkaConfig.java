package com.apex.monitor.config;

import com.apex.monitor.model.MarketTick;
import com.apex.monitor.model.TriggeredAlert;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.*;
import org.springframework.kafka.support.serializer.JacksonJsonDeserializer;
import org.springframework.kafka.support.serializer.JacksonJsonSerializer;
import tools.jackson.databind.json.JsonMapper;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class KafkaConfig {

    @Bean
    public NewTopic marketTicksTopic() {
        return TopicBuilder.name("market-ticks").partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic triggeredAlertsTopic() {
        return TopicBuilder.name("triggered-alerts").partitions(3).replicas(1).build();
    }

    @Bean
    public ProducerFactory<String, Object> producerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);

        JsonMapper jsonMapper = JsonMapper.builder()
                .findAndAddModules()
                .build();

        JacksonJsonSerializer<Object> serializer = new JacksonJsonSerializer<>(jsonMapper);

        return new DefaultKafkaProducerFactory<>(config, new StringSerializer(), serializer);
    }

    @Bean
    public KafkaTemplate<String, Object> kafkaTemplate(ProducerFactory<String, Object> producerFactory) {
        return new KafkaTemplate<>(producerFactory);
    }

    @Bean
    public ConsumerFactory<String, MarketTick> marketTickConsumerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        config.put(ConsumerConfig.GROUP_ID_CONFIG, "apex-monitor-group");
        config.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);

        JsonMapper jsonMapper = JsonMapper.builder()
                .findAndAddModules()
                .build();

        JacksonJsonDeserializer<MarketTick> deserializer = new JacksonJsonDeserializer<>(MarketTick.class, jsonMapper);

        return new DefaultKafkaConsumerFactory<>(config, new StringDeserializer(), deserializer);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, MarketTick> kafkaListenerContainerFactory(
            ConsumerFactory<String, MarketTick> marketTickConsumerFactory) {
        ConcurrentKafkaListenerContainerFactory<String, MarketTick> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(marketTickConsumerFactory);
        return factory;
    }

    @Bean
    public ConsumerFactory<String, TriggeredAlert> triggeredAlertConsumerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        config.put(ConsumerConfig.GROUP_ID_CONFIG, "apex-notification-group");
        config.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);

        JsonMapper jsonMapper = JsonMapper.builder()
                .findAndAddModules()
                .build();

        JacksonJsonDeserializer<TriggeredAlert> deserializer = new JacksonJsonDeserializer<>(TriggeredAlert.class, jsonMapper);
        deserializer.addTrustedPackages("com.apex.monitor.model");
        deserializer.setUseTypeHeaders(false);

        return new DefaultKafkaConsumerFactory<>(config, new StringDeserializer(), deserializer);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, TriggeredAlert> triggeredAlertListenerContainerFactory(
            ConsumerFactory<String, TriggeredAlert> triggeredAlertConsumerFactory) {
        ConcurrentKafkaListenerContainerFactory<String, TriggeredAlert> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(triggeredAlertConsumerFactory);
        return factory;
    }
}
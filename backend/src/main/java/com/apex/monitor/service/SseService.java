package com.apex.monitor.service;


import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class SseService {

    private final Map<String, List<SseEmitter>> channels = new ConcurrentHashMap<>();

    public SseEmitter createConnection(String channel) {
        SseEmitter emitter = new SseEmitter(0L);


        channels.computeIfAbsent(channel, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(channel, emitter));
        emitter.onTimeout(() -> removeEmitter(channel, emitter));
        emitter.onError((e) -> removeEmitter(channel, emitter));

        try {
            emitter.send(SseEmitter.event().name("INIT").data("Connected to Apex Monitor Stream"));
        } catch (IOException e) {
            removeEmitter(channel, emitter);
        }

        return emitter;
    }


    public void broadcast(String channel, String eventName, Object data) {
        List<SseEmitter> emitters = channels.get(channel);
        List<SseEmitter> deadEmitters = new CopyOnWriteArrayList<>();

        for (SseEmitter emitter: emitters) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(data));
            } catch (IOException e) {
                deadEmitters.add(emitter);
            }
        }

        emitters.removeAll(deadEmitters);
    }


    private void removeEmitter(String channel, SseEmitter emitter) {
        List<SseEmitter> emitters = channels.get(channel);
        if (emitters != null) {
            emitters.remove(emitter);
            // Clean up empty channels to save memory
            if (emitters.isEmpty()) {
                channels.remove(channel);
            }
        }
    }
}

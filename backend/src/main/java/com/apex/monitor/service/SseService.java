package com.apex.monitor.service;


import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class SseService {

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public SseEmitter createConnection() {
        SseEmitter emitter = new SseEmitter(0L);

        this.emitters.add(emitter);

        emitter.onCompletion(() -> this.emitters.remove(emitter));
        emitter.onTimeout(() -> this.emitters.remove(emitter));
        emitter.onError((e) -> this.emitters.remove(emitter));

        try {
            emitter.send(SseEmitter.event().name("INIT").data("Connected to Apex Monitor Stream"));
        } catch (IOException e) {
            this.emitters.remove(emitter);
        }

        return emitter;
    }


    public void broadcast(String eventName, Object data) {
        List<SseEmitter> deadEmitters = new CopyOnWriteArrayList<>();

        for (SseEmitter emitter: emitters) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(data));
            } catch (IOException e) {
                deadEmitters.add(emitter);
            }
        }

        this.emitters.removeAll(deadEmitters);
    }
}

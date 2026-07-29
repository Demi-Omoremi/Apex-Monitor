package com.apex.monitor.registry;

import com.apex.monitor.model.TriggeredAlert;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class TriggeredAlertStore {

    private final CopyOnWriteArrayList<TriggeredAlert> history = new CopyOnWriteArrayList<>();

    public void add(TriggeredAlert alert) {
        history.add(0, alert);
    }

    public List<TriggeredAlert> getAll() {
        return new ArrayList<>(history);
    }

    public void clear() {
        history.clear();
    }
}

package com.apex.monitor.converters;

import com.apex.monitor.enums.Timeframe;
import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

@Component
public class TimeFrameConverter implements Converter<String, Timeframe> {

    @Override
    public Timeframe convert(String value) {
        for (Timeframe tf: Timeframe.values()) {
            if (tf.label.equalsIgnoreCase(value)) {
                return tf;
            }
        }

        throw new IllegalArgumentException("Unknown timeframe: " + value);
    }



}

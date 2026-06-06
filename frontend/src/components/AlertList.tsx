import React from 'react';
import type {TriggeredAlert} from "../types/monitor.ts";


interface AlertListProps {
    alerts: TriggeredAlert[];
}

export default function AlertList({ alerts }: AlertListProps) {
    return (
        <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '8px'}}>
            <h2>Recent Triggered Alerts</h2>

            {alerts.length === 0 ? (
                <p>No alerts triggered yet. Monitoring Kafka feed...</p>
            ) : (
                <ul>
                    {alerts.map((alert) => {
                        return (
                            <li key={alert.id}>
                                {alert.symbol}: alert triggered! Condition: {alert.condition}.
                                Target: ${alert.targetPrice} | Actual: ${alert.triggeredPrice}
                            </li>
                        );
                    })}

                </ul>
            )}

        </div>
    );

}
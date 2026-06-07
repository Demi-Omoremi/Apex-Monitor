import React, {useEffect, useState} from 'react';
import type {TriggeredAlert} from "./types/monitor.ts";
import AlertList from "./components/AlertList.tsx";

function App() {
    const [alerts, setAlerts] = useState<TriggeredAlert[]>([]);

    useEffect(() => {
        console.log("Connecting to Spring Boot SSE stream via Kafka channel...");


        const eventSource = new EventSource('http://localhost:8080/api/alerts');


        eventSource.addEventListener('alert-update', (event) => {
            try {
                const incomingData = JSON.parse(event.data);
                console.log("New live alert intercepted:", incomingData);

                setAlerts((prevAlerts) => [incomingData, ...prevAlerts]);

            } catch (e) {
                console.error("Error parsing streaming event data:", e);
            }
        });

        eventSource.onerror = (err) => {
            console.error("SSE Connection failed or dropped. Reconnecting automatically...", err);
        };

        return () => {
            console.log("Closing SSE stream connection...");
            eventSource.close();
        };
    }, []);




  return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif', backgroundColor: '#f9f9f9' }}>
        <h1 style={{color: 'green'}}>Apex Monitor Dashboard</h1>
          <hr />

        <AlertList alerts={alerts}/>
      </div>
  );
}

export default App;
import React from 'react';
import type {TriggeredAlert} from "./types/monitor.ts";
import AlertList from "./components/AlertList.tsx";

function App() {
    const mockAlerts: TriggeredAlert[] = [
        {
            id: '1',
            symbol: 'AAPL',
            targetPrice: 180,
            triggeredPrice: 181.5,
            condition: "ABOVE",
        },
        {
            id: '2',
            symbol: 'TSLA',
            targetPrice: 250,
            triggeredPrice: 248.2,
            condition: "BELOW",
        }
    ];



  return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif', backgroundColor: '#f9f9f9' }}>
        <h1>Apex Monitor Dashboard</h1>
          <hr />

        <AlertList alerts={mockAlerts}/>
      </div>
  );
}

export default App;
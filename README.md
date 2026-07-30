# Apex Monitor

A professional real-time market monitoring application with live streaming data, interactive charts, and customizable alerts.

## Overview

Apex Monitor is a full-stack financial monitoring platform that provides real-time market data visualization, stock tracking, and alert management. The application features a modern, cinematic UI with live Server-Sent Events (SSE) streaming for instant price updates.

## Features

- **Real-Time Market Data**: Live streaming of stock prices via SSE
- **Interactive Charts**: Historical price data with multiple timeframes (1D, 5D, 30D, 90D, 6M, 1Y)
- **Custom Alerts**: Set price-based alerts (above/below conditions) with real-time notifications
- **Market Overview**: Track most active stocks, gainers, losers, and highest volume stocks
- **News Integration**: Market and company-specific news feeds
- **Responsive Design**: Cinematic UI with dark theme optimized for professional trading environments
- **Drag-and-Drop**: Reorder stock positions with intuitive drag-and-drop interface

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (React 19)
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui, Radix UI primitives
- **Charts**: Recharts
- **Icons**: Hugeicons
- **State Management**: React Context API
- **Form Validation**: Zod
- **Notifications**: Sonner

### Backend
- **Framework**: Spring Boot 4.0.6
- **Language**: Java 21 with Kotlin 2.3.10
- **Database**: PostgreSQL with JPA/Hibernate
- **Messaging**: Apache Kafka
- **Streaming**: Server-Sent Events (SSE)
- **WebSocket**: Spring WebSocket support
- **Market Data**: Alpaca Java API
- **Build Tool**: Maven

## Project Structure

```
apex-monitor-workspace/
├── frontend/              # Next.js frontend application
│   ├── app/              # App router pages
│   ├── components/       # React components
│   ├── lib/              # Utility functions
│   ├── hooks/            # Custom React hooks
│   └── public/           # Static assets
├── backend/              # Spring Boot backend application
│   └── src/
│       ├── main/
│       │   └── java/com/apex/monitor/
│       └── test/
├── scripts/              # Utility scripts
└── docker-compose.yml    # Docker orchestration
```

## Getting Started

### Prerequisites

- Node.js 20+
- Java 21
- PostgreSQL 14+
- Maven 3.8+
- Docker (optional, for containerized deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd apex-monitor-workspace
   ```

2. **Backend Setup**
   ```bash
   cd backend
   # Configure database connection in application.properties
   mvn clean install
   mvn spring-boot:run
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080

### Docker Deployment

Using Docker Compose for quick setup:

```bash
docker-compose up -d
```

## Configuration

### Backend Configuration

Configure the following in `backend/src/main/resources/application.properties`:

- Database connection settings
- Alpaca API credentials
- Kafka configuration
- SSE endpoint settings

### Frontend Configuration

Configure environment variables in `frontend/.env`:

```
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_LOGO_DEV_KEY=your_logo_dev_key_here
```

### Backend Configuration

Configure the following in `backend/src/main/resources/application.properties`:

- Database connection settings
- Kafka configuration
- SSE endpoint settings

**Required Environment Variables for Alpaca API:**

Set the following environment variables in your run configuration or system environment:

```
ALPACA_KEY_ID=your_alpaca_api_key_id
ALPACA_SECRET_KEY=your_alpaca_api_secret_key
```

These credentials are required for accessing market data through the Alpaca API.

## API Endpoints

### Market Data
- `GET /api/streams/subscribe-stream` - SSE stream for live data
- `GET /api/streams/subscription` - Get current subscriptions
- `DELETE /api/streams/unsubscribe?symbol={symbol}` - Unsubscribe from symbol
- `GET /api/streams/{symbol}/historical-bars?tf={timeframe}` - Historical data

### Alerts
- `GET /api/streams/alerts` - Get all alerts
- `POST /api/streams/alerts` - Create alert
- `DELETE /api/streams/alerts/{symbol}/{id}` - Delete alert
- `GET /api/streams/alerts/triggered` - Get triggered alerts

### Market Overview
- `GET /api/streams/stocks/most-active` - Most active stocks
- `GET /api/streams/stocks/gainers` - Top gainers
- `GET /api/streams/stocks/losers` - Top losers
- `GET /api/streams/stocks/highest-volume` - Highest volume stocks

### News
- `GET /api/streams/market/news` - Market news
- `GET /api/streams/{symbol}/news` - Symbol-specific news

## Development

### Frontend Development

```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run typecheck    # Run TypeScript type checking
```

### Backend Development

```bash
cd backend
mvn spring-boot:run  # Start development server
mvn test             # Run tests
mvn clean package    # Build for production
```

## Architecture

### Frontend Architecture
- **App Router**: Next.js 13+ app directory structure
- **Component Organization**: Feature-based component structure
- **State Management**: React Context for SSE connection and global state
- **Styling**: Tailwind CSS with custom design system
- **Type Safety**: TypeScript with Zod validation

### Backend Architecture
- **Layered Architecture**: Controller → Service → Repository pattern
- **Event-Driven**: Kafka for async event processing
- **Streaming**: SSE for real-time data push
- **Data Access**: JPA/Hibernate with PostgreSQL
- **API Integration**: Alpaca API for market data

## Design System

The application uses a custom dark theme with a professional color palette:

- **Void (#0C0B09)**: Background
- **Brass (#C79A4B)**: Accents, borders, highlights
- **Bone (#EDE6D8)**: Primary text
- **Fog (#8B8478)**: Secondary text
- **Moss (#6E8F71)**: Positive indicators (price up)
- **Rust (#A85D45)**: Negative indicators (price down)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For support and inquiries, please contact the development team.

## Acknowledgments

- Market data provided by Alpaca
- UI components from shadcn/ui
- Icons from Hugeicons
- Charting library by Recharts

# NexusDrive Frontend

<div align="center">

![React](https://img.shields.io/badge/React-19.1.1-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7.1.7-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1.16-38B2AC?logo=tailwind-css&logoColor=white)

**A modern ML-powered ETA prediction dashboard for delivery logistics**

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Tech Stack](#-tech-stack) • [Project Structure](#-project-structure)

</div>

---

## Screenshots

### ML Prediction Dashboard
![ML Prediction Dashboard](./images/Screenshot%202025-11-12%20at%2011-47-01%20nexusdrive-frontend.png)

*The main prediction interface featuring real-time weather data, location selection, and ML model inference capabilities.*

### Overview & Route Visualization
![Overview Dashboard](./images/Screenshot%202025-11-12%20at%2011-47-59%20nexusdrive-frontend.png)

*Interactive map view showing delivery routes, live updates, and real-time delivery status tracking.*

### Analytics & Performance Metrics
![Analytics Dashboard](./images/Screenshot%202025-11-12%20at%2011-48-12%20nexusdrive-frontend.png)

*Comprehensive analytics dashboard with performance charts, delay analysis, and ML model insights.*

---

## Overview

NexusDrive is a cutting-edge **ML-powered ETA prediction dashboard** designed for delivery logistics operations. Built with React, TypeScript, and Vite, it provides real-time delivery time predictions using machine learning models, weather data integration, and comprehensive analytics.

The application features a modern, dark-themed UI with three main views:
- **ML Prediction**: Configure and run ML model predictions with real-time weather data
- **Overview**: Visualize delivery routes on interactive maps with live updates
- **Analytics**: Analyze performance metrics, delays, and delivery patterns

---

## Features

### Core Functionality
- **ML-Powered Predictions**: Real-time ETA predictions using machine learning models
- **Weather Integration**: Automatic weather data fetching from Open-Meteo API
- **Location Management**: Select start and destination locations with preset cities or custom coordinates
- **Real-Time Analytics**: Live performance metrics, delay analysis, and delivery volume tracking
- **Interactive Maps**: Visualize delivery routes with OpenStreetMap integration
- **Data Visualization**: Beautiful charts and graphs using Recharts library

### User Experience
- **Modern Dark UI**: Sleek, gradient-based dark theme with smooth animations
- **Responsive Design**: Fully optimized for desktop and mobile devices
- **⚡ Real-Time Updates**: Live metrics and status updates
- **API Health Monitoring**: Automatic backend API health checks
- **Prediction History**: Track recent predictions with detailed results

### Technical Features
- **Type Safety**: Full TypeScript implementation for reliability
- **State Management**: Efficient React state management
- **Error Handling**: Robust error handling with fallback mechanisms
- **Performance Optimized**: Fast load times and smooth interactions

---

## Tech Stack

### Frontend Framework
- **React 19.1.1**: Modern React with latest features
- **TypeScript 5.9.3**: Type-safe development
- **Vite 7.1.7**: Lightning-fast build tool and dev server

### Styling & UI
- **Tailwind CSS 4.1.16**: Utility-first CSS framework
- **Lucide React**: Modern icon library
- **Custom Gradients**: Beautiful gradient-based design system

### Data Visualization
- **Recharts 3.3.0**: Composable charting library
  - Area charts for performance trends
  - Bar charts for delay analysis
  - Line charts for delivery volume
  - Radar charts for impact factor analysis

### External APIs
- **Open-Meteo API**: Real-time weather data
- **OpenStreetMap**: Interactive map visualization
- **Backend ML API**: Custom prediction endpoint

### Development Tools
- **ESLint**: Code linting and quality checks
- **TypeScript ESLint**: TypeScript-specific linting rules
- **Vite Plugins**: React and Tailwind CSS integration

---

## 📦 Installation

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** or **yarn** package manager
- **Backend API** running on `http://127.0.0.1:8000` (for full functionality)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/NexusDrive-frontend.git
   cd NexusDrive-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000` (or the port shown in terminal)

---

## 🎯 Usage

### Running Predictions

1. **Select Locations**
   - Click on "Start Location" or "Destination" buttons
   - Choose from preset cities (Lahore, Islamabad, Karachi, etc.)
   - Or select custom location with coordinates

2. **Configure Parameters**
   - Weather data is automatically fetched for the destination
   - Select traffic condition (Light, Normal, Heavy, Congested)
   - Choose AOI type (Residential, Commercial, Industrial)

3. **Generate Prediction**
   - Click "Generate Prediction" button
   - View results including:
     - Predicted ETA (in minutes)
     - Delay risk assessment
     - Model confidence score
     - Impact factor analysis

### Viewing Analytics

- **Overview Tab**: See interactive map with route visualization
- **Analytics Tab**: Explore performance charts and metrics
- **Live Updates**: Monitor real-time delivery status

### API Configuration

The application expects a backend API at `http://127.0.0.1:8000` with:
- `GET /health`: Health check endpoint
- `POST /predict`: ML prediction endpoint

Update the API URL in `src/components/Dashboard.tsx` if your backend runs on a different address.

---

## 📁 Project Structure

```
nexusdrive-frontend/
├── public/                 # Static assets
├── images/                 # Screenshots and images
│   ├── Screenshot 2025-11-12 at 11-47-01 nexusdrive-frontend.png
│   ├── Screenshot 2025-11-12 at 11-47-59 nexusdrive-frontend.png
│   └── Screenshot 2025-11-12 at 11-48-12 nexusdrive-frontend.png
├── src/
│   ├── components/         # React components
│   │   └── Dashboard.tsx   # Main dashboard component
│   ├── assets/             # Images and static files
│   ├── App.tsx             # Root component
│   ├── main.tsx            # Application entry point
│   └── index.css           # Global styles
├── index.html              # HTML template
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration
├── tailwind.config.ts      # Tailwind CSS configuration
└── README.md               # This file
```

---

## 🚦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production-ready bundle |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint to check code quality |

---

## 🔌 API Integration

### Backend Requirements

The frontend communicates with a backend ML service that should provide:

**Health Check Endpoint**
```http
GET /health
```

**Prediction Endpoint**
```http
POST /predict
Content-Type: application/json

{
  "order_id": number,
  "distance_km": number,
  "relative_humidity_2m (%)": number,
  "cloud_cover (%)": number,
  "wind_speed_10m (km/h)": number,
  "precipitation (mm)": number,
  "accept_hour_sin": number,
  "accept_hour_cos": number,
  "accept_dow_sin": number,
  "accept_dow_cos": number,
  "Weather_Label": string,
  "Traffic_Label": string,
  "city": string,
  "aoi_type": number
}
```

**Response Format**
```json
{
  "order_id": number,
  "city": string,
  "Predicted_ETA": number,
  "Predicted_Delay": number
}
```

---

## 🎨 Key Features Explained

### Weather Data Integration
- Automatically fetches real-time weather data from Open-Meteo API
- Determines weather labels (Clear, Cloudy, Rainy, Foggy, Stormy, etc.)
- Updates when destination location changes

### Location Selection
- Preset cities: Lahore, Islamabad, Karachi, Faisalabad, Sargodha
- Custom coordinate input with validation
- Interactive map picker for visual location selection

### ML Model Integration
- Sends comprehensive feature set to backend ML model
- Includes temporal features (hour, day of week) with sine/cosine encoding
- Calculates distance using Haversine formula
- Displays prediction results with confidence metrics

### Real-Time Metrics
- Live KPI cards showing active deliveries, average ETA, on-time rate
- Auto-updating metrics every 5 seconds
- Visual indicators for API health status

---

## 🧪 Development

### Code Quality
- **TypeScript**: Full type safety throughout the codebase
- **ESLint**: Enforced code quality standards
- **Component Architecture**: Modular, reusable components

### Best Practices
- Functional components with React hooks
- Proper error handling and loading states
- Responsive design principles
- Accessibility considerations

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👤 Author

**Hamza Khan**

- Email: [hamzakhan102003@gmail.com](mailto:hamzakhan102003@gmail.com)
- GitHub: [@Muhammad-Hamza-Khan-03](https://github.com/Muhammad-Hamza-Khan-03)

---

## Acknowledgments

- **Open-Meteo** for providing free weather API
- **OpenStreetMap** for map visualization
- **Recharts** team for excellent charting library
- **Vite** team for the amazing build tool

---

<div align="center">

**Built using React, TypeScript, and Vite**

⭐ Star this repo if you find it helpful!

</div>

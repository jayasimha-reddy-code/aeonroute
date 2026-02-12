# EV Routing System - High-End UI Dashboard

> **AI-Powered Electric Vehicle Route Optimization with Modern Web Interface**

A comprehensive, modern web dashboard for the EV Routing system with interactive visualizations, real-time metrics, and AI-powered route optimization.

## 🎯 Features

### Dashboard
- **Real-time System Status**: Monitor road network statistics and model status
- **Interactive Road Network Visualization**: D3.js-based graph visualization with dynamic node layout
- **Key Metrics Display**: Energy consumption, route distance, and time estimates
- **System Health Indicators**: Status of GAN, Q-Learning Agent, and GNN models

### Route Planner
- **Interactive Route Generation**: Plan routes from any source to destination
- **EV State Management**: Adjust battery SOC, capacity, and vehicle state
- **Multiple Route Candidates**: Compare up to 5 different optimized routes
- **Route Visualization**: See routes overlay on the road network
- **Detailed Route Metrics**:
  - Distance (km)
  - Energy consumption (kWh)
  - Travel time (minutes)
  - Feasibility score
  - Charging stops

### Training Dashboard
- **Flexible Configuration**: Adjust grid size, epochs, episodes, and batch sizes
- **Real-time Progress Tracking**: Step-by-step training pipeline visualization
- **Training Metrics**: View results for each component
- **System Control**: Start/stop training with live status updates

### Analytics & Reports
- **Energy Consumption Charts**: Time-based energy consumption analysis
- **Route Quality Distribution**: Pie charts showing route feasibility
- **Distance Distribution**: Bar charts for route length analysis
- **System Performance Metrics**: Network statistics and component status
- **Export Capabilities**: Download reports and metrics

## 🏗️ Architecture

```
EV Routing UI System
├── Backend (FastAPI)
│   ├── Route Planning APIs
│   ├── System Status Endpoints
│   ├── Training Management
│   └── Metrics & Analytics
├── Frontend (React + TypeScript)
│   ├── Dashboard
│   ├── Route Planner
│   ├── Training Monitor
│   └── Analytics
└── Visualizations (D3.js + Recharts)
    ├── Interactive Road Networks
    ├── Route Visualization
    └── Performance Charts
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 18+
- npm or yarn

### Backend Setup

1. **Install dependencies:**
```bash
pip install -r requirements-api.txt
```

2. **Run the FastAPI server:**
```bash
python backend_api.py
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start development server:**
```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### Full System with Both Backend and Frontend

1. **Terminal 1 - Backend:**
```bash
python backend_api.py
```

2. **Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

3. **Open browser:**
Navigate to `http://localhost:5173`

## 📱 UI Components

### Dashboard (`src/pages/Dashboard.tsx`)
- System status cards
- Road network visualization
- Component health indicators
- Quick action buttons

### Route Planner (`src/pages/RoutePlanner.tsx`)
- Route parameter inputs
- EV state controls
- Route generation
- Route visualization
- Route comparison cards

### Training (`src/pages/Training.tsx`)
- Configuration panel
- Progress tracking
- Pipeline status visualization
- Results display

### Analytics (`src/pages/Analytics.tsx`)
- Energy consumption charts
- Route quality metrics
- Distribution analysis
- System performance stats

## 🎨 Design Features

### Modern UI Elements
- **Glass Morphism Design**: Frosted glass effects with backdrop blur
- **Dark Mode**: Full dark/light theme support
- **Responsive Layout**: Mobile, tablet, and desktop optimized
- **Smooth Animations**: Transitions and interactive feedback
- **Color-coded Status**: Visual indicators for system state

### Technology Stack
- **Frontend Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom utilities
- **Visualization**: D3.js for graphs, Recharts for charts
- **State Management**: Zustand for global state
- **HTTP Client**: Axios for API calls
- **Build Tool**: Vite for fast development
- **Icons**: Lucide React icons

### Backend
- **Framework**: FastAPI for high-performance APIs
- **ASGI Server**: Uvicorn for async request handling
- **Data Validation**: Pydantic models
- **CORS**: Enabled for cross-origin requests

## 🔗 API Endpoints

### Road Network
- `GET /api/road-network?grid_size=10` - Get road network data

### Route Generation
- `POST /api/generate-route` - Generate optimized routes
- `GET /api/route-metrics?num_samples=10` - Get route metrics
- `POST /api/save-route` - Save a route

### Traffic
- `GET /api/traffic-patterns?time_step=12` - Get traffic data

### Training
- `GET /api/training-status` - Get training status
- `POST /api/start-training` - Start training
- `POST /api/stop-training` - Stop training

### System
- `GET /api/health` - Health check
- `GET /api/system-stats` - System statistics

## 📊 Data Flow

```
Road Network Data
        ↓
Frontend Components
        ↓
User Interactions
        ↓
API Requests (Axios)
        ↓
FastAPI Backend
        ↓
Python EV Routing System
        ↓
API Response
        ↓
State Update (Zustand)
        ↓
UI Re-render
```

## 🎯 Usage Examples

### Generate a Route
1. Click on **Route Planner** tab
2. Select source node (e.g., 0)
3. Select destination node (e.g., 50)
4. Adjust battery SOC if needed
5. Click **Generate Routes**
6. View and compare route options

### Train the System
1. Click on **Training** tab
2. Configure parameters (grid size, epochs, etc.)
3. Click **Start Training**
4. Monitor progress in real-time
5. View results after completion

### View Analytics
1. Click on **Analytics** tab
2. Review energy consumption patterns
3. Check route quality distribution
4. View system performance metrics

## 🛠️ Customization

### Add Custom Charts
Edit `src/pages/Analytics.tsx` to add new chart types using Recharts.

### Modify Route Parameters
Update route request structure in `src/services/api.ts`.

### Change Color Scheme
Edit Tailwind config in `frontend/tailwind.config.ts`.

### Add New Pages
Create new components in `src/pages/` and add to `src/App.tsx`.

## 📈 Performance Optimizations

- **Code Splitting**: Lazy loaded pages
- **Memoization**: Prevent unnecessary re-renders
- **API Caching**: Service worker ready
- **Image Optimization**: Optimized SVG icons
- **Bundle Size**: Minimal dependencies

## 🐛 Troubleshooting

### API Connection Issues
- Ensure backend is running on `http://localhost:8000`
- Check CORS is enabled in `backend_api.py`
- Verify firewall settings

### Frontend Won't Load
- Clear npm cache: `npm cache clean --force`
- Reinstall dependencies: `npm install`
- Check Node.js version: `node -v`

### Training Fails
- Check Python dependencies: `pip install -r requirements-api.txt`
- Ensure models directory exists
- Check disk space for models

## 📚 Project Structure

```
EV_Routing/
├── backend_api.py              # FastAPI application
├── requirements-api.txt         # Python dependencies
├── src/                        # Python backend code
│   ├── main.py
│   ├── road_graph.py
│   ├── route_generator.py
│   └── ...
└── frontend/                    # React application
    ├── src/
    │   ├── App.tsx
    │   ├── main.tsx
    │   ├── pages/
    │   │   ├── Dashboard.tsx
    │   │   ├── RoutePlanner.tsx
    │   │   ├── Training.tsx
    │   │   └── Analytics.tsx
    │   ├── components/
    │   │   ├── Header.tsx
    │   │   ├── Sidebar.tsx
    │   │   ├── RoadNetworkVisualization.tsx
    │   │   ├── RouteVisualization.tsx
    │   │   ├── RouteCard.tsx
    │   │   └── StatCard.tsx
    │   ├── services/
    │   │   └── api.ts
    │   └── store/
    │       └── store.ts
    ├── index.html
    ├── tailwind.config.ts
    ├── vite.config.ts
    └── package.json
```

## 🔐 Security

- Input validation via Pydantic
- CORS configuration
- No sensitive data in frontend
- Environment variable support

## 📝 License

This UI dashboard is part of the EV Routing System project.

## 👥 Support

For issues, questions, or feature requests related to the UI:
1. Check the troubleshooting section
2. Review the API documentation
3. Check component TypeScript types for guidance

---

**Built with ❤️ for AI-Powered EV Route Optimization**

# AeonRoute: Graph-Augmented Generative EV Routing

**AeonRoute** is a sophisticated, hyper-intelligent routing engine designed specifically for Electric Vehicles (EVs) in complex urban environments. By merging Graph Neural Networks (GNNs) with Generative Adversarial Networks (GANs) and Reinforcement Learning (Q-Learning), AeonRoute doesn't just find the shortest path—it predicts traffic dynamics and optimizes for energy efficiency and charging infrastructure availability.

## 🚀 The Vision

In the transition to sustainable urban mobility, standard routing algorithms (like A* or Dijkstra) fall short. They ignore the non-linear energy consumption of EVs and the stochastic nature of city traffic. AeonRoute addresses this by:
- **Synthesizing Realistic Traffic:** Using GANs to generate high-fidelity traffic patterns based on historical data.
- **Topological Intelligence:** Leveraging GNNs to understand the relationship between road segments and charging nodes.
- **Adaptive Learning:** Utilizing Q-Learning agents that "live" in the simulation, learning the most efficient routes through trial and error in a digital twin of Hyderabad.

## 🏗️ Architecture

AeonRoute is built as a modular microservices-oriented system:

### 🧠 Backend (Python / FastAPI)
- **Hybrid Routing Engine:** Orchestrates multiple strategies, from classic graph search to neural-guided pathfinding.
- **Spatial Indexing:** High-performance spatial lookups for charging stations and road segments.
- **Training Pipeline:** Integrated services for GNN-GAN training and Q-Table updates.
- **Analytics Service:** Real-time processing of simulation metrics and health data.

### 🎨 Frontend (React / Vite / Tailwind)
- **Dynamic Map Visualization:** Real-time rendering of routes and station status.
- **Simulation Dashboard:** Interactive controls for managing EV agents and viewing hardware-accelerated telemetry.
- **Training Monitor:** Live SSE (Server-Sent Events) streams for tracking model convergence.

## 🛠️ Tech Stack

| Category | Technologies |
| :--- | :--- |
| **Backend** | Python 3.10+, FastAPI, NetworkX, GeoPandas, Keras/TensorFlow |
| **Frontend** | TypeScript, React, Vite, TailwindCSS, Framer Motion, Lucide React |
| **Infrastructure** | Docker, Docker Compose, Make |
| **Data** | GraphML (Hyderabad OpenStreetMap Data), JSON |

## 🏁 Getting Started

### Prerequisites
- Python 3.10 or higher
- Node.js 18+ & npm
- Docker (optional, for containerized deployment)

### Backend Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/aeonroute.git
   cd aeonroute
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the API:
   ```bash
   python backend_api.py
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 📊 Models and Training

AeonRoute utilizes three primary AI components located in `src/models/`:
1. **GNN-GAN:** Generates synthetic but realistic traffic flows across the road graph.
2. **Q-Learning Agent:** Optimizes route selection based on a reward function that balances time, energy, and battery safety.
3. **Spatial Index:** Ensures sub-millisecond lookups for nearest charging stations.

To retrain the models:
```bash
python src/main.py --train
```

## 🧪 Testing

We maintain high standards for reliability. Run the test suite using:
```bash
# Backend tests
pytest tests/

# Frontend tests
cd frontend && npm test
```

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Developed with a focus on sustainable urban infrastructure and next-generation AI.*

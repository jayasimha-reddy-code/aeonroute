# AeonRoute Frontend

This is the React-based frontend for the **AeonRoute** ecosystem. It provides a high-fidelity interface for visualizing EV simulations, monitoring AI training progress, and managing system configurations.

## ✨ Key Features

- **Real-Time Routing Map:** Interactive visualization of optimal paths and charging stations.
- **Simulation Control:** Fine-grained control over EV agents and environmental parameters.
- **AI Training Monitor:** Live feedback from GNN and GAN training cycles via Server-Sent Events (SSE).
- **Hardware Telemetry:** Real-time stats on system health and routing efficiency.
- **Animated UI:** Smooth, physics-based transitions powered by Framer Motion.

## 🚀 Development

### Installation

```bash
npm install
```

### Running the App

```bash
# Start development server
npm run dev

# Run unit tests
npm test

# Run E2E tests (Playwright)
npx playwright test
```

### Build

```bash
npm run build
```

## 🛠️ Architecture

- **State Management:** Modular stores for domain logic, UI state, and simulation telemetry.
- **API Layer:** Type-safe hooks for interacting with the AeonRoute FastAPI backend.
- **Component Library:** Atomic design pattern with customized UI primitives.

For more information, visit the main [README.md](../README.md).

# Knowledge Graph Frontend

## Overview

This is the frontend application for the interactive Knowledge Graph visualization, built with **React**, **TypeScript**, and **D3.js**. It provides a Neo4j-style graph interface with physics-based node interactions, real-time editing, and seamless data persistence.

## 🛠️ Tech Stack

- **Framework**: React 18 with TypeScript
- **Visualization**: D3.js with Force Simulation
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **HTTP Client**: Axios
- **State Management**: React Hooks (useState, useEffect, useCallback)

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/           # React components
│   │   ├── GraphCanvas.tsx   # Main D3 visualization
│   │   ├── GraphView.tsx     # Main container component
│   │   ├── Toolbar.tsx       # Search and controls
│   │   ├── PropertiesPanel.tsx # Node/edge editing
│   │   ├── ConfirmModal.tsx  # Delete confirmations
│   │   └── ErrorBoundary.tsx # Error handling
│   ├── api/                 # API communication
│   │   └── apiClient.ts
│   ├── types/               # TypeScript definitions
│   │   ├── graph.d.ts
│   │   └── constants.ts
│   ├── styles/              # CSS styles
│   │   └── index.css
│   ├── App.tsx              # Root component
│   └── main.tsx             # Entry point
├── public/
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Running backend API server (see backend repository)

### Installation

1. **Clone this repository:**
   ```bash
   git clone https://github.com/devsaad05858/Knowledge-Graph-Frontend.git
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   
   Create a `.env` file in the root directory:
   ```bash
   touch .env
   ```
   
   Add the following configuration:
   ```env
   # API Configuration
   VITE_API_BASE_URL=http://localhost:5000/api
   
   # For production deployment (Heroku backend)
   # VITE_API_BASE_URL=https://knowledge-graph-backend-app-0dd39e8bfcd4.herokuapp.com/api
   ```

4. **Make sure the backend is running:**
   
   The frontend requires the backend API to be running. See the backend repository for setup instructions.

5. **Start the development server:**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎯 Key Features

### Interactive Graph Visualization
- **Physics Simulation**: D3 force-directed layout with customizable physics
- **Drag & Drop**: Smooth node dragging with real-time position updates
- **Zoom & Pan**: Mouse wheel zoom and click-drag panning
- **Auto-centering**: Automatic centering on new nodes and search results

### Node Management
- **Create**: Click empty space to create new nodes
- **Edit**: Click nodes to edit properties in side panel
- **Delete**: Delete nodes with automatic edge cleanup
- **Types**: Multiple node types with color coding

### Edge Management  
- **Create**: Right-click and drag between nodes to create connections
- **Edit**: Click edges to modify labels and properties
- **Delete**: Remove connections via context menu or properties panel
- **Directional**: Support for both directed and undirected edges

### Search & Navigation
- **Real-time Search**: Instant search with auto-highlighting
- **Auto-centering**: Search results automatically center in view
- **Fit to Screen**: One-click view optimization
- **Visual Feedback**: Highlighted search matches

### Data Persistence
- **Auto-save**: Position changes saved automatically with debouncing
- **Real-time Updates**: Immediate reflection of all changes
- **Error Handling**: Graceful error recovery and user feedback

## 🎨 Design System

### Color Scheme
- **Background**: Dark theme with gray-900 base
- **Nodes**: Color-coded by type (frontend, backend, database, etc.)
- **Edges**: Gray with directional arrows
- **UI**: Glass-morphism with backdrop blur effects

### Node Types & Colors
- `frontend-framework`: Blue (#3B82F6)
- `backend-framework`: Green (#10B981)
- `programming-language`: Purple (#8B5CF6)
- `database`: Orange (#F59E0B)
- `runtime`: Red (#EF4444)
- `visualization-library`: Pink (#EC4899)
- `component`: Cyan (#06B6D4)
- `architecture`: Indigo (#6366F1)
- `concept`: Yellow (#EAB308)
- `css-framework`: Emerald (#059669)
- `build-tool`: Teal (#0D9488)
- `cloud-database`: Amber (#D97706)
- `orm`: Rose (#F43F5E)
- `graph-database`: Violet (#7C3AED)
- `default`: Gray (#6B7280)

## ⚙️ Physics Configuration

The D3 force simulation uses optimized parameters for smooth, stable interactions:

```typescript
const PHYSICS_CONFIG = {
  CHARGE_STRENGTH: -300,    // Node repulsion
  LINK_DISTANCE: 80,        // Edge length
  COLLISION_RADIUS: 20,     // Node collision
  ALPHA_DECAY: 0.02,        # Simulation cooling
  VELOCITY_DECAY: 0.3       // Drag coefficient
}
```

## 🎮 User Interactions

### Mouse Controls
- **Click empty space**: Create new node
- **Click node**: Select and edit properties
- **Click edge**: Select and edit relationship
- **Drag node**: Move with physics simulation
- **Right-click node**: Show connection menu
- **Mouse wheel**: Zoom in/out
- **Click + drag background**: Pan view

### Keyboard Shortcuts
- **Escape**: Close properties panel
- **Delete**: Delete selected item (when panel open)

## 🔧 Development Scripts

```bash
# Development server with hot reload
npm run dev

# Type checking
npm run build

# Production preview
npm run preview

# Linting
npm run lint
```

## 🏗️ Architecture Decisions

### Why D3.js for Physics?
- **Performance**: Highly optimized force simulation
- **Flexibility**: Complete control over physics parameters
- **Compatibility**: Works seamlessly with React
- **Ecosystem**: Rich ecosystem of extensions and examples
- **Neo4j Similarity**: Similar physics behavior to Neo4j Browser

### Component Architecture
- **GraphView**: Main container managing state and API calls
- **GraphCanvas**: Pure D3 visualization with React integration
- **Toolbar**: Search and navigation controls
- **PropertiesPanel**: Sliding panel for editing
- **ErrorBoundary**: Graceful error handling

### State Management Strategy
- **Local State**: React hooks for UI state
- **API State**: Direct API calls with error handling
- **Physics State**: D3 simulation manages node positions
- **Debouncing**: Position updates debounced to reduce API calls

## 🎯 Performance Optimizations

### Rendering
- **useCallback**: Memoized event handlers
- **Efficient Updates**: Minimal re-renders with proper dependencies
- **SVG Optimization**: Efficient D3 selections and updates

### API Communication
- **Debounced Updates**: Position changes batched
- **Request Caching**: Axios interceptors for logging
- **Error Recovery**: Automatic retry logic

### Physics Simulation
- **Optimized Parameters**: Balanced performance vs. visual quality
- **Conditional Rendering**: Simulation only runs when needed
- **Memory Management**: Proper cleanup of D3 resources

## 🐛 Troubleshooting

### Graph Not Loading
- Check backend API is running on correct port
- Verify `VITE_API_BASE_URL` in `.env`
- Check browser console for network errors

### Physics Simulation Issues
- Nodes flying apart: Reduce `CHARGE_STRENGTH`
- Slow performance: Increase `ALPHA_DECAY`
- Unstable movement: Adjust `VELOCITY_DECAY`

### Search Not Working
- Ensure backend `/api/search` endpoint is accessible
- Check for JavaScript errors in console
- Verify search query formatting

## 📱 Responsive Design

The application is optimized for desktop use but includes responsive considerations:
- **Minimum Width**: 1024px recommended
- **Touch Support**: Basic touch events for tablets
- **Mobile**: Limited functionality on mobile devices

## 🔐 Security Considerations

- **Input Sanitization**: All user inputs validated
- **XSS Prevention**: Proper React rendering practices
- **API Security**: HTTPS in production, CORS configuration
- **Error Handling**: No sensitive data exposed in errors

## 🚀 Deployment

### Vite Build Output
```bash
npm run build
# Creates dist/ folder with optimized static files
```

### Environment Variables for Production
```env
VITE_API_BASE_URL=https://knowledge-graph-backend-app-0dd39e8bfcd4.herokuapp.com/api
```

### Deployed Application
- **Frontend (Vercel)**: https://frontend-cuevpw3mf-saadaslam010s-projects.vercel.app
- **Backend (Heroku)**: https://knowledge-graph-backend-app-0dd39e8bfcd4.herokuapp.com

### Static Hosting Options
- Vercel, Netlify, GitHub Pages
- AWS S3 + CloudFront
- Docker containerization supported

## 🔗 Backend Integration

This frontend connects to a Node.js/Express backend deployed on Heroku:
**Backend URL**: https://knowledge-graph-backend-app-0dd39e8bfcd4.herokuapp.com

The backend API provides the following endpoints:

- `GET /api/graph` - Complete graph data
- `POST /api/nodes` - Create nodes
- `PUT /api/nodes/:id` - Update nodes
- `DELETE /api/nodes/:id` - Delete nodes
- `POST /api/edges` - Create edges
- `PUT /api/edges/:id` - Update edges
- `DELETE /api/edges/:id` - Delete edges
- `GET /api/search?q=term` - Search nodes

The production deployment is configured to use the Heroku backend automatically. 
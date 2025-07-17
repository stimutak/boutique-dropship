# Holistic Store - Frontend React Application

A modern React application for a holistic products dropshipping store specializing in spiritual and wellness items.

## Features

- **Product Catalog**: Browse and search spiritual products with filtering and pagination
- **Individual Product Pages**: Detailed product views with spiritual properties (without wholesaler data)
- **Shopping Cart**: Add, update, and remove items with guest and authenticated user support
- **Checkout Flow**: Complete order process with customer information and address collection
- **User Account Management**: Registration, login, profile management, and order history
- **Responsive Design**: Mobile-first design that works on all devices
- **Cross-site Integration**: Support for referrals from sister websites

## Technology Stack

- **React 18** - Modern React with hooks
- **React Router 6** - Client-side routing
- **Redux Toolkit** - State management with RTK Query
- **Vite** - Fast build tool and dev server
- **Axios** - HTTP client for API calls
- **CSS3** - Custom responsive styling

## Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   └── ProtectedRoute.jsx
│   │   └── Layout/
│   │       ├── Header.jsx
│   │       └── Footer.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Products.jsx
│   │   ├── ProductDetail.jsx
│   │   ├── Cart.jsx
│   │   ├── Checkout.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Profile.jsx
│   │   ├── Orders.jsx
│   │   ├── OrderDetail.jsx
│   │   └── NotFound.jsx
│   ├── store/
│   │   ├── store.js
│   │   └── slices/
│   │       ├── authSlice.js
│   │       ├── cartSlice.js
│   │       ├── productsSlice.js
│   │       └── ordersSlice.js
│   ├── __tests__/
│   │   ├── components/
│   │   └── pages/
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── public/
├── package.json
├── vite.config.js
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Backend API server running on port 5000

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm test` - Run tests once
- `npm run test:watch` - Run tests in watch mode

## API Integration

The frontend connects to the backend API server with the following endpoints:

- **Authentication**: `/api/auth/*`
- **Products**: `/api/products/*`
- **Cart**: `/api/cart/*`
- **Orders**: `/api/orders/*`

The Vite dev server proxies API requests to `http://localhost:5000`.

## State Management

Redux Toolkit is used for state management with the following slices:

- **authSlice**: User authentication and profile management
- **productsSlice**: Product catalog, search, and individual product data
- **cartSlice**: Shopping cart with support for both guest and authenticated users
- **ordersSlice**: Order creation and history

## Responsive Design

The application uses a mobile-first approach with:

- Flexible grid system
- Responsive navigation
- Touch-friendly interfaces
- Optimized layouts for mobile, tablet, and desktop

## Testing

Component tests are written using:

- **Vitest** - Fast test runner
- **React Testing Library** - Component testing utilities
- **jsdom** - DOM environment for tests

Run tests with:
```bash
npm test
```

## Build and Deployment

### Production Build

```bash
npm run build
```

This creates an optimized build in the `dist/` directory with:
- Minified JavaScript and CSS
- Asset optimization
- Code splitting
- Static file generation

### Deployment

The built files can be deployed to any static hosting service:

1. Build the application
2. Upload the `dist/` directory contents
3. Configure the server to serve `index.html` for all routes (SPA routing)

## Environment Configuration

The application expects the backend API to be available at:
- Development: `http://localhost:5000`
- Production: Configure via Vite environment variables

## Features Implementation

### Product Catalog
- Grid layout with product cards
- Category filtering
- Search functionality
- Pagination
- Spiritual properties display (chakra, element, zodiac)

### Shopping Cart
- Add/remove items
- Quantity updates
- Local storage for guest users
- Server sync for authenticated users
- Price calculations

### Checkout Process
- Customer information collection
- Shipping and billing addresses
- Cross-site referral tracking
- Order summary
- Integration with Mollie payment processor

### User Management
- Registration and login
- Profile management
- Address management
- Order history
- Protected routes

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Follow the existing code style
2. Write tests for new components
3. Ensure responsive design
4. Test across different browsers
5. Update documentation as needed
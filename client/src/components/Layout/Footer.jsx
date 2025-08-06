import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>Authentika Holistic Lifestyle</h3>
          <p>Your source for spiritual and wellness products</p>
        </div>
        
        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/products">Products</Link></li>
            <li><Link to="/cart">Cart</Link></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4>Categories</h4>
          <ul>
            <li><Link to="/products?category=crystals">Crystals</Link></li>
            <li><Link to="/products?category=herbs">Herbs</Link></li>
            <li><Link to="/products?category=essential-oils">Essential Oils</Link></li>
            <li><Link to="/products?category=supplements">Supplements</Link></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4>Account</h4>
          <ul>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/register">Register</Link></li>
            <li><Link to="/profile">My Account</Link></li>
            <li><Link to="/orders">Orders</Link></li>
          </ul>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Authentika Holistic Lifestyle. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
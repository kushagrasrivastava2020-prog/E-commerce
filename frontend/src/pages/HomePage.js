import React from 'react';
import Hero from '../components/Layout/Hero';
import TrustStrip from '../components/Layout/TrustStrip';
import CategoryShowcase from '../components/Layout/CategoryShowcase';
import ProductList from '../components/Products/ProductList';
import RecommendedForYou from '../components/Recommendations/RecommendedForYou';
import useReveal from '../hooks/useReveal';

function HomePage() {
  useReveal();
  return (
    <>
      <Hero />
      <TrustStrip />
      <CategoryShowcase />
      <div className="reveal">
        <RecommendedForYou />
      </div>
      <div id="shop" className="reveal">
        <ProductList />
      </div>
    </>
  );
}

export default HomePage;

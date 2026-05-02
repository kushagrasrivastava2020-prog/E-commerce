import React from 'react';
import { Link } from 'react-router-dom';

const CartItem = ({ item, onUpdateQuantity, onRemove }) => {
  return (
    <div className="cart-item">
      <div className="cart-item-image">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} />
        ) : '📦'}
      </div>

      <div className="cart-item-details">
        <Link to={`/products/${item.product_id}`}>
          <div className="cart-item-name">{item.name}</div>
        </Link>
        <div className="cart-item-price">${parseFloat(item.price).toFixed(2)}</div>

        <div className="quantity-control" style={{ marginTop: '0.5rem' }}>
          <button onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}>−</button>
          <input
            type="number"
            value={item.quantity}
            onChange={(e) => onUpdateQuantity(item.id, Math.max(1, parseInt(e.target.value) || 1))}
            min="1"
          />
          <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>+</button>
        </div>

        <div style={{ fontSize: '0.9rem', color: 'var(--gray-500)', marginTop: '0.3rem' }}>
          Subtotal: <strong>${parseFloat(item.item_total).toFixed(2)}</strong>
        </div>
      </div>

      <button className="btn btn-danger btn-sm" onClick={() => onRemove(item.id)} title="Remove">
        ✕
      </button>
    </div>
  );
};

export default CartItem;
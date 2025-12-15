import React, { useContext, useEffect, useState } from "react";
import "./Cart.css";
import { StoreContext } from "../../context/StoreContext";
import { useNavigate } from "react-router-dom";

const Cart = () => {
  const { fetchCartItems, deleteCartItem } = useContext(StoreContext);
  const [cartData, setCartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const buildImageSrc = (url) => {
    if (!url) return "";
    return url.startsWith("http") ? url : `http://localhost:5000${url}`;
  };

  const loadCart = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await fetchCartItems();
      setCartData(data ?? []);
    } catch (err) {
      console.error("Failed to fetch cart:", err);
      setError("Unable to load your cart right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const handleRemove = async (productId) => {
    try {
      await deleteCartItem(productId);
      await loadCart();
    } catch (err) {
      console.error("Remove item failed:", err);
    }
  };

  return (
    <div className="cart">
      <h2>Your Shopping Cart</h2>
      <div className="cart-items">
        <div className="cart-items-title">
          <p>Items</p>
          <p>Title</p>
          <p>Price</p>
          <p>Quantity</p>
          <p>Total</p>
          <p>Remove</p>
        </div>
        <br />
        <hr />
        {loading && <p>Loading cart...</p>}
        {error && <p className="error-text">{error}</p>}
        {!loading && !error && cartData.length === 0 && (
          <p>Your cart is empty.</p>
        )}
        {!loading &&
          !error &&
          cartData.map((item) => (
            <div key={item.id}>
              <div className="cart-items-title cart-items-item">
                <img src={buildImageSrc(item.image_url)} alt={item.name} />
                <p>{item.name}</p>
                <p>${Number(item.price || 0).toFixed(2)}</p>
                <p>{item.quantity}</p>
                <p>
                  $
                  {Number(
                    item.total_price ??
                      (Number(item.price) || 0) * (Number(item.quantity) || 0)
                  ).toFixed(2)}
                </p>
                <p
                  onClick={() => handleRemove(item.product_id)}
                  className="cross"
                  role="button"
                >
                  x
                </p>
              </div>
              <hr />
            </div>
          ))}
      </div>
      <div className="cart-actions">
        <button onClick={() => navigate("/order")}>PROCEED TO CHECKOUT</button>
      </div>
    </div>
  );
};

export default Cart;

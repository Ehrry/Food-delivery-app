import React, { useContext, useState } from "react";
import "./FoodItem.css";
import { assets } from "../../assets/assets";
import { StoreContext } from "../../context/StoreContext";
import { useNavigate } from "react-router-dom";

const FoodItem = ({ id, price, description, image }) => {
  const { cartItems, addToCart, removeFromCart } = useContext(StoreContext);
  const [updating, setUpdating] = useState(false);
  const navigate = useNavigate();

  const normalizedId = String(id);
  const count = cartItems[id] ?? cartItems[normalizedId] ?? 0;

  const handleAdd = async () => {
    if (updating) return;
    setUpdating(true);
    try {
      await addToCart(normalizedId);
    } catch (err) {
      console.error("Add to cart failed:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleRemove = async () => {
    if (updating || count <= 0) return;
    setUpdating(true);
    try {
      await removeFromCart(normalizedId);
    } catch (err) {
      console.error("Remove from cart failed:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleBuyNow = async () => {
    if (updating) return;
    setUpdating(true);
    try {
      // Ensure item is in cart before navigating
      if (count === 0) {
        await addToCart(normalizedId);
      }
      // Navigate to order page
      navigate("/order");
    } catch (err) {
      console.error("Buy now failed:", err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="food-item">
      <div className="food-item-img-container">
        <img className="food-item-image" src={image} alt="" />
        {!count ? (
          <img
            className="add"
            onClick={handleAdd}
            src={assets.add_icon_white}
            alt=""
          />
        ) : (
          <div className="food-item-counter">
            <img onClick={handleRemove} src={assets.remove_icon_red} alt="" />
            <p>{count}</p>
            <img onClick={handleAdd} src={assets.add_icon_green} alt="" />
          </div>
        )}
      </div>
      <div className="foood-item-info">
        {/* <div className="food-item-name-rating">
          <p>{name}</p>
          <img src={assets.rating_starts} alt="" />
        </div> */}
        <p className="food-item-desc">{description}</p>
        <p className="food-item-price">${price}</p>
        {count > 0 && (
          <>
            <button
              className="add-to-cart-button"
              onClick={handleAdd}
              disabled={updating}
            >
              Add to Cart
            </button>
            <button
              className="buy-now-button"
              onClick={handleBuyNow}
              disabled={updating}
            >
              Buy Now
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default FoodItem;
